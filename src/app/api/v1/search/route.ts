export const dynamic = 'force-dynamic';
// =============================================================================
// GET /api/v1/search - Unified search across clients, households, plans
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ==================== Types ====================

interface SearchResult {
  entityType: 'client' | 'household' | 'plan';
  entityId: string;
  title: string;
  subtitle: string;
  status?: string;
  url: string;
  score: number; // for relevance sorting
}

interface SearchResponse {
  success: boolean;
  data: {
    results: SearchResult[];
    totalCount: number;
    query: string;
  } | null;
  error: string | null;
  retryable: boolean;
}

// ==================== Helpers ====================

function calculateRelevance(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText === lowerQuery) return 100; // exact match
  if (lowerText.startsWith(lowerQuery)) return 90; // starts with
  if (lowerText.includes(lowerQuery)) return 80; // contains
  return 0;
}

function errorResponse(error: string, retryable: boolean, status: number): NextResponse<SearchResponse> {
  return NextResponse.json(
    { success: false, data: null, error, retryable },
    { status }
  );
}

// ==================== GET ====================

export async function GET(req: NextRequest): Promise<NextResponse<SearchResponse>> {
  try {
    // ---------- Parse query params ----------
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';
    const typeFilter = searchParams.get('type')?.split(',') || [];
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Validate query length
    if (query.length < 2) {
      return errorResponse('Query must be at least 2 characters', false, 400);
    }

    // Normalize type filter
    const validTypes = ['client', 'household', 'plan'];
    const types = typeFilter.length > 0
      ? typeFilter.filter(t => validTypes.includes(t))
      : validTypes;

    const results: SearchResult[] = [];

    // ---------- Search Clients ----------
    if (types.includes('client')) {
      const clients = await prisma.client.findMany({
        where: {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { email: { contains: query } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        take: limit,
      });

      for (const client of clients) {
        const fullName = `${client.firstName} ${client.lastName}`;
        const score = Math.max(
          calculateRelevance(fullName, query),
          calculateRelevance(client.email || '', query)
        );

        results.push({
          entityType: 'client',
          entityId: client.id,
          title: fullName,
          subtitle: client.email || 'No email',
          url: `/prism/clients/${client.id}`,
          score,
        });
      }
    }

    // ---------- Search Households ----------
    if (types.includes('household')) {
      const households = await prisma.household.findMany({
        where: {
          name: { contains: query },
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: { clients: true },
          },
        },
        take: limit,
      });

      for (const household of households) {
        const score = calculateRelevance(household.name, query);
        results.push({
          entityType: 'household',
          entityId: household.id,
          title: household.name,
          subtitle: `${household._count.clients} client${household._count.clients === 1 ? '' : 's'}`,
          url: `/prism/households/${household.id}`,
          score,
        });
      }
    }

    // ---------- Search Plans ----------
    if (types.includes('plan')) {
      const plans = await prisma.plan.findMany({
        where: {
          name: { contains: query },
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
        take: limit,
      });

      for (const plan of plans) {
        const score = calculateRelevance(plan.name, query);
        results.push({
          entityType: 'plan',
          entityId: plan.id,
          title: plan.name,
          subtitle: plan.status,
          status: plan.status,
          url: `/prism/plans/${plan.id}`,
          score,
        });
      }
    }

    // ---------- Sort by relevance ----------
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        results: limitedResults,
        totalCount: limitedResults.length,
        query,
      },
      error: null,
      retryable: false,
    });

  } catch (err) {
    console.error('[GET /api/v1/search]', err);
    return errorResponse('Search failed', true, 500);
  }
}
