import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {};

    if (year) {
      where.taxYear = parseInt(year, 10);
    }

    if (type) {
      where.tableType = type;
    }

    const taxTables = await prisma.taxTable.findMany({
      where,
      orderBy: [
        { taxYear: 'desc' },
        { tableType: 'asc' },
      ],
    });

    return NextResponse.json(taxTables);
  } catch (error) {
    console.error('Error fetching tax tables:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { taxYear, tableType, data } = body;

    if (!taxYear || !tableType || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: taxYear, tableType, data' },
        { status: 400 }
      );
    }

    // Upsert: create or update based on unique constraint
    const taxTable = await prisma.taxTable.upsert({
      where: {
        taxYear_tableType_filingStatus: {
          taxYear,
          tableType,
          filingStatus: body.filingStatus || null,
        },
      },
      update: {
        data: typeof data === 'string' ? data : JSON.stringify(data),
        notes: body.notes,
      },
      create: {
        taxYear,
        tableType,
        filingStatus: body.filingStatus || null,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        notes: body.notes,
      },
    });

    return NextResponse.json(taxTable, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating tax table:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
