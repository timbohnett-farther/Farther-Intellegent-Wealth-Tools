/**
 * Unified Search Service
 * Searches across all entity types: clients, households, proposals, plans, documents, scenarios.
 *
 * Strategy:
 * - Direct Prisma queries with `contains` filter (SQLite text search)
 * - Results sorted by relevance (exact match > starts with > contains)
 * - In-memory search index Map for pre-indexed entities (optimization for later)
 * - Will migrate to SearchIndex table when available for better performance
 */

import { prisma } from '@/lib/prisma';
import type { Client, Household, Plan } from '../generated/prisma/client';

// ==================== TYPES ====================

export type EntityType =
  | 'CLIENT'
  | 'HOUSEHOLD'
  | 'PROPOSAL'
  | 'PLAN'
  | 'DOCUMENT'
  | 'SCENARIO'
  | 'ROLLOVER'
  | 'TAX_OPPORTUNITY'
  | 'TAX_DELIVERABLE';

export interface SearchResult {
  entityType: EntityType;
  entityId: string;
  title: string;
  subtitle: string;
  status?: string;
  category?: string;
  value?: number;
  matchField: string;
  lastUpdated: Date;
}

export interface SearchParams {
  query: string;
  firmId: string;
  types?: EntityType[];
  limit?: number;
}

export interface IndexEntityParams {
  entityType: EntityType;
  entityId: string;
  firmId: string;
  title: string;
  subtitle?: string;
  searchText: string;
  status?: string;
  category?: string;
  value?: number;
}

interface IndexEntry {
  entityType: EntityType;
  entityId: string;
  firmId: string;
  title: string;
  subtitle: string;
  searchText: string;
  status?: string;
  category?: string;
  value?: number;
  updatedAt: Date;
}

// ==================== IN-MEMORY INDEX ====================

// Temporary in-memory index (will use SearchIndex Prisma model when available)
const searchIndex = new Map<string, IndexEntry>();

function buildIndexKey(firmId: string, entityType: EntityType, entityId: string): string {
  return `${firmId}:${entityType}:${entityId}`;
}

// ==================== RELEVANCE SCORING ====================

function calculateRelevance(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match (highest)
  if (lowerText === lowerQuery) return 100;

  // Starts with
  if (lowerText.startsWith(lowerQuery)) return 80;

  // Word boundary match
  const words = lowerText.split(/\s+/);
  if (words.some((w) => w.startsWith(lowerQuery))) return 60;

  // Contains
  if (lowerText.includes(lowerQuery)) return 40;

  return 0;
}

function sortByRelevance(results: SearchResult[], query: string): SearchResult[] {
  return results.sort((a, b) => {
    const scoreA = calculateRelevance(a.title, query);
    const scoreB = calculateRelevance(b.title, query);
    if (scoreA !== scoreB) return scoreB - scoreA;
    // Tie-breaker: most recent
    return b.lastUpdated.getTime() - a.lastUpdated.getTime();
  });
}

// ==================== ENTITY SEARCHERS ====================

async function searchClients(
  firmId: string,
  query: string
): Promise<SearchResult[]> {
  const clients = await prisma.client.findMany({
    where: {
      firmId,
      OR: [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { email: { contains: query } },
      ],
    },
    include: {
      household: { select: { name: true } },
    },
    take: 50,
  });

  return clients.map((client) => {
    const fullName = `${client.firstName} ${client.lastName}`;
    let matchField = 'name';
    if (client.email?.toLowerCase().includes(query.toLowerCase())) {
      matchField = 'email';
    }

    return {
      entityType: 'CLIENT' as EntityType,
      entityId: client.id,
      title: fullName,
      subtitle: client.household.name,
      status: client.isActive ? 'active' : 'inactive',
      matchField,
      lastUpdated: client.updatedAt,
    };
  });
}

