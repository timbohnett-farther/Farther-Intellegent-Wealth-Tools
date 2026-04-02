export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

/**
 * GET /api/risk-profile/profiles/[id]/history
 * Retrieve version history / audit log for a risk profile.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Verify profile exists
    const profile = await prisma.riskProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch all versions ordered by version number
    const versions = await prisma.profileVersion.findMany({
      where: { profileId: id },
      orderBy: { version: 'desc' },
    });

    // Parse JSON fields
    const parsed = versions.map((v) => ({
      ...v,
      previousScores: v.previousScores ? JSON.parse(v.previousScores) : null,
      newScores: JSON.parse(v.newScores),
    }));

    return NextResponse.json({
      profileId: id,
      currentVersion: profile.version,
      versions: parsed,
    });
  } catch (error) {
    console.error('[GET /api/risk-profile/profiles/[id]/history]', error);
    return NextResponse.json(
      { error: 'Failed to retrieve history' },
      { status: 500 },
    );
  }
}
