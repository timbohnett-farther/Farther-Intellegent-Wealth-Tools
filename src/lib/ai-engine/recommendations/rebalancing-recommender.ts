// ==================== REBALANCING RECOMMENDER ====================
// Detects allocation drift across accounts and suggests tax-efficient
// rebalancing trades that minimize capital gains realization.

import type {
  RebalancingInput,
  RebalancingRecommendation,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

type AssetClass = 'equity' | 'bond' | 'cash' | 'alternative';
const ASSET_CLASSES: AssetClass[] = ['equity', 'bond', 'cash', 'alternative'];

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  equity: 'Equity',
  bond: 'Fixed Income',
  cash: 'Cash',
  alternative: 'Alternative',
};

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Analyzes portfolio allocation drift and recommends tax-efficient rebalancing trades.
 *
 * The recommender:
 * 1. Calculates the aggregate allocation across all accounts
 * 2. Identifies asset classes that have drifted beyond the tolerance threshold
 * 3. Prioritizes rebalancing in tax-advantaged accounts to minimize tax impact
 * 4. For taxable accounts, considers unrealized gains and tax cost of selling
 * 5. Generates specific trade suggestions with dollar amounts
 *
 * @param input - Account holdings, target allocation, and tax parameters
 * @returns RebalancingRecommendation with drift analysis and suggested trades
 *
 * @example
 * ```ts
 * const rec = recommendRebalancing(input);
 * if (rec.needsRebalancing) {
 *   rec.suggestedTrades.forEach(t => console.log(`${t.action} ${t.amount} in ${t.accountName}`));
 * }
 * ```
 */
