# Farther — All Platform Sites Brand System Spec

> **This is the single source of truth.** Drop this file into any Claude Code session as training context.
> Claude must use this document when generating UI, styling, components, charts, or any visual output for ANY Farther platform site.

---

## 0. Scope & Goals

This brand system applies to **all four** Farther platform sites:
- **Farther AX** — Advisor experience command center (dark mode primary)
- **Farther Billing Portal** — Billing intelligence center
- **Farther Marketing** — Marketing command center
- **Farther Intelligent Wealth Tools** — Wealth planning platform

**Design goals:**
- Luxurious, modern, ultra-high-net-worth feel
- Cool, desaturated palette anchored in Steel blue and soft off-whites
- Full light + dark mode support via CSS variables
- Consistent across Tailwind, Tremor, Recharts, and inline CSS projects

---

## 1. Core Brand Palette (Atomic Colors)

| Name | Swatch Key | Hex | RGB Triplet | Usage |
|------|-----------|-----|-------------|-------|
| **Steel** | `steel-500` | `#4E7082` | `78 112 130` | Primary brand, CTAs, accents, chart primary |
| **Graphite** | `graphite-600` | `#374E59` | `55 78 89` | Deep text (light mode), dark surfaces |
| **Slate** | `slate-600` | `#405B69` | `64 91 105` | Supporting backgrounds, borders |
| **Ivory** | `ivory-50` | `#FFFEF4` | `255 254 244` | Light mode body bg, text on dark |
| **Linen** | `linen-100` | `#F7F4F0` | `247 244 240` | Alternate light surfaces |
| **Mist** | `mist-100` | `#D4DFE5` | `212 223 229` | Tags, chips, subtle fills, borders |
| **Sky** | `sky-300` | `#99B6C3` | `153 182 195` | Hovers, light accents, secondary chart |
| **Aqua** | `aqua-300` | `#A8CED3` | `168 206 211` | Charts, badges, pills, gradient endpoint |
| **Terra** | `terra-500` | `#8A5C4F` | `138 92 79` | Luxury accent, select highlights only |
| **Cool Gray** | `graycool-400` | `#888888` | `136 136 136` | Secondary text on light |
| **Deep Gray** | `graycool-600` | `#595959` | `89 89 89` | Secondary text on dark |

### Status Colors

| Status | DEFAULT | Soft | Subtle |
|--------|---------|------|--------|
| **Positive** (growth, gains) | `#10b981` | `#22c55e` | `#bbf7d0` |
| **Caution** (warning, review) | `#ea580c` | `#f97316` | `#fed7aa` |
| **Negative** (error, past due) | `#b91c1c` | `#ef4444` | `#fecaca` |
| **Info** | `#3b82f6` | `#60a5fa` | `#bfdbfe` |

### Tier Colors

| Tier | Hex |
|------|-----|
| Platinum | `#c7d2fe` |
| Gold | `#fbbf24` |
| Silver | `#cbd5e1` |
| Bronze | `#f59e0b` |

---

## 2. Semantic Token System

Claude must **always prefer semantic tokens** over raw hex values. The semantic system uses CSS variables with RGB triplets so Tailwind `<alpha-value>` works.

### Semantic Groups

| Group | Tokens | Purpose |
|-------|--------|---------|
| `text.*` | `DEFAULT`, `subtle`, `muted`, `onBrand` | Foreground colors |
| `surface.*` | `DEFAULT`, `soft`, `strong`, `brand`, `subtle` | Background/surface colors |
| `border.*` | `subtle`, `strong`, `brand` | Border/divider colors |
| `accent.*` | `primary`, `primarySoft`, `secondary`, `luxury` | Brand accent colors |

### Tailwind Usage

```html
<div class="bg-surface-soft text-text border border-border-subtle">
  <h2 class="text-text">Title</h2>
  <p class="text-text-subtle">Body</p>
  <button class="bg-accent-primary text-text-onBrand">CTA</button>
</div>
```

---

## 3. Light Mode Design Rules

### 3.1 Body & Layout

- Body: `linear-gradient(165deg, #FFFEF4 0%, #F7F4F0 40%, #D4DFE5 100%)` fixed
- Nav bg: `rgba(247, 244, 240, 0.92)` + `backdrop-filter: blur(20px)` + border `rgba(57, 78, 89, 0.12)`
- Mobile nav shadow: `0 4px 16px rgba(55, 78, 89, 0.12)`

### 3.2 Cards

