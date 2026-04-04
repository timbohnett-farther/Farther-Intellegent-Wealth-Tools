/**
 * @file alternatives-support.ts
 * Manual entry and tracking for alternative investments that lack standard market data.
 *
 * Handles private equity, real estate, hedge funds, private credit, and other illiquid assets
 * with custom valuation tracking, capital call management, and performance metrics (IRR, TVPI, DPI).
 */

import type { Holding, AssetClass, AccountType, MoneyCents } from '@/lib/proposal-engine/types';

// ============================================================================
// Types
// ============================================================================

export interface AlternativeInvestment {
  investmentId: string;
  name: string;
  category:
    | 'PRIVATE_EQUITY'
    | 'REAL_ESTATE'
    | 'HEDGE_FUND'
    | 'PRIVATE_CREDIT'
    | 'VENTURE_CAPITAL'
    | 'INFRASTRUCTURE'
    | 'COMMODITIES_PHYSICAL'
    | 'COLLECTIBLES'
    | 'OTHER';
  subcategory?: string;
  fundManager?: string;
  vintageYear?: number;
  commitmentAmount: MoneyCents; // Total commitment made
  calledCapital: MoneyCents; // Capital actually called/invested
  currentNav: MoneyCents; // Net asset value as of last valuation
  distributions: MoneyCents; // Total distributions received to date
  unfundedCommitment: MoneyCents; // Remaining capital commitment not yet called
  irr?: number; // Internal rate of return (decimal, e.g., 0.15 = 15%)
  tvpi?: number; // Total Value to Paid-In multiple (e.g., 1.5x)
  dpi?: number; // Distributions to Paid-In multiple
  lastValuationDate: string; // ISO date
  liquidityProfile:
    | 'LOCKED'
    | 'QUARTERLY_REDEMPTION'
    | 'ANNUAL_REDEMPTION'
    | 'SEMI_LIQUID'
    | 'DAILY';
  lockupEndDate?: string; // ISO date
  managementFee: number; // decimal (e.g., 0.02 for 2%)
  performanceFee: number; // decimal (e.g., 0.20 for 20%)
  k1Expected: boolean; // Tax form expectation
  notes?: string;
  accountId?: string;
  accountType: string; // AccountType
}

export interface AlternativesPortfolio {
  investments: AlternativeInvestment[];
  totalNav: MoneyCents;
  totalCommitment: MoneyCents;
  totalUnfunded: MoneyCents;
  totalDistributions: MoneyCents;
  weightedIRR: number;
  weightedTVPI: number;
  categoryBreakdown: Array<{
    category: string;
    nav: MoneyCents;
    pct: number;
    count: number;
  }>;
  liquidityProfile: {
    locked: number;
    quarterly: number;
    annual: number;
    liquid: number;
  }; // percentages
  vintageDistribution: Array<{
    year: number;
    commitment: MoneyCents;
    nav: MoneyCents;
  }>;
}

// ============================================================================
// In-Memory Store
// ============================================================================

const alternativesStore = new Map<string, AlternativeInvestment>();

let investmentCounter = 0;

