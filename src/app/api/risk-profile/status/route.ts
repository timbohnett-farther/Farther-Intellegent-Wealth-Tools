export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { isAIEnabled } from '@/lib/risk-profile/ai-service';

export async function GET() {
  return NextResponse.json({ aiEnabled: isAIEnabled() });
}
