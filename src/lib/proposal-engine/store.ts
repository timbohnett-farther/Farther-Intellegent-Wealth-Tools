/**
 * Farther Portfolio Proposal Engine -- In-Memory Data Store
 *
 * Stage 1 in-memory store for proposals. Provides CRUD operations,
 * advisor/client queries, and dashboard statistics. Seeded with 5 demo
 * proposals across different lifecycle statuses (DRAFT, SENT, VIEWED,
 * ACCEPTED, DECLINED).
 *
 * Stage 2 will replace this with a persistent database layer.
 *
 * Design system: Steel Blue (bg-brand-700), Limestone (bg-limestone-*),
 * charcoal text. Tailwind CSS.
 *
 * @module proposal-engine/store
 */

import type {
  Proposal,
  FartherRiskProfile,
  PortfolioAnalytics,
  ProposalTracking,
  StatementScanResult,
} from './types';
import { cents, DEFAULT_PROPOSAL_SECTIONS } from './types';

// =====================================================================
// Store
// =====================================================================

const store: Map<string, Proposal> = new Map();
const riskProfileStore: Map<string, FartherRiskProfile> = new Map();
const analyticsStore: Map<string, { current: PortfolioAnalytics | null; proposed: PortfolioAnalytics | null }> = new Map();
const trackingStore: Map<string, ProposalTracking> = new Map();
const scanResultStore: Map<string, StatementScanResult[]> = new Map();

// =====================================================================
// Constants
// =====================================================================

const FIRM_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const ADVISOR_ID = 'adv-8a1b2c3d-4e5f-6789-abcd-ef0123456789';

// =====================================================================
// Seed Data -- 5 Demo Proposals
// =====================================================================