async function searchHouseholds(
  firmId: string,
  query: string
): Promise<SearchResult[]> {
  const households = await prisma.household.findMany({
    where: {
      firmId,
      name: { contains: query },
    },
    include: {
      _count: { select: { clients: true, plans: true } },
    },
    take: 50,
  });

  return households.map((household) => ({
    entityType: 'HOUSEHOLD' as EntityType,
    entityId: household.id,
    title: household.name,
    subtitle: `${household._count.clients} clients, ${household._count.plans} plans`,
    matchField: 'name',
    lastUpdated: household.updatedAt,
  }));
}

async function searchPlans(firmId: string, query: string): Promise<SearchResult[]> {
  const plans = await prisma.plan.findMany({
    where: {
      firmId,
      OR: [
        { name: { contains: query } },
        {
          primaryClient: {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
            ],
          },
        },
      ],
    },
    include: {
      primaryClient: { select: { firstName: true, lastName: true } },
      household: { select: { name: true } },
    },
    take: 50,
  });

  return plans.map((plan) => {
    const clientName = `${plan.primaryClient.firstName} ${plan.primaryClient.lastName}`;
    return {
      entityType: 'PLAN' as EntityType,
      entityId: plan.id,
      title: plan.name,
      subtitle: `${clientName} (${plan.household.name})`,
      status: plan.status,
      category: plan.planType,
      matchField: 'name',
      lastUpdated: plan.updatedAt,
    };
  });
}

async function searchTaxScenarios(
  firmId: string,
  query: string
): Promise<SearchResult[]> {
  const scenarios = await prisma.taxScenario.findMany({
    where: {
      household: { firmId },
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
      ],
    },
    include: {
      household: { select: { name: true } },
    },
    take: 50,
  });

  return scenarios.map((scenario) => ({
    entityType: 'SCENARIO' as EntityType,
    entityId: scenario.id,
    title: scenario.name,
    subtitle: scenario.household.name,
    status: scenario.status,
    value: 0, // TaxScenario model doesn't have projectedSavings field
    matchField: 'name',
    lastUpdated: scenario.updatedAt,
  }));
}

async function searchTaxOpportunities(
  firmId: string,
  query: string
): Promise<SearchResult[]> {
  const opportunities = await prisma.taxOpportunity.findMany({
    where: {
      household: { firmId },
      OR: [
        { category: { contains: query } },
        { description: { contains: query } },
      ],
    },
    include: {
      household: { select: { name: true } },
    },
    take: 50,
  });

  return opportunities.map((opp) => ({
    entityType: 'TAX_OPPORTUNITY' as EntityType,
    entityId: opp.id,
    title: opp.title,
    subtitle: opp.household.name,
    status: opp.status,
    category: opp.category,
    value: Number(opp.estimatedValue || 0),
    matchField: 'category',
    lastUpdated: opp.updatedAt,
  }));
}

async function searchTaxDeliverables(
  firmId: string,
  query: string
): Promise<SearchResult[]> {
  const deliverables = await prisma.taxDeliverable.findMany({
    where: {
      household: { firmId },
      OR: [
        { type: { contains: query } },
        { title: { contains: query } },
      ],
    },
    include: {
      household: { select: { name: true } },
    },
    take: 50,
  });

  return deliverables.map((del) => ({
    entityType: 'TAX_DELIVERABLE' as EntityType,
    entityId: del.id,
    title: del.title,
    subtitle: del.household.name,
    status: del.status,
    category: del.type,
    matchField: 'title',
    lastUpdated: del.generatedAt,
  }));
}

// ==================== PUBLIC API ====================

/**
 * Unified search across all entity types
 */
