# What Your Money Becomes™ — Time Value of Money Calculator

## Overview

**Purpose:** Show investors how time, savings discipline, compound market returns, and reinvested dividends create wealth — while ensuring the "What Your Money Becomes" milestone experience reflects only gains created by time and growth, not principal or deposits.

**Key Innovation:** The milestone timeline shows ONLY the value created by markets and compounding (portfolio value minus principal contributed), making it intellectually honest and emotionally powerful.

---

## Core Philosophy

This calculator tells **two separate stories**:

1. **Total Wealth Story** — what the entire portfolio is worth
2. **Created Wealth Story** — what time, compounding, and market returns alone produced

### Critical Rule

```
Milestone_Basis = max(0, Portfolio_Value - Cumulative_Principal)
```

**NOT:** `Milestone_Basis = Portfolio_Value`

This means:
- A $4.28M portfolio with $980K contributed shows **$3.3M in milestones**
- Users see what **patience and markets created**, not their own deposits
- Builds trust through transparency and accuracy

---

## Features

### Input Controls
1. **Starting Investment** ($0 - $50M, step $1,000)
2. **Monthly Contribution** ($0 - $100K, step $100)
3. **Investment Type** (7 preset profiles with historical returns)
4. **Time Horizon** (1-40 years, slider)
5. **Market Correction** (optional stress test with 6 historical scenarios)

### Investment Type Presets

| Type | Annual Return | Dividend Yield | Volatility |
|------|---------------|----------------|------------|
| Conservative (Bonds & CDs) | 4.5% | 3.0% | Low |
| Balanced (60/40) | 7.5% | 2.0% | Moderate |
| Diversified Portfolio (70/30) | 8.5% | 1.8% | Moderate-High |
| Growth (100% Equities) | 10.4% | 1.4% | High |
| Aggressive Growth | 11.5% | 0.8% | Very High |
| Real Estate (REITs) | 9.0% | 3.5% | Moderate-High |
| Dividend-Focused Equity | 8.0% | 3.8% | Moderate |

### Market Correction Scenarios

| Event | Decline | Recovery Period |
|-------|---------|-----------------|
| Dot-Com Crash | -49.1% | 7.0 years |
| 2008 Financial Crisis | -56.8% | 5.5 years |
| COVID-19 Crash | -33.9% | 0.4 years |
| 2022 Bear Market | -25.4% | 2.0 years |
| Average Correction (10%+) | -15.0% | 0.33 years |
| Severe Bear Market | -35.0% | 3.0 years |

---

## Output Displays

### Hero Metrics Panel
- **Your Projected Portfolio** — Full account value (FV formula)
- **What You Put In** — Starting principal + all deposits
- **Value Created by Time & Markets** — Portfolio minus principal (highlighted)
- **Dividends Reinvested** — Approximated dividend contribution
- **Portfolio Multiple** — Total portfolio / principal invested

### Milestone Timeline

Shows real-world milestones at key years (1, 3, 5, 10, 15, 20, 25, 30, final).

Each card displays:
- Year
- **Benefit created value** (NOT total portfolio)
- Milestone icon and label
- One-sentence translation
- "Created above principal" subtitle

#### Milestone Mapping Table

| Benefit Range | Icon | Milestone | Description |
|---------------|------|-----------|-------------|
| $0 | 🌱 | Not Yet Above Principal | Growth has not yet exceeded invested dollars |
| $1 - $2,500 | ☕ | Daily Coffee Ritual | Market-created gain covers a year of coffee |
| $2,501 - $7,500 | ✈️ | Family Getaway | Gains could fund a meaningful vacation |
| $7,501 - $20,000 | 🚗 | Reliable Car Upgrade | Gains alone could buy a quality vehicle |
| $20,001 - $50,000 | 🎓 | Education Fund Boost | Market-created value could fund tuition |
| $50,001 - $100,000 | 🏡 | Home Down Payment | Gains alone could cover substantial down payment |
| $100,001 - $250,000 | 🛥️ | Lifestyle Freedom Fund | Growth created optionality |
| $250,001 - $500,000 | 🏠 | Vacation Property Equity | Gains represent major purchasing power |
| $500,001 - $1M | 🌍 | Work-Optional Flexibility | Life-changing financial freedom |
| $1M - $2.5M | 🕊️ | Early Retirement Engine | Could materially fund retirement |
| $2.5M - $5M | ✈️ | Legacy-Level Optionality | Can reshape family opportunity |
| $5M+ | 🏛️ | Generational Impact | Enduring excess capital |

