/**
 * GET /api/migration/[sessionId]/households
 *
 * Fetch parsed households with pagination, search, and filtering.
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
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
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

    if (search) {
      where.OR = [
        { householdName: { contains: search } },
        { primaryContact: { contains: search } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch households and total count
    const [households, total] = await Promise.all([
      prisma.rawHousehold.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip,
      }),
      prisma.rawHousehold.count({ where }),
    ]);

    return NextResponse.json({
      households: households.map((h) => ({
        ...h,
        rawData: h.rawData ? JSON.parse(h.rawData) : null,
        validationErrors: h.validationErrors ? JSON.parse(h.validationErrors) : null,
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
    console.error("Fetch households error:", error);
    return NextResponse.json(
      { error: "Failed to fetch households. Please try again." },
      { status: 500 }
    );
  }
}