export async function search(params: SearchParams): Promise<SearchResult[]> {
  const { query, firmId, types, limit = 20 } = params;

  if (!query.trim()) {
    return [];
  }

  const searchTypes: EntityType[] = types ?? [
    'CLIENT',
    'HOUSEHOLD',
    'PLAN',
    'SCENARIO',
    'TAX_OPPORTUNITY',
    'TAX_DELIVERABLE',
  ];

  // Execute searches in parallel
  const searchPromises: Promise<SearchResult[]>[] = [];

  if (searchTypes.includes('CLIENT')) {
    searchPromises.push(searchClients(firmId, query));
  }

  if (searchTypes.includes('HOUSEHOLD')) {
    searchPromises.push(searchHouseholds(firmId, query));
  }

  if (searchTypes.includes('PLAN')) {
    searchPromises.push(searchPlans(firmId, query));
  }

  if (searchTypes.includes('SCENARIO')) {
    searchPromises.push(searchTaxScenarios(firmId, query));
  }

  if (searchTypes.includes('TAX_OPPORTUNITY')) {
    searchPromises.push(searchTaxOpportunities(firmId, query));
  }

  if (searchTypes.includes('TAX_DELIVERABLE')) {
    searchPromises.push(searchTaxDeliverables(firmId, query));
  }

  // Combine all results
  const allResults = (await Promise.all(searchPromises)).flat();

  // Sort by relevance
  const sorted = sortByRelevance(allResults, query);

  // Apply limit
  return sorted.slice(0, limit);
}

/**
 * Index entity for search (pre-indexing)
 * Stores in in-memory Map (will use SearchIndex Prisma model when available)
 */
export async function indexEntity(params: IndexEntityParams): Promise<void> {
  const {
    entityType,
    entityId,
    firmId,
    title,
    subtitle = '',
    searchText,
    status,
    category,
    value,
  } = params;

  const key = buildIndexKey(firmId, entityType, entityId);

  const entry: IndexEntry = {
    entityType,
    entityId,
    firmId,
    title,
    subtitle,
    searchText: searchText.toLowerCase(),
    status,
    category,
    value,
    updatedAt: new Date(),
  };

  searchIndex.set(key, entry);
}

/**
 * Reindex all entities for a firm
 * (Used for initial setup or after bulk imports)
 */
export async function reindexAll(firmId: string): Promise<{ indexed: number }> {
  let count = 0;

  // Index all clients
  const clients = await prisma.client.findMany({ where: { firmId } });
  for (const client of clients) {
    const fullName = `${client.firstName} ${client.lastName}`;
    await indexEntity({
      entityType: 'CLIENT',
      entityId: client.id,
      firmId,
      title: fullName,
      searchText: `${fullName} ${client.email ?? ''}`,
    });
    count++;
  }

  // Index all households
  const households = await prisma.household.findMany({ where: { firmId } });
  for (const household of households) {
    await indexEntity({
      entityType: 'HOUSEHOLD',
      entityId: household.id,
      firmId,
      title: household.name,
      searchText: household.name,
    });
    count++;
  }

  // Index all plans
  const plans = await prisma.plan.findMany({
    where: { firmId },
    include: { primaryClient: true },
  });
  for (const plan of plans) {
    const clientName = `${plan.primaryClient.firstName} ${plan.primaryClient.lastName}`;
    await indexEntity({
      entityType: 'PLAN',
      entityId: plan.id,
      firmId,
      title: plan.name,
      searchText: `${plan.name} ${clientName}`,
      status: plan.status,
      category: plan.planType,
    });
    count++;
  }

  console.log(`[reindexAll] Indexed ${count} entities for firm ${firmId}`);

  return { indexed: count };
}

/**
 * Clear search index for a firm (dev helper)
 */
export function clearIndex(firmId: string): { cleared: number } {
  let cleared = 0;
  for (const [key, entry] of searchIndex.entries()) {
    if (entry.firmId === firmId) {
      searchIndex.delete(key);
      cleared++;
    }
  }
  return { cleared };
}

/**
 * Get index stats (dev helper)
 */
export function getIndexStats(firmId: string): {
  total: number;
  byType: Record<EntityType, number>;
} {
  const entries = Array.from(searchIndex.values()).filter(
    (e) => e.firmId === firmId
  );

  const byType: Record<string, number> = {};
  for (const entry of entries) {
    byType[entry.entityType] = (byType[entry.entityType] || 0) + 1;
  }

  return {
    total: entries.length,
    byType: byType as Record<EntityType, number>,
  };
}
