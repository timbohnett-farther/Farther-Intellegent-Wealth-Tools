// =============================================================================
// Tax Planning Platform -- Policy Dataset Registry
// =============================================================================
//
// Provides tax policy lookup tables (federal brackets, standard deductions,
// LTCG thresholds, AMT parameters, NIIT, IRMAA, SE tax, SALT caps, QBI, etc.)
// keyed by TaxYear.  Stage 1 ships with stubbed-but-real 2025 and 2026
// datasets sourced from IRS publications.
//
// All monetary values are stored as MoneyCents (cents).
// All rates are stored as RateBps (basis points, 1% = 100 bps).
// =============================================================================

import type { TaxYear, MoneyCents, RateBps } from './types';

// ==================== Tax Policy Table Shape ====================

/**
 * Complete tax policy lookup tables for a single federal tax year.
 *
 * Each table is keyed by filing status where applicable.  Filing status keys
 * use the canonical values: "SINGLE", "MFJ", "MFS", "HOH", "QW".
 */
interface TaxPolicyTables {
  /** The tax year these tables apply to. */
  taxYear: TaxYear;

  // ---- Ordinary income brackets by filing status ----
  /**
   * Progressive ordinary income brackets.  Each entry defines the lower
   * threshold (inclusive) and the marginal rate that applies above it.
   * Thresholds are cumulative -- the last bracket captures everything above
   * its threshold at the stated rate.
   */
  ordinaryBrackets: Record<string, Array<{ threshold: MoneyCents; rate: RateBps }>>;

  // ---- Standard deduction ----
  /** Standard deduction amount by filing status. */
  standardDeduction: Record<string, MoneyCents>;

  // ---- Long-term capital gains / qualified dividends ----
  /**
   * LTCG / qualified dividend rate thresholds by filing status.
   * 0%, 15%, and 20% rate tiers.
   */
  ltcgThresholds: Record<string, Array<{ threshold: MoneyCents; rate: RateBps }>>;

  // ---- Alternative Minimum Tax ----
  /** AMT exemption amounts and phaseout start thresholds by filing status. */
  amtExemption: Record<string, { exemption: MoneyCents; phaseoutStart: MoneyCents }>;
  /** AMT rate structure: 26% rate up to threshold, 28% above. */
  amtRates: { rate26: RateBps; rate28: RateBps; threshold: MoneyCents };

  // ---- Net Investment Income Tax (NIIT) ----
  /** NIIT MAGI threshold by filing status. */
  niitThreshold: Record<string, MoneyCents>;
  /** NIIT rate (3.8% = 380 bps). */
  niitRate: RateBps;

  // ---- Social Security benefit taxation ----
  /**
   * Provisional income thresholds that trigger SS benefit taxation.
   * - Below baseAmount: 0% taxable
   * - Between base and upper: up to 50% taxable
   * - Above upperAmount: up to 85% taxable
   */
  ssTaxation: {
    baseAmount: Record<string, MoneyCents>;
    upperAmount: Record<string, MoneyCents>;
  };

  // ---- IRMAA (Income-Related Monthly Adjustment Amount) ----
  /**
   * Simplified IRMAA brackets for Medicare Part B premium and Part D
   * surcharge determination.  MAGI floor is for single filers (double
   * for MFJ where applicable).
   */
  irmaaBrackets: Array<{
    magiFloor: MoneyCents;
    partBPremium: MoneyCents;
    partDSurcharge: MoneyCents;
  }>;

  // ---- Self-Employment Tax ----
  /** Social Security wage base cap. */
  seWageBase: MoneyCents;
  /** SE tax rate components in basis points. */
  seTaxRates: {
    socialSecurity: RateBps;
    medicare: RateBps;
    additionalMedicare: RateBps;
  };
  /** Additional Medicare tax threshold by filing status. */
  additionalMedicareThreshold: Record<string, MoneyCents>;

  // ---- State and Local Tax (SALT) Deduction ----
  /** SALT deduction cap by filing status. */
  saltCap: Record<string, MoneyCents>;
  /** Income threshold above which the SALT cap is reduced (per SALT cap legislation). */
  saltCapReductionThreshold: Record<string, MoneyCents>;

