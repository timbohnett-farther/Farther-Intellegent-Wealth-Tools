// Farther Prism — Chart Configuration (Recharts) — Dark Glass-Morphism

export const chartConfig = {
  backgroundColor:  '#111111',
  gridColor:        'rgba(255, 255, 255, 0.06)',
  axisColor:        'rgba(255, 255, 255, 0.30)',
  axisLabelColor:   'rgba(255, 255, 255, 0.40)',
  legendColor:      'rgba(255, 255, 255, 0.60)',
  fontFamily:       '"Fakt", sans-serif',
  axisFontSize:     12,
  legendFontSize:   12,
  labelFontSize:    11,

  tooltip: {
    background:   'rgba(26, 26, 26, 0.95)',
    border:       '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    boxShadow:    '0 8px 32px rgba(0, 0, 0, 0.4)',
    padding:      '12px 16px',
    titleColor:   '#ffffff',
    titleSize:    '13px',
    titleWeight:  700,
    valueColor:   'rgba(255, 255, 255, 0.80)',
    valueSize:    '14px',
    fontFamily:   '"JetBrains Mono", monospace',
  },

  animation: {
    duration: 800,
    easing:   'ease-out',
  },

  colors: {
    primary:   '#1d7682',
    secondary: '#b6d0ed',
    tertiary:  '#2a9aa8',
    positive:  '#22c55e',
    negative:  '#ef4444',
    neutral:   'rgba(255, 255, 255, 0.40)',
    goal:      '#f59e0b',
    estate:    '#8b5cf6',
    tax:       '#f97316',

    mcP50:     '#1d7682',
    mcP25_75:  'rgba(29, 118, 130, 0.30)',
    mcP10_90:  'rgba(29, 118, 130, 0.15)',
    mcP5_95:   'rgba(29, 118, 130, 0.08)',
  },

  barChart: {
    barRadius:       [6, 6, 0, 0] as [number, number, number, number],
    barGap:          '20%',
    barCategoryGap:  '35%',
  },

  lineChart: {
    strokeWidth:          2.5,
    dotRadius:            4,
    dotHoverRadius:       6,
    dotFill:              '#1a1a1a',
    activeDotStrokeWidth: 2,
  },

  areaChart: {
    fillOpacity: 0.15,
    strokeWidth: 2.5,
  },
} as const;

export const projectionChartConfig = {
  xAxisLabel:  'Age',
  yAxisLabel:  'Portfolio Value',
  yAxisFormat: (value: number) => `$${(value / 1_000_000).toFixed(1)}M`,
  referenceLines: {
    retirement: { stroke: '#1d7682', strokeDasharray: '6 4', label: 'Retirement' },
    zero:       { stroke: '#ef4444', strokeDasharray: '4 4', label: 'Portfolio Depleted' },
  },
  height: 380,
  margin: { top: 20, right: 30, left: 20, bottom: 20 },
} as const;

export const monteCarloConfig = {
  bands: [
    { key: 'p5_p95',  fillColor: 'rgba(29, 118, 130, 0.07)',  label: '90th Percentile Range' },
    { key: 'p10_p90', fillColor: 'rgba(29, 118, 130, 0.12)',  label: '80th Percentile Range' },
    { key: 'p25_p75', fillColor: 'rgba(29, 118, 130, 0.22)',  label: '50th Percentile Range' },
    { key: 'p50',     strokeColor: '#1d7682', strokeWidth: 2.5, label: 'Median (P50)' },
  ],
  height: 400,
} as const;

// Tremor chart color bridge — maps existing design tokens to Tremor color names
export const tremorChartColors = {
  brand: chartConfig.colors.primary,
  "brand-light": chartConfig.colors.secondary,
  "brand-muted": chartConfig.colors.tertiary,
  success: chartConfig.colors.positive,
  critical: chartConfig.colors.negative,
  neutral: chartConfig.colors.neutral,
  gold: chartConfig.colors.goal,
  purple: chartConfig.colors.estate,
  terra: chartConfig.colors.tax,
} as const;