- Background: `rgba(255, 254, 244, 0.96)`
- Border: `1px solid rgba(57, 78, 89, 0.10)`
- Radius: `16px`
- Shadow: `0 8px 24px rgba(55, 78, 89, 0.10)`

### 3.3 Buttons (Light)

| Variant | Background | Text | Hover |
|---------|-----------|------|-------|
| Primary | `linear-gradient(135deg, #4E7082, #A8CED3)` | `#FFFEF4` | `linear-gradient(135deg, #374E59, #4E7082)` + shadow |
| Secondary | `rgba(212, 223, 229, 0.7)` | `#374E59` | border shifts to `rgba(78,112,130,0.35)` |
| Ghost | transparent | `#4E7082` | `rgba(212, 223, 229, 0.45)` fill |

### 3.4 Inputs (Light)

- Background: `rgba(255, 254, 244, 0.9)`
- Border: `rgba(57, 78, 89, 0.18)`
- Placeholder: `rgba(89, 89, 89, 0.6)`
- Focus: border `#4E7082` + ring `0 0 0 3px rgba(78, 112, 130, 0.20)`

### 3.5 Typography (Light)

| Role | Value |
|------|-------|
| Page titles | `#374E59` |
| Card titles | `#374E59` |
| Body copy | `rgba(55, 78, 89, 0.85)` |
| Subtitles/meta | `rgba(89, 89, 89, 0.75)` |
| Disabled | `rgba(137, 137, 137, 0.55)` |

---

## 4. Dark Mode Design Rules

### 4.1 Body & Layout

- Body: `linear-gradient(165deg, #111111 0%, #1A1A1A 40%, #202830 100%)` fixed
- Sidebar bg: `rgba(16, 20, 25, 0.95)` + `backdrop-filter: blur(24px)` + border `rgba(212, 223, 229, 0.10)`
- Active nav: bg `linear-gradient(135deg, rgba(78,112,130,0.32), rgba(168,206,211,0.24))` + left pill `#A8CED3 -> #99B6C3`
- Top bar: `rgba(23, 31, 39, 0.92)` + border `rgba(212, 223, 229, 0.10)`

### 4.2 Cards & Glass (Dark)

| Class | Background | Border | Shadow |
|-------|-----------|--------|--------|
| glass-card | `rgba(23, 31, 39, 0.80)` | `rgba(212, 223, 229, 0.16)` | `0 8px 32px rgba(0,0,0,0.60)` |
| glass-card hover | `rgba(34, 48, 59, 0.90)` | `rgba(153, 182, 195, 0.35)` | — |
| KPI stat bar | `linear-gradient(90deg, #4E7082, #A8CED3)` | — | — |

### 4.3 Buttons (Dark)

| Variant | Background | Text | Hover |
|---------|-----------|------|-------|
| Primary | `linear-gradient(135deg, #4E7082, #A8CED3)` | `#FFFEF4` | `linear-gradient(135deg, #374E59, #4E7082)` + glow `0 0 18px rgba(168,206,211,0.50)` |
| Secondary | `rgba(64, 91, 105, 0.70)` | `rgba(255, 254, 244, 0.90)` | border to `rgba(212,223,229,0.35)` |
| Ghost | transparent | `#99B6C3` | `rgba(64, 91, 105, 0.55)` |

### 4.4 Inputs (Dark)

- Background: `rgba(16, 20, 25, 0.90)`
- Border: `rgba(212, 223, 229, 0.22)`
- Placeholder: `rgba(212, 223, 229, 0.50)`
- Focus ring: `0 0 0 3px rgba(168, 206, 211, 0.38)`

### 4.5 Typography (Dark)

| Role | Value |
|------|-------|
| Page titles | `#FFFEF4` |
| Card titles | `rgba(255, 254, 244, 0.90)` |
| Body copy | `rgba(255, 254, 244, 0.78)` |
| Subtitles | `rgba(212, 223, 229, 0.66)` |
| Tertiary/labels | `rgba(212, 223, 229, 0.45)` |

---

## 5. Charts & Data Visualization

### Series Order (both modes)

1. Steel `#4E7082`
2. Aqua `#A8CED3`
3. Sky `#99B6C3`
4. Mist `#D4DFE5`
5. Slate `#405B69`
6. Terra `#8A5C4F` (highlight only)

### Area Gradient Stops

- Primary: `#4E7082` opacity 0.45 -> 0
- Secondary: `#A8CED3` opacity 0.45 -> 0

### Axes & Grid

