import { TalsInputs, TalsAllResults, TalsCostBreakdown } from '../types';
import { getProviderById } from '../providers';
import { calculateColumn, calculateHoldConcentrated } from './columnCalculator';
import { generateWarnings } from './warningEngine';
import { deriveTalsRates } from './deriveInputs';

export { deriveTalsRates } from './deriveInputs';

/**
 * Main orchestrator: compute all TALS results for up to 4 comparison columns.
 */
export function calculateTalsAll(rawInputs: TalsInputs): TalsAllResults {
  const inputs = deriveTalsRates(rawInputs);

  // First compute Hold baseline for wealth delta calculations
  const holdRows = calculateHoldConcentrated(inputs);
  const holdFinalWealth = holdRows[holdRows.length - 1]?.afterTaxWealth ?? 0;

  // Calculate each column
  const columns = inputs.columns.map((config) =>
    calculateColumn(inputs, config, holdFinalWealth)
  );

  // Build cost analysis
  const costAnalysis: TalsCostBreakdown[] = columns.map((col) => {
    const strategy = col.strategy;
    const pv = inputs.portfolio.value;
    const horizon = inputs.assumptions.horizon;

    if (col.config.type === 'hold') {
      return {
        columnLabel: col.config.label,
        mgmtFee: 0,
        financingCost: 0,
        txnCosts: 0,
        riaFee: 0,
        totalPreTax: 0,
        taxSavingsOffset: 0,
        netCost: 0,
      };
    }

    if (col.config.type === 'sell_upfront') {
      const riaTotal = inputs.assumptions.riaFee * pv * horizon;
      return {
        columnLabel: col.config.label,
        mgmtFee: 0,
        financingCost: 0,
        txnCosts: 0,
        riaFee: riaTotal,
        totalPreTax: riaTotal,
        taxSavingsOffset: 0,
        netCost: riaTotal,
      };
    }

    if (col.config.type === 'direct_indexing') {
      const diMgmt = 0.002 * pv * horizon;
      const riaTotal = inputs.assumptions.riaFee * pv * horizon;
      const totalSavings = col.summary.totalTaxSavings;
      return {
        columnLabel: col.config.label,
        mgmtFee: diMgmt,
        financingCost: 0,
        txnCosts: 0,
        riaFee: riaTotal,
        totalPreTax: diMgmt + riaTotal,
        taxSavingsOffset: totalSavings,
        netCost: diMgmt + riaTotal - totalSavings,
      };
    }

    // TALS strategy
    if (!strategy) {
      return {
        columnLabel: col.config.label,
        mgmtFee: 0, financingCost: 0, txnCosts: 0, riaFee: 0,
        totalPreTax: 0, taxSavingsOffset: 0, netCost: 0,
      };
    }

    const mgmtFee = (col.config.feeOverride ?? strategy.fees.mgmtFee) * pv * horizon;
    const financingCost = strategy.fees.postTaxFinancingCost * pv * horizon;
    const txnCosts = strategy.fees.txnCosts * pv * horizon;
    const riaTotal = inputs.assumptions.riaFee * pv * horizon;
    const totalPreTax = mgmtFee + financingCost + txnCosts + riaTotal;
    const totalSavings = col.summary.totalTaxSavings;

    return {
      columnLabel: col.config.label,
      mgmtFee,
      financingCost,
      txnCosts,
      riaFee: riaTotal,
      totalPreTax,
      taxSavingsOffset: totalSavings,
      netCost: totalPreTax - totalSavings,
    };
  });

  const warnings = generateWarnings(inputs);

  return { columns, costAnalysis, warnings };
}