  // ---- Qualified Business Income (Section 199A) ----
  /** QBI deduction phase-out threshold by filing status. */
  qbiThreshold: Record<string, MoneyCents>;
}

// ==================== Helper Casting Functions ====================

/** Cast a plain number to MoneyCents branded type. */
function mc(value: number): MoneyCents {
  return value as MoneyCents;
}

/** Cast a plain number to RateBps branded type. */
function rb(value: number): RateBps {
  return value as RateBps;
}

/** Cast a plain number to TaxYear branded type. */
function ty(value: number): TaxYear {
  return value as TaxYear;
}

// ==================== Policy Registry ====================

/**
 * Registry that holds tax policy datasets keyed by TaxYear.
 *
 * Pre-loaded with 2025 and 2026 federal policy data sourced from IRS
 * publications (Rev. Proc. 2024-40 for 2025, Rev. Proc. 2025-XX for 2026).
 *
 * This class is not exported directly -- consumers use the singleton
 * {@link policyRegistry} instance.
 */
class PolicyRegistry {
  private datasets: Map<TaxYear, TaxPolicyTables> = new Map();

  constructor() {
    this.loadYear2025();
    this.loadYear2026();
  }

  // -------------------- Public API --------------------

  /**
   * Retrieves the full policy table set for a given tax year.
   *
   * @param taxYear - The tax year to look up.
   * @returns The TaxPolicyTables for that year, or undefined if unavailable.
   */
  getPolicy(taxYear: TaxYear): TaxPolicyTables | undefined {
    return this.datasets.get(taxYear);
  }

  /**
   * Returns all tax years for which policy data is available.
   *
   * @returns Sorted array of available TaxYear values.
   */
  getAvailableYears(): TaxYear[] {
    return Array.from(this.datasets.keys()).sort((a, b) => (a as number) - (b as number));
  }

  // ==================== 2025 Dataset ====================