| Mode | Grid Stroke | Label Color |
|------|------------|-------------|
| Light | `rgba(89, 89, 89, 0.20)` | `rgba(55, 78, 89, 0.75)` |
| Dark | `rgba(212, 223, 229, 0.16)` | `rgba(255, 254, 244, 0.60)` |

### Donut/Pie Defaults

- Color order: `[steel, aqua, sky, mist, slate, terra]`
- Inner radius: 70, outer: 120, padding angle: 3

---

## 6. Component Patterns

### 6.1 Button Base (all variants)

```html
<button class="inline-flex items-center justify-center gap-2
               px-5 py-3 rounded-xl text-sm font-medium
               transition-all duration-200
               focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-accent-primary focus-visible:ring-offset-2
               focus-visible:ring-offset-surface">
```

### 6.2 Primary Button

```html
<button class="bg-accent-primary text-text-onBrand shadow-glow-accent
               hover:bg-accent-primary-soft active:scale-[0.99] ...base">
  Primary CTA
</button>
```

### 6.3 Secondary Button

```html
<button class="bg-surface-soft dark:bg-surface-strong text-text-subtle
               border border-border-subtle hover:border-border-brand
               hover:text-text active:scale-[0.99] ...base">
  Secondary
</button>
```

### 6.4 Ghost Button

```html
<button class="bg-transparent text-accent-primary
               hover:bg-surface-subtle/40 active:scale-[0.99] ...base">
  Ghost
</button>
```

### 6.5 Content Card

```html
<div class="bg-surface-soft dark:bg-surface-strong border border-border-subtle
            rounded-2xl shadow-glass p-6 flex flex-col gap-3">
  <h2 class="text-text text-base font-serif">Title</h2>
  <p class="text-text-subtle text-sm">Content</p>
</div>
```

### 6.6 KPI Stat Card

```html
<div class="relative overflow-hidden rounded-2xl shadow-glass
            bg-surface-soft dark:bg-surface-strong border border-border-subtle p-5">
  <div class="absolute inset-x-0 top-0 h-[3px]
              bg-gradient-to-r from-accent-primary to-accent-primarySoft"></div>
  <p class="text-[10px] font-medium tracking-[0.15em] uppercase text-text-muted mb-1">Label</p>
  <p class="text-text text-3xl font-light">$12.4M</p>
  <p class="text-text-subtle text-xs mt-1">+$220k vs. last month</p>
</div>
```

### 6.7 Status Pills

```html
<!-- Positive -->
<span class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium
             bg-status-positive-soft text-status-positive border border-status-positive">
  On track
</span>

<!-- Caution -->
<span class="... bg-status-caution-soft text-status-caution border border-status-caution">
  Review soon
</span>

<!-- Negative -->
<span class="... bg-status-negative-soft text-status-negative border border-status-negative">
  Past due
</span>
```

### 6.8 Neutral Tag

```html
<span class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium
             bg-surface-subtle text-text-subtle border border-border-subtle">
  Family office
</span>
```

---

## 7. Tremor Integration

### Tremor Light Mode Colors

```js
tremor: {
  brand:      { faint: '#D4DFE5', muted: '#99B6C3', subtle: '#A8CED3', DEFAULT: '#4E7082', emphasis: '#374E59', inverted: '#FFFEF4' },
  background: { muted: '#F7F4F0', subtle: '#FFFEF4', DEFAULT: '#FFFEF4', emphasis: '#374E59' },
  border:     { DEFAULT: '#D4DFE5' },
  ring:       { DEFAULT: '#D4DFE5' },
  content:    { subtle: '#888888', DEFAULT: '#595959', emphasis: '#374E59', strong: '#111111', inverted: '#FFFEF4' }
}
```

### Tremor Dark Mode Colors

```js
'dark-tremor': {
  brand:      { faint: '#0B1220', muted: '#1F2933', subtle: '#4E7082', DEFAULT: '#A8CED3', emphasis: '#D4DFE5', inverted: '#030712' },
  background: { muted: '#111111', subtle: '#1A1A1A', DEFAULT: '#111111', emphasis: '#D4DFE5' },
  border:     { DEFAULT: '#1F2937' },
  ring:       { DEFAULT: '#1F2937' },
  content:    { subtle: '#9CA3AF', DEFAULT: '#D4DFE5', emphasis: '#F9FAFB', strong: '#FFFFFF', inverted: '#000000' }
}
```

### Tremor Chart Colors

