import Decimal from 'decimal.js';
import type {
  CashFlowInput,
  AnnualCashFlow,
  FilingStatus,
} from '../types';
import { calculateFederalTax } from '../tax/federal-income-tax';
import { calculateSETax } from '../tax/self-employment-tax';
import { calculateSSTaxation } from '../tax/social-security-taxation';
import { calculateIRMAA } from '../tax/irmaa';
import { calculateStateTax } from '../tax/state-income-tax';
import { calculateRMD } from '../retirement/rmd';
import { calculateSSBenefit } from '../retirement/social-security-benefit';
import { projectIncome } from './income-projector';
import { projectExpenses, getPreMedicareHealthcareCost, projectDebtPayments, amortizeLiabilities } from './expense-projector';
import {
  sumAccountsByBucket,
  sumLiabilities,
  sumRealEstate,
  blendedReturn,
  calculateContributions,
} from './account-growth';
import { inflationAdjustBrackets } from './inflation';

/**
 * Project year-by-year cash flows for the entire planning horizon.
 * This is the core engine that drives all plan results.
 */
export function projectCashFlows(input: CashFlowInput): AnnualCashFlow[] {
  const results: AnnualCashFlow[] = [];

  // Initialize account balances
  let taxableBalance = new Decimal(sumAccountsByBucket(input.accounts, 'taxable'));
  let taxDeferredBalance = new Decimal(sumAccountsByBucket(input.accounts, 'tax_deferred'));
  let taxFreeBalance = new Decimal(sumAccountsByBucket(input.accounts, 'tax_free'));
  let realEstateValue = new Decimal(sumRealEstate(input.accounts));
  let totalLiabilities = new Decimal(sumLiabilities(input.accounts));

  const baseYear = input.startYear;

  for (let year = input.startYear; year <= input.endYear; year++) {
    const clientAge = year - input.clientBirthYear;
    const coAge = input.coBirthYear ? year - input.coBirthYear : undefined;
    const isRetired = year >= input.retirementYearClient;
    const yearsFromBase = year - baseYear;

    // --- INCOME PROJECTION ---
    const projected = projectIncome(input.incomeSources, year, baseYear, input.assumptions);

    // Stop employment income at retirement
    const salaryIncome = isRetired ? 0 : projected.salary;
    const seIncome = isRetired ? 0 : projected.selfEmployment;
    const pensionIncome = projected.pension;
    const rentalIncome = projected.rental;
    const annuityIncome = projected.annuity;
    const businessDist = projected.businessDistributions;
    const trustIncome = projected.trust;
    const otherIncome = projected.other;

    // --- SOCIAL SECURITY ---
    const ssSources = input.incomeSources.filter(s => s.type.includes('social_security'));
    let ssClientGross = 0;
    let ssCoGross = 0;

    for (const ss of ssSources) {
      const claimAge = ss.ssClaimAge ?? 67;
      const pia = ss.ssPia ?? 0;
      const isClient = ss.ownerType !== 'co_client';
      const birthYear = isClient ? input.clientBirthYear : (input.coBirthYear ?? input.clientBirthYear);
      const currentAge = year - birthYear;

      if (currentAge >= claimAge && pia > 0) {
        const benefit = calculateSSBenefit({
          pia,
          fullRetirementAge: 67,
          claimAge,
          colaRate: input.assumptions.ssCola,
          ssHaircut: 0,
          wep: false,
          wepNoncoveredPension: 0,
          gpo: false,
          gpoNoncoveredPension: 0,
        });

        // Apply COLA growth from claim year to current year
        const yearsSinceClaim = currentAge - claimAge;
        const colaGrowth = new Decimal(1).plus(input.assumptions.ssCola).pow(yearsSinceClaim);
        const annualBenefit = new Decimal(benefit.finalAnnualBenefit).mul(colaGrowth).toDP(2).toNumber();

        if (isClient) {
          ssClientGross = annualBenefit;
        } else {
          ssCoGross = annualBenefit;
        }
      }
    }

    const totalSSGross = ssClientGross + ssCoGross;

    // --- RMD ---
    const rmdStartAge = input.clientBirthYear >= 1960 ? 75 : 73;
    let rmdIncome = 0;
    if (clientAge >= rmdStartAge) {
      const rmdResult = calculateRMD({
        accountBalance: taxDeferredBalance.toNumber(),
        ownerAge: clientAge,
        accountType: 'ira_traditional',
        isInherited: false,
        rmdTable: input.taxTables.rmdUniform,
        secure2Act: true,
        birthYear: input.clientBirthYear,
      });
      rmdIncome = rmdResult.rmdAmount;
    }

    // --- INVESTMENT INCOME FROM TAXABLE PORTFOLIO ---
    const portfolioYield = 0.02;
    const investmentIncome = taxableBalance.mul(portfolioYield).toDP(2).toNumber();
    const qualifiedDividends = new Decimal(investmentIncome).mul(0.75).toDP(2).toNumber();

    // --- SS TAXATION ---
    const totalNonSSIncome = salaryIncome + seIncome + pensionIncome + rentalIncome +
      rmdIncome + investmentIncome + annuityIncome + businessDist + trustIncome + otherIncome;

    const ssTaxResult = calculateSSTaxation({
      grossSocialSecurityBenefit: totalSSGross,
      otherMAGIIncome: totalNonSSIncome,
      taxExemptInterest: 0,
      filingStatus: input.filingStatus,
    });

    const totalGrossIncome = new Decimal(salaryIncome)
      .plus(seIncome).plus(pensionIncome).plus(rentalIncome)
      .plus(totalSSGross).plus(rmdIncome).plus(investmentIncome)
      .plus(annuityIncome).plus(businessDist).plus(trustIncome).plus(otherIncome)
      .toDP(2).toNumber();

    // --- EXPENSES ---
    const livingExpenses = projectExpenses(input.expenses, year, baseYear, isRetired, input.assumptions);

    // Healthcare premiums
    let healthcarePremiums: number;
    if (clientAge >= 65) {
      const irmaaResult = calculateIRMAA({
        magiTwoYearsAgo: totalNonSSIncome,
        filingStatus: input.filingStatus,
        age: clientAge,
        brackets: input.taxTables.irmaa,
      });
      healthcarePremiums = irmaaResult.totalAnnualMedicarePremium;
    } else {
      healthcarePremiums = getPreMedicareHealthcareCost(clientAge, year, baseYear, input.assumptions.healthcareInflation);
    }

    // Goal withdrawals
    const goalWithdrawals = getGoalWithdrawals(input.goals, year);

    // Debt payments
    const debtPayments = projectDebtPayments(
      input.accounts.map(a => ({
        accountType: a.accountType,
        monthlyPayment: a.monthlyPayment,
        remainingTerm: a.remainingTerm,
        currentBalance: a.currentBalance,
      })),
      year,
      baseYear
    );

    const totalExpenses = new Decimal(livingExpenses)
      .plus(healthcarePremiums)
      .plus(goalWithdrawals)
      .plus(debtPayments)
      .toDP(2).toNumber();

    // --- TAX CALCULATION ---
    const seTaxResult = seIncome > 0
      ? calculateSETax({
          netSelfEmploymentIncome: seIncome,
          year,
          sswageBase: input.taxTables.ssWageBase,
          w2Wages: salaryIncome,
        })
      : { totalSETax: 0, deductibleHalf: 0 };

    // Inflation-adjust brackets for future years
    const adjustedOrdinaryBrackets = yearsFromBase > 0
      ? inflationAdjustBrackets(input.taxTables.ordinaryBrackets[input.filingStatus], input.assumptions.inflationRate, yearsFromBase)
      : input.taxTables.ordinaryBrackets[input.filingStatus];

    const adjustedCGBrackets = yearsFromBase > 0
      ? inflationAdjustBrackets(input.taxTables.capitalGainsBrackets[input.filingStatus] ?? input.taxTables.capitalGainsBrackets['single'], input.assumptions.inflationRate, yearsFromBase)
      : (input.taxTables.capitalGainsBrackets[input.filingStatus] ?? input.taxTables.capitalGainsBrackets['single']);

    // Standard deduction (adjusted for inflation and age)
    let standardDeduction = input.taxTables.standardDeductions[input.filingStatus as keyof typeof input.taxTables.standardDeductions] as number;
    if (typeof standardDeduction !== 'number') standardDeduction = 16100;
    if (yearsFromBase > 0) {
      standardDeduction = new Decimal(standardDeduction)
        .mul(new Decimal(1).plus(input.assumptions.inflationRate).pow(yearsFromBase))
        .round().toNumber();
    }
    if (clientAge >= 65) {
      standardDeduction += input.taxTables.standardDeductions.additional_single_65 ?? 1650;
      if (input.filingStatus === 'mfj' && coAge && coAge >= 65) {
        standardDeduction += input.taxTables.standardDeductions.additional_mfj_65 ?? 1650;
      }
    }

    const federalTaxResult = calculateFederalTax({
      ordinaryIncome: salaryIncome + pensionIncome + rmdIncome + annuityIncome + trustIncome + otherIncome,
      qualifiedDividends,
      longTermCapitalGains: 0,
      shortTermCapitalGains: seIncome > 0 ? 0 : 0,
      otherIncome: rentalIncome + businessDist,
      iraDistributions: rmdIncome,
      rothDistributions: 0,
      socialSecurityTaxable: ssTaxResult.taxableSS,
      adjustments: {
        studentLoanInterest: 0,
        selfEmploymentDeduction: seTaxResult.deductibleHalf,
        iraDeduction: 0,
        hsaDeduction: 0,
        alimonyPaid: 0,
        otherAGIAdjustments: 0,
      },
      deductions: {
        type: 'standard',
        standardAmount: standardDeduction,
        itemizedTotal: 0,
        saltAmount: 0,
        mortgageInterest: 0,
        charitableCash: 0,
        charitableNonCash: 0,
        medicalExpenses: 0,
        otherItemized: 0,
      },
      credits: {
        childTaxCredit: 0,
        childCareCredit: 0,
        educationCredit: 0,
        retirementSaverCredit: 0,
        foreignTaxCredit: 0,
        otherCredits: 0,
      },
      filingStatus: input.filingStatus,
      brackets: adjustedOrdinaryBrackets,
      cgBrackets: adjustedCGBrackets,
      year,
    });

    const agi = federalTaxResult.adjustedGrossIncome;

    const stateTaxResult = calculateStateTax({
      agi,
      state: input.stateCode,
      filingStatus: input.filingStatus,
      year,
      ssIncome: totalSSGross,
      pensionIncome,
      retirementDistributions: rmdIncome,
      age: clientAge,
    });

    const totalTax = new Decimal(federalTaxResult.federalIncomeTax)
      .plus(stateTaxResult.stateTax)
      .plus(seTaxResult.totalSETax)
      .toDP(2).toNumber();

    // --- NET CASH FLOW ---
    const netCashFlow = new Decimal(totalGrossIncome)
      .minus(totalExpenses)
      .minus(totalTax)
      .toDP(2).toNumber();

    // --- PORTFOLIO MANAGEMENT ---
    let portfolioContributions = 0;
    let portfolioWithdrawals = 0;

    if (netCashFlow >= 0) {
      const contribs = calculateContributions(input.assumptions, clientAge, netCashFlow);
      portfolioContributions = contribs.total;

      taxDeferredBalance = taxDeferredBalance.plus(contribs.taxDeferred);
      taxFreeBalance = taxFreeBalance.plus(contribs.taxFree);
      taxableBalance = taxableBalance.plus(contribs.taxable);
    } else {
      portfolioWithdrawals = Math.abs(netCashFlow);

      // Withdrawal sequence: taxable first, then tax-deferred (above RMD), then Roth
      const taxableWithdrawal = Decimal.min(taxableBalance, new Decimal(portfolioWithdrawals).mul(0.5));
      const remaining1 = new Decimal(portfolioWithdrawals).minus(taxableWithdrawal);
      const deferredWithdrawal = Decimal.min(taxDeferredBalance, remaining1.mul(0.7));
      const remaining2 = remaining1.minus(deferredWithdrawal);
      const rothWithdrawal = Decimal.min(taxFreeBalance, remaining2);

      taxableBalance = taxableBalance.minus(taxableWithdrawal);
      taxDeferredBalance = taxDeferredBalance.minus(deferredWithdrawal);
      taxFreeBalance = taxFreeBalance.minus(rothWithdrawal);
    }

    // RMD distribution from tax-deferred
    if (rmdIncome > 0) {
      taxDeferredBalance = Decimal.max(0, taxDeferredBalance.minus(rmdIncome));
    }

    // --- ACCOUNT GROWTH ---
    const prevTotalInvestable = taxableBalance.plus(taxDeferredBalance).plus(taxFreeBalance).toNumber();

    const taxableReturn = blendedReturn(input.assumptions, 'taxable', isRetired);
    const deferredReturn = blendedReturn(input.assumptions, 'tax_deferred', isRetired);
    const freeReturn = blendedReturn(input.assumptions, 'tax_free', isRetired);

    taxableBalance = taxableBalance.mul(new Decimal(1).plus(taxableReturn));
    taxDeferredBalance = taxDeferredBalance.mul(new Decimal(1).plus(deferredReturn));
    taxFreeBalance = taxFreeBalance.mul(new Decimal(1).plus(freeReturn));

    // Real estate appreciation (inflation + 1%)
    realEstateValue = realEstateValue.mul(new Decimal(1).plus(input.assumptions.inflationRate).plus(0.01));

    // Amortize liabilities
    totalLiabilities = new Decimal(amortizeLiabilities(
      input.accounts.map(a => ({
        accountType: a.accountType,
        currentBalance: a.currentBalance,
        interestRate: a.interestRate,
        monthlyPayment: a.monthlyPayment,
        remainingTerm: a.remainingTerm,
      })),
      year,
      baseYear
    ));

    const totalInvestablePortfolio = taxableBalance.plus(taxDeferredBalance).plus(taxFreeBalance).toDP(2).toNumber();
    const totalAssets = new Decimal(totalInvestablePortfolio).plus(realEstateValue).toDP(2).toNumber();
    const netWorth = new Decimal(totalAssets).minus(totalLiabilities).toDP(2).toNumber();
    const portfolioGrowth = totalInvestablePortfolio - prevTotalInvestable;

    results.push({
      year,
      clientAge,
      coAge,
      isRetired,
      salaryIncome,
      selfEmploymentIncome: seIncome,
      pensionIncome,
      socialSecurityClientGross: ssClientGross,
      socialSecurityCoGross: ssCoGross,
      socialSecurityTaxable: ssTaxResult.taxableSS,
      rentalIncome,
      investmentIncome,
      qualifiedDividends,
      capitalGainsRealized: 0,
      rmdIncome,
      rothDistributions: 0,
      annuityIncome,
      trustIncome,
      businessDistributions: businessDist,
      otherIncome,
      totalGrossIncome,
      agi,
      livingExpenses,
      healthcarePremiums,
      ltcExpenses: 0,
      goalWithdrawals,
      debtPayments,
      totalExpenses,
      federalTax: federalTaxResult.federalIncomeTax,
      stateTax: stateTaxResult.stateTax,
      seTax: seTaxResult.totalSETax,
      niit: federalTaxResult.niit,
      totalTax,
      effectiveFedRate: federalTaxResult.effectiveRate,
      netCashFlow,
      surplusDeficit: netCashFlow,
      portfolioContributions,
      portfolioWithdrawals,
      portfolioGrowth,
      taxablePortfolio: taxableBalance.toDP(2).toNumber(),
      taxDeferredPortfolio: taxDeferredBalance.toDP(2).toNumber(),
      taxFreePortfolio: taxFreeBalance.toDP(2).toNumber(),
      totalInvestablePortfolio,
      realEstateValue: realEstateValue.toDP(2).toNumber(),
      otherAssets: 0,
      totalAssets,
      totalLiabilities: totalLiabilities.toDP(2).toNumber(),
      netWorth,
    });
  }

  return results;
}

/**
 * Get goal-related withdrawals for a specific year.
 */
function getGoalWithdrawals(goals: Array<{ type: string; targetAmount: number; targetYear: number }>, year: number): number {
  let total = new Decimal(0);

  for (const goal of goals) {
    // One-time goals: full amount in target year
    if (goal.targetYear === year) {
      if (['home_purchase', 'home_renovation', 'vehicle_purchase', 'wedding',
           'major_travel', 'sabbatical', 'other_one_time'].includes(goal.type)) {
        total = total.plus(goal.targetAmount);
      }
    }

    // Education goals: spread over 4 years starting at target year
    if (goal.type.startsWith('education_')) {
      const yearsOfSchool = goal.type === 'education_private_k12' ? 12 : 4;
      if (year >= goal.targetYear && year < goal.targetYear + yearsOfSchool) {
        total = total.plus(new Decimal(goal.targetAmount).div(yearsOfSchool));
      }
    }
  }

  return total.toDP(2).toNumber();
}
