/**
 * Statement Normalizer
 *
 * Normalizes OCR-extracted holdings across different custodian formats (Schwab, Fidelity, Vanguard, Merrill, Morgan Stanley).
 * Handles messy AI output, infers asset classes from ticker symbols and descriptions, validates holdings, and merges duplicates.
 */

import type { Holding, AssetClass, AccountType, MoneyCents } from '@/lib/proposal-engine/types';

/**
 * Raw holding shape from AI OCR extraction — all fields optional, multiple naming conventions
 */
export interface RawHolding {
  // Ticker variations
  symbol?: string;
  ticker?: string;

  // Description variations
  description?: string;
  name?: string;

  // Quantity variations
  quantity?: number;
  shares?: number;

  // Price variations
  price?: number;

  // Market value variations
  value?: number;
  marketValue?: number;
  market_value?: number;

  // Cost basis variations
  costBasis?: number;
  cost_basis?: number;

  // Asset class variations
  assetClass?: string;
  asset_class?: string;

  // Account type variations
  accountType?: string;
  account_type?: string;

  // Optional metadata
  expenseRatio?: number;
  expense_ratio?: number;
  cusip?: string;
  accountName?: string;
  account_name?: string;
}

/**
 * Validation result with warnings
 */
export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

/**
 * Known ETF ticker → asset class mapping
 * Based on the most common institutional holdings
 */
const TICKER_ASSET_CLASS_MAP: Record<string, AssetClass> = {
  // US Large Cap Equity
  'VTI': 'EQUITY_US_LARGE',
  'VOO': 'EQUITY_US_LARGE',
  'SPY': 'EQUITY_US_LARGE',
  'IVV': 'EQUITY_US_LARGE',
  'SCHX': 'EQUITY_US_LARGE',
  'ITOT': 'EQUITY_US_LARGE',
  'VV': 'EQUITY_US_LARGE',

  // US Mid Cap
  'VO': 'EQUITY_US_MID',
  'IJH': 'EQUITY_US_MID',
  'SCHM': 'EQUITY_US_MID',
  'MDY': 'EQUITY_US_MID',
  'IWR': 'EQUITY_US_MID',

  // US Small Cap
  'VB': 'EQUITY_US_SMALL',
  'IJR': 'EQUITY_US_SMALL',
  'SCHA': 'EQUITY_US_SMALL',
  'IWM': 'EQUITY_US_SMALL',
  'VTWO': 'EQUITY_US_SMALL',

  // International Developed
  'VXUS': 'EQUITY_INTL_DEVELOPED',
  'VEA': 'EQUITY_INTL_DEVELOPED',
  'IEFA': 'EQUITY_INTL_DEVELOPED',
  'SCHF': 'EQUITY_INTL_DEVELOPED',
  'EFA': 'EQUITY_INTL_DEVELOPED',
  'IXUS': 'EQUITY_INTL_DEVELOPED',

  // Emerging Markets
  'VWO': 'EQUITY_INTL_EMERGING',
  'IEMG': 'EQUITY_INTL_EMERGING',
  'EEM': 'EQUITY_INTL_EMERGING',
  'SCHE': 'EQUITY_INTL_EMERGING',

  // Sector ETFs
  'QQQ': 'EQUITY_SECTOR',
  'XLK': 'EQUITY_SECTOR',
  'XLF': 'EQUITY_SECTOR',
  'XLE': 'EQUITY_SECTOR',
  'XLV': 'EQUITY_SECTOR',
  'XLY': 'EQUITY_SECTOR',
  'XLP': 'EQUITY_SECTOR',
  'XLI': 'EQUITY_SECTOR',
  'XLB': 'EQUITY_SECTOR',
  'XLU': 'EQUITY_SECTOR',

  // Government Bonds
  'BND': 'FIXED_INCOME_GOVT',
  'AGG': 'FIXED_INCOME_GOVT',
  'VBTLX': 'FIXED_INCOME_GOVT',
  'SCHZ': 'FIXED_INCOME_GOVT',
  'IEF': 'FIXED_INCOME_GOVT',
  'SHY': 'FIXED_INCOME_GOVT',
  'TLT': 'FIXED_INCOME_GOVT',

  // Corporate Bonds (Investment Grade)
  'VCIT': 'FIXED_INCOME_CORP_IG',
  'LQD': 'FIXED_INCOME_CORP_IG',
  'VCLT': 'FIXED_INCOME_CORP_IG',
  'USIG': 'FIXED_INCOME_CORP_IG',

  // Corporate Bonds (High Yield)
  'HYG': 'FIXED_INCOME_CORP_HY',
  'JNK': 'FIXED_INCOME_CORP_HY',

  // Municipal Bonds
  'MUB': 'FIXED_INCOME_MUNI',
  'TFI': 'FIXED_INCOME_MUNI',
  'VTEB': 'FIXED_INCOME_MUNI',

  // TIPS
  'VTIP': 'FIXED_INCOME_TIPS',
  'TIP': 'FIXED_INCOME_TIPS',
  'SCHP': 'FIXED_INCOME_TIPS',

  // Real Estate
  'VNQ': 'REAL_ESTATE',
  'XLRE': 'REAL_ESTATE',
  'IYR': 'REAL_ESTATE',
  'SCHH': 'REAL_ESTATE',

  // Gold
  'GLD': 'GOLD',
  'IAU': 'GOLD',
  'GLDM': 'GOLD',

  // Cash Equivalents
  'SGOV': 'CASH_EQUIVALENT',
  'BIL': 'CASH_EQUIVALENT',
  'SHV': 'CASH_EQUIVALENT',
  'SCHO': 'CASH_EQUIVALENT',
};

