// Farther Prism — Typography Tokens
// Font: Inter (Google Fonts) — geometric sans-serif
// Monospace: JetBrains Mono — dollar amounts, account numbers, tax calculations

export const typography = {
  fontFamily: {
    sans: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  },

  fontWeight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  // Type scale — 1.25 (major third) modular scale
  fontSize: {
    xs:   '0.75rem',    // 12px
    sm:   '0.875rem',   // 14px
    base: '1rem',       // 16px
    md:   '1.125rem',   // 18px
    lg:   '1.25rem',    // 20px
    xl:   '1.5rem',     // 24px
    '2xl': '1.875rem',  // 30px
    '3xl': '2.25rem',   // 36px
    '4xl': '3rem',      // 48px
    '5xl': '3.75rem',   // 60px
  },

  lineHeight: {
    tight:   '1.2',
    snug:    '1.35',
    normal:  '1.5',
    relaxed: '1.65',
  },

  letterSpacing: {
    tight:  '-0.02em',
    normal: '0em',
    wide:   '0.04em',
    wider:  '0.08em',
  },
} as const;