export function recommendRebalancing(input: RebalancingInput): RebalancingRecommendation {
  const { accounts, targetAllocation, driftTolerance, marginalTaxRate, ltcgRate } = input;

  // ── Step 1: Calculate aggregate allocation ─────────────────────────────
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  if (totalBalance <= 0) {
    return {
      needsRebalancing: false,
      currentAllocation: { equity: 0, bond: 0, cash: 0, alternative: 0 },
      driftAnalysis: ASSET_CLASSES.map(ac => ({
        assetClass: ASSET_CLASS_LABELS[ac],
        currentPct: 0,
        targetPct: targetAllocation[ac],
        driftPct: -targetAllocation[ac],
        exceedsTolerance: false,
      })),
      suggestedTrades: [],
      estimatedTaxCost: 0,
      summary: 'No portfolio balance to rebalance.',
    };
  }

  const currentAllocation: Record<AssetClass, number> = {
    equity: 0,
    bond: 0,
    cash: 0,
    alternative: 0,
  };

  for (const account of accounts) {
    for (const ac of ASSET_CLASSES) {
      currentAllocation[ac] += account.balance * (account.allocation[ac] / 100);
    }
  }

  // Convert to percentages
  const currentAllocationPct: Record<AssetClass, number> = {
    equity: (currentAllocation.equity / totalBalance) * 100,
    bond: (currentAllocation.bond / totalBalance) * 100,
    cash: (currentAllocation.cash / totalBalance) * 100,
    alternative: (currentAllocation.alternative / totalBalance) * 100,
  };

  // ── Step 2: Drift analysis ─────────────────────────────────────────────
  const driftAnalysis = ASSET_CLASSES.map(ac => {
    const drift = currentAllocationPct[ac] - targetAllocation[ac];
    return {
      assetClass: ASSET_CLASS_LABELS[ac],
      currentPct: Math.round(currentAllocationPct[ac] * 100) / 100,
      targetPct: targetAllocation[ac],
      driftPct: Math.round(drift * 100) / 100,
      exceedsTolerance: Math.abs(drift) > driftTolerance,
    };
  });

  const anyDriftExceeded = driftAnalysis.some(d => d.exceedsTolerance);

  if (!anyDriftExceeded) {
    return {
      needsRebalancing: false,
      currentAllocation: {
        equity: currentAllocationPct.equity,
        bond: currentAllocationPct.bond,
        cash: currentAllocationPct.cash,
        alternative: currentAllocationPct.alternative,
      },
      driftAnalysis,
      suggestedTrades: [],
      estimatedTaxCost: 0,
      summary: `Portfolio is within the ${driftTolerance} percentage point drift tolerance. No rebalancing needed at this time.`,
    };
  }

  // ── Step 3: Calculate target dollar amounts for each asset class ───────
  const targetDollars: Record<AssetClass, number> = {
    equity: totalBalance * (targetAllocation.equity / 100),
    bond: totalBalance * (targetAllocation.bond / 100),
    cash: totalBalance * (targetAllocation.cash / 100),
    alternative: totalBalance * (targetAllocation.alternative / 100),
  };

  // Net change needed per asset class (positive = need to buy, negative = need to sell)
  const netChange: Record<AssetClass, number> = {
    equity: targetDollars.equity - currentAllocation.equity,
    bond: targetDollars.bond - currentAllocation.bond,
    cash: targetDollars.cash - currentAllocation.cash,
    alternative: targetDollars.alternative - currentAllocation.alternative,
  };

  // ── Step 4: Generate tax-efficient trade suggestions ───────────────────
  // Priority: rebalance in tax-deferred > tax-free > taxable
  const suggestedTrades: RebalancingRecommendation['suggestedTrades'] = [];
  let estimatedTaxCost = 0;

  // Sort accounts by tax efficiency for rebalancing
  const accountPriority: Record<string, number> = {
    tax_deferred: 0, // Best: no immediate tax impact
    tax_free: 1,     // Good: no tax impact ever
    taxable: 2,      // Worst: may trigger capital gains
  };

  const sortedAccounts = [...accounts].sort(
    (a, b) => (accountPriority[a.accountType] ?? 2) - (accountPriority[b.accountType] ?? 2)
  );

  // Track remaining adjustments needed
  const remainingChange = { ...netChange };

  for (const account of sortedAccounts) {
    if (account.balance <= 0) continue;

    for (const ac of ASSET_CLASSES) {
      if (Math.abs(remainingChange[ac]) < 100) continue; // Skip tiny adjustments

      const currentInAccount = account.balance * (account.allocation[ac] / 100);
      const targetInAccount = account.balance * (targetAllocation[ac] / 100);

      // How much can we adjust in this account?
      let adjustmentAmount: number;
      if (remainingChange[ac] > 0) {
        // Need to buy — can we sell other asset classes in this account to fund it?
        adjustmentAmount = Math.min(remainingChange[ac], account.balance - currentInAccount);
        if (adjustmentAmount < 100) continue;

        suggestedTrades.push({
          accountId: account.accountId,
          accountName: account.accountName,
          assetClass: ASSET_CLASS_LABELS[ac],
          action: 'buy',
          amount: Math.round(adjustmentAmount),
          taxImpact: 0,
          reasoning: `Increase ${ASSET_CLASS_LABELS[ac]} allocation in ${account.accountName} (${account.accountType}) by ${formatCurrency(adjustmentAmount)} to approach target.`,
        });

        remainingChange[ac] -= adjustmentAmount;
      } else if (remainingChange[ac] < 0) {
        // Need to sell
        adjustmentAmount = Math.min(Math.abs(remainingChange[ac]), currentInAccount);
        if (adjustmentAmount < 100) continue;

        // Calculate tax impact for taxable accounts
        let taxImpact = 0;
        if (account.accountType === 'taxable' && account.unrealizedGains > 0) {
          // Proportional gains realized
          const gainRatio = account.balance > 0 ? account.unrealizedGains / account.balance : 0;
          const gainsRealized = adjustmentAmount * gainRatio;
          taxImpact = gainsRealized * ltcgRate;
          estimatedTaxCost += taxImpact;
        }

        const reasoning = account.accountType === 'taxable' && taxImpact > 0
          ? `Sell ${formatCurrency(adjustmentAmount)} of ${ASSET_CLASS_LABELS[ac]} in ${account.accountName}. Estimated tax cost: ${formatCurrency(taxImpact)} on realized gains.`
          : `Sell ${formatCurrency(adjustmentAmount)} of ${ASSET_CLASS_LABELS[ac]} in ${account.accountName} (${account.accountType} — no immediate tax impact).`;

        suggestedTrades.push({
          accountId: account.accountId,
          accountName: account.accountName,
          assetClass: ASSET_CLASS_LABELS[ac],
          action: 'sell',
          amount: Math.round(adjustmentAmount),
          taxImpact: Math.round(taxImpact),
          reasoning,
        });

        remainingChange[ac] += adjustmentAmount;
      }
    }
  }

  // ── Step 5: Build summary ──────────────────────────────────────────────
  const driftedClasses = driftAnalysis
    .filter(d => d.exceedsTolerance)
    .map(d => `${d.assetClass} (${d.driftPct > 0 ? '+' : ''}${d.driftPct.toFixed(1)}pp)`)
    .join(', ');

  let summary = `Rebalancing recommended. The following asset classes exceed the ${driftTolerance}pp drift tolerance: ${driftedClasses}. `;
  summary += `${suggestedTrades.length} trades suggested across ${new Set(suggestedTrades.map(t => t.accountId)).size} account(s). `;

  if (estimatedTaxCost > 0) {
    summary += `Estimated tax cost: ${formatCurrency(estimatedTaxCost)}. `;
    summary += `Trades are prioritized in tax-advantaged accounts to minimize tax impact.`;
  } else {
    summary += `All trades can be executed in tax-advantaged accounts with no immediate tax impact.`;
  }

  return {
    needsRebalancing: true,
    currentAllocation: {
      equity: Math.round(currentAllocationPct.equity * 100) / 100,
      bond: Math.round(currentAllocationPct.bond * 100) / 100,
      cash: Math.round(currentAllocationPct.cash * 100) / 100,
      alternative: Math.round(currentAllocationPct.alternative * 100) / 100,
    },
    driftAnalysis,
    suggestedTrades,
    estimatedTaxCost: Math.round(estimatedTaxCost),
    summary,
  };
}
