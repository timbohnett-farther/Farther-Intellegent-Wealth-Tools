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
    900: '#1E3642',   // Deepest — dark mode headings
    800: '#2B4A58',   // Active state on primary buttons
    700: '#3B5A69',   // PRIMARY BRAND — buttons, links, active nav
    600: '#4D6E7E',   // Hover state on primary
    500: '#6189A0',   // Subtle accents, info badges
    400: '#7EA4B8',   // Light accents, chart secondary
    300: '#A3BFC9',   // Chart grid lines, background accents
    200: '#C5D8DF',   // Focus rings
    100: '#E0EAED',   // Chip/tag backgrounds
    50:  '#F0F5F7',   // Lightest tint — alternate sections
  },

  limestone: {
    50:  '#F8F4F0',   // PRIMARY CANVAS — page background
    100: '#F0EBE3',   // Card alt backgrounds, sidebar
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
    primary:    '#3B5A69',
    secondary:  '#6189A0',
    tertiary:   '#A3BFC9',
    positive:   '#2E8B57',
    negative:   '#C0392B',
    neutral:    '#9E9E9E',
    accent1:    '#E8A838',
    accent2:    '#7B68EE',
    accent3:    '#E07B54',
    gridLine:   '#E4DDD4',
    axisLabel:  '#6B6B6B',
    background: '#F8F4F0',
  },

  white: '#FFFFFF',
  black: '#000000',

  overlay: {
    light: 'rgba(248, 244, 240, 0.85)',
    dark:  'rgba(51, 51, 51, 0.60)',
  },
} as const;

export type ColorToken = typeof colors;
