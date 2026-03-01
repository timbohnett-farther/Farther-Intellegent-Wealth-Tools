import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const connections = await prisma.custodianConnection.findMany({
      orderBy: { displayName: 'asc' },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error('Error fetching integration connections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