### Correction Insight Panel (conditional)

When market correction is enabled:
- **Without correction:** Base case ending value
- **With correction:** Stressed ending value
- **Compounding lost:** Dollar amount and percentage
- Dynamic narrative about downside impact

---

## Formulas

### Formula 1: Future Value of Total Portfolio

```
FV = PV(1 + r/n)^(nt) + PMT × [(1 + r/n)^(nt) - 1] / (r/n)
```

Where:
- `PV` = Starting investment
- `PMT` = Monthly contribution
- `r` = Annual return
- `n` = Compounding periods per year (12)
- `t` = Time horizon in years

### Formula 2: Cumulative Principal

```
P_y = PV + (PMT × 12 × y)
```

### Formula 3: Benefit Created (KEY FORMULA)

```
B_y = V_y - P_y
```

Where:
- `V_y` = Portfolio value at year y
- `P_y` = Cumulative principal at year y
- `B_y` = Benefit created at year y

### Formula 4: Milestone Basis (CRITICAL)

```
Milestone_Basis_y = max(0, B_y)
```

**This is what drives the milestone cards.**

### Formula 5: Dividend Tracking (Approximation)

```
Dividend_y ≈ V_y × dividend_yield
```

### Formula 6: Market Correction Logic

1. Grow normally until correction year
2. Apply selected decline to current portfolio value
3. Resume compounding over stated recovery period
4. Continue normal growth after recovery
5. Recompute V_y, P_y, and B_y for every year

---

## Technical Implementation

### Technology Stack
- **Framework:** Next.js 14.2 + React 18.3
- **Language:** TypeScript 5.3
- **Styling:** Tailwind CSS v4
- **Icons:** Remix Icon
- **Testing:** Vitest

### File Structure

```
src/app/tools/wealth-calculator/
├── page.tsx                    # Main calculator component
├── layout.tsx                  # Layout wrapper
├── metadata.ts                 # SEO metadata
├── README.md                   # This file
└── __tests__/
    └── calculations.test.ts    # Test suite (48+ tests)
```

### Key Functions

```typescript
calculateYearSeries(pv, pmt, investmentType, timeHorizon): YearData[]
applyCorrectionToSeries(series, correctionYear, scenario, investmentType): YearData[]
getMilestoneForBenefit(benefitValue): Milestone
formatCurrency(value): string
```

### Data Model

```typescript
interface YearData {
  year: number;
  portfolioValue: number;
  principalContributed: number;
  cumulativeDividends: number;
  capitalAppreciation: number;
  benefitCreated: number;
  milestoneBasis: number;      // ← Key: max(0, benefitCreated)
}
```

---

## Testing

### Test Matrix

The calculator includes 48+ automated tests covering:

| Test Case | Starting | Monthly | Type | Years | Expected Outcome |
|-----------|----------|---------|------|-------|------------------|
| 1 | $500k | $2k | Growth | 20 | Principal: $980k, Portfolio: ~$4.28M, Benefit: ~$3.3M |
| 2 | $100k | $1k | Balanced | 10 | Principal: $220k, Portfolio: ~$315k, Benefit: ~$95k |
| 3 | $100k | $1k | Balanced | 3 | Principal: $136k, Portfolio: ~$147k, Benefit: ~$11k |
| 4 | $100k | $1k | Balanced | 1 | Principal: $112k, Portfolio: ~$116k, Benefit: ~$4k |
| 5 | $250k | $0 | Dividend | 10 | Principal: $250k, Portfolio: ~$540k, Benefit: ~$290k |

### Run Tests

```bash
npm run test src/app/tools/wealth-calculator/__tests__
```

### Critical Assertions

✅ Milestone basis must ALWAYS equal `max(0, Portfolio - Principal)`
✅ Milestone basis must NEVER use total portfolio value
✅ Principal must accumulate correctly: `PV + (PMT × 12 × year)`
✅ Benefit must equal portfolio minus principal
✅ Year 0 must have zero benefit created
✅ Negative benefits must show 🌱 state

