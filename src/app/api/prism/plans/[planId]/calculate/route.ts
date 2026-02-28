import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  await params;

  return NextResponse.json(
    { error: 'Plan calculation will be available in Stage 2' },
    { status: 501 }
  );
}
