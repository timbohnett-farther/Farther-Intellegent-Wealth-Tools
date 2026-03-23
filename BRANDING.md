# Farther Brand Guide

**This file is identical across all 4 Farther repos.** Any changes must be applied to all repos to keep branding consistent.

---

## Core Brand Colors

All colors are tuned for readability on dark backgrounds. Minimum 4.5:1 contrast ratio for text.

| Token | Hex | Usage |
|-------|-----|-------|
| **Teal** (primary) | `#2bb8c4` | Buttons, links, active states, brand accent |
| **Teal Dark** | `#1d7682` | Hover/pressed on light surfaces, original brand reference |
| **Teal Light** | `#5dd8e4` | Badges, secondary accents, chart highlights |
| **Teal Glow** | `#28a1af` | Mid-tone for gradients and glows |
| **Charcoal** | `#333333` | Text on light backgrounds (light mode only) |
| **Cream** | `#FAF7F2` | Text on dark backgrounds, light mode background |
| **Slate** | `#8a9aa2` | Secondary text on dark backgrounds |
| **Ice** | `#b6d0ed` | Tertiary accent, chart fills, cool highlights |
| **White** | `#ffffff` | Cards on light backgrounds |
| **Black** | `#000000` | Deepest background |

## Dark Theme Palette

All Farther apps use a dark theme. These are the surface and text colors:

| Token | Value | Usage |
|-------|-------|-------|
| **Background 900** | `#111111` | Deepest background |
| **Background 800** | `#1a1a1a` | Primary page background |
| **Background 600** | `#2a2a2a` | Elevated surfaces |
| **Card Surface** | `rgba(255,255,255,0.07)` | Glass card background |
| **Card Hover** | `rgba(255,255,255,0.10)` | Card hover state |
| **Border** | `rgba(255,255,255,0.12)` | Card/section borders |
| **Border Subtle** | `rgba(255,255,255,0.08)` | Table row dividers |
| **Text Primary** | `rgba(255,255,255,0.92)` | Main body text (bright cream) |
| **Text Secondary** | `rgba(255,255,255,0.7)` | Supporting text |
| **Text Muted** | `rgba(255,255,255,0.5)` | Labels, captions |
| **Text Tertiary** | `rgba(255,255,255,0.35)` | Least emphasis, decorative |

## Table Row Striping

| Row | Background |
|-----|------------|
| Even rows | `rgba(255,255,255,0.03)` |
| Odd rows | `rgba(255,255,255,0.06)` |
| Hover | `rgba(43,184,196,0.15)` (teal glow) |

## Status Colors

Brightened for dark backgrounds:

| Status | Color | Dark BG |
|--------|-------|---------|
| **Success** | `#4ade80` | `#1a2e1c` |
| **Warning** | `#fbbf24` | `#2e2518` |
| **Error / Danger** | `#f87171` | `#2e1a1a` |
| **Info** | `#60a5fa` | `#1a2530` |

## Market / Financial Colors

| Token | Color | Usage |
|-------|-------|-------|
| Bull / Gain | `#34d399` | Positive returns, inflows |
| Bear / Loss | `#f87171` | Negative returns, outflows |
| Neutral | `#94a3b8` | No change |

## Tier Colors

| Tier | Color |
|------|-------|
| Platinum | `#c7d2fe` |
| Gold | `#fbbf24` |
| Silver | `#cbd5e1` |
| Bronze | `#f59e0b` |

## Typography

| Role | Font Family | Fallbacks |
|------|-------------|-----------|
| **Headings** | `ABC Arizona Text` | Georgia, Times New Roman, serif |
| **Body** | `Fakt` | -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif |
| **Code / Numbers** | `SF Mono` | Fira Code, Fira Mono, JetBrains Mono, monospace |

## Font Sizes

| Token | Size |
|-------|------|
| xs | 11px / 0.6875rem |
| sm | 13px / 0.8125rem |
| base | 15px / 0.9375rem |
| md | 16px / 1rem |
| lg | 18px / 1.125rem |
| xl | 22px / 1.375rem |
| 2xl | 28px / 1.75rem |
| 3xl | 36px / 2.25rem |
| 4xl | 48px / 3rem |