  /**
   * Loads 2025 federal tax policy data.
   *
   * Sources:
   * - IRS Rev. Proc. 2024-40 (inflation adjustments for 2025)
   * - IRS Publication 15-T (2025 withholding tables)
   * - SSA wage base announcement
   */
  private loadYear2025(): void {
    const year: TaxYear = ty(2025);

    const tables: TaxPolicyTables = {
      taxYear: year,

      // ---- 2025 Ordinary Income Brackets ----
      ordinaryBrackets: {
        SINGLE: [
          { threshold: mc(0),          rate: rb(1000) },   // 10% on first $11,925
          { threshold: mc(1192500),    rate: rb(1200) },   // 12% $11,926 - $48,475
          { threshold: mc(4847500),    rate: rb(2200) },   // 22% $48,476 - $103,350
          { threshold: mc(10335000),   rate: rb(2400) },   // 24% $103,351 - $197,300
          { threshold: mc(19730000),   rate: rb(3200) },   // 32% $197,301 - $250,525
          { threshold: mc(25052500),   rate: rb(3500) },   // 35% $250,526 - $626,350
          { threshold: mc(62635000),   rate: rb(3700) },   // 37% over $626,350
        ],
        MFJ: [
          { threshold: mc(0),          rate: rb(1000) },   // 10% on first $23,850
          { threshold: mc(2385000),    rate: rb(1200) },   // 12% $23,851 - $96,950
          { threshold: mc(9695000),    rate: rb(2200) },   // 22% $96,951 - $206,700
          { threshold: mc(20670000),   rate: rb(2400) },   // 24% $206,701 - $394,600
          { threshold: mc(39460000),   rate: rb(3200) },   // 32% $394,601 - $501,050
          { threshold: mc(50105000),   rate: rb(3500) },   // 35% $501,051 - $751,600
          { threshold: mc(75160000),   rate: rb(3700) },   // 37% over $751,600
        ],
        MFS: [
          { threshold: mc(0),          rate: rb(1000) },   // 10% on first $11,925
          { threshold: mc(1192500),    rate: rb(1200) },   // 12% $11,926 - $48,475
          { threshold: mc(4847500),    rate: rb(2200) },   // 22% $48,476 - $103,350
          { threshold: mc(10335000),   rate: rb(2400) },   // 24% $103,351 - $197,300
          { threshold: mc(19730000),   rate: rb(3200) },   // 32% $197,301 - $250,525
          { threshold: mc(25052500),   rate: rb(3500) },   // 35% $250,526 - $375,800
          { threshold: mc(37580000),   rate: rb(3700) },   // 37% over $375,800
        ],
        HOH: [
          { threshold: mc(0),          rate: rb(1000) },   // 10% on first $17,000
          { threshold: mc(1700000),    rate: rb(1200) },   // 12% $17,001 - $64,850
          { threshold: mc(6485000),    rate: rb(2200) },   // 22% $64,851 - $103,350
          { threshold: mc(10335000),   rate: rb(2400) },   // 24% $103,351 - $197,300
          { threshold: mc(19730000),   rate: rb(3200) },   // 32% $197,301 - $250,500
          { threshold: mc(25050000),   rate: rb(3500) },   // 35% $250,501 - $626,350
          { threshold: mc(62635000),   rate: rb(3700) },   // 37% over $626,350
        ],
      },

      // ---- 2025 Standard Deduction ----
      standardDeduction: {
        SINGLE: mc(1500000),   // $15,000
        MFJ:    mc(3000000),   // $30,000
        MFS:    mc(1500000),   // $15,000
        HOH:    mc(2250000),   // $22,500
        QW:     mc(3000000),   // $30,000 (same as MFJ)
      },

      // ---- 2025 LTCG / Qualified Dividend Thresholds ----
      ltcgThresholds: {
        SINGLE: [
          { threshold: mc(0),          rate: rb(0) },      // 0% up to $48,350
          { threshold: mc(4835000),    rate: rb(1500) },   // 15% $48,351 - $533,400
          { threshold: mc(53340000),   rate: rb(2000) },   // 20% over $533,400
        ],
        MFJ: [
          { threshold: mc(0),          rate: rb(0) },      // 0% up to $96,700
          { threshold: mc(9670000),    rate: rb(1500) },   // 15% $96,701 - $600,050
          { threshold: mc(60005000),   rate: rb(2000) },   // 20% over $600,050
        ],
        MFS: [
          { threshold: mc(0),          rate: rb(0) },      // 0% up to $48,350
          { threshold: mc(4835000),    rate: rb(1500) },   // 15% $48,351 - $300,000
          { threshold: mc(30000000),   rate: rb(2000) },   // 20% over $300,000
        ],
        HOH: [
          { threshold: mc(0),          rate: rb(0) },      // 0% up to $64,750
          { threshold: mc(6475000),    rate: rb(1500) },   // 15% $64,751 - $566,700
          { threshold: mc(56670000),   rate: rb(2000) },   // 20% over $566,700
        ],
      },

      // ---- 2025 AMT ----
      amtExemption: {
        SINGLE: { exemption: mc(8880000),   phaseoutStart: mc(63290000)  },  // $88,800 / $632,900
        MFJ:    { exemption: mc(13780000),  phaseoutStart: mc(118870000) },  // $137,800 / $1,188,700
        MFS:    { exemption: mc(6890000),   phaseoutStart: mc(59435000)  },  // $68,900 / $594,350
        HOH:    { exemption: mc(8880000),   phaseoutStart: mc(63290000)  },  // $88,800 / $632,900
      },
      amtRates: {
        rate26:    rb(2600),      // 26%
        rate28:    rb(2800),      // 28%
        threshold: mc(23290000),  // $232,900 (single) -- threshold where 28% kicks in
      },

      // ---- NIIT ----
      niitThreshold: {
        SINGLE: mc(20000000),   // $200,000
        MFJ:    mc(25000000),   // $250,000
        MFS:    mc(12500000),   // $125,000
        HOH:    mc(20000000),   // $200,000
        QW:     mc(25000000),   // $250,000
      },
      niitRate: rb(380),        // 3.8%

      // ---- Social Security Benefit Taxation Thresholds ----
      ssTaxation: {
        baseAmount: {
          SINGLE: mc(2500000),  // $25,000
          MFJ:    mc(3200000),  // $32,000
          MFS:    mc(0),        // $0 (MFS always taxed)
          HOH:    mc(2500000),  // $25,000
        },
        upperAmount: {
          SINGLE: mc(3400000),  // $34,000
          MFJ:    mc(4400000),  // $44,000
          MFS:    mc(0),        // $0
          HOH:    mc(3400000),  // $34,000
        },
      },

      // ---- 2025 IRMAA Brackets (Simplified v0) ----
      // Based on 2023 MAGI for 2025 premiums
      irmaaBrackets: [
        { magiFloor: mc(0),           partBPremium: mc(18550),  partDSurcharge: mc(0)    },  // $185.50/mo standard
        { magiFloor: mc(10600000),    partBPremium: mc(25970),  partDSurcharge: mc(1310) },  // $106,000
        { magiFloor: mc(13300000),    partBPremium: mc(37060),  partDSurcharge: mc(3390) },  // $133,000
        { magiFloor: mc(16700000),    partBPremium: mc(48150),  partDSurcharge: mc(5470) },  // $167,000
        { magiFloor: mc(20000000),    partBPremium: mc(59240),  partDSurcharge: mc(7550) },  // $200,000
        { magiFloor: mc(50000000),    partBPremium: mc(62500),  partDSurcharge: mc(8190) },  // $500,000+
      ],

      // ---- 2025 Self-Employment Tax ----
      seWageBase: mc(17610000),  // $176,100
      seTaxRates: {
        socialSecurity:     rb(1240),  // 12.4% (combined employee + employer)
        medicare:           rb(290),   // 2.9% (combined employee + employer)
        additionalMedicare: rb(90),    // 0.9% additional Medicare
      },
      additionalMedicareThreshold: {
        SINGLE: mc(20000000),   // $200,000
        MFJ:    mc(25000000),   // $250,000
        MFS:    mc(12500000),   // $125,000
        HOH:    mc(20000000),   // $200,000
      },

      // ---- SALT Cap ----
      saltCap: {
        SINGLE: mc(1000000),    // $10,000
        MFJ:    mc(1000000),    // $10,000
        MFS:    mc(500000),     // $5,000
        HOH:    mc(1000000),    // $10,000
      },
      // No reduction threshold in current law (TCJA cap is flat)
      saltCapReductionThreshold: {
        SINGLE: mc(0),
        MFJ:    mc(0),
        MFS:    mc(0),
        HOH:    mc(0),
      },

      // ---- 2025 QBI (Section 199A) Threshold ----
      qbiThreshold: {
        SINGLE: mc(19140000),   // $191,950 -- rounded to published figure
        MFJ:    mc(38390000),   // $383,900
        MFS:    mc(19140000),   // $191,950
        HOH:    mc(19140000),   // $191,950
      },
    };

    this.datasets.set(year, tables);
  }