function generateInvestmentId(): string {
  investmentCounter += 1;
  return `alt-${Date.now()}-${investmentCounter}`;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Add a new alternative investment to the portfolio.
 */
export function addAlternativeInvestment(
  investment: Omit<AlternativeInvestment, 'investmentId'>
): AlternativeInvestment {
  const investmentId = generateInvestmentId();
  const record: AlternativeInvestment = { investmentId, ...investment };

  alternativesStore.set(investmentId, record);
  return record;
}

/**
 * Update an existing alternative investment.
 */
export function updateAlternativeInvestment(
  investmentId: string,
  updates: Partial<AlternativeInvestment>
): AlternativeInvestment | null {
  const existing = alternativesStore.get(investmentId);
  if (!existing) return null;

  const updated = { ...existing, ...updates, investmentId }; // preserve ID
  alternativesStore.set(investmentId, updated);
  return updated;
}

/**
 * Remove an alternative investment from the portfolio.
 */
export function removeAlternativeInvestment(investmentId: string): boolean {
  return alternativesStore.delete(investmentId);
}

/**
 * Get aggregated portfolio metrics for all alternative investments.
 */
export function getAlternativesPortfolio(accountFilter?: string): AlternativesPortfolio {
  const investments = Array.from(alternativesStore.values()).filter(
    (inv) => !accountFilter || inv.accountId === accountFilter
  );

  const totalNav = investments.reduce((sum, inv) => sum + inv.currentNav, 0) as MoneyCents;
  const totalCommitment = investments.reduce((sum, inv) => sum + inv.commitmentAmount, 0) as MoneyCents;
  const totalUnfunded = investments.reduce((sum, inv) => sum + inv.unfundedCommitment, 0) as MoneyCents;
  const totalDistributions = investments.reduce((sum, inv) => sum + inv.distributions, 0) as MoneyCents;

  // Weighted IRR (weighted by called capital)
  let weightedIRR = 0;
  const totalCalled = investments.reduce((sum, inv) => sum + inv.calledCapital, 0);
  if (totalCalled > 0) {
    weightedIRR = investments.reduce((sum, inv) => {
      const irr = inv.irr ?? 0;
      return sum + (irr * inv.calledCapital) / totalCalled;
    }, 0);
  }

  // Weighted TVPI (weighted by called capital)
  let weightedTVPI = 0;
  if (totalCalled > 0) {
    weightedTVPI = investments.reduce((sum, inv) => {
      const tvpi = inv.tvpi ?? 0;
      return sum + (tvpi * inv.calledCapital) / totalCalled;
    }, 0);
  }

  // Category breakdown
  const categoryMap = new Map<string, { nav: MoneyCents; count: number }>();
  investments.forEach((inv) => {
    const existing = categoryMap.get(inv.category) ?? { nav: 0 as MoneyCents, count: 0 };
    categoryMap.set(inv.category, {
      nav: (existing.nav + inv.currentNav) as MoneyCents,
      count: existing.count + 1,
    });
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    nav: data.nav,
    pct: totalNav > 0 ? data.nav / totalNav : 0,
    count: data.count,
  }));

  // Liquidity profile
  const liquidityCounts = {
    LOCKED: 0,
    QUARTERLY_REDEMPTION: 0,
    ANNUAL_REDEMPTION: 0,
    SEMI_LIQUID: 0,
    DAILY: 0,
  };

  investments.forEach((inv) => {
    liquidityCounts[inv.liquidityProfile] += 1;
  });

  const totalInvestments = investments.length || 1; // avoid divide by zero
  const liquidityProfile = {
    locked: liquidityCounts.LOCKED / totalInvestments,
    quarterly: liquidityCounts.QUARTERLY_REDEMPTION / totalInvestments,
    annual: liquidityCounts.ANNUAL_REDEMPTION / totalInvestments,
    liquid: (liquidityCounts.SEMI_LIQUID + liquidityCounts.DAILY) / totalInvestments,
  };

  // Vintage distribution
  const vintageMap = new Map<number, { commitment: MoneyCents; nav: MoneyCents }>();
  investments.forEach((inv) => {
    if (inv.vintageYear) {
      const existing = vintageMap.get(inv.vintageYear) ?? { commitment: 0 as MoneyCents, nav: 0 as MoneyCents };
      vintageMap.set(inv.vintageYear, {
        commitment: (existing.commitment + inv.commitmentAmount) as MoneyCents,
        nav: (existing.nav + inv.currentNav) as MoneyCents,
      });
    }
  });

  const vintageDistribution = Array.from(vintageMap.entries())
    .map(([year, data]) => ({ year, ...data }))
    .sort((a, b) => a.year - b.year);

  return {
    investments,
    totalNav,
    totalCommitment,
    totalUnfunded,
    totalDistributions,
    weightedIRR,
    weightedTVPI,
    categoryBreakdown,
    liquidityProfile,
    vintageDistribution,
  };
}

/**
 * Convert alternative investments to standard Holding[] format for portfolio integration.
 * Maps currentNav → marketValue, commitmentAmount → costBasis, category → AssetClass.
 */
