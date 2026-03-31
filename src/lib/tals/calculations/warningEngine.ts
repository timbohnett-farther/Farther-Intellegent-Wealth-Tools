import { TalsInputs, TalsWarning } from '../types';
import { getProviderById } from '../providers';

export function generateWarnings(inputs: TalsInputs): TalsWarning[] {
  const warnings: TalsWarning[] = [];
  const { portfolio, assumptions } = inputs;

  // Horizon warnings
  if (assumptions.horizon < 5) {
    warnings.push({
      type: 'short_horizon',
      severity: 'warning',
      message: `A ${assumptions.horizon}-year horizon may not generate sufficient tax alpha. TALS strategies typically need 5+ years to realize meaningful benefits.`,
    });
  }

  // Gain ratio warning
  const gainRatio = portfolio.concentratedStockValue > 0
    ? (portfolio.concentratedStockValue - portfolio.costBasis) / portfolio.concentratedStockValue
    : 0;
  if (gainRatio > 0.90) {
    warnings.push({
      type: 'high_gain_ratio',
      severity: 'warning',
      message: `Unrealized gain is ${(gainRatio * 100).toFixed(0)}% of position value. Consider the tax impact carefully when comparing strategies.`,
    });
  }

  // Per-strategy warnings
  for (const col of inputs.columns) {
    if (col.type !== 'tals' || !col.strategyId) continue;

    const provider = getProviderById(col.strategyId);
    if (!provider) continue;

    // QP required + portfolio too small
    if (provider.qualifiedPurchaserRequired && portfolio.value < 5_000_000) {
      warnings.push({
        type: 'qp_required',
        severity: 'critical',
        message: `${provider.name} requires Qualified Purchaser status ($5M+ in investments). Current portfolio: $${(portfolio.value / 1_000_000).toFixed(1)}M.`,
        strategyId: provider.id,
      });
    }

    // Below provider minimum
    if (portfolio.value < provider.minimumInvestment) {
      warnings.push({
        type: 'below_minimum',
        severity: 'critical',
        message: `${provider.name} requires a minimum investment of $${(provider.minimumInvestment / 1_000_000).toFixed(1)}M. Current portfolio: $${(portfolio.value / 1_000_000).toFixed(1)}M.`,
        strategyId: provider.id,
      });
    }

    // Neuberger Berman — new product note
    if (provider.id === 'neuberger_130_30') {
      warnings.push({
        type: 'new_product',
        severity: 'info',
        message: `${provider.name} is a newer TALS offering with limited track record. Verify current availability and terms.`,
        strategyId: provider.id,
      });
    }
  }

  // State-specific notes
  if (inputs.tax.state === 'OR' || inputs.tax.state === 'NJ') {
    warnings.push({
      type: 'state_deductibility',
      severity: 'info',
      message: `${inputs.tax.state === 'OR' ? 'Oregon' : 'New Jersey'} has specific rules on margin interest deductibility that may affect net cost calculations.`,
    });
  }

  return warnings;
}
