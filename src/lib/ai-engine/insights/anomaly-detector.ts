// ==================== ANOMALY DETECTOR ====================
// Compares current plan snapshots against previous snapshots to detect
// significant changes that may warrant advisor attention.

import type {
  PlanSnapshot,
  AnomalyResult,
  AlertSeverity,
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

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / Math.abs(previous);
}

function severityFromChange(changePct: number, thresholds: { low: number; medium: number; high: number }): AlertSeverity {
  const abs = Math.abs(changePct);
  if (abs >= thresholds.high) return 'high';
  if (abs >= thresholds.medium) return 'medium';
  if (abs >= thresholds.low) return 'low';
  return 'info';
}

// ---------------------------------------------------------------------------
// Individual anomaly checks
// ---------------------------------------------------------------------------

/**
 * Check for large balance changes in total portfolio or individual accounts.
 * Threshold: >10% change triggers detection.
 */
function checkBalanceChanges(
  current: PlanSnapshot,
  previous: PlanSnapshot,
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  // Total portfolio check
  const totalChange = pctChange(current.totalPortfolioValue, previous.totalPortfolioValue);
  if (Math.abs(totalChange) > 0.10) {
    const direction = totalChange > 0 ? 'increased' : 'decreased';
    anomalies.push({
      anomalyType: 'balance_change',
      severity: severityFromChange(totalChange, { low: 0.10, medium: 0.20, high: 0.30 }),
      title: `Total Portfolio ${direction} ${(Math.abs(totalChange) * 100).toFixed(1)}%`,
      description: `Total portfolio value has ${direction} from ${formatCurrency(previous.totalPortfolioValue)} to ${formatCurrency(current.totalPortfolioValue)}, a change of ${formatCurrency(current.totalPortfolioValue - previous.totalPortfolioValue)}. This ${Math.abs(totalChange) > 0.20 ? 'significant' : 'notable'} movement may reflect market conditions, large deposits/withdrawals, or transfers.`,
      metric: 'totalPortfolioValue',
      previousValue: previous.totalPortfolioValue,
      currentValue: current.totalPortfolioValue,
      changePercent: totalChange * 100,
      requiresAttention: Math.abs(totalChange) > 0.15,
    });
  }

  // Individual account checks
  const allAccountIds = Array.from(new Set([
    ...Object.keys(current.accountBalances),
    ...Object.keys(previous.accountBalances),
  ]));

  for (const accountId of allAccountIds) {
    const currentBalance = current.accountBalances[accountId] ?? 0;
    const previousBalance = previous.accountBalances[accountId] ?? 0;

    // Skip small accounts (< $10k)
    if (previousBalance < 10_000 && currentBalance < 10_000) continue;

    const change = pctChange(currentBalance, previousBalance);
    if (Math.abs(change) > 0.15) {
      const direction = change > 0 ? 'increased' : 'decreased';
      anomalies.push({
        anomalyType: 'balance_change',
        severity: severityFromChange(change, { low: 0.15, medium: 0.25, high: 0.40 }),
        title: `Account ${accountId} balance ${direction} ${(Math.abs(change) * 100).toFixed(1)}%`,
        description: `Account ${accountId} has ${direction} from ${formatCurrency(previousBalance)} to ${formatCurrency(currentBalance)}. This should be verified as an expected transaction or investigated further.`,
        metric: `accountBalance.${accountId}`,
        previousValue: previousBalance,
        currentValue: currentBalance,
        changePercent: change * 100,
        requiresAttention: Math.abs(change) > 0.25,
      });
    }
  }

  return anomalies;
}

/**
 * Check for income divergence from projection.
 * Compares actual income to projected income.
 */
function checkIncomeDivergence(
  current: PlanSnapshot,
  previous: PlanSnapshot,
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  // Compare current annual income to projected
  if (current.projectedIncome > 0) {
    const divergence = pctChange(current.annualIncome, current.projectedIncome);
    if (Math.abs(divergence) > 0.10) {
      const direction = divergence > 0 ? 'higher' : 'lower';
      anomalies.push({
        anomalyType: 'income_divergence',
        severity: severityFromChange(divergence, { low: 0.10, medium: 0.20, high: 0.35 }),
        title: `Income ${(Math.abs(divergence) * 100).toFixed(1)}% ${direction} than projected`,
        description: `Actual annual income of ${formatCurrency(current.annualIncome)} is ${(Math.abs(divergence) * 100).toFixed(1)}% ${direction} than the projected ${formatCurrency(current.projectedIncome)}. This divergence may affect tax planning, contribution capacity, and long-term projections.`,
        metric: 'annualIncome',
        previousValue: current.projectedIncome,
        currentValue: current.annualIncome,
        changePercent: divergence * 100,
        requiresAttention: Math.abs(divergence) > 0.20,
      });
    }
  }

  // Compare income year-over-year
  const yoyIncomeChange = pctChange(current.annualIncome, previous.annualIncome);
  if (Math.abs(yoyIncomeChange) > 0.15 && previous.annualIncome > 0) {
    const direction = yoyIncomeChange > 0 ? 'increased' : 'decreased';
    anomalies.push({
      anomalyType: 'income_divergence',
      severity: severityFromChange(yoyIncomeChange, { low: 0.15, medium: 0.25, high: 0.40 }),
      title: `Year-over-year income ${direction} ${(Math.abs(yoyIncomeChange) * 100).toFixed(1)}%`,
      description: `Annual income has ${direction} from ${formatCurrency(previous.annualIncome)} to ${formatCurrency(current.annualIncome)}. Significant income changes require plan re-projection to ensure retirement readiness and tax strategy remain appropriate.`,
      metric: 'annualIncome_yoy',
      previousValue: previous.annualIncome,
      currentValue: current.annualIncome,
      changePercent: yoyIncomeChange * 100,
      requiresAttention: Math.abs(yoyIncomeChange) > 0.25,
    });
  }

  return anomalies;
}