/**
 * Infer asset class from ticker symbol and description
 */
export function inferAssetClass(ticker: string | null, description: string): AssetClass {
  // Check ticker mapping first
  if (ticker) {
    const upperTicker = ticker.toUpperCase().trim();
    if (TICKER_ASSET_CLASS_MAP[upperTicker]) {
      return TICKER_ASSET_CLASS_MAP[upperTicker];
    }
  }

  // Description-based fallback
  const lowerDesc = description.toLowerCase();

  // Fixed income
  if (lowerDesc.includes('bond') || lowerDesc.includes('fixed income')) {
    if (lowerDesc.includes('municipal') || lowerDesc.includes('muni')) return 'FIXED_INCOME_MUNI';
    if (lowerDesc.includes('treasury') || lowerDesc.includes('govt') || lowerDesc.includes('government')) return 'FIXED_INCOME_GOVT';
    if (lowerDesc.includes('corporate') || lowerDesc.includes('corp')) {
      if (lowerDesc.includes('high yield') || lowerDesc.includes('junk')) return 'FIXED_INCOME_CORP_HY';
      return 'FIXED_INCOME_CORP_IG';
    }
    if (lowerDesc.includes('tips') || lowerDesc.includes('inflation')) return 'FIXED_INCOME_TIPS';
    if (lowerDesc.includes('international') || lowerDesc.includes('global')) return 'FIXED_INCOME_INTL';
    return 'FIXED_INCOME_GOVT'; // Default bond
  }

  // Real estate
  if (lowerDesc.includes('real estate') || lowerDesc.includes('reit')) {
    return 'REAL_ESTATE';
  }

  // Gold / Commodities
  if (lowerDesc.includes('gold') || lowerDesc.includes('precious')) return 'GOLD';
  if (lowerDesc.includes('commodity') || lowerDesc.includes('commodities')) return 'COMMODITIES';

  // Cash
  if (lowerDesc.includes('money market') || lowerDesc.includes('treasury bill') || lowerDesc.includes('cash')) {
    return 'CASH_EQUIVALENT';
  }

  // Equity
  if (lowerDesc.includes('stock') || lowerDesc.includes('equity') || lowerDesc.includes('index')) {
    if (lowerDesc.includes('international') || lowerDesc.includes('foreign') || lowerDesc.includes('global') || lowerDesc.includes('ex-us')) {
      if (lowerDesc.includes('emerging')) return 'EQUITY_INTL_EMERGING';
      return 'EQUITY_INTL_DEVELOPED';
    }
    if (lowerDesc.includes('small cap') || lowerDesc.includes('small-cap')) return 'EQUITY_US_SMALL';
    if (lowerDesc.includes('mid cap') || lowerDesc.includes('mid-cap')) return 'EQUITY_US_MID';
    if (lowerDesc.includes('sector') || lowerDesc.includes('technology') || lowerDesc.includes('healthcare') || lowerDesc.includes('financials')) {
      return 'EQUITY_SECTOR';
    }
    return 'EQUITY_US_LARGE'; // Default equity
  }

  // Alternatives
  if (lowerDesc.includes('private equity') || lowerDesc.includes('pe fund')) return 'ALTERNATIVE_PE';
  if (lowerDesc.includes('hedge fund')) return 'ALTERNATIVE_HEDGE';
  if (lowerDesc.includes('private credit')) return 'ALTERNATIVE_PRIVATE_CREDIT';
  if (lowerDesc.includes('annuity')) return 'ANNUITY';

  // Default fallback
  return 'OTHER';
}