## Font Weights

| Token | Weight |
|-------|--------|
| Normal | 400 |
| Medium | 500 |
| Semibold | 600 |
| Bold | 700 |

## Spacing Scale

| Token | px |
|-------|-----|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 24px |
| 2xl | 32px |
| 3xl | 40px |
| 4xl | 48px |
| 5xl | 64px |

## Layout Constants

| Token | Value |
|-------|-------|
| Sidebar Width | 288px |
| Main Padding | 40px |
| Max Content Width | 1400px |
| Header Height | 64px |
| Card Border Radius | 16px |
| Border Radius (default) | 8px |
| Border Radius (small) | 6px |

## Shadows (Dark Theme)

| Token | Value |
|-------|-------|
| sm | `0 4px 16px rgba(0,0,0,0.25)` |
| md | `0 8px 32px rgba(0,0,0,0.36)` |
| lg | `0 12px 40px rgba(0,0,0,0.45)` |
| xl | `0 16px 48px rgba(0,0,0,0.55)` |
| Glow (teal) | `0 0 24px rgba(43,184,196,0.35)` |
| Glow (ice) | `0 0 20px rgba(182,208,237,0.25)` |

## Button Styles

Primary buttons use a gradient for visibility on dark backgrounds:

```
background: linear-gradient(135deg, #2bb8c4, #5dd8e4)
color: #ffffff
font-weight: 600
box-shadow: 0 4px 16px rgba(43,184,196,0.3)
border-radius: 8px
```

Secondary (outline):
```
background: transparent
color: #2bb8c4
border: 1px solid #2bb8c4
```

## Chart Color Palette

Brightened for contrast on dark chart backgrounds:

```
#2bb8c4  (teal — primary series)
#5dd8e4  (teal light — secondary series)
#b6d0ed  (ice)
#88cbd3  (teal-ice blend)
#8a9aa2  (slate)
#a8b8c0  (slate light)
#34d399  (success green — for positive series)
#fbbf24  (gold — for highlight series)
```

## Glass Card Style

The standard "glass card" used across all apps:

```
background: rgba(255,255,255,0.07)
border: 1px solid rgba(255,255,255,0.12)
border-radius: 16px
box-shadow: 0 8px 32px rgba(0,0,0,0.36)
backdrop-filter: blur(24px)
```

Hover:
```
background: rgba(255,255,255,0.10)
border-color: rgba(255,255,255,0.18)
box-shadow: 0 12px 40px rgba(0,0,0,0.45)
```

## Logo

- Text: "Farther" in ABC Arizona Text (serif), semibold
- Icon: Teal square with rounded corners, white "F" in serif
- Subtitle varies by app: "AX Command Center", "Billing Portal", "Marketing Command Center", "Intelligent Wealth Tools"

---

## Implementation Notes

Each repo implements these tokens differently based on its styling approach:

| Repo | Approach | Token File |
|------|----------|------------|
| Farther-AX | Tailwind CSS + `design-tokens.ts` | `lib/design-tokens.ts` |
| farther-billing-portal | Inline styles via `THEME`/`STYLES` | `src/lib/theme.ts` |
| Farther-Marketing | Tailwind CSS + `tailwind.config.ts` | `tailwind.config.ts` |
| Wealth Tools | Tailwind v4 + `@theme` in globals.css | `src/app/globals.css` |

**The hex values and design intent must be identical.** Only the delivery mechanism differs.

---

## Light Mode (Future)

All apps will support a light/dark toggle. Light mode uses:
- Page background: `#FAF7F2` (cream)
- Card background: `#ffffff`
- Text primary: `#333333` (charcoal)
- Text secondary: `#5b6a71` (slate)
- Teal stays `#2bb8c4` for buttons/links (darkened to `#1d7682` for text on light bg)
- Status colors shift to their darker variants for contrast on light surfaces
