/**
 * PUT/DELETE /api/migration/[sessionId]/mappings/[id]
 *
 * Update or delete a field mapping.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string; id: string } }
) {
  try {
    const { sessionId, id } = params;
    const body = await request.json();
    const {
      sourceField,
      targetProperty,
      transformationType,
      transformationConfig,
      required,
      defaultValue,
    } = body;

    // Fetch existing mapping
    const existing = await prisma.fieldMapping.findUnique({
      where: { id },
    });

    if (!existing || existing.sessionId !== sessionId) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    // Update mapping
    const mapping = await prisma.fieldMapping.update({
      where: { id },
      data: {
        ...(sourceField && { sourceField }),
        ...(targetProperty && { targetProperty }),
        ...(transformationType && { transformationType }),
        ...(transformationConfig !== undefined && {
          transformationConfig: transformationConfig ? JSON.stringify(transformationConfig) : null,
        }),
        ...(required !== undefined && { required }),
        ...(defaultValue !== undefined && { defaultValue }),
      },
    });

    return NextResponse.json({
      ...mapping,
      transformationConfig: mapping.transformationConfig
        ? JSON.parse(mapping.transformationConfig)
        : null,
    });
  } catch (error) {
    console.error("Update mapping error:", error);
    return NextResponse.json(
      {
        error: "Failed to update mapping",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string; id: string } }
) {
  try {
    const { sessionId, id } = params;

    // Fetch existing mapping
    const existing = await prisma.fieldMapping.findUnique({
      where: { id },
    });

    if (!existing || existing.sessionId !== sessionId) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    // Delete mapping
    await prisma.fieldMapping.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete mapping error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete mapping",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
