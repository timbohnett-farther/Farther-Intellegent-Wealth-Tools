/**
 * GET/POST /api/migration/sessions
 *
 * List all migration sessions or create a new session.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET - List all migration sessions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: any = {};
    if (sessionId) where.id = sessionId;
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const [sessions, total] = await Promise.all([
      prisma.migrationSession.findMany({
        where,
        include: {
          files: {
            select: {
              id: true,
              originalName: true,
              uploadStatus: true,
              sizeBytes: true,
            },
          },
          _count: {
            select: {
              contacts: true,
              households: true,
              activities: true,
              relationships: true,
              fieldMappings: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.migrationSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("List sessions error:", error);
    return NextResponse.json(
      { error: "Failed to list sessions. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new migration session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, name, description, uploadedBy } = body;

    // Validate required fields
    if (!platform || !name) {
      return NextResponse.json(
        { error: "Missing required fields: platform, name" },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = ["REDTAIL", "WEALTHBOX", "COMMONWEALTH", "SALESFORCE", "ADVIZON"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}` },
        { status: 400 }
      );
    }

    // Create migration session
    const session = await prisma.migrationSession.create({
      data: {
        platform,
        name,
        description,
        uploadedBy,
        status: "UPLOADING",
        totalRecords: 0,
        parsedRecords: 0,
        mappedRecords: 0,
        importedRecords: 0,
        errorCount: 0,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Failed to create session. Please try again." },
      { status: 500 }
    );
  }
}
