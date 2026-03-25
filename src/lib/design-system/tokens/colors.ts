// Farther Prism — Design System Color Tokens
// All components reference tokens — never raw hex values in component code.

export const colors = {
  // ─── PRIMARY BRAND PALETTE ──────────────────────────────────────────
  charcoal: {
    900: '#333333',   // PRIMARY TEXT
    700: '#4A4A4A',   // Secondary text, labels
    500: '#6B6B6B',   // Tertiary text, placeholders
    300: '#9E9E9E',   // Borders, dividers, muted
    100: '#D9D9D9',   // Subtle borders, table separators
    50:  '#F2F2F2',   // Hover states on white, zebra rows
  },

  steelBlue: {
    900: '#374E59',   // Graphite — deepest text
    800: '#405B69',   // Slate — supporting
    700: '#4E7082',   // Steel — PRIMARY BRAND — buttons, links, active nav
    600: '#5C8395',   // Hover state on primary
    500: '#99B6C3',   // Sky — subtle accents, info badges
    400: '#A8CED3',   // Aqua — light accents, chart secondary
    300: '#D4DFE5',   // Mist — chart grid lines, background accents, tags/chips
    200: '#E2EAED',   // Focus rings
    100: '#F0F5F7',   // Chip/tag backgrounds
    50:  '#F7F9FA',   // Lightest tint — alternate sections
  },

  limestone: {
    50:  '#FFFEF4',   // Ivory — text on dark
    100: '#F7F4F0',   // Linen — card backgrounds
    200: '#E4DDD4',   // Borders, input borders
    300: '#D4CCC2',   // Deeper borders, dividers
    400: '#BDB4A8',   // Muted text on dark backgrounds
  },

  // ─── SEMANTIC / FUNCTIONAL COLORS ───────────────────────────────────
  success: {
    700: '#1A6B3C',
    500: '#2E8B57',   // Success icons, positive delta
    100: '#D4EDDA',
    50:  '#F0FAF4',
  },

  warning: {
    700: '#8A5700',
    500: '#D4860B',   // Warning icons, IRMAA alerts
    100: '#FFF3CD',
    50:  '#FFFBF0',
  },

  critical: {
    700: '#7A1F1F',
    500: '#C0392B',   // Critical alerts, error states
    100: '#F8D7DA',
    50:  '#FFF5F5',
  },

  info: {
    700: '#1A4A6B',
    500: '#2980B9',
    100: '#D6EAF8',
    50:  '#EBF5FB',
  },

  // ─── DATA VISUALIZATION PALETTE ─────────────────────────────────────
  chart: {
    primary:    '#4E7082',    // Steel
    secondary:  '#A8CED3',    // Aqua
    tertiary:   '#99B6C3',    // Sky
    positive:   '#2E8B57',
    negative:   '#C0392B',
    neutral:    '#9E9E9E',
    accent1:    '#E8A838',
    accent2:    '#7B68EE',
    accent3:    '#8A5C4F',    // Terra — luxury accent
    gridLine:   '#E4DDD4',
    axisLabel:  '#6B6B6B',
    background: '#F7F4F0',    // Linen
  },

  white: '#FFFFFF',
  black: '#000000',

  overlay: {
    light: 'rgba(248, 244, 240, 0.85)',
    dark:  'rgba(51, 51, 51, 0.60)',
  },
} as const;

export type ColorToken = typeof colors;
