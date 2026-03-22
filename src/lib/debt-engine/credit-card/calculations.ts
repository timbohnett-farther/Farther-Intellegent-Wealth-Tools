/**
 * Credit Card & Consumer Debt Optimization Engine (FP-DebtIQ Category 4)
 *
 * Provides credit card payoff strategy comparison (avalanche vs snowball),
 * balance transfer opportunity analysis, utilization-based credit score
 * improvement modeling, minimum payment path projection, and full debt
 * consolidation analysis.
 *
 * All financial math uses decimal.js for precision. Every exported function
 * is pure (no async, no DB calls, no side effects).
 *
 * @module debt-engine/credit-card/calculations
 */

import Decimal from 'decimal.js';
import type {
  CreditCard,
  BalanceTransferOffer,
  BalanceTransferOpportunity,
  UtilizationAnalysis,
  CreditCardOptimizerResult,
  PayoffPlan,
  PayoffPlanSummary,
  PayoffSequenceItem,
  PayoffStrategy,
  HouseholdDebt,
  ConsolidationOption,
  ConsolidationResult,
  ConsolidationScenario,
  HouseholdTaxProfile,
  RecommendationLevel,
} from '../types';

// =====================================================================
// Helpers
// =====================================================================

/**
 * Convert a Decimal to a plain number rounded to 2 decimal places.
 */
function toNum(d: Decimal): number {
  return d.toDecimalPlaces(2).toNumber();
}

/**
 * Compute a standard monthly amortization payment for a fixed-rate loan.
 */
function amortizationPayment(
  principal: Decimal,
  annualRate: Decimal,
  months: number,
): Decimal {
  if (principal.lte(0)) return new Decimal(0);
  if (annualRate.isZero()) return principal.div(months);
  const monthlyRate = annualRate.div(12);
  const factor = monthlyRate.plus(1).pow(months);
  return principal.mul(monthlyRate).mul(factor).div(factor.minus(1));
}

/**
 * Calculate total interest remaining on a debt at its current payment.
 */
function totalInterestRemaining(
  balance: Decimal,
  annualRate: Decimal,
  monthlyPayment: Decimal,
): Decimal {
  const monthlyRate = annualRate.div(12);
  let remaining = new Decimal(balance);
  let totalInterest = new Decimal(0);
  let safetyCounter = 0;
  const maxMonths = 600; // 50 year safety cap

  while (remaining.gt(0.01) && safetyCounter < maxMonths) {
    const interest = remaining.mul(monthlyRate);
    totalInterest = totalInterest.plus(interest);
    const principalPaid = monthlyPayment.minus(interest);
    if (principalPaid.lte(0)) {
      // Payment does not even cover interest -- infinite payoff
      return new Decimal(Infinity);
    }
    remaining = remaining.minus(principalPaid);
    safetyCounter++;
  }

  return totalInterest;
}

// =====================================================================
// Card Payoff Simulation
// =====================================================================

/**
 * Internal card state used during month-by-month simulation.
 */
interface SimCard {
  id: string;
  name: string;
  balance: Decimal;
  apr: Decimal;
  minimumPayment: Decimal;
  interestPaid: Decimal;
  isPaidOff: boolean;
  payoffMonth: number;
}

/**
 * Simulate paying off a set of credit cards following a given ordering.
 *
 * Each month:
 * 1. Accrue interest on every unpaid card.
 * 2. Pay minimum on all cards except the target.
 * 3. Apply remaining budget (minimums freed + extra) to the target card.
 * 4. When target is paid off, move to next in order.
 */