export function convertToHoldings(investments: AlternativeInvestment[]): Holding[] {
  return investments.map((inv) => {
    const gain = inv.currentNav - inv.commitmentAmount;
    const gainPct = inv.commitmentAmount > 0 ? (gain / inv.commitmentAmount) * 100 : 0;

    return {
      ticker: inv.name,
      cusip: null,
      description: inv.name,
      assetClass: mapCategoryToAssetClass(inv.category),
      quantity: 1, // Alternatives are single-unit holdings
      price: inv.currentNav as MoneyCents, // Price per unit = NAV
      marketValue: inv.currentNav,
      costBasis: inv.commitmentAmount,
      unrealizedGain: gain as MoneyCents,
      gainPct,
      expenseRatio: null,
      dividendYield: null,
      holdingPeriod: null,
      accountType: inv.accountType as AccountType,
      accountName: inv.accountId ?? 'Alternative Investment Account',
    };
  });
}

/**
 * Calculate advanced metrics for a set of alternative investments.
 */
export function calculateAlternativesMetrics(investments: AlternativeInvestment[]) {
  const totalCommitment = investments.reduce((sum, inv) => sum + inv.commitmentAmount, 0) as MoneyCents;
  const totalNav = investments.reduce((sum, inv) => sum + inv.currentNav, 0) as MoneyCents;
  const totalCalled = investments.reduce((sum, inv) => sum + inv.calledCapital, 0);

  // Weighted IRR
  let weightedIRR = 0;
  if (totalCalled > 0) {
    weightedIRR = investments.reduce((sum, inv) => {
      const irr = inv.irr ?? 0;
      return sum + (irr * inv.calledCapital) / totalCalled;
    }, 0);
  }

  // Weighted TVPI
  let weightedTVPI = 0;
  if (totalCalled > 0) {
    weightedTVPI = investments.reduce((sum, inv) => {
      const tvpi = inv.tvpi ?? 0;
      return sum + (tvpi * inv.calledCapital) / totalCalled;
    }, 0);
  }

  // Pace of deployment: called capital / commitment
  const paceOfDeployment = totalCommitment > 0 ? totalCalled / totalCommitment : 0;

  // Estimated J-Curve position (simplified heuristic)
  // Early stage (< 30% deployed) = early J-curve, 30-70% = mid, > 70% = mature
  let estimatedJCurvePosition: 'EARLY' | 'MID' | 'MATURE' = 'EARLY';
  if (paceOfDeployment > 0.7) {
    estimatedJCurvePosition = 'MATURE';
  } else if (paceOfDeployment > 0.3) {
    estimatedJCurvePosition = 'MID';
  }

  return {
    totalCommitment,
    totalNav,
    weightedIRR,
    weightedTVPI,
    paceOfDeployment,
    estimatedJCurvePosition,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map alternative investment category to standard AssetClass.
 */
function mapCategoryToAssetClass(category: AlternativeInvestment['category']): AssetClass {
  switch (category) {
    case 'PRIVATE_EQUITY':
    case 'VENTURE_CAPITAL':
      return 'ALTERNATIVE_PE';
    case 'REAL_ESTATE':
      return 'ALTERNATIVES_REAL_ESTATE';
    case 'HEDGE_FUND':
      return 'ALTERNATIVE_HEDGE';
    case 'PRIVATE_CREDIT':
      return 'ALTERNATIVE_PRIVATE_CREDIT';
    case 'INFRASTRUCTURE':
    case 'COMMODITIES_PHYSICAL':
      return 'ALTERNATIVES_COMMODITIES';
    case 'COLLECTIBLES':
    case 'OTHER':
    default:
      return 'ALTERNATIVES_OTHER';
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Import multiple alternative investments at once.
 */
export function bulkAddAlternatives(
  investments: Array<Omit<AlternativeInvestment, 'investmentId'>>
): AlternativeInvestment[] {
  return investments.map(addAlternativeInvestment);
}

/**
 * Get all alternative investments.
 */
export function getAllAlternatives(): AlternativeInvestment[] {
  return Array.from(alternativesStore.values());
}

/**
 * Clear all alternative investments (useful for testing).
 */
export function clearAlternatives(): void {
  alternativesStore.clear();
  investmentCounter = 0;
}