const seedProposals: Proposal[] = [
  // -----------------------------------------------------------------
  // 1. DRAFT -- new relationship, early wizard stage
  // -----------------------------------------------------------------
  {
    proposalId: 'prop-001-draft-henderson',
    firmId: FIRM_ID,
    advisorId: ADVISOR_ID,
    clientId: 'cli-001-henderson',
    clientName: 'James & Patricia Henderson',
    proposalType: 'NEW_RELATIONSHIP',
    occasion: 'INITIAL_MEETING',
    assetsInScope: cents(1250000),
    relationshipTier: 'HNW',
    notes: 'Couple referred by existing client. Both mid-50s, planning for retirement in 10 years. Currently with Merrill Lynch.',
    currentPortfolio: null,
    riskProfile: null,
    proposedModel: null,
    customAllocations: null,
    analytics: { current: null, proposed: null },
    taxTransition: null,
    feeAnalysis: null,
    stressTests: [],
    sections: [...DEFAULT_PROPOSAL_SECTIONS],
    templateId: 'tmpl-standard-v2',
    ipsGenerated: false,
    regBIGenerated: false,
    status: 'DRAFT',
    wizardStep: 1,
    createdAt: '2026-02-25T10:30:00.000Z',
    updatedAt: '2026-02-25T11:15:00.000Z',
    sentAt: null,
    tracking: null,
  },

  // -----------------------------------------------------------------
  // 2. SENT -- annual review, awaiting client response
  // -----------------------------------------------------------------
  {
    proposalId: 'prop-002-sent-nakamura',
    firmId: FIRM_ID,
    advisorId: ADVISOR_ID,
    clientId: 'cli-002-nakamura',
    clientName: 'Kenji Nakamura',
    proposalType: 'ACCOUNT_REVIEW',
    occasion: 'ANNUAL_REVIEW',
    assetsInScope: cents(3200000),
    relationshipTier: 'HNW',
    notes: 'Annual review for long-standing client. Considering rebalancing toward lower-risk allocation as he approaches age 62.',
    currentPortfolio: null,
    riskProfile: null,
    proposedModel: null,
    customAllocations: null,
    analytics: { current: null, proposed: null },
    taxTransition: null,
    feeAnalysis: null,
    stressTests: [],
    sections: [...DEFAULT_PROPOSAL_SECTIONS],
    templateId: 'tmpl-standard-v2',
    ipsGenerated: true,
    regBIGenerated: true,
    status: 'SENT',
    wizardStep: 6,
    createdAt: '2026-02-10T14:00:00.000Z',
    updatedAt: '2026-02-18T09:30:00.000Z',
    sentAt: '2026-02-18T09:30:00.000Z',
    tracking: {
      sentAt: '2026-02-18T09:30:00.000Z',
      sentTo: ['kenji.nakamura@email.com'],
      deliveryMethod: 'EMAIL',
      opens: [],
      firstOpenedAt: null,
      totalOpenCount: 0,
      mostViewedSection: null,
      outcome: 'PENDING',
      outcomeDate: null,
      aumWon: null,
      declineReason: null,
    },
  },

  // -----------------------------------------------------------------
  // 3. VIEWED -- asset transfer, client has opened the proposal
  // -----------------------------------------------------------------
  {
    proposalId: 'prop-003-viewed-chen-zhao',
    firmId: FIRM_ID,
    advisorId: ADVISOR_ID,
    clientId: 'cli-003-chen-zhao',
    clientName: 'Dr. Mei Chen & David Zhao',
    proposalType: 'ASSET_TRANSFER',
    occasion: 'FOLLOW_UP',
    assetsInScope: cents(5800000),
    relationshipTier: 'VHNW',
    notes: 'High-earning dual-physician household. Consolidating accounts from UBS and Goldman Sachs. Interested in tax-efficient strategies.',
    currentPortfolio: null,
    riskProfile: null,
    proposedModel: null,
    customAllocations: null,
    analytics: { current: null, proposed: null },
    taxTransition: null,
    feeAnalysis: null,
    stressTests: [],
    sections: [...DEFAULT_PROPOSAL_SECTIONS],
    templateId: 'tmpl-premium-v1',
    ipsGenerated: true,
    regBIGenerated: true,
    status: 'VIEWED',
    wizardStep: 6,
    createdAt: '2026-02-01T08:45:00.000Z',
    updatedAt: '2026-02-14T16:20:00.000Z',
    sentAt: '2026-02-14T16:20:00.000Z',
    tracking: {
      sentAt: '2026-02-14T16:20:00.000Z',
      sentTo: ['mei.chen@hospital.org', 'david.zhao@email.com'],
      deliveryMethod: 'EMAIL',
      opens: [
        { openedAt: '2026-02-15T07:12:00.000Z', durationMs: 420000, pagesViewed: [0, 1, 2, 3, 4, 5] },
        { openedAt: '2026-02-17T20:45:00.000Z', durationMs: 780000, pagesViewed: [0, 5, 6, 7, 8, 9, 10] },
        { openedAt: '2026-02-20T12:30:00.000Z', durationMs: 300000, pagesViewed: [6, 7, 9] },
      ],
      firstOpenedAt: '2026-02-15T07:12:00.000Z',
      totalOpenCount: 3,
      mostViewedSection: 'proposed_portfolio',
      outcome: 'MEETING_SCHEDULED',
      outcomeDate: '2026-02-21T10:00:00.000Z',
      aumWon: null,
      declineReason: null,
    },
  },

  // -----------------------------------------------------------------
  // 4. ACCEPTED -- Roth conversion, won AUM
  // -----------------------------------------------------------------
  {
    proposalId: 'prop-004-accepted-okonkwo',
    firmId: FIRM_ID,
    advisorId: ADVISOR_ID,
    clientId: 'cli-004-okonkwo',
    clientName: 'Chinwe Okonkwo',
    proposalType: 'ROTH_CONVERSION',
    occasion: 'PROACTIVE_OUTREACH',
    assetsInScope: cents(890000),
    relationshipTier: 'MASS_AFFLUENT',
    notes: 'Recently sold startup equity. Significant one-time income event makes partial Roth conversion attractive this tax year.',
    currentPortfolio: null,
    riskProfile: null,
    proposedModel: null,
    customAllocations: null,
    analytics: { current: null, proposed: null },
    taxTransition: null,
    feeAnalysis: null,
    stressTests: [],
    sections: [...DEFAULT_PROPOSAL_SECTIONS],
    templateId: 'tmpl-standard-v2',
    ipsGenerated: true,
    regBIGenerated: true,
    status: 'ACCEPTED',
    wizardStep: 6,
    createdAt: '2026-01-15T11:00:00.000Z',
    updatedAt: '2026-02-05T14:45:00.000Z',
    sentAt: '2026-01-20T09:00:00.000Z',
    tracking: {
      sentAt: '2026-01-20T09:00:00.000Z',
      sentTo: ['chinwe.okonkwo@email.com'],
      deliveryMethod: 'PORTAL_UPLOAD',
      opens: [
        { openedAt: '2026-01-20T18:30:00.000Z', durationMs: 540000, pagesViewed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { openedAt: '2026-01-25T10:15:00.000Z', durationMs: 360000, pagesViewed: [0, 6, 7, 10, 11] },
      ],
      firstOpenedAt: '2026-01-20T18:30:00.000Z',
      totalOpenCount: 2,
      mostViewedSection: 'tax_transition',
      outcome: 'ACCEPTED',
      outcomeDate: '2026-02-05T14:45:00.000Z',
      aumWon: cents(890000),
      declineReason: null,
    },
  },

  // -----------------------------------------------------------------
  // 5. DECLINED -- specific goal proposal, client chose competitor
  // -----------------------------------------------------------------
  {
    proposalId: 'prop-005-declined-martinez',
    firmId: FIRM_ID,
    advisorId: ADVISOR_ID,
    clientId: 'cli-005-martinez',
    clientName: 'Roberto & Elena Martinez',
    proposalType: 'SPECIFIC_GOAL',
    occasion: 'CLIENT_INQUIRY',
    assetsInScope: cents(2100000),
    relationshipTier: 'HNW',
    notes: 'Funding a family foundation and 529 plans for three grandchildren. Wanted ESG-aligned growth with income distributions.',
    currentPortfolio: null,
    riskProfile: null,
    proposedModel: null,
    customAllocations: null,
    analytics: { current: null, proposed: null },
    taxTransition: null,
    feeAnalysis: null,
    stressTests: [],
    sections: [...DEFAULT_PROPOSAL_SECTIONS],
    templateId: 'tmpl-standard-v2',
    ipsGenerated: true,
    regBIGenerated: true,
    status: 'DECLINED',
    wizardStep: 6,
    createdAt: '2025-12-20T13:00:00.000Z',
    updatedAt: '2026-01-28T10:30:00.000Z',
    sentAt: '2026-01-05T08:15:00.000Z',
    tracking: {
      sentAt: '2026-01-05T08:15:00.000Z',
      sentTo: ['roberto.martinez@email.com', 'elena.martinez@email.com'],
      deliveryMethod: 'EMAIL',
      opens: [
        { openedAt: '2026-01-05T19:00:00.000Z', durationMs: 180000, pagesViewed: [0, 1, 2, 3] },
      ],
      firstOpenedAt: '2026-01-05T19:00:00.000Z',
      totalOpenCount: 1,
      mostViewedSection: 'executive_summary',
      outcome: 'DECLINED',
      outcomeDate: '2026-01-28T10:30:00.000Z',
      aumWon: null,
      declineReason: 'Chose a competing firm offering lower advisory fees and direct indexing.',
    },
  },
];

// Seed the store on module load
for (const proposal of seedProposals) {
  store.set(proposal.proposalId, proposal);
  if (proposal.tracking) {
    trackingStore.set(proposal.proposalId, proposal.tracking);
  }
}

// =====================================================================
// CRUD Functions
// =====================================================================

/**
 * Returns all proposals in the store.
 */
export function getAllProposals(): Proposal[] {
  return Array.from(store.values());
}

/**
 * Finds a single proposal by its unique identifier.
 *
 * @param id - The `proposalId` to search for.
 * @returns The matching `Proposal`, or `undefined` if not found.
 */
export function getProposalById(id: string): Proposal | undefined {
  return store.get(id);
}

/**
 * Creates a new proposal in the store.
 * The proposal's `proposalId` is used as the key.
 *
 * @param proposal - The full `Proposal` object to insert.
 * @returns The created proposal.
 */
export function createProposal(proposal: Proposal): Proposal {
  store.set(proposal.proposalId, proposal);
  return proposal;
}

/**
 * Updates an existing proposal with a partial set of fields.
 * Merges the provided updates into the existing proposal and
 * sets `updatedAt` to the current timestamp.
 *
 * @param id - The `proposalId` of the proposal to update.
 * @param updates - A partial `Proposal` containing only the fields to change.
 * @returns The updated `Proposal`, or `undefined` if not found.
 */
export function updateProposal(
  id: string,
  updates: Partial<Proposal>,
): Proposal | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;

  const updated: Proposal = {
    ...existing,
    ...updates,
    proposalId: existing.proposalId, // Prevent ID mutation
    updatedAt: new Date().toISOString(),
  };

  store.set(id, updated);
  return updated;
}

