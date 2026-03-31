# Build Plan: Phase 4 + Phase 5 Implementation

**Date:** 2026-03-30
**Scope:** Complete implementation of Opportunity Detection Engine (Phase 4) + Scenario Planning Workspace (Phase 5)

---

## Phase 4: Opportunity Detection Engine

### Sprint 1: Foundation (Database + Types)
- [ ] Prisma schema: 4 new models + 3 extended
  - OpportunityDetectionRun
  - Opportunity
  - OpportunityAuditEvent
  - OpportunityRule
  - Extend: CalculationRun, Household, Plan
- [ ] TypeScript types (opportunity-engine.ts)
- [ ] Database migration

### Sprint 2: Core Engine
- [ ] Rule evaluator (9 comparison operators)
- [ ] Detection orchestrator (8-step pipeline)
- [ ] 3 initial detection rules:
  - Roth Conversion Headroom
  - IRMAA Proximity Alert
  - Withholding Payment Mismatch

### Sprint 3: Testing
- [ ] Unit tests for rule evaluator
- [ ] Integration tests for orchestrator
- [ ] Golden test cases (4 household scenarios)

### Sprint 4: API Layer
- [ ] 6 RESTful endpoints with Zod validation
  - POST /api/opportunities/detect
  - GET /api/opportunities/:id
  - PATCH /api/opportunities/:id/status
  - POST /api/opportunities/:id/ai-summary
  - GET /api/opportunities/runs/:runId
  - GET /api/households/:id/opportunities

### Sprint 5: AI Enhancement
- [ ] Claude API integration
- [ ] 7 IRS publications knowledge base
- [ ] Citation validation (3-layer hallucination prevention)
- [ ] AI service with temperature 0.3

---

## Phase 5: Scenario Planning Workspace

### Sprint 1: Schema & Object Model
- [ ] Prisma schema: Scenario models
  - PlanningScenario
  - ScenarioOverride
  - ScenarioAssumption
  - ScenarioNote
  - ScenarioComparison
  - ScenarioTemplate
  - ScenarioAuditEvent
- [ ] TypeScript types
- [ ] Database migration

### Sprint 2: Scenario Creation
- [ ] Create from baseline
- [ ] Create from opportunity
- [ ] Create from template
- [ ] Persistence logic

### Sprint 3: Calculation & Comparison
- [ ] Scenario calculation flow
- [ ] Baseline vs scenario comparison
- [ ] Multiple scenario comparison
- [ ] Comparison payload generator

### Sprint 4: Lifecycle & Notes
- [ ] Scenario lifecycle states (11 states)
- [ ] Notes and collaboration
- [ ] Warnings and blockers framework
- [ ] Recommendation designation

### Sprint 5: API Layer
- [ ] 8 REST endpoints
  - POST /scenarios
  - PATCH /scenarios/:id
  - GET /scenarios/:id
  - GET /households/:id/scenarios
  - POST /scenario-comparisons
  - POST /scenarios/:id/recommend
  - POST /scenarios/:id/archive
  - POST /scenario-templates/:id/create

### Sprint 6: Templates & Hooks
- [ ] 6 scenario templates (Roth, Charitable, Cap Gains, Payments, Retirement, Transition)
- [ ] Hooks to reporting
- [ ] Hooks to workflow/tasks
- [ ] Hooks to AI explanation
- [ ] Event emission

### Sprint 7: QA & Polish
- [ ] Golden scenario datasets
- [ ] Supersede logic
- [ ] Admin controls
- [ ] Analytics hooks

---

## Build Order

1. Phase 4 Sprint 1-5 (complete foundation)
2. Phase 5 Sprint 1-7 (complete workspace)
3. Integration testing
4. Documentation

---

## Target Delivery

All components built and functional by end of session.
