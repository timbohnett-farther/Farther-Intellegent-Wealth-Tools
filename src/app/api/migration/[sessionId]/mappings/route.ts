/**
 * GET/POST /api/migration/[sessionId]/mappings
 *
 * List all field mappings or create a new mapping.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    // Build where clause
    const where: any = { sessionId };
    if (entityType) {
      where.entityType = entityType;
    }

    // Fetch mappings
    const mappings = await prisma.fieldMapping.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      mappings: mappings.map((m) => ({
        ...m,
        transformationConfig: m.transformationConfig ? JSON.parse(m.transformationConfig) : null,
      })),
    });
  } catch (error) {
    console.error("List mappings error:", error);
    return NextResponse.json(
      {
        error: "Failed to list mappings. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const {
      entityType,
      sourceField,
      targetProperty,
      transformationType,
      transformationConfig,
      required,
      defaultValue,
    } = body;

    // Validate required fields
    if (!entityType || !sourceField || !targetProperty) {
      return NextResponse.json(
        { error: "Missing required fields: entityType, sourceField, targetProperty" },
        { status: 400 }
      );
    }

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    // Create mapping
    const mapping = await prisma.fieldMapping.create({
      data: {
        sessionId,
        entityType,
        sourceField,
        targetProperty,
        transformationType: transformationType || "direct",
        transformationConfig: transformationConfig ? JSON.stringify(transformationConfig) : null,
        required: required || false,
        defaultValue,
      },
    });

    return NextResponse.json({
      ...mapping,
      transformationConfig: mapping.transformationConfig
        ? JSON.parse(mapping.transformationConfig)
        : null,
    });
  } catch (error) {
    console.error("Create mapping error:", error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A mapping for this source field already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create mapping. Please try again.",
      },
      { status: 500 }
    );
  }
}
