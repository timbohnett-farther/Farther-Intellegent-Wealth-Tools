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
      colors: {
        safe: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        'box-spread': '#3B82F6',
        'margin-loan': '#6B7280',
        sbloc: '#F97316',
        heloc: '#8B5CF6',
        savings: '#10B981',
      },
    },
  },
  plugins: [],
};
export default config;