```tsx
<AreaChart colors={['[#4E7082]', '[#A8CED3]', '[#99B6C3]']} />
<DonutChart colors={['[#4E7082]', '[#A8CED3]', '[#99B6C3]', '[#D4DFE5]']} />
```

---

## 8. Avatars

| Variant | Gradient |
|---------|----------|
| Executive | `#8A5C4F -> #A8CED3` |
| Standard brand | `#4E7082 -> #A8CED3` |
| Soft | `#99B6C3 -> #D4DFE5` |

---

## 9. Badge Opacity Rules

### Light Mode Badges

- Background: `bg-{color}-500/12`
- Border: `border-{color}-500/18`
- Text: `{color}-700`

### Dark Mode Badges

- Background: `bg-{color}-400/20`
- Border: `border-{color}-400/35`
- Text: `{color}-200`

---

## 10. Typography

| Role | Font | Fallback | Tailwind |
|------|------|----------|----------|
| Headers (h1-h6) | ABC Arizona Text | Georgia, serif | `font-serif` |
| Body | Fakt | system-ui, sans-serif | `font-sans` |
| Code | SF Mono | Fira Code, monospace | `font-mono` |

**Weights:** Light (300), Regular/Blond (400), Medium (500), SemiBold (600)

---

## 11. Shadows & Depth

| Token | Value |
|-------|-------|
| glass | `0 8px 32px rgba(0,0,0,0.36)` |
| glass-hover | `0 12px 40px rgba(0,0,0,0.45)` |
| glass-sm | `0 4px 16px rgba(0,0,0,0.25)` |
| glow-accent | `0 0 20px rgba(78,112,130,0.35)` |
| glow-aqua | `0 0 18px rgba(168,206,211,0.50)` |
| card-light | `0 8px 24px rgba(55,78,89,0.10)` |
| card-dark | `0 8px 32px rgba(0,0,0,0.60)` |

---

## 12. Spacing & Border Radius

**Spacing:** xs=4px, sm=8px, md=16px, lg=24px, xl=32px, 2xl=48px, 3xl=64px

**Border Radius:** sm=6px, md=8px, lg=12px (buttons/inputs), xl=16px (cards), 2xl=20px (chart cards), full=9999px (pills/avatars)

---

## 13. Logo Usage

- Light backgrounds: Steel wordmark
- Dark backgrounds: White/Ivory wordmark
- Exclusion zone: minimum padding = height of the "F" on all sides
- Minimum cap height: 32px desktop, 24px mobile
- Never place Terra behind the logo — use Mist or Graphite backgrounds

---

## 14. Files in This Brand System

| File | Purpose | Import Into |
|------|---------|-------------|
| `farther-platform-colors.json` | Single source of truth JSON | Design tools, scripts, any platform |
| `tailwind-brand-colors.js` | Tailwind config colors + shadows | `tailwind.config.js` |
| `brand-css-variables.css` | Light/dark CSS variables | `globals.css` or `app.css` |
| `design-tokens.ts` | TypeScript exports for all tokens | Any React/Next.js component |
| `chart-colors.ts` | Chart color helpers for Recharts/Tremor | Charting components |
| `FARTHER-BRAND-GUIDE.md` | This file — the master spec | Claude Code sessions |

---

## 15. Rules for Claude

1. **Always use semantic tokens** (`bg-surface-soft`, `text-text-subtle`, `bg-accent-primary`) instead of raw hex — except in Tremor `colors` arrays and design token definitions.
2. **Use the status color system** for financial contexts: positive = gains, caution = review needed, negative = losses/past due.
3. **Charts:** Default series order is Steel, Aqua, Sky, Mist, Slate, Terra. Use status colors for good/ok/bad breakdowns.
4. **Dark mode:** Rely on `.dark` class + CSS variable overrides. Never hardcode light or dark values — let the variables handle it.
5. **Buttons & Pills:** Primary CTAs use `bg-accent-primary text-text-onBrand`. Status pills use `status.*` tokens.
6. **Never invent new colors.** Only use what is defined in this guide.
7. **Never use pure white** (`#FFFFFF`) for body text — always Ivory `#FFFEF4` or semantic `text-text`.
8. **Border radius:** Cards = 16px, Buttons/Inputs = 12px, Badges/Pills = 9999px (full).
9. **Transitions:** All interactive elements need `transition-all duration-200` minimum.
10. **Fonts:** Headers = `font-serif` (ABC Arizona Text), Body = `font-sans` (Fakt).
