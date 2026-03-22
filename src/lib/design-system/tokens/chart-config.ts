// Farther Prism — Chart Configuration (Recharts)

export const chartConfig = {
  backgroundColor:  '#F8F4F0',
  gridColor:        '#E4DDD4',
  axisColor:        '#D4CCC2',
  axisLabelColor:   '#6B6B6B',
  legendColor:      '#4A4A4A',
  fontFamily:       '"Inter", sans-serif',
  axisFontSize:     12,
  legendFontSize:   12,
  labelFontSize:    11,

  tooltip: {
    background:   '#FFFFFF',
    border:       '1px solid #E4DDD4',
    borderRadius: '8px',
    boxShadow:    '0 4px 12px rgba(51,51,51,0.10)',
    padding:      '12px 16px',
    titleColor:   '#333333',
    titleSize:    '13px',
    titleWeight:  700,
    valueColor:   '#333333',
    valueSize:    '14px',
    fontFamily:   '"JetBrains Mono", monospace',
  },

  animation: {
    duration: 800,
    easing:   'ease-out',
  },

  colors: {
    primary:   '#3B5A69',
    secondary: '#6189A0',
    tertiary:  '#A3BFC9',
    positive:  '#2E8B57',
    negative:  '#C0392B',
    neutral:   '#9E9E9E',
    goal:      '#E8A838',
    estate:    '#7B68EE',
    tax:       '#E07B54',

    mcP50:     '#3B5A69',
    mcP25_75:  'rgba(59,90,105,0.30)',
    mcP10_90:  'rgba(59,90,105,0.15)',
    mcP5_95:   'rgba(59,90,105,0.08)',
  },

  barChart: {
    barRadius:       [4, 4, 0, 0] as [number, number, number, number],
    barGap:          '20%',
    barCategoryGap:  '35%',
  },

  lineChart: {
    strokeWidth:          2.5,
    dotRadius:            4,
    dotHoverRadius:       6,
    dotFill:              '#FFFFFF',
    activeDotStrokeWidth: 2,
  },

  areaChart: {
    fillOpacity: 0.12,
    strokeWidth: 2.5,
  },
} as const;

export const projectionChartConfig = {
  xAxisLabel:  'Age',
  yAxisLabel:  'Portfolio Value',
  yAxisFormat: (value: number) => `$${(value / 1_000_000).toFixed(1)}M`,
  referenceLines: {
    retirement: { stroke: '#3B5A69', strokeDasharray: '6 4', label: 'Retirement' },
    zero:       { stroke: '#C0392B', strokeDasharray: '4 4', label: 'Portfolio Depleted' },
  },
  height: 380,
  margin: { top: 20, right: 30, left: 20, bottom: 20 },
} as const;

export const monteCarloConfig = {
  bands: [
    { key: 'p5_p95',  fillColor: 'rgba(59,90,105,0.07)',  label: '90th Percentile Range' },
    { key: 'p10_p90', fillColor: 'rgba(59,90,105,0.10)',  label: '80th Percentile Range' },
    { key: 'p25_p75', fillColor: 'rgba(59,90,105,0.18)',  label: '50th Percentile Range' },
    { key: 'p50',     strokeColor: '#3B5A69', strokeWidth: 2.5, label: 'Median (P50)' },
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
