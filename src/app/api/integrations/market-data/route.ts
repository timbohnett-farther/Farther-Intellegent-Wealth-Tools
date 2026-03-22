export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('dataType') || 'daily_close';

    const snapshot = await prisma.marketDataSnapshot.findFirst({
      where: { dataType },
      orderBy: { date: 'desc' },
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: 'No market data snapshot found' },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { date, dataType } = body;

    if (!date || !dataType) {
      return NextResponse.json(
        { error: 'Missing required fields: date, dataType' },
        { status: 400 }
      );
    }

    // Parse the date
    body.date = new Date(body.date);

    // Upsert based on unique constraint (date + dataType)
    const snapshot = await prisma.marketDataSnapshot.upsert({
      where: {
        date_dataType: {
          date: body.date,
          dataType: body.dataType,
        },
      },
      update: {
        ...body,
      },
      create: {
        ...body,
      },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error('Error updating market data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
