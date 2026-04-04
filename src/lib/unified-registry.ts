/**
 * Unified Client/Household Registry
 * Single source of truth for all client and household data.
 * All tools (proposal engine, tax planning, rollover, risk profiling) reference this.
 */

import { prisma } from '@/lib/prisma';
import type {
  Firm,
  Advisor,
  Household,
  Client,
  Plan,
  Account,
  TaxScenario,
  TaxOpportunity,
  TaxDeliverable,
} from '../generated/prisma/client';

// ==================== TYPES ====================

export interface HouseholdWithClients extends Household {
  clients: Client[];
  plans: Plan[];
  accounts?: Account[];
  taxScenarios?: TaxScenario[];
}

export interface CrossToolSummary {
  clientId: string;
  householdId: string;
  client: Client;
  household: Household;

  // Planning data
  plans: Plan[];
  activePlanId: string | null;

  // Tax data
  taxScenarios: TaxScenario[];
  taxOpportunities: TaxOpportunity[];
  taxDeliverables: TaxDeliverable[];

  // Accounts
  accounts: Account[];
  totalAUM: number;

  // Counts for cross-tool visibility
  counts: {
    plans: number;
    taxScenarios: number;
    taxOpportunities: number;
    taxDeliverables: number;
    accounts: number;
  };

  lastUpdated: Date;
}

export interface GetOrCreateHouseholdParams {
  firmId: string;
  advisorId?: string;
  name: string;
  primaryState?: string;
}

export interface GetOrCreateClientParams {
  firmId: string;
  householdId: string;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: Date;
}

// ==================== HOUSEHOLD OPERATIONS ====================

/**
 * Find household by name+firmId or create new
 */
export async function getOrCreateHousehold(
  params: GetOrCreateHouseholdParams
): Promise<Household> {
  const { firmId, advisorId, name, primaryState } = params;

  // Validate firm exists
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) {
    throw new Error(`Firm not found: ${firmId}`);
  }

  // If advisorId provided, validate advisor
  if (advisorId) {
    const advisor = await prisma.advisor.findUnique({ where: { id: advisorId } });
    if (!advisor || advisor.firmId !== firmId) {
      throw new Error(`Advisor not found or does not belong to firm: ${advisorId}`);
    }
  }

  // Try to find existing household
  const existing = await prisma.household.findFirst({
    where: {
      firmId,
      name: { equals: name.trim() },
    },
  });

  if (existing) {
    return existing;
  }

  // Create new household — requires advisorId
  if (!advisorId) {
    throw new Error('advisorId required to create new household');
  }

  const household = await prisma.household.create({
    data: {
      firmId,
      advisorId,
      name: name.trim(),
    },
  });

  return household;
}

/**
 * Search households by name (fuzzy match)
 */
export async function lookupHousehold(
  firmId: string,
  query: string
): Promise<Household[]> {
  if (!query.trim()) {
    return [];
  }

  const households = await prisma.household.findMany({
    where: {
      firmId,
      name: {
        contains: query.trim(),
      },
    },
    orderBy: { name: 'asc' },
    take: 20,
  });

  return households;

  return households;
}

/**
 * Get household with all related entities
 */
export async function getHouseholdWithClients(
  householdId: string
): Promise<HouseholdWithClients> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      clients: {
        orderBy: { createdAt: 'asc' },
      },
      plans: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!household) {
    throw new Error(`Household not found: ${householdId}`);
  }

  return household as HouseholdWithClients;
}

// ==================== CLIENT OPERATIONS ====================

/**
 * Find client by name+household or create new
 */
export async function getOrCreateClient(
  params: GetOrCreateClientParams
): Promise<Client> {
  const { firmId, householdId, firstName, lastName, email, dateOfBirth } = params;

  // Validate household exists and belongs to firm
  const household = await prisma.household.findUnique({
    where: { id: householdId },
  });

  if (!household) {
    throw new Error(`Household not found: ${householdId}`);
  }

  if (household.firmId !== firmId) {
    throw new Error(`Household ${householdId} does not belong to firm ${firmId}`);
  }

  // Try to find existing client
  const existing = await prisma.client.findFirst({
    where: {
      householdId,
      firstName: { equals: firstName.trim() },
      lastName: { equals: lastName.trim() },
    },
  });

  if (existing) {
    return existing;
  }

  // Create new client
  if (!dateOfBirth) {
    throw new Error('dateOfBirth required to create new client');
  }

  const client = await prisma.client.create({
    data: {
      householdId,
      firmId,
      advisorId: household.advisorId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.trim(),
      dateOfBirth,
      role: 'primary', // First client defaults to primary
    },
  });

  return client;
}

/**
 * Search clients by name or email (fuzzy match)
 */
export async function lookupClient(
  firmId: string,
  query: string
): Promise<Client[]> {
  if (!query.trim()) {
    return [];
  }

  const clients = await prisma.client.findMany({
    where: {
      firmId,
      OR: [
        { firstName: { contains: query.trim() } },
        { lastName: { contains: query.trim() } },
        { email: { contains: query.trim() } },
      ],
    },
    orderBy: { lastName: 'asc' },
    take: 20,
  });

  return clients;
}

/**
 * Link existing proposal/plan/scenario to client and household
 * (Used when proposals are created before client records)
 */
export async function linkProposalToClient(
  proposalId: string,
  clientId: string,
  householdId: string
): Promise<void> {
  // Verify client belongs to household
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client || client.householdId !== householdId) {
    throw new Error(`Client ${clientId} does not belong to household ${householdId}`);
  }

  // Update plan to link to client
  await prisma.plan.update({
    where: { id: proposalId },
    data: {
      primaryClientId: clientId,
      householdId,
      firmId: client.firmId,
      advisorId: client.advisorId,
    },
  });
}

// ==================== CROSS-TOOL SUMMARY ====================

/**
 * Get unified view of all client data across all tools
 * Returns proposals, plans, tax scenarios, rollover analyses, etc.
 */
export async function getClientCrossToolSummary(
  clientId: string
): Promise<CrossToolSummary> {
  // Get client with household
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      household: true,
    },
  });

  if (!client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  const householdId = client.householdId;

  // Fetch all related data in parallel
  const [plans, taxScenarios, taxOpportunities, taxDeliverables, accounts] =
    await Promise.all([
      prisma.plan.findMany({
        where: {
          OR: [{ primaryClientId: clientId }, { coClientId: clientId }],
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.taxScenario.findMany({
        where: { householdId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.taxOpportunity.findMany({
        where: { householdId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.taxDeliverable.findMany({
        where: { householdId },
        orderBy: { generatedAt: 'desc' },
      }),
      prisma.account.findMany({
        where: {
          OR: [{ clientId: clientId }, { coOwnerId: clientId }],
        },
      }),
    ]);

  // Calculate total AUM
  const totalAUM = accounts.reduce((sum, acc) => sum + Number(acc.currentBalance || 0), 0);

  // Find active plan (most recent non-archived)
  const activePlan = plans.find((p) => p.status !== 'archived');

  return {
    clientId,
    householdId,
    client,
    household: client.household,
    plans,
    activePlanId: activePlan?.id ?? null,
    taxScenarios,
    taxOpportunities,
    taxDeliverables,
    accounts,
    totalAUM,
    counts: {
      plans: plans.length,
      taxScenarios: taxScenarios.length,
      taxOpportunities: taxOpportunities.length,
      taxDeliverables: taxDeliverables.length,
      accounts: accounts.length,
    },
    lastUpdated: new Date(),
  };
}
