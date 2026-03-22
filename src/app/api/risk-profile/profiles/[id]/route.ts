export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

/**
 * GET /api/risk-profile/profiles/[id]
 * Retrieve a saved risk profile with parsed JSON scores.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const profile = await prisma.riskProfile.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            responses: {
              orderBy: { sequenceNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse JSON fields for convenience
    const parsed = {
      ...profile,
      scores: JSON.parse(profile.scores),
      composite: JSON.parse(profile.composite),
      assetClassEligibility: JSON.parse(profile.assetClassEligibility),
    };

    return NextResponse.json({ profile: parsed });
  } catch (error) {
    console.error('[GET /api/risk-profile/profiles/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to retrieve profile' },
      { status: 500 },
    );
  }
}