---

## Compliance & Disclosures

### Required Disclosures

**Educational Purpose:**
> This calculator is for educational and illustrative purposes only. Results are hypothetical, are based on selected assumptions, and do not represent actual investment results. Investment returns, dividend yields, and market declines are not guaranteed. Actual outcomes will vary and may be materially better or worse than shown.

**Milestone Methodology:**
> The milestone timeline labeled "What Time & Growth Created" reflects only the modeled value above principal contributed. It excludes the investor's starting principal and ongoing deposits when assigning real-world milestone comparisons.

**Return Assumptions:**
> Investment type assumptions are based on broad historical market data and simplified return profiles, including reinvested dividend assumptions where applicable, and are not recommendations of any security, portfolio, or strategy.

**Market Corrections:**
> Historical correction scenarios are simplified educational illustrations based on prior market declines. They do not predict future market behavior, recovery timing, or actual portfolio performance.

**Taxes, Fees, Inflation:**
> Results are shown in nominal dollars and do not account for inflation, taxes, advisory fees, fund expenses, or transaction costs.

### Language Guardrails

**Do NOT use:**
- "guaranteed"
- "safe return"
- "expected outcome"
- "your money will become" (without qualification)

**Prefer:**
- "hypothetical projection"
- "modeled estimate"
- "illustrative growth"
- "value created beyond principal"

---

## UX Principles

### Emotional Journey

1. **Engagement** — Under 60 seconds to see results
2. **Understanding** — Two separate wealth stories (total vs. created)
3. **Trust** — Honest milestone mapping builds credibility
4. **Aha Moment** — "The real wealth came from time in the market"
5. **Action** — CTA to personalized advisory conversation

### Design Philosophy

- **Calm, premium, educational** (not flashy)
- **Milestone section feels editorial** (more meaningful than numeric chart)
- **Short labels, strong icons, concise copy**
- **Mobile-first responsive layout**
- **Accessible** (keyboard navigation, color not sole indicator)

### Narrative Rules

**Bad:**
> "Your money becomes a vacation home"

**Good:**
> "The growth created beyond your invested dollars becomes equivalent to a vacation home down payment"

---

## Usage Example

### User Story: Sarah, $500K Starting, $2K Monthly

Sarah enters:
- Starting: $500,000
- Monthly: $2,000
- Type: Diversified Portfolio (8.5%)
- Horizon: 20 years

**Results:**
- Total Portfolio: **$4,280,000**
- Principal Contributed: **$980,000**
- Value Created: **$3,300,000** ← This drives milestones

**Milestone Timeline:**
- Year 5: $73K → 🎓 Education Fund Boost
- Year 10: $420K → 🌍 Work-Optional Flexibility
- Year 15: $1.2M → 🕊️ Early Retirement Engine
- Year 20: $3.3M → ✈️ Legacy-Level Optionality

**Sarah's Reaction:**
> "I invested $500K and added $2K/month. After 20 years I see a $4.28M portfolio, but the milestone story tells me that only about $3.3M was created above the dollars I put in. That makes the value of patience feel real — and honest. I trust the tool more because it does not claim my own contributions are market success."

---

## Future Enhancements

### Potential Features
- [ ] Export PDF report
- [ ] Email results
- [ ] Save/load scenarios
- [ ] Compare multiple scenarios side-by-side
- [ ] Inflation-adjusted view toggle
- [ ] Tax/fee impact overlay
- [ ] Custom investment type builder
- [ ] Historical market data overlay
- [ ] Monte Carlo simulation mode

### Accessibility Improvements
- [ ] Screen reader optimization
- [ ] High contrast mode
- [ ] Keyboard shortcuts
- [ ] ARIA live regions for dynamic updates

---

## Support

For questions, issues, or feature requests related to the What Your Money Becomes™ calculator, contact:

- **Technical:** [Development Team]
- **Compliance:** [Compliance Team]
- **Product:** [Product Team]

---

**Built with precision by WealthCalc Architects**
**"Show the wealth that time creates"**
