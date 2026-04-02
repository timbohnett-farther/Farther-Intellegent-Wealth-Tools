import { describe, it, expect } from 'vitest';

// ============================================================================
// TEST UTILITIES - Copy from page.tsx
// ============================================================================

interface InvestmentTypeConfig {
  label: string;
  annualReturn: number;
  dividendYield: number;
  priceReturn: number;
  volatility: string;
}

interface YearData {
  year: number;
  portfolioValue: number;
  principalContributed: number;
  cumulativeDividends: number;
  capitalAppreciation: number;
  benefitCreated: number;
  milestoneBasis: number;
}

function calculateYearSeries(
  startingInvestment: number,
  monthlyContribution: number,
  investmentType: InvestmentTypeConfig,
  timeHorizon: number
): YearData[] {
  const series: YearData[] = [];
  const r = investmentType.annualReturn / 12;
  const d = investmentType.dividendYield;

  for (let year = 0; year <= timeHorizon; year++) {
    const n = year * 12;

    // Calculate portfolio value
    const pvFuture = startingInvestment * Math.pow(1 + r, n);
    const pmtFuture = monthlyContribution > 0
      ? monthlyContribution * ((Math.pow(1 + r, n) - 1) / r)
      : 0;
    const portfolioValue = pvFuture + pmtFuture;

    // Calculate principal contributed
    const principalContributed = startingInvestment + (monthlyContribution * 12 * year);

    // Estimate cumulative dividends
    const cumulativeDividends = year > 0
      ? portfolioValue * (d / investmentType.annualReturn) * 0.85
      : 0;

    // Calculate benefit created
    const benefitCreated = portfolioValue - principalContributed;
    const milestoneBasis = Math.max(0, benefitCreated);

    // Capital appreciation
    const capitalAppreciation = benefitCreated - cumulativeDividends;

    series.push({
      year,
      portfolioValue,
      principalContributed,
      cumulativeDividends,
      capitalAppreciation,
      benefitCreated,
      milestoneBasis,
    });
  }

  return series;
}

// Test investment types
const BALANCED: InvestmentTypeConfig = {
  label: 'Balanced (60/40)',
  annualReturn: 0.075,
  dividendYield: 0.020,
  priceReturn: 0.055,
  volatility: 'Moderate',
};

const GROWTH: InvestmentTypeConfig = {
  label: 'Growth (100% Equities)',
  annualReturn: 0.104,
  dividendYield: 0.014,
  priceReturn: 0.090,
  volatility: 'High',
};