/**
 * Infer account type from string
 */
export function inferAccountType(typeStr: string): AccountType {
  const lower = typeStr.toLowerCase().trim();

  if (lower.includes('401') || lower.includes('401k')) return '401K';
  if (lower.includes('403') || lower.includes('403b')) return '403B';
  if (lower.includes('roth') && lower.includes('ira')) return 'ROTH_IRA';
  if (lower.includes('sep') && lower.includes('ira')) return 'SEP_IRA';
  if (lower.includes('simple') && lower.includes('ira')) return 'SIMPLE_IRA';
  if (lower.includes('ira')) return 'IRA';
  if (lower.includes('529')) return '529';
  if (lower.includes('trust')) return 'TRUST';
  if (lower.includes('joint')) return 'JOINT';
  if (lower.includes('custodial') || lower.includes('utma') || lower.includes('ugma')) return 'CUSTODIAL';
  if (lower.includes('hsa')) return 'HSA';
  if (lower.includes('annuity')) return 'ANNUITY';
  if (lower.includes('taxable') || lower.includes('individual') || lower.includes('brokerage')) return 'TAXABLE';

  return 'OTHER';
}

/**
 * Validate holding for common data issues
 */
export function validateHolding(holding: Holding): ValidationResult {
  const warnings: string[] = [];

  // Price must be positive
  if (holding.price <= 0) {
    warnings.push(`Invalid price: ${holding.price / 100}`);
  }

  // Quantity must be positive
  if (holding.quantity <= 0) {
    warnings.push(`Invalid quantity: ${holding.quantity}`);
  }

  // Market value should approximately equal price * quantity (within 5%)
  const expectedValue = Math.round(holding.price * holding.quantity);
  const valueDiff = Math.abs(expectedValue - holding.marketValue);
  const valueDiffPct = expectedValue > 0 ? valueDiff / expectedValue : 0;

  if (valueDiffPct > 0.05) {
    warnings.push(`Market value mismatch: ${holding.marketValue / 100} vs expected ${expectedValue / 100} (${(valueDiffPct * 100).toFixed(1)}% diff)`);
  }

  // Ticker should be 1-6 uppercase letters if present
  if (holding.ticker && !/^[A-Z]{1,6}$/.test(holding.ticker)) {
    warnings.push(`Unusual ticker format: ${holding.ticker}`);
  }

  // CUSIP should be 9 alphanumeric if present
  if (holding.cusip && !/^[A-Z0-9]{9}$/.test(holding.cusip)) {
    warnings.push(`Invalid CUSIP format: ${holding.cusip}`);
  }

  // Expense ratio should be between 0 and 5% if present
  if (holding.expenseRatio !== null && (holding.expenseRatio < 0 || holding.expenseRatio > 5.0)) {
    warnings.push(`Unusual expense ratio: ${holding.expenseRatio}%`);
  }

  const valid = warnings.length === 0;
  return { valid, warnings };
}

/**
 * Resolve duplicate tickers from same account by merging quantities
 */