function simulatePayoff(
  cards: CreditCard[],
  ordering: string[],
  monthlyExtraPayment: number,
): PayoffPlan {
  const simCards: SimCard[] = cards.map((c) => ({
    id: c.id,
    name: c.issuer,
    balance: new Decimal(c.balance),
    apr: new Decimal(c.apr),
    minimumPayment: new Decimal(c.minimumPayment),
    interestPaid: new Decimal(0),
    isPaidOff: c.balance <= 0,
    payoffMonth: 0,
  }));

  const extra = new Decimal(monthlyExtraPayment);
  const sequence: PayoffSequenceItem[] = [];
  const maxMonths = 600;
  let month = 0;
  let targetIdx = 0; // index into ordering
  let totalInterest = new Decimal(0);
  let freedMinimums = new Decimal(0); // minimums freed from paid off cards

  while (month < maxMonths) {
    const allPaid = simCards.every((c) => c.isPaidOff);
    if (allPaid) break;
    month++;

    // Step 1: Accrue interest
    for (const card of simCards) {
      if (card.isPaidOff) continue;
      const monthlyInterest = card.balance.mul(card.apr.div(12));
      card.balance = card.balance.plus(monthlyInterest);
      card.interestPaid = card.interestPaid.plus(monthlyInterest);
      totalInterest = totalInterest.plus(monthlyInterest);
    }

    // Step 2: Pay minimums on non-target cards
    let budgetRemaining = extra.plus(freedMinimums);
    // Find current target
    let targetId: string | null = null;
    while (targetIdx < ordering.length) {
      const candidate = simCards.find((c) => c.id === ordering[targetIdx]);
      if (candidate && !candidate.isPaidOff) {
        targetId = candidate.id;
        break;
      }
      targetIdx++;
    }

    for (const card of simCards) {
      if (card.isPaidOff) continue;
      if (card.id === targetId) continue; // pay target last with remainder
      const payment = Decimal.min(card.minimumPayment, card.balance);
      card.balance = card.balance.minus(payment);
      if (card.balance.lte(0.01)) {
        card.balance = new Decimal(0);
        card.isPaidOff = true;
        card.payoffMonth = month;
        freedMinimums = freedMinimums.plus(card.minimumPayment);
        const payoffDate = new Date();
        payoffDate.setMonth(payoffDate.getMonth() + month);
        sequence.push({
          debtId: card.id,
          debtName: card.name,
          payoffMonth: month,
          payoffDate,
          totalInterestPaid: toNum(card.interestPaid),
          payoffPayment: toNum(payment),
          rolloverAmount: 0,
        });
      }
    }

    // Step 3: Pay target card with minimums + extra + freed minimums
    if (targetId) {
      const targetCard = simCards.find((c) => c.id === targetId)!;
      const targetPayment = targetCard.minimumPayment.plus(budgetRemaining);
      const actualPayment = Decimal.min(targetPayment, targetCard.balance);
      targetCard.balance = targetCard.balance.minus(actualPayment);

      if (targetCard.balance.lte(0.01)) {
        targetCard.balance = new Decimal(0);
        targetCard.isPaidOff = true;
        targetCard.payoffMonth = month;
        const rollover = targetPayment.minus(actualPayment);
        freedMinimums = freedMinimums.plus(targetCard.minimumPayment);
        const payoffDate = new Date();
        payoffDate.setMonth(payoffDate.getMonth() + month);
        sequence.push({
          debtId: targetCard.id,
          debtName: targetCard.name,
          payoffMonth: month,
          payoffDate,
          totalInterestPaid: toNum(targetCard.interestPaid),
          payoffPayment: toNum(actualPayment),
          rolloverAmount: toNum(rollover),
        });
        targetIdx++;
      }
    }
  }

  const totalDebtFreeDate = new Date();
  totalDebtFreeDate.setMonth(totalDebtFreeDate.getMonth() + month);

  const summary: PayoffPlanSummary = {
    totalDebtFreeDate,
    totalInterestPaid: toNum(totalInterest),
    totalInterestSaved: 0, // populated by caller relative to minimum path
    monthsSavedVsMinimum: 0, // populated by caller
    netWorthAt10Years: 0, // placeholder; would require investment assumptions
  };

  return {
    strategy: 'AVALANCHE' as PayoffStrategy, // overridden by caller
    monthlyExtraPayment: monthlyExtraPayment,
    debtPayoffSequence: sequence,
    summary,
  };
}

// =====================================================================
// Balance Transfer Analysis
// =====================================================================

/**
 * Analyze a single balance transfer opportunity.
 */
