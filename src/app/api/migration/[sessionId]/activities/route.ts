/**
 * GET /api/migration/[sessionId]/activities
 *
 * Fetch parsed activities with pagination, search, and filtering.
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
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "activityDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const activityType = searchParams.get("activityType");
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

    if (activityType) {
      where.activityType = activityType;
    }

    if (mappingStatus) {
      where.mappingStatus = mappingStatus;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch activities and total count
    const [activities, total] = await Promise.all([
      prisma.rawActivity.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip,
      }),
      prisma.rawActivity.count({ where }),
    ]);

    return NextResponse.json({
      activities: activities.map((a) => ({
        ...a,
        rawData: a.rawData ? JSON.parse(a.rawData) : null,
        validationErrors: a.validationErrors ? JSON.parse(a.validationErrors) : null,
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
    console.error("Fetch activities error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
