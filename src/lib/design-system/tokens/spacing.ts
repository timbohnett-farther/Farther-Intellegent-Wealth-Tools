// Farther Prism — Spacing, Radius, Shadow & Motion Tokens

export const borderRadius = {
  none: '0px',
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const shadows = {
  none:  'none',
  xs:    '0 1px 2px rgba(51, 51, 51, 0.06)',
  sm:    '0 2px 4px rgba(51, 51, 51, 0.08), 0 1px 2px rgba(51, 51, 51, 0.04)',
  md:    '0 4px 12px rgba(51, 51, 51, 0.10), 0 2px 4px rgba(51, 51, 51, 0.06)',
  lg:    '0 8px 24px rgba(51, 51, 51, 0.12), 0 4px 8px rgba(51, 51, 51, 0.06)',
  xl:    '0 16px 48px rgba(51, 51, 51, 0.14), 0 8px 16px rgba(51, 51, 51, 0.06)',
  focus: '0 0 0 3px rgba(59, 90, 105, 0.25)',
  brand: '0 4px 16px rgba(59, 90, 105, 0.16), 0 2px 4px rgba(59, 90, 105, 0.08)',
} as const;

export const motion = {
  duration: {
    instant: '0ms',
    fast:    '100ms',
    normal:  '200ms',
    slow:    '350ms',
    gentle:  '500ms',
    ripple:  '800ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter:    'cubic-bezier(0.0, 0, 0.2, 1)',
    exit:     'cubic-bezier(0.4, 0, 1, 1)',
    ripple:   'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;