function analyzeTransfer(
  card: CreditCard,
  offer: BalanceTransferOffer,
): BalanceTransferOpportunity {
  const balance = new Decimal(card.balance);
  const transferAmount = Decimal.min(balance, new Decimal(offer.creditLimit));
  const feeRate = new Decimal(offer.transferFee);
  const fee = transferAmount.mul(feeRate);

  // Interest saved during promo period vs staying on the card
  const currentMonthlyRate = new Decimal(card.apr).div(12);
  const promoMonthlyRate = new Decimal(offer.promoRate).div(12);
  const months = offer.promoPeriodMonths;

  // Approximate interest saved (assuming balance remains roughly constant during promo)
  let currentInterest = new Decimal(0);
  let promoInterest = new Decimal(0);
  let remainingCurrent = new Decimal(transferAmount);
  let remainingPromo = new Decimal(transferAmount);
  const monthlyPmt = new Decimal(card.minimumPayment);

  for (let m = 0; m < months; m++) {
    // Current card path
    const intCurrent = remainingCurrent.mul(currentMonthlyRate);
    currentInterest = currentInterest.plus(intCurrent);
    remainingCurrent = remainingCurrent
      .plus(intCurrent)
      .minus(Decimal.min(monthlyPmt, remainingCurrent.plus(intCurrent)));
    if (remainingCurrent.lt(0)) remainingCurrent = new Decimal(0);

    // Promo path
    const intPromo = remainingPromo.mul(promoMonthlyRate);
    promoInterest = promoInterest.plus(intPromo);
    remainingPromo = remainingPromo
      .plus(intPromo)
      .minus(Decimal.min(monthlyPmt, remainingPromo.plus(intPromo)));
    if (remainingPromo.lt(0)) remainingPromo = new Decimal(0);
  }

  const interestSaved = currentInterest.minus(promoInterest);
  const netSavings = interestSaved.minus(fee);

  // Break-even months: how many months until the interest savings cover the fee
  let breakEvenMonths = 0;
  if (interestSaved.gt(0)) {
    const monthlySavings = interestSaved.div(months);
    breakEvenMonths = monthlySavings.gt(0)
      ? Math.ceil(fee.div(monthlySavings).toNumber())
      : months;
  }

  let recommendation: 'DO_IT' | 'MARGINAL' | 'SKIP';
  let caution: string;
  if (netSavings.gt(500)) {
    recommendation = 'DO_IT';
    caution =
      'Ensure you can pay off the balance before the promo period ends to maximize savings.';
  } else if (netSavings.gte(0)) {
    recommendation = 'MARGINAL';
    caution =
      'Net savings are modest. Only proceed if you are confident you will pay off before the promo rate expires.';
  } else {
    recommendation = 'SKIP';
    caution =
      'Transfer fee exceeds interest savings. This transfer would cost you more than staying on the current card.';
  }

  return {
    fromCard: card.id,
    toOffer: offer.offerLabel,
    amountToTransfer: toNum(transferAmount),
    transferFee: toNum(fee),
    interestSaved: toNum(interestSaved),
    netSavings: toNum(netSavings),
    breakEvenMonths,
    recommendation,
    caution,
  };
}

// =====================================================================
// Utilization Analysis
// =====================================================================

/**
 * Analyze credit utilization across all cards.
 */
function analyzeUtilization(cards: CreditCard[]): UtilizationAnalysis {
  let totalBalance = new Decimal(0);
  let totalLimit = new Decimal(0);
  const perCard: Record<string, number> = {};

  for (const card of cards) {
    const bal = new Decimal(card.balance);
    const limit = new Decimal(card.creditLimit);
    totalBalance = totalBalance.plus(bal);
    totalLimit = totalLimit.plus(limit);
    const utilization = limit.gt(0) ? bal.div(limit) : new Decimal(0);
    perCard[card.id] = toNum(utilization);
  }

  const currentTotal = totalLimit.gt(0)
    ? totalBalance.div(totalLimit)
    : new Decimal(0);

  // Amount needed to reach targets
  const target30 = totalLimit.mul(0.3);
  const target10 = totalLimit.mul(0.1);
  const paydownTo30 = Decimal.max(
    totalBalance.minus(target30),
    new Decimal(0),
  );
  const paydownTo10 = Decimal.max(
    totalBalance.minus(target10),
    new Decimal(0),
  );

  return {
    currentTotal: toNum(currentTotal),
    currentPerCard: perCard,
    targetUtilization: 0.3,
    paydownToImprove: {
      to30pct: toNum(paydownTo30),
      to10pct: toNum(paydownTo10),
      estimatedScoreLift: {
        to30pct: currentTotal.gt(0.3) ? 20 : 0,
        to10pct: currentTotal.gt(0.1) ? 40 : currentTotal.gt(0.3) ? 20 : 0,
      },
    },
  };
}

