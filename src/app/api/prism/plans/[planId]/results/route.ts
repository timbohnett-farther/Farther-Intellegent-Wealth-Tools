import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  await params;

  return NextResponse.json(
    { error: 'Plan results will be available in Stage 2' },
    { status: 501 }
  );
}
