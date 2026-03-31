import { TalsInputs } from './types';

export const DEFAULT_TALS_INPUTS: TalsInputs = {
  portfolio: {
    value: 5_000_000,
    concentratedStockValue: 5_000_000,
    costBasis: 500_000,
  },
  tax: {
    filingStatus: 'mfj',
    taxableIncome: 800_000,
    state: 'CA',
    ltcgRate: 0.20,
    niitRate: 0.038,
    stateCGRate: 0.133,
    ordinaryRate: 0.37,
    blendedCGRate: 0.371,
  },
  assumptions: {
    marketReturn: 0.085,
    horizon: 15,
    riaFee: 0.0075,
    targetConcentration: 0.10,
    gainOffsetType: 'capital_gains',
  },
  columns: [
    { type: 'hold', label: 'Hold Concentrated' },
    { type: 'sell_upfront', label: 'Sell & Reinvest' },
    { type: 'direct_indexing', label: 'Direct Indexing' },
    { type: 'tals', strategyId: 'aqr_145_45', label: 'AQR 145/45' },
  ],
};
