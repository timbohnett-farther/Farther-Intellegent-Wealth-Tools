// Farther Prism — Number Formatting Utilities
// Every dollar and percent value displayed in the platform goes through these formatters.

export const formatCurrency = (value: number, options?: {
  compact?: boolean;
  decimals?: number;
  showSign?: boolean;
}): string => {
  const { compact = false, decimals = 0, showSign = false } = options ?? {};

  if (compact && Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000;
    return `${showSign && value > 0 ? '+' : ''}$${m.toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    const k = value / 1_000;
    return `${showSign && value > 0 ? '+' : ''}$${k.toFixed(0)}K`;
  }

  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay:           showSign ? 'exceptZero' : 'auto',
  }).format(value);
};

export const formatPercent = (value: number, decimals = 1): string =>
  `${(value * 100).toFixed(decimals)}%`;

export const formatPercentValue = (value: number, decimals = 1): string =>
  `${value.toFixed(decimals)}%`;

export const formatAge = (value: number): string => `Age ${value}`;

export const formatYear = (value: number): string => String(value);

export const formatLargeDollar = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000)     return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)         return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export const formatNumber = (value: number, decimals = 0): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);