  // ==================== 2026 Dataset ====================

  /**
   * Loads 2026 federal tax policy data.
   *
   * Sources:
   * - IRS Rev. Proc. 2025-XX (inflation adjustments for 2026)
   * - SSA wage base announcement for 2026
   *
   * Note: 2026 figures use projected/announced inflation adjustments.
   * Some values may be updated when final IRS guidance is published.
   */
  private loadYear2026(): void {
    const year: TaxYear = ty(2026);

    const tables: TaxPolicyTables = {
      taxYear: year,

      // ---- 2026 Ordinary Income Brackets ----
      // Inflation-adjusted from 2025 per IRS methodology
      ordinaryBrackets: {
        SINGLE: [
          { threshold: mc(0),          rate: rb(1000) },   // 10% on first $11,925
          { threshold: mc(1192500),    rate: rb(1200) },   // 12% $11,926 - $49,475
          { threshold: mc(4947500),    rate: rb(2200) },   // 22% $49,476 - $105,525
          { threshold: mc(10552500),   rate: rb(2400) },   // 24% $105,526 - $201,350
          { threshold: mc(20135000),   rate: rb(3200) },   // 32% $201,351 - $256,000
          { threshold: mc(25600000),   rate: rb(3500) },   // 35% $256,001 - $640,600
          { threshold: mc(64060000),   rate: rb(3700) },   // 37% over $640,600
        ],
        MFJ: [
          { threshold: mc(0),          rate: rb(1000) },   // 10% on first $23,850
          { threshold: mc(2385000),    rate: rb(1200) },   // 12% $23,851 - $98,950
          { threshold: mc(9895000),    rate: rb(2200) },   // 22% $98,951 - $211,050
          { threshold: mc(21105000),   rate: rb(2400) },   // 24% $211,051 - $402,700
          { threshold: mc(40270000),   rate: rb(3200) },   // 32% $402,701 - $512,050
          { threshold: mc(51205000),   rate: rb(3500) },   // 35% $512,051 - $768,450
          { threshold: mc(76845000),   rate: rb(3700) },   // 37% over $768,450
        ],
        MFS: [
          { threshold: mc(0),          rate: rb(1000) },   // 10% on first $11,925
          { threshold: mc(1192500),    rate: rb(1200) },   // 12% $11,926 - $49,475
          { threshold: mc(4947500),    rate: rb(2200) },   // 22% $49,476 - $105,525
          { threshold: mc(10552500),   rate: rb(2400) },   // 24% $105,526 - $201,350
          { threshold: mc(20135000),   rate: rb(3200) },   // 32% $201,351 - $256,000
          { threshold: mc(25600000),   rate: rb(3500) },   // 35% $256,001 - $384,225
          { threshold: mc(38422500),   rate: rb(3700) },   // 37% over $384,225
        ],
        HOH: [
          { threshold: mc(0),          rate: rb(1000) },   // 10% on first $17,350
          { threshold: mc(1735000),    rate: rb(1200) },   // 12% $17,351 - $66,250
          { threshold: mc(6625000),    rate: rb(2200) },   // 22% $66,251 - $105,525
          { threshold: mc(10552500),   rate: rb(2400) },   // 24% $105,526 - $201,350
          { threshold: mc(20135000),   rate: rb(3200) },   // 32% $201,351 - $256,000
          { threshold: mc(25600000),   rate: rb(3500) },   // 35% $256,001 - $640,600
          { threshold: mc(64060000),   rate: rb(3700) },   // 37% over $640,600
        ],
      },

      // ---- 2026 Standard Deduction ----
      standardDeduction: {
        SINGLE: mc(1535000),   // $15,350
        MFJ:    mc(3070000),   // $30,700
        MFS:    mc(1535000),   // $15,350
        HOH:    mc(2305000),   // $23,050
        QW:     mc(3070000),   // $30,700 (same as MFJ)
      },

      // ---- 2026 LTCG / Qualified Dividend Thresholds ----
      // Inflation-adjusted from 2025
      ltcgThresholds: {
        SINGLE: [
          { threshold: mc(0),          rate: rb(0) },      // 0% up to $49,350
          { threshold: mc(4935000),    rate: rb(1500) },   // 15% $49,351 - $544,250
          { threshold: mc(54425000),   rate: rb(2000) },   // 20% over $544,250
        ],
        MFJ: [
          { threshold: mc(0),          rate: rb(0) },      // 0% up to $98,750
          { threshold: mc(9875000),    rate: rb(1500) },   // 15% $98,751 - $612,350
          { threshold: mc(61235000),   rate: rb(2000) },   // 20% over $612,350
        ],
        MFS: [
          { threshold: mc(0),          rate: rb(0) },      // 0% up to $49,350
          { threshold: mc(4935000),    rate: rb(1500) },   // 15% $49,351 - $306,175
          { threshold: mc(30617500),   rate: rb(2000) },   // 20% over $306,175
        ],
        HOH: [
          { threshold: mc(0),          rate: rb(0) },      // 0% up to $66,150
          { threshold: mc(6615000),    rate: rb(1500) },   // 15% $66,151 - $578,450
          { threshold: mc(57845000),   rate: rb(2000) },   // 20% over $578,450
        ],
      },

      // ---- 2026 AMT ----
      amtExemption: {
        SINGLE: { exemption: mc(9070000),   phaseoutStart: mc(64620000)  },  // $90,700 / $646,200
        MFJ:    { exemption: mc(14070000),  phaseoutStart: mc(121270000) },  // $140,700 / $1,212,700
        MFS:    { exemption: mc(7035000),   phaseoutStart: mc(60635000)  },  // $70,350 / $606,350
        HOH:    { exemption: mc(9070000),   phaseoutStart: mc(64620000)  },  // $90,700 / $646,200
      },
      amtRates: {
        rate26:    rb(2600),      // 26%
        rate28:    rb(2800),      // 28%
        threshold: mc(23960000),  // $239,600 -- inflation adjusted
      },

      // ---- NIIT (not indexed for inflation -- unchanged) ----
      niitThreshold: {
        SINGLE: mc(20000000),   // $200,000
        MFJ:    mc(25000000),   // $250,000
        MFS:    mc(12500000),   // $125,000
        HOH:    mc(20000000),   // $200,000
        QW:     mc(25000000),   // $250,000
      },
      niitRate: rb(380),        // 3.8%

      // ---- Social Security Benefit Taxation (not indexed -- unchanged) ----
      ssTaxation: {
        baseAmount: {
          SINGLE: mc(2500000),  // $25,000
          MFJ:    mc(3200000),  // $32,000
          MFS:    mc(0),        // $0
          HOH:    mc(2500000),  // $25,000
        },
        upperAmount: {
          SINGLE: mc(3400000),  // $34,000
          MFJ:    mc(4400000),  // $44,000
          MFS:    mc(0),        // $0
          HOH:    mc(3400000),  // $34,000
        },
      },

      // ---- 2026 IRMAA Brackets (Simplified v0) ----
      // Based on projected 2024 MAGI for 2026 premiums
      irmaaBrackets: [
        { magiFloor: mc(0),           partBPremium: mc(19050),  partDSurcharge: mc(0)    },  // ~$190.50/mo standard
        { magiFloor: mc(10800000),    partBPremium: mc(26670),  partDSurcharge: mc(1350) },  // $108,000
        { magiFloor: mc(13600000),    partBPremium: mc(38100),  partDSurcharge: mc(3480) },  // $136,000
        { magiFloor: mc(17000000),    partBPremium: mc(49520),  partDSurcharge: mc(5620) },  // $170,000
        { magiFloor: mc(20400000),    partBPremium: mc(60950),  partDSurcharge: mc(7760) },  // $204,000
        { magiFloor: mc(51200000),    partBPremium: mc(64300),  partDSurcharge: mc(8420) },  // $512,000+
      ],

      // ---- 2026 Self-Employment Tax ----
      seWageBase: mc(18450000),  // $184,500
      seTaxRates: {
        socialSecurity:     rb(1240),  // 12.4%
        medicare:           rb(290),   // 2.9%
        additionalMedicare: rb(90),    // 0.9%
      },
      additionalMedicareThreshold: {
        SINGLE: mc(20000000),   // $200,000 (not indexed)
        MFJ:    mc(25000000),   // $250,000
        MFS:    mc(12500000),   // $125,000
        HOH:    mc(20000000),   // $200,000
      },

      // ---- SALT Cap ----
      saltCap: {
        SINGLE: mc(1000000),    // $10,000
        MFJ:    mc(1000000),    // $10,000
        MFS:    mc(500000),     // $5,000
        HOH:    mc(1000000),    // $10,000
      },
      saltCapReductionThreshold: {
        SINGLE: mc(0),
        MFJ:    mc(0),
        MFS:    mc(0),
        HOH:    mc(0),
      },

      // ---- 2026 QBI (Section 199A) Threshold ----
      qbiThreshold: {
        SINGLE: mc(19750000),   // $197,500 -- inflation adjusted
        MFJ:    mc(39500000),   // $395,000
        MFS:    mc(19750000),   // $197,500
        HOH:    mc(19750000),   // $197,500
      },
    };

    this.datasets.set(year, tables);
  }
}

// ==================== Singleton Export ====================

/** Global policy registry instance pre-loaded with 2025 and 2026 data. */
export const policyRegistry = new PolicyRegistry();

export type { TaxPolicyTables };
