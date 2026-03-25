// src/lib/design-system/tokens/component-standards.ts
// Farther Prism — Component Design Standards
// Every UI component references these tokens for consistent styling.

import { colors } from './colors';

export const componentStandards = {
  button: {
    primary:   { bg: colors.steelBlue[700], text: colors.white, hoverBg: colors.steelBlue[600], activeBg: colors.steelBlue[800], radius: '8px' },
    secondary: { bg: colors.steelBlue[50], text: colors.steelBlue[700], hoverBg: colors.steelBlue[100], activeBg: colors.steelBlue[200], radius: '8px' },
    danger:    { bg: colors.critical[50], text: colors.critical[700], hoverBg: colors.critical[100], activeBg: colors.critical[100], radius: '8px' },
    ghost:     { bg: 'transparent', text: colors.steelBlue[700], hoverBg: colors.steelBlue[50], activeBg: colors.steelBlue[100], radius: '8px' },
    minHeight: '40px',
    padding:   '8px 16px',
    fontWeight: 600,
    fontSize:  '0.875rem',
    transition: '200ms',
  },

  card: {
    background: colors.white,
    border:     `1px solid ${colors.limestone[200]}`,
    radius:     '12px',
    shadow:     '0 1px 3px rgba(0,0,0,0.1)',
    padding:    '24px',
    hoverShadow: '0 4px 12px rgba(0,0,0,0.10)',
  },

  kpiCard: {
    background: colors.white,
    border:     `1px solid ${colors.limestone[200]}`,
    radius:     '12px',
    labelSize:  '12px',
    labelColor: colors.charcoal[500],
    labelWeight: 500,
    labelLetterSpacing: '0.04em',
    valueSize:  '28px',
    valueWeight: 700,
    valueColor: colors.charcoal[900],
    valueFontFamily: '"JetBrains Mono", monospace',
    deltaPositiveColor: colors.success[500],
    deltaNegativeColor: colors.critical[500],
  },

  input: {
    border:      `1px solid ${colors.limestone[200]}`,
    focusBorder: `2px solid ${colors.steelBlue[700]}`,
    radius:      '8px',
    height:      '40px',
    padding:     '8px 12px',
    background:  colors.white,
    placeholderColor: colors.charcoal[300],
    errorBorder: `2px solid ${colors.critical[500]}`,
  },

  table: {
    headerBg:   colors.limestone[50],
    headerText: colors.charcoal[700],
    headerWeight: 600,
    headerSize: '12px',
    headerLetterSpacing: '0.04em',
    rowBorder:  colors.limestone[200],
    rowHover:   colors.limestone[50],
    stripedRow: colors.limestone[50],
    cellPadding: '12px 16px',
    cellSize:   '14px',
  },

  badge: {
    success:  { bg: colors.success[100], text: colors.success[700], border: 'none' },
    warning:  { bg: colors.warning[100], text: colors.warning[700], border: 'none' },
    critical: { bg: colors.critical[100], text: colors.critical[700], border: 'none' },
    info:     { bg: colors.info[100], text: colors.info[700], border: 'none' },
    neutral:  { bg: colors.charcoal[50], text: colors.charcoal[700], border: 'none' },
    radius:   '9999px',
    padding:  '2px 10px',
    fontSize: '12px',
    fontWeight: 500,
  },

  tab: {
    activeColor: colors.steelBlue[700],
    activeBorder: `2px solid ${colors.steelBlue[700]}`,
    inactiveColor: colors.charcoal[500],
    inactiveBorder: '2px solid transparent',
    hoverColor: colors.steelBlue[600],
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 16px',
  },

  modal: {
    overlayBg: colors.overlay.dark,
    background: colors.white,
    radius: '16px',
    shadow: '0 16px 48px rgba(0,0,0,0.14)',
    padding: '24px',
    maxWidth: '560px',
    headerSize: '18px',
    headerWeight: 600,
  },

  toast: {
    success: { bg: colors.success[50], border: `1px solid ${colors.success[500]}`, icon: colors.success[500] },
    warning: { bg: colors.warning[50], border: `1px solid ${colors.warning[500]}`, icon: colors.warning[500] },
    critical: { bg: colors.critical[50], border: `1px solid ${colors.critical[500]}`, icon: colors.critical[500] },
    info: { bg: colors.info[50], border: `1px solid ${colors.info[500]}`, icon: colors.info[500] },
    radius: '12px',
    shadow: '0 4px 12px rgba(0,0,0,0.10)',
    padding: '12px 16px',
  },

  skeleton: {
    baseColor: colors.limestone[100],
    shimmerColor: colors.limestone[200],
    radius: '8px',
    animationDuration: '1.5s',
  },

  sidebar: {
    background: colors.limestone[100],
    activeItemBg: colors.steelBlue[50],
    activeItemText: colors.steelBlue[700],
    inactiveItemText: colors.charcoal[700],
    hoverItemBg: colors.limestone[200],
    width: '260px',
    padding: '16px',
  },

  financialNumber: {
    fontFamily: '"JetBrains Mono", monospace',
    fontFeatureSettings: '"tnum" 1, "lnum" 1',
    fontVariantNumeric: 'tabular-nums',
  },

  chart: {
    minHeight: 200,
    gridColor: colors.limestone[200],
    gridDashArray: '4',
    axisLabelColor: colors.charcoal[500],
    axisLabelSize: 11,
    tooltipBg: colors.charcoal[900],
    tooltipTextColor: colors.white,
    tooltipRadius: '8px',
    animationDuration: 300,
    legendPosition: 'top' as const,
    // Financial data visualization colors — consistent across ALL charts
    assetClass: {
      equityDomestic:       colors.steelBlue[700],    // Steel #4E7082
      equityInternational:  colors.steelBlue[500],    // Sky #99B6C3
      fixedIncome:          colors.success[500],
      alternatives:         colors.chart.accent2,
      cash:                 colors.charcoal[300],
      realEstate:           colors.chart.accent3,      // Terra #8A5C4F
      commodities:          colors.chart.accent1,
    },
    // Series colors used in order for multi-series charts
    series: [
      colors.steelBlue[700],    // Steel #4E7082
      colors.steelBlue[400],    // Aqua #A8CED3
      colors.steelBlue[500],    // Sky #99B6C3
      colors.chart.accent2,
      colors.success[500],
      colors.warning[500],
    ],
  },

  // Currency & Number formatting standards
  formatting: {
    currency: {
      large:   { threshold: 1_000_000, example: '$2.4M' },
      medium:  { threshold: 1_000,     example: '$42,000' },
      small:   { example: '$842' },
    },
    percentage: {
      standard: 1,    // One decimal: 74.2%
      fine:     2,    // Two decimals: 74.21% (for rates, returns)
    },
    date: {
      display:  'MMM dd, yyyy',
      short:    'MM/dd/yy',
    },
  },
} as const;

export type ComponentStandards = typeof componentStandards;
