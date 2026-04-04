/**
 * GET /api/migration/[sessionId]/relationships
 *
 * Fetch parsed relationships with pagination and filtering.
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

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const mappingStatus = searchParams.get("mappingStatus");

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    // Build where clause
    const where: any = { sessionId };

    if (mappingStatus) {
      where.mappingStatus = mappingStatus;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch relationships and total count
    const [relationships, total] = await Promise.all([
      prisma.rawRelationship.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.rawRelationship.count({ where }),
    ]);

    return NextResponse.json({
      relationships: relationships.map((r) => ({
        ...r,
        rawData: r.rawData ? JSON.parse(r.rawData) : null,
        validationErrors: r.validationErrors ? JSON.parse(r.validationErrors) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Fetch relationships error:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationships. Please try again." },
      { status: 500 }
    );
  }
}
