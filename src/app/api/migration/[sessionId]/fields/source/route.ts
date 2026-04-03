/**
 * GET /api/migration/[sessionId]/fields/source
 *
 * Analyze rawData to extract unique field paths and sample values.
 * This helps users understand what fields are available for mapping.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface FieldInfo {
  path: string;
  type: string;
  sampleValues: string[];
  occurrences: number;
}

function extractFields(obj: any, prefix: string = ""): Map<string, Set<any>> {
  const fields = new Map<string, Set<any>>();

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      if (!fields.has(path)) fields.set(path, new Set());
      fields.get(path)!.add(null);
    } else if (Array.isArray(value)) {
      if (!fields.has(path)) fields.set(path, new Set());
      fields.get(path)!.add(`[Array of ${value.length}]`);
    } else if (typeof value === "object") {
      // Recurse into nested objects
      const nested = extractFields(value, path);
      for (const [nestedPath, nestedValues] of nested) {
        if (!fields.has(nestedPath)) fields.set(nestedPath, new Set());
        for (const val of nestedValues) {
          fields.get(nestedPath)!.add(val);
        }
      }
    } else {
      if (!fields.has(path)) fields.set(path, new Set());
      fields.get(path)!.add(value);
    }
  }

  return fields;
}

function inferType(values: Set<any>): string {
  const types = new Set(
    Array.from(values)
      .filter((v) => v !== null && v !== undefined)
      .map((v) => typeof v)
  );

  if (types.size === 0) return "null";
  if (types.size > 1) return "mixed";
  return Array.from(types)[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") || "CONTACT";
    const sampleSize = parseInt(searchParams.get("sampleSize") || "100", 10);

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    // Fetch sample records based on entity type
    let records: any[] = [];
    if (entityType === "CONTACT") {
      records = await prisma.rawContact.findMany({
        where: { sessionId },
        take: sampleSize,
        select: { rawData: true },
      });
    } else if (entityType === "HOUSEHOLD") {
      records = await prisma.rawHousehold.findMany({
        where: { sessionId },
        take: sampleSize,
        select: { rawData: true },
      });
    }

    // Extract all fields from sample records
    const allFields = new Map<string, Set<any>>();

    for (const record of records) {
      const data = typeof record.rawData === "string" ? JSON.parse(record.rawData) : record.rawData;
      const fields = extractFields(data);

      for (const [path, values] of fields) {
        if (!allFields.has(path)) allFields.set(path, new Set());
        for (const value of values) {
          allFields.get(path)!.add(value);
        }
      }
    }

    // Convert to field info array
    const fieldInfos: FieldInfo[] = Array.from(allFields.entries())
      .map(([path, values]) => ({
        path,
        type: inferType(values),
        sampleValues: Array.from(values)
          .filter((v) => v !== null && v !== undefined)
          .slice(0, 3)
          .map((v) => String(v)),
        occurrences: values.size,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));

    return NextResponse.json({
      fields: fieldInfos,
      totalRecords: records.length,
      entityType,
    });
  } catch (error) {
    console.error("Source fields discovery error:", error);
    return NextResponse.json(
      {
        error: "Failed to discover source fields",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
