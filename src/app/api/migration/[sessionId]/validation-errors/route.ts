/**
 * GET /api/migration/[sessionId]/validation-errors
 *
 * Get all validation errors for review.
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
    const severity = searchParams.get("severity");

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    // Build where clause
    const where: any = {
      sessionId,
      mappingStatus: "ERROR",
    };

    // Fetch error records
    let errorRecords: any[] = [];
    if (!entityType || entityType === "CONTACT") {
      const contacts = await prisma.rawContact.findMany({
        where,
        select: { id: true, validationErrors: true, sourceId: true, firstName: true, lastName: true },
      });
      errorRecords.push(...contacts.map((c) => ({ ...c, entityType: "CONTACT" })));
    }

    if (!entityType || entityType === "HOUSEHOLD") {
      const households = await prisma.rawHousehold.findMany({
        where,
        select: { id: true, validationErrors: true, sourceId: true, householdName: true },
      });
      errorRecords.push(...households.map((h) => ({ ...h, entityType: "HOUSEHOLD" })));
    }

    // Parse and flatten errors
    const allErrors: any[] = [];
    for (const record of errorRecords) {
      if (record.validationErrors) {
        const errors = JSON.parse(record.validationErrors);
        allErrors.push(
          ...errors.map((err: any) => ({
            ...err,
            recordLabel: record.firstName
              ? `${record.firstName} ${record.lastName}`
              : record.householdName || record.sourceId,
          }))
        );
      }
    }

    // Filter by severity if specified
    const filteredErrors = severity
      ? allErrors.filter((e) => e.severity === severity)
      : allErrors;

    // Calculate summary
    const errorSummary = {
      total: filteredErrors.length,
      byField: Object.entries(
        filteredErrors.reduce((acc: any, err: any) => {
          acc[err.field] = (acc[err.field] || 0) + 1;
          return acc;
        }, {})
      ).map(([field, count]) => ({ field, count })),
      bySeverity: Object.entries(
        filteredErrors.reduce((acc: any, err: any) => {
          acc[err.severity] = (acc[err.severity] || 0) + 1;
          return acc;
        }, {})
      ).map(([severity, count]) => ({ severity, count })),
    };

    return NextResponse.json({
      errors: filteredErrors,
      errorSummary,
    });
  } catch (error) {
    console.error("Fetch validation errors error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch validation errors",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
