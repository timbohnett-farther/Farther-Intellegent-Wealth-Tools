import { FilingStatus } from '../types';

export type FormulaTrack = 'A' | 'B' | 'C' | 'D' | 'E';

export type GainOffsetType = 'capital_gains' | 'ordinary_income' | 'blended';

export interface ProviderStrategy {
  id: string;
  provider: string;
  name: string;
  shortName: string;
  formulaTrack: FormulaTrack;
  longRatio: number;
  shortRatio: number;
  grossMultiplier: number;
  fees: {
    mgmtFee: number;
    mgmtFeeEditable: boolean;
    preTaxFinancingCost: number;
    postTaxFinancingCost: number;
    txnCosts: number;
  };
  alpha: {
    longAlpha: number;
    shortAlpha: number;
  };
  cncl: {
    cnclBase: number;
    decaying: boolean;
    decayRate: number;
    lifetimeCap: number;
  };
  taxLossCharacter: 'capital_gains' | 'ordinary_income';
  minimumInvestment: number;
  qualifiedPurchaserRequired: boolean;
  notes?: string;
}

export interface TalsInputs {
  portfolio: {
    value: number;
    concentratedStockValue: number;
    costBasis: number;
  };
  tax: {
    filingStatus: FilingStatus;
    taxableIncome: number;
    state: string;
    // Derived rates
    ltcgRate: number;
    niitRate: number;
    stateCGRate: number;
    ordinaryRate: number;
    blendedCGRate: number;
  };
  assumptions: {
    marketReturn: number;
    horizon: number;
    riaFee: number;
    targetConcentration: number;
    gainOffsetType: GainOffsetType;
  };
  columns: TalsColumnConfig[];
}

export type ColumnType = 'hold' | 'sell_upfront' | 'direct_indexing' | 'tals';

export interface TalsColumnConfig {
  type: ColumnType;
  strategyId?: string;
  label: string;
  feeOverride?: number;
}

export interface TalsYearRow {
  year: number;
  grossReturn: number;
  taxLossesGenerated: number;
  cumulativeCNCL: number;
  taxSavings: number;
  allInCost: number;
  netTaxAlpha: number;
  concentratedPctRemaining: number;
  portfolioValue: number;
  afterTaxWealth: number;
}

export interface TalsColumnSummary {
  totalTaxSavings: number;
  totalCost: number;
  netTaxAlpha: number;
  annualizedNetAlpha: number;
  finalAfterTaxWealth: number;
  yearsToTarget: number | null;
  finalConcentration: number;
  wealthDeltaVsHold: number;
}

export interface TalsColumnResult {
  config: TalsColumnConfig;
  strategy: ProviderStrategy | null;
  yearByYear: TalsYearRow[];
  summary: TalsColumnSummary;
}

export type WarningSeverity = 'info' | 'warning' | 'critical';

export interface TalsWarning {
  type: string;
  severity: WarningSeverity;
  message: string;
  strategyId?: string;
}

export interface TalsCostBreakdown {
  columnLabel: string;
  mgmtFee: number;
  financingCost: number;
  txnCosts: number;
  riaFee: number;
  totalPreTax: number;
  taxSavingsOffset: number;
  netCost: number;
}

export interface TalsAllResults {
  columns: TalsColumnResult[];
  costAnalysis: TalsCostBreakdown[];
  warnings: TalsWarning[];
}