/**
 * Check for expense spikes.
 * Compares current expenses to previous period and projections.
 */
function checkExpenseSpikes(
  current: PlanSnapshot,
  previous: PlanSnapshot,
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  // Year-over-year expense comparison
  if (previous.annualExpenses > 0) {
    const expenseChange = pctChange(current.annualExpenses, previous.annualExpenses);
    if (expenseChange > 0.12) {
      anomalies.push({
        anomalyType: 'expense_spike',
        severity: severityFromChange(expenseChange, { low: 0.12, medium: 0.25, high: 0.40 }),
        title: `Expenses spiked ${(expenseChange * 100).toFixed(1)}% year-over-year`,
        description: `Annual expenses have increased from ${formatCurrency(previous.annualExpenses)} to ${formatCurrency(current.annualExpenses)}, a ${(expenseChange * 100).toFixed(1)}% jump. If this increase is ongoing rather than one-time, it could significantly impact long-term plan sustainability.`,
        metric: 'annualExpenses',
        previousValue: previous.annualExpenses,
        currentValue: current.annualExpenses,
        changePercent: expenseChange * 100,
        requiresAttention: expenseChange > 0.20,
      });
    }
  }

  // Expense vs. projection comparison
  if (current.projectedExpenses > 0) {
    const projDivergence = pctChange(current.annualExpenses, current.projectedExpenses);
    if (projDivergence > 0.15) {
      anomalies.push({
        anomalyType: 'expense_spike',
        severity: severityFromChange(projDivergence, { low: 0.15, medium: 0.25, high: 0.40 }),
        title: `Expenses ${(projDivergence * 100).toFixed(1)}% above projection`,
        description: `Actual expenses of ${formatCurrency(current.annualExpenses)} are ${(projDivergence * 100).toFixed(1)}% higher than the projected ${formatCurrency(current.projectedExpenses)}. Review whether this reflects a permanent lifestyle change or a one-time event.`,
        metric: 'annualExpenses_vs_projection',
        previousValue: current.projectedExpenses,
        currentValue: current.annualExpenses,
        changePercent: projDivergence * 100,
        requiresAttention: projDivergence > 0.25,
      });
    }
  }

  return anomalies;
}

/**
 * Check for sudden shifts in asset allocation.
 * Detects drift in equity, bond, cash, or alternative percentages.
 */
function checkAllocationShifts(
  current: PlanSnapshot,
  previous: PlanSnapshot,
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const assetClasses: Array<{ key: keyof PlanSnapshot['allocation']; label: string }> = [
    { key: 'equity', label: 'Equity' },
    { key: 'bond', label: 'Fixed Income' },
    { key: 'cash', label: 'Cash' },
    { key: 'alternative', label: 'Alternative' },
  ];

  for (const { key, label } of assetClasses) {
    const currentPct = current.allocation[key];
    const previousPct = previous.allocation[key];
    const drift = currentPct - previousPct; // absolute percentage point change

    // Alert on >5 percentage point shift
    if (Math.abs(drift) > 5) {
      const direction = drift > 0 ? 'increased' : 'decreased';
      const severity: AlertSeverity = Math.abs(drift) > 15 ? 'high' : Math.abs(drift) > 10 ? 'medium' : 'low';

      anomalies.push({
        anomalyType: 'allocation_shift',
        severity,
        title: `${label} allocation ${direction} by ${Math.abs(drift).toFixed(1)} percentage points`,
        description: `The ${label.toLowerCase()} allocation has shifted from ${previousPct.toFixed(1)}% to ${currentPct.toFixed(1)}%, a ${Math.abs(drift).toFixed(1)} percentage point ${direction.slice(0, -1)}. This may be due to market movements, rebalancing, or manual trades. Verify this aligns with the target allocation and risk tolerance.`,
        metric: `allocation.${key}`,
        previousValue: previousPct,
        currentValue: currentPct,
        changePercent: previousPct > 0 ? (drift / previousPct) * 100 : drift * 100,
        requiresAttention: Math.abs(drift) > 10,
      });
    }
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Detects anomalies by comparing current plan data to a previous snapshot.
 *
 * Anomaly categories detected:
 * - **Balance changes**: >10% change in total portfolio or >15% in individual accounts
 * - **Income divergence**: >10% divergence from projection or >15% year-over-year
 * - **Expense spikes**: >12% increase year-over-year or >15% above projection
 * - **Allocation shifts**: >5 percentage point change in any asset class
 *
 * @param currentData - Current plan snapshot
 * @param previousData - Previous plan snapshot for comparison
 * @returns Array of detected anomalies, sorted by severity
 *
 * @example
 * ```ts
 * const anomalies = detectAnomalies(currentSnapshot, lastQuarterSnapshot);
 * const urgent = anomalies.filter(a => a.requiresAttention);
 * ```
 */
export function detectAnomalies(
  currentData: PlanSnapshot,
  previousData: PlanSnapshot,
): AnomalyResult[] {
  const allAnomalies: AnomalyResult[] = [
    ...checkBalanceChanges(currentData, previousData),
    ...checkIncomeDivergence(currentData, previousData),
    ...checkExpenseSpikes(currentData, previousData),
    ...checkAllocationShifts(currentData, previousData),
  ];

  // Sort by severity, then by absolute change percentage
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  allAnomalies.sort((a, b) => {
    const severityDiff = (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    if (severityDiff !== 0) return severityDiff;
    return Math.abs(b.changePercent) - Math.abs(a.changePercent);
  });

  return allAnomalies;
}
