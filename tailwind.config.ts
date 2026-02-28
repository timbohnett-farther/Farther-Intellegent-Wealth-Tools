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
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Existing tool colors
        safe: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        'box-spread': '#3B82F6',
        'margin-loan': '#6B7280',
        sbloc: '#F97316',
        heloc: '#8B5CF6',
        savings: '#10B981',

        // Farther Prism Design System
        brand: {
          900: '#0A1628',
          800: '#0F2241',
          700: '#1A3A6B',
          600: '#1E4D94',
          500: '#2563EB',
          400: '#3B82F6',
          300: '#93C5FD',
          100: '#DBEAFE',
          50: '#EFF6FF',
        },
        accent: {
          500: '#0EA5E9',
          400: '#38BDF8',
        },
        // Semantic planning colors
        'goal-funded': '#10B981',
        'goal-partial': '#F59E0B',
        'goal-at-risk': '#EF4444',
        'tax-deferred': '#8B5CF6',
        'tax-free': '#06B6D4',
        'taxable': '#F97316',
      },
      fontFeatureSettings: {
        tnum: '"tnum"',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'DEFAULT': '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        'md': '0 4px 6px rgba(0,0,0,0.07)',
        'lg': '0 10px 15px rgba(0,0,0,0.10)',
        'xl': '0 20px 25px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        'input': '4px',
        'card': '8px',
        'modal': '12px',
        'panel': '16px',
      },
      maxWidth: {
        'panel-form': '800px',
        'panel-dashboard': '1200px',
        'content': '1440px',
      },
      width: {
        'sidebar': '260px',
        'sidebar-collapsed': '64px',
        'right-panel': '300px',
      },
    },
  },
  plugins: [],
};
export default config;