// =====================================================================
// Minimum Payment Path
// =====================================================================

/**
 * Simulate paying only the minimum on every card and report total cost.
 */
function simulateMinimumPath(cards: CreditCard[]): {
  payoffMonths: number;
  totalInterest: number;
  trueAPREffect: string;
} {
  interface MinCard {
    balance: Decimal;
    apr: Decimal;
    minimumPayment: Decimal;
  }

  const simCards: MinCard[] = cards.map((c) => ({
    balance: new Decimal(c.balance),
    apr: new Decimal(c.apr),
    minimumPayment: new Decimal(c.minimumPayment),
  }));

  let month = 0;
  let totalInterest = new Decimal(0);
  let totalPaid = new Decimal(0);
  const maxMonths = 600;
  const originalBalance = cards.reduce(
    (s, c) => s.plus(new Decimal(c.balance)),
    new Decimal(0),
  );

  while (month < maxMonths) {
    const allPaid = simCards.every((c) => c.balance.lte(0.01));
    if (allPaid) break;
    month++;

    for (const card of simCards) {
      if (card.balance.lte(0.01)) continue;
      const interest = card.balance.mul(card.apr.div(12));
      card.balance = card.balance.plus(interest);
      totalInterest = totalInterest.plus(interest);

      const payment = Decimal.min(card.minimumPayment, card.balance);
      card.balance = card.balance.minus(payment);
      totalPaid = totalPaid.plus(payment);
      if (card.balance.lt(0)) card.balance = new Decimal(0);
    }
  }

  const years = new Decimal(month).div(12);
  const multiplier = originalBalance.gt(0)
    ? totalPaid.div(originalBalance)
    : new Decimal(1);

  const trueAPREffect = `Paying only minimums will cost $${toNum(totalPaid)} over ${toNum(years)} years -- ${toNum(multiplier)}x the original balance of $${toNum(originalBalance)}.`;

  return {
    payoffMonths: month,
    totalInterest: toNum(totalInterest),
    trueAPREffect,
  };
}

// =====================================================================
// Main Exported Functions
// =====================================================================

/**
 * Optimize credit card debt repayment using avalanche and snowball strategies,
 * analyze balance transfer opportunities, compute utilization impact on credit
 * score, and project the minimum-payment-only path.
 *
 * @param params - Object containing:
 *   - cards: Array of credit cards with balances, APRs, and limits
 *   - monthlyExtraPayment: Additional amount available above all minimums
 *   - transferOptions: Available balance transfer offers
 *   - creditScore: Current FICO score for context
 * @returns Complete optimization result with strategy comparisons, transfer
 *   opportunities, utilization analysis, and minimum payment projection.
 */