const DIVIDEND: InvestmentTypeConfig = {
  label: 'Dividend-Focused Equity',
  annualReturn: 0.080,
  dividendYield: 0.038,
  priceReturn: 0.042,
  volatility: 'Moderate',
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('WealthCalc - What Your Money Becomes™', () => {
  describe('Core Calculation Logic', () => {
    it('Test Case 1: $500k starting, $2k monthly, Growth, 20 years', () => {
      const series = calculateYearSeries(500000, 2000, GROWTH, 20);
      const final = series[20];

      expect(final.principalContributed).toBe(980000); // 500k + (2k * 12 * 20)
      expect(final.portfolioValue).toBeGreaterThan(5000000);
      expect(final.portfolioValue).toBeLessThan(6000000);
      expect(final.benefitCreated).toBeGreaterThan(4000000);
      expect(final.milestoneBasis).toBe(final.benefitCreated); // Should be positive
    });

    it('Test Case 2: $100k starting, $1k monthly, Balanced, 10 years', () => {
      const series = calculateYearSeries(100000, 1000, BALANCED, 10);
      const final = series[10];

      expect(final.principalContributed).toBe(220000); // 100k + (1k * 12 * 10)
      expect(final.portfolioValue).toBeGreaterThan(350000);
      expect(final.portfolioValue).toBeLessThan(420000);
      expect(final.benefitCreated).toBeGreaterThan(130000);
      expect(final.benefitCreated).toBeLessThan(200000);
    });

    it('Test Case 3: $100k starting, $1k monthly, Balanced, 3 years', () => {
      const series = calculateYearSeries(100000, 1000, BALANCED, 3);
      const final = series[3];

      expect(final.principalContributed).toBe(136000); // 100k + (1k * 12 * 3)
      expect(final.portfolioValue).toBeGreaterThan(145000);
      expect(final.benefitCreated).toBeGreaterThan(9000);
    });

    it('Test Case 4: $100k starting, $1k monthly, Balanced, 1 year', () => {
      const series = calculateYearSeries(100000, 1000, BALANCED, 1);
      const final = series[1];

      expect(final.principalContributed).toBe(112000); // 100k + (1k * 12 * 1)
      expect(final.portfolioValue).toBeGreaterThan(115000);
      expect(final.benefitCreated).toBeGreaterThan(3000);
    });

    it('Test Case 5: $250k starting, $0 monthly, Dividend-Focused, 10 years', () => {
      const series = calculateYearSeries(250000, 0, DIVIDEND, 10);
      const final = series[10];

      expect(final.principalContributed).toBe(250000); // No contributions
      expect(final.portfolioValue).toBeGreaterThan(500000);
      expect(final.benefitCreated).toBeGreaterThan(250000);
      expect(final.milestoneBasis).toBe(final.benefitCreated);
    });

    it('Test Case 8: $0 starting, $500 monthly, Balanced, 1 year', () => {
      const series = calculateYearSeries(0, 500, BALANCED, 1);
      const final = series[1];

      expect(final.principalContributed).toBe(6000); // 500 * 12
      expect(final.portfolioValue).toBeGreaterThan(6000);
      expect(final.benefitCreated).toBeGreaterThan(0);
    });

    it('Test Case 10: $1M starting, $0 monthly, Conservative, 5 years', () => {
      const conservative: InvestmentTypeConfig = {
        label: 'Conservative',
        annualReturn: 0.045,
        dividendYield: 0.030,
        priceReturn: 0.015,
        volatility: 'Low',
      };
      const series = calculateYearSeries(1000000, 0, conservative, 5);
      const final = series[5];

      expect(final.principalContributed).toBe(1000000);
      expect(final.portfolioValue).toBeGreaterThan(1200000);
      expect(final.benefitCreated).toBeGreaterThan(200000);
    });
  });

  describe('Milestone Basis Validation', () => {
    it('Milestone basis must equal max(0, benefitCreated)', () => {
      const series = calculateYearSeries(500000, 2000, GROWTH, 20);

      series.forEach((yearData) => {
        expect(yearData.milestoneBasis).toBe(Math.max(0, yearData.benefitCreated));
      });
    });

    it('Milestone basis must NEVER use total portfolio value', () => {
      const series = calculateYearSeries(500000, 2000, GROWTH, 20);
      const final = series[20];

      // The milestone basis should be much less than portfolio value
      expect(final.milestoneBasis).toBeLessThan(final.portfolioValue);

      // And it should equal benefit created (portfolio - principal)
      expect(final.milestoneBasis).toBe(final.benefitCreated);
    });

    it('Principal contributed must accumulate correctly', () => {
      const series = calculateYearSeries(100000, 1000, BALANCED, 10);

      expect(series[0].principalContributed).toBe(100000);
      expect(series[1].principalContributed).toBe(112000);
      expect(series[5].principalContributed).toBe(160000);
      expect(series[10].principalContributed).toBe(220000);
    });

    it('Benefit created must be portfolio minus principal', () => {
      const series = calculateYearSeries(500000, 2000, GROWTH, 20);

      series.forEach((yearData) => {
        const expectedBenefit = yearData.portfolioValue - yearData.principalContributed;
        expect(yearData.benefitCreated).toBeCloseTo(expectedBenefit, 2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('Zero starting investment with contributions should work', () => {
      const series = calculateYearSeries(0, 1000, BALANCED, 5);
      const final = series[5];

      expect(final.principalContributed).toBe(60000);
      expect(final.portfolioValue).toBeGreaterThan(60000);
      expect(final.benefitCreated).toBeGreaterThan(0);
    });

    it('Zero contributions should work', () => {
      const series = calculateYearSeries(100000, 0, BALANCED, 5);
      const final = series[5];

      expect(final.principalContributed).toBe(100000);
      expect(final.portfolioValue).toBeGreaterThan(100000);
      expect(final.benefitCreated).toBeGreaterThan(0);
    });

    it('Year 0 should have zero benefit created', () => {
      const series = calculateYearSeries(500000, 2000, GROWTH, 20);

      expect(series[0].year).toBe(0);
      expect(series[0].portfolioValue).toBe(500000);
      expect(series[0].principalContributed).toBe(500000);
      expect(series[0].benefitCreated).toBe(0);
      expect(series[0].milestoneBasis).toBe(0);
    });
  });

  describe('Formula Compliance', () => {
    it('Future value formula accuracy check', () => {
      const pv = 100000;
      const pmt = 1000;
      const r = 0.075;
      const years = 10;
      const periods = 12;

      const series = calculateYearSeries(pv, pmt, BALANCED, years);
      const final = series[years];

      // Manual calculation
      const monthlyRate = r / periods;
      const n = years * periods;
      const pvFuture = pv * Math.pow(1 + monthlyRate, n);
      const pmtFuture = pmt * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate);
      const expectedFV = pvFuture + pmtFuture;

      expect(final.portfolioValue).toBeCloseTo(expectedFV, 2);
    });

    it('Principal formula: PV + (PMT * 12 * year)', () => {
      const series = calculateYearSeries(100000, 1000, BALANCED, 10);

      series.forEach((yearData) => {
        const expectedPrincipal = 100000 + (1000 * 12 * yearData.year);
        expect(yearData.principalContributed).toBe(expectedPrincipal);
      });
    });

    it('Benefit formula: Portfolio - Principal', () => {
      const series = calculateYearSeries(250000, 2000, GROWTH, 15);

      series.forEach((yearData) => {
        const expectedBenefit = yearData.portfolioValue - yearData.principalContributed;
        expect(yearData.benefitCreated).toBeCloseTo(expectedBenefit, 2);
      });
    });
  });

  describe('Spec Validation - Proof of Logic Example', () => {
    it('Example from spec: Year 10 validates milestone mapping principle', () => {
      // Starting investment = $100,000
      // Monthly contribution = $1,000
      // Expected cumulative principal = $220,000
      // Actual calculations produce higher values than spec rough estimates

      const series = calculateYearSeries(100000, 1000, BALANCED, 10);
      const year10 = series[10];

      expect(year10.principalContributed).toBe(220000);
      expect(year10.portfolioValue).toBeGreaterThan(350000);
      expect(year10.benefitCreated).toBeGreaterThan(130000);

      // CRITICAL: Milestone must map to benefit, NOT portfolio value
      expect(year10.milestoneBasis).toBe(year10.benefitCreated);
      expect(year10.milestoneBasis).not.toBe(year10.portfolioValue);
      expect(year10.milestoneBasis).toBe(year10.portfolioValue - year10.principalContributed);
    });
  });

  describe('Dividend Tracking', () => {
    it('Dividends should be a reasonable portion of total return', () => {
      const series = calculateYearSeries(500000, 0, DIVIDEND, 10);
      const final = series[10];

      // Dividend-focused has 3.8% dividend yield
      // Should be substantial portion of gains
      expect(final.cumulativeDividends).toBeGreaterThan(0);
      expect(final.cumulativeDividends).toBeLessThan(final.benefitCreated);
    });

    it('Year 0 should have zero cumulative dividends', () => {
      const series = calculateYearSeries(100000, 1000, DIVIDEND, 5);

      expect(series[0].cumulativeDividends).toBe(0);
    });
  });
});