/**
 * Deletes a proposal from the store.
 *
 * @param id - The `proposalId` of the proposal to delete.
 * @returns `true` if the proposal existed and was deleted, `false` otherwise.
 */
export function deleteProposal(id: string): boolean {
  return store.delete(id);
}

// =====================================================================
// Query Helpers
// =====================================================================

/**
 * Returns all proposals belonging to a specific advisor.
 *
 * @param advisorId - The advisor's unique identifier.
 * @returns An array of proposals sorted by most recently updated.
 */
export function getProposalsByAdvisor(advisorId: string): Proposal[] {
  return Array.from(store.values())
    .filter((p) => p.advisorId === advisorId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Returns all proposals for a specific client.
 *
 * @param clientId - The client's unique identifier.
 * @returns An array of proposals sorted by most recently updated.
 */
export function getProposalsByClient(clientId: string): Proposal[] {
  return Array.from(store.values())
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Computes aggregate dashboard statistics across all proposals
 * in the store.
 *
 * @returns An object with `totalCreated90Days`, `totalSent`,
 *          `conversionRate`, and `aumWon`.
 */
export function getDashboardStats(): {
  totalCreated90Days: number;
  totalSent: number;
  conversionRate: number;
  aumWon: number;
} {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  let totalCreated90Days = 0;
  let totalSent = 0;
  let accepted = 0;
  let aumWon = 0;

  for (const p of store.values()) {
    if (new Date(p.createdAt) >= ninetyDaysAgo) {
      totalCreated90Days++;
    }

    if (p.sentAt) {
      totalSent++;
    }

    if (p.status === 'ACCEPTED' && p.tracking) {
      accepted++;
      aumWon += p.tracking.aumWon
        ? (p.tracking.aumWon as number)
        : (p.assetsInScope as number);
    }
  }

  return {
    totalCreated90Days,
    totalSent,
    conversionRate: totalSent > 0
      ? Math.round((accepted / totalSent) * 10000) / 10000
      : 0,
    aumWon,
  };
}

// =====================================================================
// List / Filter
// =====================================================================

/**
 * Lists proposals for a firm with optional filters.
 */
export function listProposals(
  firmId: string,
  filters?: { status?: string; type?: string; q?: string },
): Proposal[] {
  let results = Array.from(store.values()).filter((p) => p.firmId === firmId);

  if (filters?.status) {
    results = results.filter((p) => p.status === filters.status);
  }
  if (filters?.type) {
    results = results.filter((p) => p.proposalType === filters.type);
  }
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    results = results.filter(
      (p) =>
        p.clientName.toLowerCase().includes(q) ||
        p.proposalId.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q),
    );
  }

  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// =====================================================================
// Risk Profile Store
// =====================================================================

export function getRiskProfile(proposalId: string): FartherRiskProfile | undefined {
  return riskProfileStore.get(proposalId);
}

export function setRiskProfile(proposalId: string, profile: FartherRiskProfile): void {
  riskProfileStore.set(proposalId, profile);
}

// =====================================================================
// Analytics Store
// =====================================================================

export function getAnalytics(proposalId: string): { current: PortfolioAnalytics | null; proposed: PortfolioAnalytics | null } | undefined {
  return analyticsStore.get(proposalId);
}

export function setAnalytics(proposalId: string, analytics: { current: PortfolioAnalytics | null; proposed: PortfolioAnalytics | null }): void {
  analyticsStore.set(proposalId, analytics);
}

// =====================================================================
// Tracking Store
// =====================================================================

export function getTracking(proposalId: string): ProposalTracking | undefined {
  return trackingStore.get(proposalId);
}

export function setTracking(proposalId: string, tracking: ProposalTracking): void {
  trackingStore.set(proposalId, tracking);
}

// =====================================================================
// Scan Result Store
// =====================================================================

export function addScanResult(proposalId: string, result: StatementScanResult): void {
  const existing = scanResultStore.get(proposalId) ?? [];
  existing.push(result);
  scanResultStore.set(proposalId, existing);
}

export function getScanResults(proposalId: string): StatementScanResult[] {
  return scanResultStore.get(proposalId) ?? [];
}

// =====================================================================
// Backward-Compatible Singleton
// =====================================================================

/**
 * Object facade that mirrors the old class-based `ProposalStore` API.
 * Existing route handlers import `proposalStore` as a singleton;
 * this adapter delegates to the standalone CRUD functions above.
 */
export const proposalStore = {
  /** @deprecated Use `createProposal()`. */
  createProposal,
  /** Alias -- upsertProposal delegates to createProposal (insert-or-replace). */
  upsertProposal: createProposal,
  /** @deprecated Use `getProposalById()`. */
  getProposal: getProposalById,
  /** @deprecated Use `updateProposal()`. */
  updateProposal,
  /** @deprecated Use `deleteProposal()`. */
  deleteProposal,
  /** @deprecated Use `getAllProposals()`. */
  getAllProposals,
  /** @deprecated Use `getProposalsByAdvisor()`. */
  getProposalsByAdvisor,
  /** @deprecated Use `getProposalsByClient()`. */
  getProposalsByClient,
  /** @deprecated Use `getDashboardStats()`. */
  getDashboardStats,
  /** List proposals for a firm with optional filters. */
  listProposals,
  /** Risk profile store operations. */
  getRiskProfile,
  setRiskProfile,
  /** Analytics store operations. */
  getAnalytics,
  setAnalytics,
  /** Tracking store operations. */
  getTracking,
  setTracking,
  /** Scan result store operations. */
  addScanResult,
  getScanResults,
} as const;
