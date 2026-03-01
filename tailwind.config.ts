import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Colors ────────────────────────────────────────────────────
      colors: {
        // Farther Brand — Steel Blue palette (brand-700 = primary action)
        brand: {
          50:  '#F0F5F7',
          100: '#E0EAED',
          200: '#C5D8DF',
          300: '#A3BFC9',
          400: '#7EA4B8',
          500: '#6189A0',
          600: '#4D6E7E',
          700: '#3B5A69',
          800: '#2B4A58',
          900: '#1E3642',
        },

        charcoal: {
          50:  '#F2F2F2',
          100: '#D9D9D9',
          300: '#9E9E9E',
          500: '#6B6B6B',
          700: '#4A4A4A',
          900: '#333333',
        },
        'steel-blue': {
          50:  '#F0F5F7',
          100: '#E0EAED',
          200: '#C5D8DF',
          300: '#A3BFC9',
          400: '#7EA4B8',
          500: '#6189A0',
          600: '#4D6E7E',
          700: '#3B5A69',
          800: '#2B4A58',
          900: '#1E3642',
        },
        limestone: {
          50:  '#F8F4F0',
          100: '#F0EBE3',
          200: '#E4DDD4',
          300: '#D4CCC2',
          400: '#BDB4A8',
        },

        canvas:  '#F8F4F0',
        success: { 50: '#F0FAF4', 100: '#D4EDDA', 500: '#2E8B57', 700: '#1A6B3C' },
        warning: { 50: '#FFFBF0', 100: '#FFF3CD', 500: '#D4860B', 700: '#8A5700' },
        critical:{ 50: '#FFF5F5', 100: '#F8D7DA', 500: '#C0392B', 700: '#7A1F1F' },
        info:    { 50: '#EBF5FB', 100: '#D6EAF8', 500: '#2980B9', 700: '#1A4A6B' },

        // Legacy tool colors
        safe:          '#22C55E',
        danger:        '#EF4444',
        'box-spread':  '#3B82F6',
        'margin-loan': '#6B7280',
        sbloc:         '#F97316',
        heloc:         '#8B5CF6',
        savings:       '#10B981',
        accent:        { 500: '#6189A0', 400: '#7EA4B8' },

        'goal-funded':  '#2E8B57',
        'goal-partial': '#D4860B',
        'goal-at-risk': '#C0392B',
        'tax-deferred': '#8B5CF6',
        'tax-free':     '#06B6D4',
        'taxable':      '#F97316',
      },

      // ── Typography ────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      fontSize: {
        'xs':  ['0.75rem',  { lineHeight: '1.4' }],
        'sm':  ['0.875rem', { lineHeight: '1.45' }],
        'base': ['1rem',    { lineHeight: '1.5' }],
        'md':  ['1.125rem', { lineHeight: '1.45' }],
        'lg':  ['1.25rem',  { lineHeight: '1.35' }],
        'xl':  ['1.5rem',   { lineHeight: '1.3' }],
        '2xl': ['1.875rem', { lineHeight: '1.2' }],
        '3xl': ['2.25rem',  { lineHeight: '1.1' }],
        '4xl': ['3rem',     { lineHeight: '1.05' }],
        '5xl': ['3.75rem',  { lineHeight: '1.0' }],
      },

      // ── Spacing ───────────────────────────────────────────────────
      spacing: {
        '4.5': '18px',
        '13':  '52px',
        '15':  '60px',
        '18':  '72px',
        '22':  '88px',
        '26':  '104px',
        '30':  '120px',
      },

      // ── Border Radius ─────────────────────────────────────────────
      borderRadius: {
        'sm':   '4px',
        DEFAULT:'8px',
        'md':   '8px',
        'lg':   '12px',
        'xl':   '16px',
        '2xl':  '24px',
        'full': '9999px',
        'input':'4px',
        'card': '8px',
        'modal':'12px',
        'panel':'16px',
      },

      // ── Shadows ───────────────────────────────────────────────────
      boxShadow: {
        'xs':    '0 1px 2px rgba(51, 51, 51, 0.06)',
        'sm':    '0 2px 4px rgba(51, 51, 51, 0.08), 0 1px 2px rgba(51, 51, 51, 0.04)',
        DEFAULT: '0 2px 4px rgba(51, 51, 51, 0.08), 0 1px 2px rgba(51, 51, 51, 0.04)',
        'md':    '0 4px 12px rgba(51, 51, 51, 0.10), 0 2px 4px rgba(51, 51, 51, 0.06)',
        'lg':    '0 8px 24px rgba(51, 51, 51, 0.12), 0 4px 8px rgba(51, 51, 51, 0.06)',
        'xl':    '0 16px 48px rgba(51, 51, 51, 0.14), 0 8px 16px rgba(51, 51, 51, 0.06)',
        'brand': '0 4px 16px rgba(59, 90, 105, 0.16), 0 2px 4px rgba(59, 90, 105, 0.08)',
        'focus': '0 0 0 3px rgba(59, 90, 105, 0.25)',
      },

      // ── Max Widths ────────────────────────────────────────────────
      maxWidth: {
        'panel-form':      '800px',
        'panel-dashboard': '1200px',
        'content':         '1440px',
      },
      width: {
        'sidebar':           '240px',
        'sidebar-collapsed': '64px',
        'right-panel':       '300px',
      },

      // ── Transitions ───────────────────────────────────────────────
      transitionDuration: {
        '0':   '0ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '350': '350ms',
        '500': '500ms',
        '800': '800ms',
      },
      transitionTimingFunction: {
        'ripple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'enter':  'cubic-bezier(0.0, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ── Animations ────────────────────────────────────────────────
      animation: {
        'ripple':         'rippleExpand 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'shimmer':        'shimmer 1.5s infinite linear',
        'pulse-slow':     'calcPulse 1.5s ease-in-out infinite',
        'slide-in-right': 'slideInRight 350ms cubic-bezier(0.0, 0, 0.2, 1) forwards',
        'slide-in-up':    'slideInUp 200ms cubic-bezier(0.0, 0, 0.2, 1) forwards',
        'count-up':       'valueReveal 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
      },
      keyframes: {
        rippleExpand: {
          '0%':   { transform: 'scale(0.8)',  opacity: '0' },
          '40%':  { transform: 'scale(1.02)', opacity: '1' },
          '100%': { transform: 'scale(1.0)',  opacity: '1' },
        },
        shimmer: {
          from: { backgroundPosition: '-400px 0' },
          to:   { backgroundPosition: '400px 0' },
        },
        calcPulse: {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)' },
          '50%':      { opacity: '0.6', transform: 'scale(0.98)' },
        },
        slideInRight: {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        slideInUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        valueReveal: {
          from: { opacity: '0.4', transform: 'translateY(4px)' },
          to:   { opacity: '1',   transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
