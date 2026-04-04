import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  smaParsedDocuments,
  smaFactSheetDocuments,
  smaProviders,
  smaChangeEvents
} from "@/lib/db/schema";
import { eq, inArray, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Export SMA strategies to CSV
 *
 * GET /api/fmss/sma/export?format=csv&ids=doc1,doc2,doc3
 * GET /api/fmss/sma/export?format=csv (all strategies)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") || "csv";
  const idsParam = searchParams.get("ids");

  try {
    // Build query
    const baseQuery = db
      .select({
        id: smaParsedDocuments.id,
        document_id: smaParsedDocuments.document_id,
        strategy_name: smaParsedDocuments.strategy_name,
        manager_name: smaParsedDocuments.manager_name,
        inception_date: smaParsedDocuments.inception_date,
        aum_mm: smaParsedDocuments.aum_mm,
        management_fee_bps: smaParsedDocuments.management_fee_bps,
        provider_key: smaProviders.provider_key,
        provider_name: smaProviders.provider_name,
        document_url: smaFactSheetDocuments.canonical_url,
        parsed_at: smaParsedDocuments.parsed_at,
        extraction_confidence: smaParsedDocuments.extraction_confidence,
      })
      .from(smaParsedDocuments)
      .leftJoin(smaFactSheetDocuments, eq(smaParsedDocuments.document_id, smaFactSheetDocuments.id))
      .leftJoin(smaProviders, eq(smaFactSheetDocuments.provider_id, smaProviders.id));

    // If specific IDs provided, filter by them
    const strategies = idsParam
      ? await baseQuery
          .where(inArray(smaParsedDocuments.document_id, idsParam.split(',')))
          .limit(1000)
      : await baseQuery
          .where(isNotNull(smaParsedDocuments.strategy_name))
          .limit(1000);

    if (strategies.length === 0) {
      return NextResponse.json(
        { error: "No strategies found" },
        { status: 404 }
      );
    }

    // Export as CSV
    if (format === "csv") {
      const csv = generateCSV(strategies);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sma-strategies-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Export as JSON (fallback)
    return NextResponse.json({
      strategies,
      count: strategies.length,
      exported_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export strategies" },
      { status: 500 }
    );
  }
}

function generateCSV(strategies: any[]): string {
  // CSV headers
  const headers = [
    "Strategy Name",
    "Manager",
    "Provider",
    "Inception Date",
    "AUM (MM)",
    "Management Fee (bps)",
    "Parsed At",
    "Extraction Confidence",
    "Document URL",
  ];

  // CSV rows
  const rows = strategies.map((s) => [
    escapeCSV(s.strategy_name || ""),
    escapeCSV(s.manager_name || ""),
    escapeCSV(s.provider_name || ""),
    s.inception_date ? new Date(s.inception_date).toISOString().split('T')[0] : "",
    s.aum_mm ? s.aum_mm.toString() : "",
    s.management_fee_bps ? s.management_fee_bps.toString() : "",
    s.parsed_at ? new Date(s.parsed_at).toISOString() : "",
    s.extraction_confidence ? s.extraction_confidence.toString() : "",
    escapeCSV(s.document_url || ""),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

function escapeCSV(value: string): string {
  // Escape double quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAUM(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${(amount / 1_000).toFixed(0)}K`;
}
