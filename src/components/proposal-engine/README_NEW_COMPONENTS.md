# New FPE UI Components

Three new UI components were added to the Farther Proposal Engine (FPE) on 2026-04-05.

## 1. FundXrayPanel.tsx

**Purpose**: Displays fund X-ray analysis results showing underlying securities decomposed from ETF/mutual fund holdings.

**Props**:
- `result: FundXrayResult` - Fund X-ray analysis result from `performFundXray()`

**Features**:
- 3 stat cards: underlying securities count, top 10 concentration, concentration alerts
- 4-tab interface:
  - **Holdings**: Table of decomposed securities with effective weight, appearance info, and direct/underlying badge
  - **Sectors**: Horizontal bar chart of sector exposure
  - **Overlaps**: Cards showing securities appearing in multiple funds
  - **Alerts**: Concentration alerts with severity badges (HIGH/MEDIUM/LOW)
- Uses semantic tokens: `text-text`, `bg-surface-soft`, `border-border-subtle`, etc.
- Follows existing `StressTestPanel.tsx` design patterns

**Example Usage**:
```tsx
import { performFundXray } from '@/lib/proposal-engine/analytics/fund-xray';
import { FundXrayPanel } from '@/components/proposal-engine/FundXrayPanel';

const xrayResult = await performFundXray(holdings);
<FundXrayPanel result={xrayResult} />
```

---

## 2. MonteCarloFanChart.tsx

**Purpose**: Visualizes Monte Carlo simulation results as a fan chart with percentile bands.

**Props**:
- `result: MonteCarloResult` - Monte Carlo simulation result from `runProposalMonteCarlo()`

**Features**:
- Recharts AreaChart with 5 percentile paths (p5, p25, p50, p75, p95)
- Gradient fills: p25-p75 band (darker), p5-p95 band (lighter)
- p50 (median) as solid accent line
- 4 terminal statistics cards: mean, median, p5, p95
- 3 probability badges: success rate, loss risk, doubling chance
- Custom tooltip showing year + percentile values
- Y-axis auto-scales with $K/$M formatting

**Example Usage**:
```tsx
import { runProposalMonteCarlo } from '@/lib/proposal-engine/analytics/monte-carlo-bridge';
import { MonteCarloFanChart } from '@/components/proposal-engine/MonteCarloFanChart';

const mcResult = runProposalMonteCarlo({
  portfolioValue: 1000000 * 100, // in cents
  expectedReturn: 0.07,
  volatility: 0.15,
  timeHorizonYears: 30,
});
<MonteCarloFanChart result={mcResult} />
```

---

## 3. StressTestPanel.tsx (Enhanced)

**Purpose**: Displays stress test results with optional VaR/CVaR metrics and dollar impact.

**Props**:
- `results: StressTestResult[]` - Basic stress test results (backward-compatible)
- `enhancedResult?: EnhancedStressResult | null` - Optional enhanced result with VaR/CVaR

**New Features**:
- 4 VaR/CVaR summary cards (only when `enhancedResult` is provided): VaR (95%), CVaR (95%), Avg Loss, Max Drawdown
- Dollar impact column (only when `enhancedResult` is provided)
- Worst-case scenario row highlighted with subtle red background (`bg-critical-500/5`)
- Backward-compatible: works with basic `StressTestResult[]` as before

**Example Usage**:
```tsx
import { runEnhancedStressTests } from '@/lib/proposal-engine/analytics/stress-testing';
import { StressTestPanel } from '@/components/proposal-engine/StressTestPanel';

// Basic usage (unchanged)
<StressTestPanel results={basicResults} />

// Enhanced usage (new)
const enhancedResult = runEnhancedStressTests(holdings);
<StressTestPanel results={enhancedResult.results} enhancedResult={enhancedResult} />
```

---

## Design System Adherence

All 3 components follow the existing design system:
- **Semantic tokens**: `text-text`, `text-text-muted`, `text-text-faint`, `bg-surface-soft`, `bg-surface-subtle`, `border-border-subtle`, etc.
- **Color accents**: `text-accent-primary`, `text-critical-700`, `text-warning-700`, `text-success-700`
- **cn() utility**: All conditional classes use `cn()` from `@/lib/utils/cn`
- **Lucide icons**: All icons from `lucide-react`
- **Recharts**: All charts use Recharts 2.x with Tremor-style theming
- **No custom CSS**: 100% Tailwind utility classes

---

## File Locations

- `/Users/tim.bohnett/Projects/Farther-Intelligent-Wealth-Tools/src/components/proposal-engine/FundXrayPanel.tsx`
- `/Users/tim.bohnett/Projects/Farther-Intelligent-Wealth-Tools/src/components/proposal-engine/MonteCarloFanChart.tsx`
- `/Users/tim.bohnett/Projects/Farther-Intelligent-Wealth-Tools/src/components/proposal-engine/StressTestPanel.tsx` (enhanced)

---

## Next Steps

1. **Integration**: Wire these components into proposal detail pages
2. **Testing**: Add component tests for all 3 files
3. **API Integration**: Connect to live FMP data for fund X-ray
4. **Polish**: Add loading states, empty state refinements, responsive breakpoints
