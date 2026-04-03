/**
 * POST /api/migration/[sessionId]/mappings/preview
 *
 * Preview transformation on sample data.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function applyTransformation(
  value: any,
  transformationType: string,
  transformationConfig: any
): any {
  switch (transformationType) {
    case "direct":
      return value;

    case "concat":
      // Concatenate multiple fields with separator
      const { fields, separator } = transformationConfig || {};
      if (!fields || !Array.isArray(fields)) return value;
      return fields.map((f: string) => value[f] || "").join(separator || " ");

    case "split":
      // Split a field by delimiter and take specific part
      const { delimiter, index } = transformationConfig || {};
      if (!delimiter || index === undefined) return value;
      const parts = String(value).split(delimiter);
      return parts[index] || "";

    case "lookup":
      // Map values using lookup table
      const { mappings } = transformationConfig || {};
      if (!mappings) return value;
      return mappings[String(value)] || value;

    case "custom":
      // Custom JavaScript transformation (dangerous - use with caution)
      const { code } = transformationConfig || {};
      if (!code) return value;
      try {
        const fn = new Function("value", `return ${code}`);
        return fn(value);
      } catch {
        return value;
      }

    default:
      return value;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { mappingId, sampleRecordIds, entityType, sourceField, transformationType, transformationConfig } = body;

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    // Fetch sample records
    let records: any[] = [];
    if (entityType === "CONTACT") {
      records = await prisma.rawContact.findMany({
        where: {
          sessionId,
          ...(sampleRecordIds && { id: { in: sampleRecordIds } }),
        },
        take: sampleRecordIds ? sampleRecordIds.length : 5,
        select: { id: true, rawData: true },
      });
    } else if (entityType === "HOUSEHOLD") {
      records = await prisma.rawHousehold.findMany({
        where: {
          sessionId,
          ...(sampleRecordIds && { id: { in: sampleRecordIds } }),
        },
        take: sampleRecordIds ? sampleRecordIds.length : 5,
        select: { id: true, rawData: true },
      });
    }

    // Apply transformation to each record
    const samples = records.map((record) => {
      const data = typeof record.rawData === "string" ? JSON.parse(record.rawData) : record.rawData;

      // Extract source value
      const parts = sourceField.split(".");
      let sourceValue = data;
      for (const part of parts) {
        if (sourceValue && typeof sourceValue === "object") {
          sourceValue = sourceValue[part];
        } else {
          sourceValue = undefined;
          break;
        }
      }

      // Apply transformation
      const transformed = applyTransformation(
        sourceValue,
        transformationType || "direct",
        transformationConfig
      );

      return {
        recordId: record.id,
        original: sourceValue,
        transformed,
      };
    });

    return NextResponse.json({
      samples,
      totalSamples: samples.length,
    });
  } catch (error) {
    console.error("Preview transformation error:", error);
    return NextResponse.json(
      {
        error: "Failed to preview transformation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