export function optimizeCreditCardDebt(params: {
  cards: CreditCard[];
  monthlyExtraPayment: number;
  transferOptions: BalanceTransferOffer[];
  creditScore: number;
}): CreditCardOptimizerResult {
  const { cards, monthlyExtraPayment, transferOptions } = params;

  // ---------------------------------------------------------------
  // 1. Determine card orderings for each strategy
  // ---------------------------------------------------------------
  const avalancheOrder = [...cards]
    .sort((a, b) => b.apr - a.apr)
    .map((c) => c.id);

  const snowballOrder = [...cards]
    .sort((a, b) => a.balance - b.balance)
    .map((c) => c.id);

  // ---------------------------------------------------------------
  // 2. Simulate each strategy
  // ---------------------------------------------------------------
  const minimumPath = simulateMinimumPath(cards);

  const avalanchePlan = simulatePayoff(cards, avalancheOrder, monthlyExtraPayment);
  avalanchePlan.strategy = 'AVALANCHE' as PayoffStrategy;
  avalanchePlan.summary.totalInterestSaved = toNum(
    new Decimal(minimumPath.totalInterest).minus(
      new Decimal(avalanchePlan.summary.totalInterestPaid),
    ),
  );
  avalanchePlan.summary.monthsSavedVsMinimum =
    minimumPath.payoffMonths -
    (avalanchePlan.debtPayoffSequence.length > 0
      ? Math.max(
          ...avalanchePlan.debtPayoffSequence.map((s) => s.payoffMonth),
        )
      : 0);

  const snowballPlan = simulatePayoff(cards, snowballOrder, monthlyExtraPayment);
  snowballPlan.strategy = 'SNOWBALL' as PayoffStrategy;
  snowballPlan.summary.totalInterestSaved = toNum(
    new Decimal(minimumPath.totalInterest).minus(
      new Decimal(snowballPlan.summary.totalInterestPaid),
    ),
  );
  snowballPlan.summary.monthsSavedVsMinimum =
    minimumPath.payoffMonths -
    (snowballPlan.debtPayoffSequence.length > 0
      ? Math.max(
          ...snowballPlan.debtPayoffSequence.map((s) => s.payoffMonth),
        )
      : 0);

  const strategies: Partial<Record<string, PayoffPlan>> = {
    AVALANCHE: avalanchePlan,
    SNOWBALL: snowballPlan,
  };

  // ---------------------------------------------------------------
  // 3. Balance transfer opportunities
  // ---------------------------------------------------------------
  const balanceTransferOpportunities: BalanceTransferOpportunity[] = [];
  for (const card of cards) {
    if (card.balance <= 0) continue;
    for (const offer of transferOptions) {
      balanceTransferOpportunities.push(analyzeTransfer(card, offer));
    }
  }

  // ---------------------------------------------------------------
  // 4. Utilization analysis
  // ---------------------------------------------------------------
  const utilizationAnalysis = analyzeUtilization(cards);

  // ---------------------------------------------------------------
  // 5. Build recommendation
  // ---------------------------------------------------------------
  const avalancheInterest = avalanchePlan.summary.totalInterestPaid;
  const snowballInterest = snowballPlan.summary.totalInterestPaid;
  const interestDiff = toNum(
    new Decimal(snowballInterest).minus(new Decimal(avalancheInterest)),
  );

  let recommendation: string;
  if (interestDiff > 500) {
    recommendation = `Use the AVALANCHE strategy to save $${interestDiff} in interest compared to snowball. Target the highest-APR card first.`;
  } else if (interestDiff > 0) {
    recommendation = `Both strategies perform similarly (only $${interestDiff} difference). SNOWBALL may provide better motivation through quick wins, while AVALANCHE is mathematically optimal.`;
  } else {
    recommendation = `Use the SNOWBALL strategy. Paying off the smallest balances first provides psychological momentum with no meaningful interest cost.`;
  }

  // Add balance transfer note if a strong opportunity exists
  const bestTransfer = balanceTransferOpportunities.find(
    (t) => t.recommendation === 'DO_IT',
  );
  if (bestTransfer) {
    recommendation += ` Additionally, transferring $${bestTransfer.amountToTransfer} to "${bestTransfer.toOffer}" could save a net $${bestTransfer.netSavings}.`;
  }

  return {
    strategies,
    balanceTransferOpportunities,
    utilizationAnalysis,
    minimumPaymentPath: minimumPath,
    recommendation,
  };
}

/**
 * Analyze debt consolidation options against the household's existing debts.
 * Computes current state summary, evaluates each consolidation option for
 * payment relief, total interest savings, break-even timeline, risk factors,
 * and provides a recommendation.
 *
 * @param params - Object containing:
 *   - existingDebts: All household debts to potentially consolidate
 *   - consolidationOptions: Available consolidation products
 *   - taxProfile: Household tax profile for after-tax analysis
 * @returns Complete consolidation analysis with scenario comparisons,
 *   best option selection, and rationale.
 */