export function resolveTickerConflicts(holdings: Holding[]): Holding[] {
  const grouped = new Map<string, Holding[]>();

  // Group by account + ticker
  for (const holding of holdings) {
    const key = `${holding.accountName}::${holding.ticker || holding.cusip || holding.name}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(holding);
  }

  const resolved: Holding[] = [];

  for (const [key, group] of grouped.entries()) {
    if (group.length === 1) {
      resolved.push(group[0]);
      continue;
    }

    // Merge duplicates: sum quantities, take weighted average price, sum market value
    const totalQuantity = group.reduce((sum, h) => sum + h.quantity, 0);
    const totalValue = group.reduce((sum, h) => sum + h.marketValue, 0);
    const avgPrice = totalQuantity > 0 ? Math.round(totalValue / totalQuantity) as MoneyCents : group[0].price;

    const totalCostBasis = group.reduce((sum, h) => sum + (h.costBasis ?? 0), 0);
    const unrealizedGain = totalCostBasis > 0 ? (totalValue - totalCostBasis) as MoneyCents : null;
    const gainPct = totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : null;

    const merged: Holding = {
      ...group[0], // Take first as base
      quantity: totalQuantity,
      price: avgPrice,
      marketValue: totalValue as MoneyCents,
      costBasis: totalCostBasis > 0 ? totalCostBasis as MoneyCents : null,
      unrealizedGain,
      gainPct,
    };

    resolved.push(merged);
  }

  return resolved;
}

/**
 * Detect custodian from statement text
 */
export function detectInstitution(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes('charles schwab') || lower.includes('schwab.com')) return 'Schwab';
  if (lower.includes('fidelity') || lower.includes('fidelity.com')) return 'Fidelity';
  if (lower.includes('vanguard') || lower.includes('vanguard.com')) return 'Vanguard';
  if (lower.includes('merrill lynch') || lower.includes('merrill edge') || lower.includes('merrilledge.com')) return 'Merrill';
  if (lower.includes('morgan stanley') || lower.includes('morganstanley.com')) return 'Morgan Stanley';
  if (lower.includes('td ameritrade') || lower.includes('tdameritrade.com')) return 'TD Ameritrade';
  if (lower.includes('e*trade') || lower.includes('etrade') || lower.includes('etrade.com')) return 'E*TRADE';
  if (lower.includes('wells fargo') || lower.includes('wellsfargo.com')) return 'Wells Fargo';
  if (lower.includes('ubs') || lower.includes('ubs.com')) return 'UBS';
  if (lower.includes('raymond james') || lower.includes('raymondjames.com')) return 'Raymond James';

  return 'Unknown';
}

/**
 * Normalize raw AI-extracted holdings into typed Holding objects
 */
export function normalizeHoldings(holdings: RawHolding[], institution: string): Holding[] {
  const normalized: Holding[] = [];

  for (const raw of holdings) {
    // Extract ticker (try multiple field names)
    const ticker = (raw.ticker || raw.symbol || '').trim().toUpperCase() || null;

    // Extract description/name
    const description = (raw.description || raw.name || ticker || 'Unknown Holding').trim();
    const name = description;

    // Extract quantity
    const quantity = raw.quantity ?? raw.shares ?? 0;
    if (quantity <= 0) continue; // Skip zero-quantity holdings

    // Extract price (dollars → cents)
    const priceDollars = raw.price ?? 0;
    const price: MoneyCents = Math.round(priceDollars * 100) as MoneyCents;

    // Extract market value (dollars → cents)
    const valueDollars = raw.value ?? raw.marketValue ?? raw.market_value ?? (priceDollars * quantity);
    const marketValue: MoneyCents = Math.round(valueDollars * 100) as MoneyCents;

    // Extract cost basis (dollars → cents)
    const costBasisDollars = raw.costBasis ?? raw.cost_basis ?? null;
    const costBasis: MoneyCents | null = costBasisDollars !== null ? Math.round(costBasisDollars * 100) as MoneyCents : null;

    // Calculate unrealized gain
    const unrealizedGain: MoneyCents | null = costBasis !== null ? (marketValue - costBasis) as MoneyCents : null;
    const gainPct: number | null = costBasis !== null && costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : null;

    // Infer asset class
    const assetClassStr = raw.assetClass ?? raw.asset_class ?? '';
    const assetClass: AssetClass = assetClassStr ? (assetClassStr as AssetClass) : inferAssetClass(ticker, description);

    // Check if single stock (has ticker, not a known ETF, not a fund)
    const isSingleStock = ticker !== null
      && !TICKER_ASSET_CLASS_MAP[ticker]
      && !description.toLowerCase().includes('fund')
      && !description.toLowerCase().includes('etf');

    // Infer account type
    const accountTypeStr = raw.accountType ?? raw.account_type ?? 'TAXABLE';
    const accountType: AccountType = inferAccountType(accountTypeStr);

    // Account name
    const accountName = raw.accountName ?? raw.account_name ?? `${institution} Account`;

    // Expense ratio (if present)
    const expenseRatio = raw.expenseRatio ?? raw.expense_ratio ?? null;

    // Build normalized holding
    const holding: Holding = {
      ticker,
      cusip: raw.cusip?.trim().toUpperCase() || null,
      name,
      description,
      assetClass,
      isSingleStock,
      quantity,
      shares: quantity, // Alias
      price,
      marketValue,
      costBasis,
      unrealizedGain,
      gainPct,
      holdingPeriod: null, // Unknown from statement alone
      expenseRatio,
      dividendYield: null, // Not typically on statements
      accountType,
      accountName,
    };

    normalized.push(holding);
  }

  // Resolve duplicate tickers
  const resolved = resolveTickerConflicts(normalized);

  return resolved;
}
