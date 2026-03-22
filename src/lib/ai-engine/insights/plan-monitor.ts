// ==================== PLAN MONITORING ENGINE ====================
// Evaluates a comprehensive set of alert triggers against live plan data
// and collects fired alerts for advisor review.

import type {
  AlertTrigger,
  PlanAlert,
  PlanMonitorInput,
  PlanMonitorResult,
} from '../types';

// ---------------------------------------------------------------------------
// Helper: format currency for descriptions
// ---------------------------------------------------------------------------
function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function yearEnd(year: number): string {
  return `${year}-12-31`;
}

function monthsUntilAge(currentAge: number, targetAge: number): number {
  return Math.max(0, Math.round((targetAge - currentAge) * 12));
}

// ---------------------------------------------------------------------------
// ALERT TRIGGERS — 15 comprehensive financial planning rules
// ---------------------------------------------------------------------------

/**
 * The master list of alert triggers evaluated during each plan monitor run.
 * Each trigger encapsulates its own check logic, description generation,
 * impact estimation, and recommended action.
 */
export const ALERT_TRIGGERS: AlertTrigger[] = [
  // ── 1. Roth Conversion Window ──────────────────────────────────────────
  {
    id: 'roth_conversion_window',
    category: 'tax',
    severity: 'medium',
    title: 'Roth Conversion Window Open',
    checkCondition: (d) => {
      const yearsToRetirement = d.retirementYear - d.currentYear;
      const hasHeadroom = d.taxableIncome < d.agi * 0.85; // simplified headroom check
      const hasPretaxBalance = d.preTaxBalance > 50_000;
      return yearsToRetirement > 0 && yearsToRetirement <= 15 && hasHeadroom && hasPretaxBalance;
    },
    generateDescription: (d) => {
      const headroom = d.agi * 0.85 - d.taxableIncome;
      return `${d.clientName} has approximately ${formatCurrency(Math.max(0, headroom))} of bracket headroom available for Roth conversions this year. With ${formatCurrency(d.preTaxBalance)} in pre-tax accounts and ${d.retirementYear - d.currentYear} years to retirement, converting now at the current ${pct(d.marginalRate)} marginal rate could reduce future RMDs and overall lifetime taxes.`;
    },
    generateRecommendedAction: () =>
      'Run the Roth conversion optimizer to determine the ideal conversion amount that fills the current bracket without triggering IRMAA surcharges.',
    estimateImpact: (d) => {
      const headroom = Math.max(0, d.agi * 0.85 - d.taxableIncome);
      const conversionAmount = Math.min(headroom, d.preTaxBalance * 0.1);
      // Estimate: future tax rate assumed 5% higher, savings = conversionAmount * rate differential
      return conversionAmount * 0.05;
    },
    generateDeadline: (d) => yearEnd(d.currentYear),
    autoActionAvailable: false,
  },

  // ── 2. IRMAA Danger Zone ───────────────────────────────────────────────
  {
    id: 'irmaa_danger_zone',
    category: 'healthcare',
    severity: 'high',
    title: 'IRMAA Surcharge Danger Zone',
    checkCondition: (d) => {
      // IRMAA uses MAGI from 2 years ago; warn if current AGI is within 10% of threshold
      const proximity = d.agi / d.irmaaThreshold;
      return proximity >= 0.90 && d.clientAge >= 60;
    },
    generateDescription: (d) => {
      const gap = d.irmaaThreshold - d.agi;
      return gap > 0
        ? `${d.clientName}'s current AGI of ${formatCurrency(d.agi)} is only ${formatCurrency(gap)} below the IRMAA threshold of ${formatCurrency(d.irmaaThreshold)}. Any additional income (Roth conversions, capital gains, RMDs) could trigger Medicare premium surcharges in two years.`
        : `${d.clientName}'s current AGI of ${formatCurrency(d.agi)} exceeds the IRMAA threshold of ${formatCurrency(d.irmaaThreshold)} by ${formatCurrency(Math.abs(gap))}. Medicare Part B and Part D premium surcharges will apply in two years.`;
    },
    generateRecommendedAction: () =>
      'Review all planned income events for the year and defer or restructure items that would push MAGI over the IRMAA threshold. Consider tax-loss harvesting or charitable giving to offset.',
    estimateImpact: () => 4_800, // approximate annual IRMAA surcharge at first tier
    generateDeadline: (d) => yearEnd(d.currentYear),
    autoActionAvailable: false,
  },

  // ── 3. RMD Approaching ─────────────────────────────────────────────────
  {
    id: 'rmd_approaching',
    category: 'retirement',
    severity: 'high',
    title: 'Required Minimum Distributions Approaching',
    checkCondition: (d) => {
      const yearsToRMD = d.rmdStartAge - d.clientAge;
      return yearsToRMD > 0 && yearsToRMD <= 3 && d.preTaxBalance > 100_000;
    },
    generateDescription: (d) => {
      const yearsToRMD = d.rmdStartAge - d.clientAge;
      const estimatedRMD = d.preTaxBalance / 25; // rough divisor
      return `${d.clientName} will be required to begin taking RMDs in ${yearsToRMD} year${yearsToRMD > 1 ? 's' : ''} (age ${d.rmdStartAge}). With ${formatCurrency(d.preTaxBalance)} in tax-deferred accounts, the estimated initial RMD will be approximately ${formatCurrency(estimatedRMD)}/year, potentially pushing income into higher brackets.`;
    },
    generateRecommendedAction: () =>
      'Consider accelerating Roth conversions before RMDs begin to reduce future mandatory distributions. Evaluate the impact on IRMAA and Social Security taxation.',
    estimateImpact: (d) => d.preTaxBalance / 25 * d.marginalRate,
    generateDeadline: (d) => `${d.currentYear + (d.rmdStartAge - d.clientAge)}-04-01`,
    autoActionAvailable: false,
  },

  // ── 4. Tax Return Divergence ───────────────────────────────────────────
  {
    id: 'tax_return_divergence',
    category: 'tax',
    severity: 'medium',
    title: 'Tax Return Divergence Detected',
    checkCondition: (d) => {
      if (d.lastTaxReturnAgi <= 0) return false;
      const divergence = Math.abs(d.agi - d.lastTaxReturnAgi) / d.lastTaxReturnAgi;
      return divergence > 0.15;
    },
    generateDescription: (d) => {
      const direction = d.agi > d.lastTaxReturnAgi ? 'higher' : 'lower';
      const pctChange = ((d.agi - d.lastTaxReturnAgi) / d.lastTaxReturnAgi) * 100;
      return `${d.clientName}'s current projected AGI of ${formatCurrency(d.agi)} is ${Math.abs(pctChange).toFixed(1)}% ${direction} than the last filed tax return AGI of ${formatCurrency(d.lastTaxReturnAgi)}. This significant divergence may indicate unreported income changes or planning model assumptions that need updating.`;
    },
    generateRecommendedAction: () =>
      'Verify the plan assumptions against the most recent tax return and W-2/1099 documents. Update income projections accordingly.',
    estimateImpact: (d) => Math.abs(d.agi - d.lastTaxReturnAgi) * d.marginalRate,
    generateDeadline: () => null,
    autoActionAvailable: false,
  },

  // ── 5. Estimated Tax Underpayment ──────────────────────────────────────
  {
    id: 'estimated_tax_underpayment',
    category: 'tax',
    severity: 'high',
    title: 'Estimated Tax Underpayment Risk',
    checkCondition: (d) => {
      if (d.projectedTaxLiability <= 0) return false;
      const ratio = d.estimatedTaxPaymentsMade / d.projectedTaxLiability;
      return ratio < 0.85;
    },
    generateDescription: (d) => {
      const shortfall = d.projectedTaxLiability - d.estimatedTaxPaymentsMade;
      const percentPaid = (d.estimatedTaxPaymentsMade / d.projectedTaxLiability) * 100;
      return `${d.clientName} has paid ${formatCurrency(d.estimatedTaxPaymentsMade)} in estimated taxes (${percentPaid.toFixed(0)}% of the projected ${formatCurrency(d.projectedTaxLiability)} liability). The shortfall of ${formatCurrency(shortfall)} may trigger underpayment penalties if not addressed before the next quarterly deadline.`;
    },
    generateRecommendedAction: () =>
      'Calculate the safe harbor amount and submit an additional estimated tax payment before the next quarterly deadline to avoid penalties.',
    estimateImpact: (d) => {
      const shortfall = d.projectedTaxLiability - d.estimatedTaxPaymentsMade;
      return shortfall * 0.08; // approximate penalty rate
    },
    generateDeadline: (d) => {
      // Next quarterly deadline
      const month = new Date().getMonth();
      if (month < 3) return `${d.currentYear}-04-15`;
      if (month < 5) return `${d.currentYear}-06-15`;
      if (month < 8) return `${d.currentYear}-09-15`;
      return `${d.currentYear + 1}-01-15`;
    },
    autoActionAvailable: false,
  },

  // ── 6. Account Balance Drop ────────────────────────────────────────────
  {
    id: 'account_balance_drop',
    category: 'investment',
    severity: 'high',
    title: 'Significant Portfolio Value Decline',
    checkCondition: (d) => {
      if (d.previousPortfolioValue <= 0) return false;
      const dropPct = (d.previousPortfolioValue - d.totalPortfolioValue) / d.previousPortfolioValue;
      return dropPct > 0.10;
    },
    generateDescription: (d) => {
      const dropPct = ((d.previousPortfolioValue - d.totalPortfolioValue) / d.previousPortfolioValue) * 100;
      const dropAmount = d.previousPortfolioValue - d.totalPortfolioValue;
      return `${d.clientName}'s total portfolio has declined ${dropPct.toFixed(1)}% (${formatCurrency(dropAmount)}) from ${formatCurrency(d.previousPortfolioValue)} to ${formatCurrency(d.totalPortfolioValue)}. This exceeds the 10% monitoring threshold and may impact retirement success probability.`;
    },
    generateRecommendedAction: () =>
      'Review the cause of the decline (market correction vs. withdrawals), assess impact on the financial plan, and consider rebalancing opportunities or tax-loss harvesting.',
    estimateImpact: (d) => d.previousPortfolioValue - d.totalPortfolioValue,
    generateDeadline: () => null,
    autoActionAvailable: false,
  },

  // ── 7. Success Rate Below Threshold ────────────────────────────────────
  {
    id: 'success_rate_below_threshold',
    category: 'retirement',
    severity: 'critical',
    title: 'Plan Success Rate Below Safe Threshold',
    checkCondition: (d) => d.successRate < 0.80,
    generateDescription: (d) => {
      const delta = d.successRate - d.previousSuccessRate;
      const direction = delta < 0 ? 'decreased' : 'increased';
      return `${d.clientName}'s Monte Carlo probability of success is ${pct(d.successRate)}, below the 80% minimum threshold. The success rate has ${direction} by ${pct(Math.abs(delta))} since the last analysis. At this level, there is a meaningful risk of running out of money during retirement.`;
    },
    generateRecommendedAction: () =>
      'Schedule a plan review meeting to discuss adjustments: increasing savings, reducing planned spending, adjusting retirement timing, or modifying investment strategy.',
    estimateImpact: (d) => d.totalPortfolioValue * 0.05, // rough value of getting back on track
    generateDeadline: () => null,
    autoActionAvailable: false,
  },

  // ── 8. Large Account Movement ──────────────────────────────────────────
  {
    id: 'large_account_movement',
    category: 'investment',
    severity: 'medium',
    title: 'Large Account Movement Detected',
    checkCondition: (d) => {
      if (d.previousPortfolioValue <= 0) return false;
      const changePct = Math.abs(d.totalPortfolioValue - d.previousPortfolioValue) / d.previousPortfolioValue;
      return changePct > 0.15;
    },
    generateDescription: (d) => {
      const changePct = ((d.totalPortfolioValue - d.previousPortfolioValue) / d.previousPortfolioValue) * 100;
      const direction = changePct > 0 ? 'increase' : 'decrease';
      return `A ${Math.abs(changePct).toFixed(1)}% ${direction} in ${d.clientName}'s portfolio (${formatCurrency(Math.abs(d.totalPortfolioValue - d.previousPortfolioValue))}) has been detected. Large movements may indicate significant deposits, withdrawals, or market events that require plan recalibration.`;
    },
    generateRecommendedAction: () =>
      'Verify the source of the account movement and update the financial plan to reflect any new contributions, distributions, or asset transfers.',
    estimateImpact: (d) => Math.abs(d.totalPortfolioValue - d.previousPortfolioValue) * 0.03,
    generateDeadline: () => null,
    autoActionAvailable: false,
  },

  // ── 9. Estate Document Staleness ───────────────────────────────────────
  {
    id: 'estate_document_stale',
    category: 'estate',
    severity: 'medium',
    title: 'Estate Documents Need Review',
    checkCondition: (d) => {
      if (!d.estateDocumentsLastReview) return true;
      const lastReview = new Date(d.estateDocumentsLastReview);
      const now = new Date();
      const yearsSinceReview = (now.getTime() - lastReview.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSinceReview > 3;
    },
    generateDescription: (d) => {
      if (!d.estateDocumentsLastReview) {
        return `${d.clientName} has no record of estate document review. Estate planning documents (wills, trusts, powers of attorney, healthcare directives) should be reviewed regularly to ensure they reflect current wishes, family circumstances, and tax laws.`;
      }
      const lastReview = new Date(d.estateDocumentsLastReview);
      const yearsSince = ((new Date()).getFullYear() - lastReview.getFullYear());
      return `${d.clientName}'s estate documents were last reviewed ${yearsSince} years ago (${lastReview.toISOString().slice(0, 10)}). With an estate valued at ${formatCurrency(d.grossEstateValue)}, outdated documents may not reflect current tax law, family changes, or asset titling.`;
    },
    generateRecommendedAction: () =>
      'Schedule a meeting with the estate attorney to review and update all estate planning documents, including will, trust(s), powers of attorney, and healthcare directives.',
    estimateImpact: (d) => d.grossEstateValue * 0.02, // potential estate tax exposure
    generateDeadline: () => null,
    autoActionAvailable: false,
  },

  // ── 10. Beneficiary Review Overdue ─────────────────────────────────────
  {
    id: 'beneficiary_review_overdue',
    category: 'estate',
    severity: 'medium',
    title: 'Beneficiary Designations Need Review',
    checkCondition: (d) => {
      if (!d.beneficiaryLastReview) return true;
      const lastReview = new Date(d.beneficiaryLastReview);
      const now = new Date();
      const yearsSinceReview = (now.getTime() - lastReview.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSinceReview > 2;
    },
    generateDescription: (d) => {
      if (!d.beneficiaryLastReview) {
        return `${d.clientName} has no record of beneficiary designation review. Beneficiary designations on retirement accounts and insurance policies supersede wills and should be verified regularly to avoid unintended distributions.`;
      }
      return `${d.clientName}'s beneficiary designations were last reviewed over 2 years ago. Life events (marriages, divorces, births, deaths) can make existing designations incorrect. With ${formatCurrency(d.preTaxBalance + d.rothBalance)} in retirement accounts, incorrect beneficiaries could cause significant issues.`;
    },
    generateRecommendedAction: () =>
      'Review all beneficiary designations on retirement accounts, life insurance, and annuities. Verify primary and contingent beneficiaries are current.',
    estimateImpact: (d) => (d.preTaxBalance + d.rothBalance) * 0.01,
    generateDeadline: () => null,
    autoActionAvailable: false,
  },

  // ── 11. Gifting Opportunity ────────────────────────────────────────────
  {
    id: 'gifting_opportunity',
    category: 'estate',
    severity: 'low',
    title: 'Annual Gifting Opportunity Available',
    checkCondition: (d) => {
      const unusedExclusion = (d.annualGiftExclusion * d.giftRecipientCount) - d.annualGiftingDone;
      const hasEstateExposure = d.grossEstateValue > d.estateExemptionAmount * 0.5;
      return unusedExclusion > 0 && hasEstateExposure && d.totalPortfolioValue > 500_000;
    },
    generateDescription: (d) => {
      const totalCapacity = d.annualGiftExclusion * d.giftRecipientCount;
      const remaining = totalCapacity - d.annualGiftingDone;
      return `${d.clientName} has ${formatCurrency(remaining)} of unused annual gift exclusion capacity (${d.giftRecipientCount} recipients x ${formatCurrency(d.annualGiftExclusion)}). With an estate valued at ${formatCurrency(d.grossEstateValue)}, annual gifting can reduce potential estate tax exposure over time.`;
    },
    generateRecommendedAction: () =>
      'Consider making annual exclusion gifts before year-end. Evaluate whether gifts should be made in cash, appreciated securities, or contributions to 529 plans.',
    estimateImpact: (d) => {
      const remaining = (d.annualGiftExclusion * d.giftRecipientCount) - d.annualGiftingDone;
      return remaining * 0.40; // estate tax rate savings
    },
    generateDeadline: (d) => yearEnd(d.currentYear),
    autoActionAvailable: false,
  },

  // ── 12. Insurance Coverage Gap ─────────────────────────────────────────
  {
    id: 'insurance_coverage_gap',
    category: 'insurance',
    severity: 'high',
    title: 'Life Insurance Coverage Gap',
    checkCondition: (d) => {
      if (d.clientAge > 70) return false;
      const incomeReplacementNeed = d.annualIncome * 10;
      const debtNeed = d.outstandingDebt;
      const totalNeed = incomeReplacementNeed + debtNeed;
      const gap = totalNeed - d.lifeInsuranceCoverage - d.totalPortfolioValue;
      return gap > 100_000 && d.dependents > 0;
    },
    generateDescription: (d) => {
      const incomeReplacementNeed = d.annualIncome * 10;
      const debtNeed = d.outstandingDebt;
      const totalNeed = incomeReplacementNeed + debtNeed;
      const gap = totalNeed - d.lifeInsuranceCoverage - d.totalPortfolioValue;
      return `${d.clientName}'s estimated life insurance need is ${formatCurrency(totalNeed)} (10x income + debts), but current coverage of ${formatCurrency(d.lifeInsuranceCoverage)} plus assets of ${formatCurrency(d.totalPortfolioValue)} leaves a gap of approximately ${formatCurrency(gap)}. With ${d.dependents} dependent${d.dependents > 1 ? 's' : ''}, this gap represents significant financial risk.`;
    },
    generateRecommendedAction: () =>
      'Run a detailed insurance needs analysis and obtain term life insurance quotes to close the coverage gap.',
    estimateImpact: (d) => {
      const totalNeed = d.annualIncome * 10 + d.outstandingDebt;
      return Math.max(0, totalNeed - d.lifeInsuranceCoverage - d.totalPortfolioValue);
    },
    generateDeadline: () => null,
    autoActionAvailable: false,
  },

  // ── 13. 401(k) Contribution Not Maxed ──────────────────────────────────
  {
    id: 'contribution_not_maxed',
    category: 'retirement',
    severity: 'low',
    title: '401(k) Contribution Below Maximum',
    checkCondition: (d) => {
      if (d.k401Limit <= 0) return false;
      const ratio = d.k401ContributionYTD / d.k401Limit;
      // Alert if on pace to miss max (project YTD to full year)
      const monthsElapsed = new Date().getMonth() + 1;
      const projectedAnnual = (d.k401ContributionYTD / monthsElapsed) * 12;
      return projectedAnnual < d.k401Limit * 0.90 && d.retirementYear > d.currentYear;
    },
    generateDescription: (d) => {
      const monthsElapsed = new Date().getMonth() + 1;
      const projectedAnnual = (d.k401ContributionYTD / monthsElapsed) * 12;
      const shortfall = d.k401Limit - projectedAnnual;
      return `${d.clientName} is on pace to contribute approximately ${formatCurrency(projectedAnnual)} to their 401(k) this year, which is ${formatCurrency(shortfall)} below the ${formatCurrency(d.k401Limit)} annual limit. Maximizing contributions provides immediate tax savings and accelerates retirement accumulation.`;
    },
    generateRecommendedAction: () =>
      'Increase 401(k) deferral percentage to maximize contributions for the remainder of the year. Calculate the per-paycheck adjustment needed.',
    estimateImpact: (d) => {
      const monthsElapsed = Math.max(1, new Date().getMonth() + 1);
      const projectedAnnual = (d.k401ContributionYTD / monthsElapsed) * 12;
      const shortfall = Math.max(0, d.k401Limit - projectedAnnual);
      return shortfall * d.marginalRate;
    },
    generateDeadline: (d) => yearEnd(d.currentYear),
    autoActionAvailable: false,
  },

  // ── 14. HSA Not Maxed ──────────────────────────────────────────────────
  {
    id: 'hsa_not_maxed',
    category: 'tax',
    severity: 'low',
    title: 'HSA Contribution Below Maximum',
    checkCondition: (d) => {
      if (!d.hasHSA || d.hsaLimit <= 0) return false;
      const monthsElapsed = new Date().getMonth() + 1;
      const projectedAnnual = (d.hsaContributionYTD / monthsElapsed) * 12;
      return projectedAnnual < d.hsaLimit * 0.90;
    },
    generateDescription: (d) => {
      const monthsElapsed = Math.max(1, new Date().getMonth() + 1);
      const projectedAnnual = (d.hsaContributionYTD / monthsElapsed) * 12;
      const shortfall = d.hsaLimit - projectedAnnual;
      return `${d.clientName} is on pace to contribute approximately ${formatCurrency(projectedAnnual)} to their HSA, which is ${formatCurrency(shortfall)} below the ${formatCurrency(d.hsaLimit)} annual limit. The HSA provides a triple tax benefit: deductible contributions, tax-free growth, and tax-free qualified withdrawals.`;
    },
    generateRecommendedAction: () =>
      'Increase HSA contributions to reach the annual maximum. Consider making a lump-sum contribution before year-end if payroll adjustment is not feasible.',
    estimateImpact: (d) => {
      const monthsElapsed = Math.max(1, new Date().getMonth() + 1);
      const projectedAnnual = (d.hsaContributionYTD / monthsElapsed) * 12;
      const shortfall = Math.max(0, d.hsaLimit - projectedAnnual);
      // Triple tax benefit: income tax + FICA
      return shortfall * (d.marginalRate + 0.0765);
    },
    generateDeadline: (d) => `${d.currentYear + 1}-04-15`,
    autoActionAvailable: false,
  },

  // ── 15. Social Security Claim Decision Approaching ─────────────────────
  {
    id: 'ss_claim_decision_approaching',
    category: 'social_security',
    severity: 'high',
    title: 'Social Security Claim Decision Approaching',
    checkCondition: (d) => {
      const yearsTo62 = 62 - d.clientAge;
      return yearsTo62 > 0 && yearsTo62 <= 3 && d.ssPia > 0;
    },
    generateDescription: (d) => {
      const yearsTo62 = 62 - d.clientAge;
      const earlyBenefit = d.ssPia * 0.70; // approximate reduction at 62
      const delayedBenefit = d.ssPia * 1.24; // approximate increase at 70
      return `${d.clientName} will be eligible to claim Social Security in ${yearsTo62} year${yearsTo62 > 1 ? 's' : ''} (age 62). The claiming decision has significant lifetime impact: early claiming at 62 yields approximately ${formatCurrency(earlyBenefit * 12)}/year, while delaying to 70 yields approximately ${formatCurrency(delayedBenefit * 12)}/year — a ${pct((delayedBenefit - earlyBenefit) / earlyBenefit)} increase.`;
    },
    generateRecommendedAction: () =>
      'Run the Social Security optimizer to compare claiming strategies. Consider spousal coordination, tax implications, and break-even analysis.',
    estimateImpact: (d) => {
      const earlyAnnual = d.ssPia * 0.70 * 12;
      const delayedAnnual = d.ssPia * 1.24 * 12;
      return (delayedAnnual - earlyAnnual) * 15; // roughly 15-year benefit period
    },
    generateDeadline: () => null,
    autoActionAvailable: false,
  },
];

// ---------------------------------------------------------------------------
// CORE MONITOR FUNCTION
// ---------------------------------------------------------------------------

/**
 * Runs the plan monitor against all registered alert triggers.
 *
 * @param planData - Current plan data to evaluate
 * @returns A PlanMonitorResult containing all fired alerts and summary metrics
 *
 * @example
 * ```ts
 * const result = runPlanMonitor(clientPlanData);
 * console.log(`${result.alertsGenerated.length} alerts for ${result.clientName}`);
 * ```
 */
export function runPlanMonitor(planData: PlanMonitorInput): PlanMonitorResult {
  const firedAlerts: PlanAlert[] = [];

  for (const trigger of ALERT_TRIGGERS) {
    try {
      if (trigger.checkCondition(planData)) {
        const alert: PlanAlert = {
          triggerId: trigger.id,
          severity: trigger.severity,
          category: trigger.category,
          title: trigger.title,
          description: trigger.generateDescription(planData),
          recommendedAction: trigger.generateRecommendedAction(planData),
          estimatedImpact: trigger.estimateImpact(planData),
          deadline: trigger.generateDeadline(planData),
          autoActionAvailable: trigger.autoActionAvailable,
        };
        firedAlerts.push(alert);
      }
    } catch {
      // Silently skip triggers that throw due to missing or invalid data
      // In production, this would log to an observability system
    }
  }

  // Sort alerts by severity (critical first), then by estimated impact
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  firedAlerts.sort((a, b) => {
    const severityDiff = (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    if (severityDiff !== 0) return severityDiff;
    return b.estimatedImpact - a.estimatedImpact;
  });

  return {
    planId: planData.planId,
    clientName: planData.clientName,
    alertsGenerated: firedAlerts,
    insightsGenerated: firedAlerts.length, // 1:1 mapping initially; insight generator may merge
    lastSuccessRate: planData.previousSuccessRate,
    currentSuccessRate: planData.successRate,
    successRateDelta: planData.successRate - planData.previousSuccessRate,
  };
}