export function analyzeDebtConsolidation(params: {
  existingDebts: HouseholdDebt[];
  consolidationOptions: ConsolidationOption[];
  taxProfile: HouseholdTaxProfile;
}): ConsolidationResult {
  const { existingDebts, consolidationOptions, taxProfile } = params;

  // ---------------------------------------------------------------
  // 1. Current state summary
  // ---------------------------------------------------------------
  let totalBalanceDec = new Decimal(0);
  let totalMonthlyPayment = new Decimal(0);
  let weightedRateSum = new Decimal(0);
  let totalInterestRemain = new Decimal(0);

  for (const debt of existingDebts) {
    const bal = new Decimal(debt.currentBalance);
    const rate = new Decimal(debt.interestRate);
    const monthly = new Decimal(debt.monthlyPayment);
    totalBalanceDec = totalBalanceDec.plus(bal);
    totalMonthlyPayment = totalMonthlyPayment.plus(monthly);
    weightedRateSum = weightedRateSum.plus(bal.mul(rate));

    const interestRem = totalInterestRemaining(bal, rate, monthly);
    if (interestRem.isFinite()) {
      totalInterestRemain = totalInterestRemain.plus(interestRem);
    }
  }

  const weightedAvgAPR = totalBalanceDec.gt(0)
    ? weightedRateSum.div(totalBalanceDec)
    : new Decimal(0);

  const currentState = {
    totalBalance: toNum(totalBalanceDec),
    weightedAvgAPR: toNum(weightedAvgAPR),
    totalMonthlyPayment: toNum(totalMonthlyPayment),
    totalInterestRemaining: toNum(totalInterestRemain),
  };

  // ---------------------------------------------------------------
  // 2. Evaluate each consolidation option
  // ---------------------------------------------------------------
  const scenarios: ConsolidationScenario[] = [];

  for (const option of consolidationOptions) {
    const consolidateAmount = Decimal.min(
      totalBalanceDec,
      new Decimal(option.maxAmount),
    );
    const newRate = new Decimal(option.rate);
    const termMonths = option.termMonths;
    const fee = consolidateAmount.mul(new Decimal(option.originationFee));
    // Principal for the new loan includes the fee if rolled in
    const newPrincipal = consolidateAmount.plus(fee);
    const newMonthly = amortizationPayment(newPrincipal, newRate, termMonths);

    // Total interest on new loan
    const totalPaidNew = newMonthly.mul(termMonths);
    const totalInterestNew = totalPaidNew.minus(newPrincipal);

    // Calculate pro-rata interest for the portion being consolidated
    const consolidationFraction = totalBalanceDec.gt(0)
      ? consolidateAmount.div(totalBalanceDec)
      : new Decimal(1);
    const currentInterestPortion = totalInterestRemain.isFinite()
      ? totalInterestRemain.mul(consolidationFraction)
      : new Decimal(0);

    const totalInterestSaved = currentInterestPortion.minus(totalInterestNew);
    const netSavings = totalInterestSaved.minus(fee);

    // Monthly relief
    const currentMonthlyPortion =
      totalMonthlyPayment.mul(consolidationFraction);
    const monthlyRelief = currentMonthlyPortion.minus(newMonthly);

    // Break-even months (how long until cumulative savings exceed the fee)
    let breakEvenMonths = 0;
    if (monthlyRelief.gt(0)) {
      breakEvenMonths = Math.ceil(fee.div(monthlyRelief).toNumber());
    } else if (totalInterestSaved.gt(0)) {
      // If monthly payment is higher but total interest is lower,
      // break-even is at the end of the term
      breakEvenMonths = termMonths;
    }

    // Risk assessment
    const risks: string[] = [];
    if (
      option.type === 'HELOC' ||
      option.type === 'CASH_OUT_REFI'
    ) {
      risks.push(
        'Converts unsecured debt to secured debt backed by your home.',
      );
      risks.push(
        'Missed payments could result in foreclosure.',
      );
    }
    if (option.type === '401K_LOAN') {
      risks.push(
        'If you leave your job, the full balance may become due within 60 days.',
      );
      risks.push(
        'Reduces retirement growth -- opportunity cost of missed market returns.',
      );
    }
    if (option.type === 'SBLOC') {
      risks.push(
        'Variable rate exposure -- payments could increase significantly.',
      );
      risks.push(
        'Margin call risk if portfolio value declines.',
      );
    }
    if (newRate.gt(weightedAvgAPR)) {
      risks.push(
        `New rate (${toNum(newRate.mul(100))}%) is higher than current weighted average (${toNum(weightedAvgAPR.mul(100))}%).`,
      );
    }

    // Tax implications
    let taxImplications: string;
    if (
      option.type === 'HELOC' ||
      option.type === 'CASH_OUT_REFI'
    ) {
      taxImplications = taxProfile.itemizingDeductions
        ? 'Interest may be deductible if used for home improvement (consult tax advisor).'
        : 'Interest is not deductible under the standard deduction.';
    } else if (option.type === '401K_LOAN') {
      taxImplications =
        'No tax benefit. Repayments are made with after-tax dollars, and distributions would be taxed again.';
    } else {
      taxImplications =
        'Personal loan interest is generally not tax-deductible.';
    }

    // Recommendation
    let recommendation: RecommendationLevel;
    if (
      netSavings.gt(2000) &&
      newRate.lt(weightedAvgAPR) &&
      risks.length <= 1
    ) {
      recommendation = 'STRONGLY_RECOMMEND';
    } else if (netSavings.gt(0) && newRate.lt(weightedAvgAPR)) {
      recommendation = 'CONSIDER';
    } else if (netSavings.lt(0) || risks.length >= 3) {
      recommendation = 'AVOID';
    } else {
      recommendation = 'CAUTION';
    }

    scenarios.push({
      option: option.type,
      newRate: toNum(newRate),
      newMonthlyPayment: toNum(newMonthly),
      monthlyRelief: toNum(monthlyRelief),
      totalInterestNew: toNum(Decimal.max(totalInterestNew, new Decimal(0))),
      totalInterestSaved: toNum(totalInterestSaved),
      consolidationFee: toNum(fee),
      netSavings: toNum(netSavings),
      breakEvenMonths,
      risks,
      taxImplications,
      recommendation,
    });
  }

  // ---------------------------------------------------------------
  // 3. Pick best option
  // ---------------------------------------------------------------
  let bestOption = 'None';
  let bestOptionReason = 'No consolidation option provides a clear benefit.';

  if (scenarios.length > 0) {
    // Sort by net savings descending, then by recommendation strength
    const recommendationOrder: Record<RecommendationLevel, number> = {
      STRONGLY_RECOMMEND: 0,
      CONSIDER: 1,
      CAUTION: 2,
      AVOID: 3,
    };

    const sorted = [...scenarios].sort((a, b) => {
      const recDiff =
        recommendationOrder[a.recommendation] -
        recommendationOrder[b.recommendation];
      if (recDiff !== 0) return recDiff;
      return b.netSavings - a.netSavings;
    });

    const top = sorted[0];
    if (top.recommendation !== 'AVOID') {
      bestOption = top.option;
      if (top.recommendation === 'STRONGLY_RECOMMEND') {
        bestOptionReason = `${top.option} offers the best value with $${top.netSavings} in net savings, a lower rate of ${toNum(new Decimal(top.newRate).mul(100))}%, and $${toNum(new Decimal(top.monthlyRelief))} in monthly payment relief.`;
      } else if (top.recommendation === 'CONSIDER') {
        bestOptionReason = `${top.option} provides moderate savings of $${top.netSavings} net. Review the risks before proceeding.`;
      } else {
        bestOptionReason = `${top.option} is the least unfavorable option with $${top.netSavings} net savings, but proceed with caution given the associated risks.`;
      }
    }
  }

  return {
    currentState,
    consolidationScenarios: scenarios,
    bestOption,
    bestOptionReason,
  };
}
