# Phases 4 & 5: Quick Start Guide

**Built:** 2026-03-30
**Status:** Ready for integration and testing

---

## TL;DR

✅ **Phase 4 (Opportunity Detection):** Fully built, 48/48 tests passing
✅ **Phase 5 (Scenario Planning):** Fully built, ready for UI integration

---

## Quick Links

- [Phase 4 Complete Documentation](./PHASE_4_COMPLETE.md)
- [Phase 5 Complete Documentation](./PHASE_5_COMPLETE.md)
- [Session Summary](./SESSION_COMPLETE_SUMMARY.md)

---

## What's Working Now

### Phase 4: Opportunity Detection
```typescript
import { detectOpportunities } from '@/lib/opportunity-engine';

// Detect opportunities from a tax calculation
const result = await detectOpportunities({
  calculationRunId: 'calc_run_123'
});

// Returns detected opportunities with ranking and scoring
console.log(result.opportunities); // Array of detected opportunities
```

### Phase 5: Scenario Planning
```typescript
import { createScenario, compareScenarios } from '@/lib/scenario-planning';

// Create a Roth conversion scenario
const scenario = await createScenario({
  householdId: 'hh_123',
  taxYear: 2025,
  baselineSnapshotId: 'snap_001',
  baselineRunId: 'run_001',
  scenarioType: 'roth_conversion',
  overrides: [{
    field: 'iraDistributionsTaxable',
    operator: 'add',
    value: 50000,
    reason: 'Roth conversion',
    sourceType: 'manual',
    createdBy: 'advisor_123',
    createdAt: new Date().toISOString(),
  }],
}, 'advisor_123');

// Compare scenarios
const comparison = await compareScenarios({
  householdId: 'hh_123',
  taxYear: 2025,
  baselineScenarioId: scenario.id,
  comparisonScenarioIds: ['scn_002', 'scn_003'],
}, 'advisor_123');
```

---

## API Endpoints

### Phase 4
```bash
POST   /api/opportunities/detect
GET    /api/opportunities/:id
PATCH  /api/opportunities/:id/status
POST   /api/opportunities/:id/ai-summary
GET    /api/opportunities/runs/:runId
GET    /api/households/:id/opportunities
```

### Phase 5
```bash
POST   /api/scenarios
GET    /api/scenarios/:id
PATCH  /api/scenarios/:id
POST   /api/scenarios/:id/recommend
POST   /api/scenarios/:id/archive
POST   /api/scenario-comparisons
GET    /api/households/:id/scenarios
```

---

## Database Models

### Phase 4
- `OpportunityDetectionRun` - Detection run metadata
- `Opportunity` - Individual opportunities
- `OpportunityAuditEvent` - Audit trail
- `OpportunityRule` - Rule definitions

### Phase 5
- `PlanningScenario` - Scenario definitions
- `ScenarioNote` - Advisor notes
- `ScenarioComparison` - Comparison results
- `ScenarioTemplate` - Pre-built templates
- `ScenarioAuditEvent` - Audit trail

---

## Run Tests

```bash
# Phase 4 tests (48 tests)
npm test -- src/lib/opportunity-engine/__tests__

# All tests
npm test
```

---

## View Database

```bash
npx prisma studio
```

---

## Scenario Templates Available

1. **Roth Conversion** - Fill to target bracket
2. **Charitable Bunching** - Multi-year gifts
3. **Capital Gains Harvesting** - 0% bracket
4. **Withholding Adjustment** - Cash flow
5. **Estimated Payments** - Quarterly planning
6. **IRA Distribution** - RMD scenarios
7. **QCD Strategy** - Qualified charitable distributions
8. **Retirement Transition** - Income drop
9. **Bonus Income** - Windfall planning
10. **Custom** - Advisor-defined

---

## Next Steps

1. **Fix Phase 4 API field names** (see SESSION_COMPLETE_SUMMARY.md)
2. **Build UI components**
3. **Integrate with Phase 3 tax calculation**
4. **Seed templates into database**

---

## Need Help?

See detailed documentation:
- [PHASE_4_COMPLETE.md](./PHASE_4_COMPLETE.md) - Full Phase 4 docs
- [PHASE_5_COMPLETE.md](./PHASE_5_COMPLETE.md) - Full Phase 5 docs
- [SESSION_COMPLETE_SUMMARY.md](./SESSION_COMPLETE_SUMMARY.md) - Quick summary
