# Phase 5 PRD — Scenario Planning Workspace
## Advisor Tax Intelligence Platform
**Purpose:** Build the advisor-facing scenario planning workspace that transforms surfaced tax opportunities and deterministic tax calculations into interactive, reviewable, comparable planning scenarios that advisors can use to evaluate tradeoffs, prepare recommendations, and drive client decisions.

---

# 1) Why this is the next phase to build

By the end of Phase 4, the platform can:
- ingest and normalize household tax data
- create approved facts
- compute deterministic baseline tax outcomes
- detect and rank planning opportunities
- explain why opportunities surfaced
- connect opportunities to next actions

That gives the advisor insight.

But insight alone is not enough.

The advisor still needs a place to answer questions like:
- “What happens if we convert $40,000 instead of $75,000?”
- “What if we bunch charitable giving this year?”
- “How close does this keep us to a threshold?”
- “What is the tradeoff between tax paid now and future tax flexibility?”
- “Which version should I show the client?”

That is the job of the Scenario Planning Workspace.

Without this phase, the platform can identify opportunities, but it cannot fully help the advisor evaluate, compare, and choose a plan.

This phase turns the product from:
- tax detection
into
- tax planning decision support

---

# 2) Phase 5 objective

Build a Scenario Planning Workspace that:
1. allows advisors to create planning scenarios from baseline tax data and surfaced opportunities
2. supports manual and template-driven scenario creation
3. compares baseline and multiple scenarios side by side
4. makes tradeoffs, assumptions, warnings, and impacts clear
5. preserves version history and scenario lineage
6. supports advisor notes, internal collaboration, and recommendation selection
7. feeds downstream systems such as:
   - reporting
   - AI drafting
   - workflow/tasks
   - compliance review
   - client presentation preparation

This workspace must feel:
- intuitive
- fast
- analytical
- trustworthy
- presentation-ready
- advisor-controlled

---

# 3) Product promise for this phase

When an advisor opens a household and begins planning, the system should let them do things like:

- start from baseline
- click “Create Scenario” from an opportunity card
- model a Roth conversion, charitable bunching strategy, gain harvesting strategy, or payment adjustment
- compare baseline vs multiple scenarios in real time
- see changes in:
  - AGI
  - taxable income
  - total tax
  - threshold proximity
  - refund or balance due
  - deduction method
  - other relevant outputs
- understand tradeoffs and data assumptions
- mark a scenario as “recommended”
- save it for later
- use it as the basis for a report, task, or client conversation

That is the goal.

---

# 4) In-scope for Phase 5

## This phase includes
- scenario object model
- scenario creation flows
- baseline cloning
- template-based scenario creation
- manual override editing
- side-by-side comparison framework
- scenario notes and metadata
- scenario status lifecycle
- saved scenario sets
- recommendation designation
- scenario versioning
- scenario lineage tracking
- assumption tracking
- warning and blocker display
- scenario-to-report hooks
- scenario-to-task hooks
- scenario-to-AI explanation hooks
- scenario persistence and auditability

## This phase does not include
- full polished report generation
- full CRM workflow engine
- CPA portal
- client portal
- state tax scenario engine in V1
- autonomous scenario generation without human input

---

# 5) Core design principles

## Principle 1 — Baseline is immutable
The baseline tax snapshot and baseline run must remain untouched.
Scenarios are layered on top of baseline, never destructive.

## Principle 2 — Scenarios must feel easy
Advisors should not feel like they are editing a tax return.
They should feel like they are adjusting planning levers.

## Principle 3 — Comparison is the product
The key value is not simply creating scenarios.
It is understanding the differences clearly.

## Principle 4 — Assumptions must be visible
Every scenario must preserve:
- what changed
- why it changed
- who changed it
- what assumptions were introduced
- what warnings still apply

## Principle 5 — Multiple scenarios should be normal
The product should make it easy to compare several planning pathways, not just one.

## Principle 6 — Actionability matters
A good scenario should be easy to convert into:
- a recommendation
- a report
- a task
- a meeting talking point

---

# 6) Target users

## Primary
- lead advisor
- associate advisor / paraplanner
- planning specialist
- advanced planning / tax strategist

## Secondary
- compliance reviewer
- firm admin
- internal specialist teams

---

# 7) Key jobs to be done

## Advisor JTBD
- model multiple planning paths quickly
- see how much a lever changes the client outcome
- decide which scenario is best to recommend
- explain tradeoffs to a client in simple terms
- save and revisit planning ideas over time

## Paraplanner JTBD
- build scenarios before advisor meetings
- document assumptions and data gaps
- prepare comparison views and suggested recommendation paths

## Firm JTBD
- standardize how advisors test planning ideas
- preserve scenario history and rationale
- reduce spreadsheet-based scenario modeling
- improve repeatability and defensibility of planning work

---

# 8) What the workspace must produce

For each household, the Scenario Planning Workspace must support:
- a baseline scenario
- one or more derived scenarios
- saved scenario comparisons
- scenario metadata and notes
- scenario warnings and blockers
- scenario impact summaries
- a recommended scenario designation
- exportable scenario payloads for downstream use

---

# 9) Core scenario types for V1

Start with the planning moves most relevant to RIAs.

## Scenario Type A — Roth conversion
Examples:
- convert fixed dollar amount
- fill a target bracket
- compare several conversion amounts
- paired caution on IRMAA / threshold effects

## Scenario Type B — Charitable planning
Examples:
- bunch gifts into one year
- donor-advised fund contribution
- QCD scenario
- appreciated securities gifting placeholder

## Scenario Type C — Capital gains planning
Examples:
- harvest gains up to a threshold
- realize additional gain
- offset gains/losses using planning assumptions
- test preferential rate boundary effects

## Scenario Type D — Payment and withholding changes
Examples:
- adjust withholding
- add estimated payment
- test refund vs balance due change
- safe harbor planning placeholder

## Scenario Type E — Retirement income sequencing
Examples:
- change IRA distribution amount
- combine QCD and IRA distribution timing
- test Social Security + IRA withdrawal mix
- reduce or increase taxable distribution amount

## Scenario Type F — Transition event scenarios
Examples:
- model bonus income
- model retirement-year wage reduction
- model liquidity event placeholder
- model home sale placeholder
- model widow/survivor tax posture shift placeholder

---

# 10) Scenario object model

This is the central object of the phase.

## Scenario requirements
Each scenario must include:
- unique scenario ID
- household ID
- tax year
- baseline snapshot reference
- baseline run reference
- scenario snapshot reference
- scenario run reference
- scenario type
- title
- description
- inputs changed
- assumptions
- notes
- warnings
- blockers
- status
- created by
- timestamps
- version
- lineage to originating opportunity if applicable
- recommended flag
- comparison-ready summary

## Suggested schema
```ts
export interface PlanningScenario {
  scenarioId: string;
  householdId: string;
  taxYear: number;
  baselineSnapshotId: string;
  baselineRunId: string;
  scenarioSnapshotId: string;
  scenarioRunId: string;
  scenarioType:
    | 'roth_conversion'
    | 'charitable'
    | 'capital_gains'
    | 'payments'
    | 'retirement_income'
    | 'transition'
    | 'custom';
  title: string;
  description?: string | null;
  originatingOpportunityId?: string | null;
  overrides: ScenarioOverride[];
  assumptions: ScenarioAssumption[];
  notes?: string | null;
  warnings: string[];
  blockers: MissingInfoItem[];
  status:
    | 'draft'
    | 'ready_for_review'
    | 'reviewed'
    | 'recommended'
    | 'presented'
    | 'archived'
    | 'superseded';
  recommended: boolean;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

---

# 11) Scenario override model

Scenarios are built by applying overrides to baseline.

## Override requirements
Each override must track:
- field changed
- operator
- value
- reason
- source type
- created by
- created at

## Suggested schema
```ts
export interface ScenarioOverride {
  field: string;
  operator: 'replace' | 'add' | 'subtract' | 'toggle';
  value: number | string | boolean | null;
  reason: string;
  sourceType: 'manual' | 'template' | 'opportunity_seed';
  createdBy: string;
  createdAt: string;
}
```

---

# 12) Scenario assumption model

Not every scenario change comes directly from an extracted fact.
Some scenarios require advisor assumptions.

## Examples
- assumed charitable contribution amount
- assumed Roth conversion target amount
- assumed bonus size
- assumed reduction in wages due to retirement
- assumed additional estimated payment

## Assumption requirements
Each assumption must be explicit.

## Suggested schema
```ts
export interface ScenarioAssumption {
  assumptionId: string;
  label: string;
  description?: string | null;
  value: number | string | boolean | null;
  units?: string | null;
  confidence?: 'high' | 'medium' | 'low';
}
```

---

# 13) Scenario template framework

To make the workspace fast and easy, advisors should often start from templates rather than from scratch.

## Template use cases
- Roth fill to target bracket
- charitable bunching
- QCD planning
- gain harvesting threshold
- withholding adjustment
- retirement income sequencing
- bonus income scenario
- retirement-year income drop

## Template requirements
A template should define:
- scenario type
- required inputs
- seeded overrides
- seeded assumptions
- default title
- warning prompts
- linked opportunity types

## Suggested schema
```ts
export interface ScenarioTemplate {
  scenarioTemplateId: string;
  name: string;
  scenarioType: PlanningScenario['scenarioType'];
  description: string;
  requiredFields: string[];
  seedOverrides: Partial<ScenarioOverride>[];
  seedAssumptions: Partial<ScenarioAssumption>[];
  linkedOpportunityTypes: string[];
}
```

---

# 14) Scenario creation flows

The workspace must support multiple creation paths.

## Flow A — Create from baseline manually
1. advisor opens household planning tab
2. clicks “New Scenario”
3. selects scenario type or custom
4. enters overrides and assumptions
5. system validates
6. scenario run is calculated
7. comparison view opens

## Flow B — Create from opportunity card
1. advisor clicks “Create Scenario” from surfaced opportunity
2. opportunity-linked template or seed values prefill
3. advisor adjusts values if desired
4. scenario run calculates
5. comparison opens with opportunity context shown

## Flow C — Duplicate existing scenario
1. advisor opens an existing scenario
2. clicks duplicate
3. adjusts amount / levers
4. saves new scenario version

## Flow D — Quick compare preset
Example:
- three Roth conversion amounts generated at once
- several charitable amounts generated at once
- multiple gain realization levels generated at once

This can be a later enhancement but should be anticipated in the object model.

---

# 15) Scenario calculation flow

Every scenario must connect cleanly to Phase 3.

## Scenario calculation sequence
1. load baseline snapshot
2. clone snapshot
3. apply overrides
4. create scenario snapshot
5. validate scenario snapshot
6. run deterministic tax engine
7. generate scenario output snapshot
8. generate scenario explanation payload
9. compare scenario to baseline
10. persist scenario objects and comparison

No scenario should ever bypass the deterministic tax engine.

---

# 16) Comparison framework

This is the heart of the workspace.

## Comparison modes to support
### Mode 1 — Baseline vs one scenario
Standard most common workflow

### Mode 2 — Baseline vs multiple scenarios
Useful for comparing several planning options

### Mode 3 — Scenario vs scenario
Useful once several alternatives exist

## Required comparison fields
At a minimum, compare:
- gross income
- AGI
- taxable income
- deduction method
- ordinary tax
- preferential tax
- NIIT where supported
- total tax
- payments total
- refund or balance due
- threshold proximity where supported
- key caution/warning changes

## Comparison output must include
- raw values
- delta values
- interpretation notes
- visual emphasis on changes that matter
- confidence/warning indicators

---

# 17) Comparison payload schema

```ts
export interface ScenarioComparisonView {
  comparisonId: string;
  householdId: string;
  taxYear: number;
  baselineRunId: string;
  comparisonRunIds: string[];
  summaryCards: ComparisonSummaryCard[];
  rowComparisons: ComparisonRow[];
  interpretationNotes: string[];
  warnings: string[];
}
```

## Comparison summary card
```ts
export interface ComparisonSummaryCard {
  label: string;
  baselineValue: number | string | null;
  comparisonValues: Array<{
    runId: string;
    value: number | string | null;
    delta: number | null;
  }>;
}
```

## Comparison row
```ts
export interface ComparisonRow {
  field: string;
  label: string;
  baselineValue: number | string | null;
  comparisonValues: Array<{
    runId: string;
    value: number | string | null;
    delta: number | null;
  }>;
  significance: 'high' | 'medium' | 'low';
}
```

---

# 18) Recommendation designation

The advisor should be able to mark one scenario as preferred or recommended.

## Requirements
- only one scenario may be “recommended” within a recommendation set by default
- recommended scenario must preserve timestamp and user attribution
- changing recommended scenario must retain history
- recommended scenario should become the default source for reporting later

## Schema addition
```ts
export interface ScenarioRecommendationState {
  scenarioId: string;
  isRecommended: boolean;
  setBy: string;
  setAt: string;
  reason?: string | null;
}
```

---

# 19) Scenario lifecycle states

Scenarios need a lifecycle.

## States
- draft
- ready_for_review
- reviewed
- recommended
- presented
- archived
- superseded

## Why this matters
This supports:
- workflow
- auditability
- report generation
- analytics
- compliance review

---

# 20) Notes and collaboration fields

Even before a full CPA portal or internal collaboration system, scenarios need rich notes.

## Notes requirements
Allow:
- advisor rationale
- assumptions commentary
- caution commentary
- client discussion prep notes
- internal-only notes

## Suggested schema
```ts
export interface ScenarioNote {
  noteId: string;
  scenarioId: string;
  noteType: 'advisor_internal' | 'meeting_prep' | 'assumption' | 'compliance';
  body: string;
  createdBy: string;
  createdAt: string;
}
```

---

# 21) Warnings and blockers framework

Scenarios can introduce new issues or preserve existing ones.

## Warnings examples
- threshold crossed
- incomplete supporting data
- unsupported complexity still present
- deduction method changed unexpectedly
- estimated impact requires human review

## Blockers examples
- missing basis data for accurate IRA-related planning
- unsupported input type
- invalid override value
- impossible scenario structure

## UX rule
Warnings should not stop scenario use unless severity is blocking.
But they must be visible and preserved.

---

# 22) Workspace UX requirements

Even if final design comes later, this PRD must define what the workspace needs.

## Main workspace view must include
- baseline summary panel
- scenario list panel
- create scenario button
- comparison area
- notes panel
- warnings and blockers panel
- recommend scenario action
- convert to report/task action

## Scenario list must show
- title
- type
- status
- recommended badge
- created by
- last updated
- originating opportunity if any
- warning count

## Scenario detail / editor must show
- editable overrides
- assumptions
- notes
- recalculation status
- warnings
- quick links to source opportunity and baseline

## Comparison area must show
- high-level summary cards first
- detail rows second
- interpretation notes
- threshold indicators
- caution deltas

---

# 23) Scenario hooks to downstream systems

Phase 5 must connect to future phases.

## To reporting
Scenario can become:
- client scenario report
- advisor memo
- comparison handout
- executive summary

## To workflow
Scenario can become:
- task
- follow-up activity
- recommendation status object

## To AI
Scenario can feed:
- explanation drafting
- client-friendly summaries
- meeting prep
- follow-up email drafting

## To analytics
Scenario activity can drive:
- usage stats
- recommendation conversion tracking
- planning workflow adoption

---

# 24) Event model

## Events to emit
- `scenario.created`
- `scenario.updated`
- `scenario.calculated`
- `scenario.validation_failed`
- `scenario.recommended`
- `scenario.archived`
- `scenario.superseded`
- `scenario.converted_to_report_request`
- `scenario.converted_to_task_request`

## Example event payload
```json
{
  "eventName": "scenario.created",
  "scenarioId": "scn_001",
  "householdId": "hh_123",
  "taxYear": 2025,
  "scenarioType": "roth_conversion",
  "originatingOpportunityId": "opp_001",
  "createdAt": "2026-03-30T22:00:00Z"
}
```

---

# 25) API surface

## Endpoint 1 — Create scenario
`POST /scenarios`

Request:
```json
{
  "householdId": "hh_123",
  "taxYear": 2025,
  "baselineSnapshotId": "tis_001",
  "baselineRunId": "calc_001",
  "scenarioType": "roth_conversion",
  "originatingOpportunityId": "opp_001",
  "overrides": [
    {
      "field": "iraDistributionsTaxable",
      "operator": "add",
      "value": 50000,
      "reason": "Model Roth conversion amount",
      "sourceType": "opportunity_seed"
    }
  ]
}
```

## Endpoint 2 — Update scenario
`PATCH /scenarios/{scenarioId}`

## Endpoint 3 — Get scenario detail
`GET /scenarios/{scenarioId}`

## Endpoint 4 — List scenarios by household
`GET /households/{householdId}/scenarios?taxYear=2025`

## Endpoint 5 — Compare scenarios
`POST /scenario-comparisons`

## Endpoint 6 — Recommend scenario
`POST /scenarios/{scenarioId}/recommend`

## Endpoint 7 — Archive scenario
`POST /scenarios/{scenarioId}/archive`

## Endpoint 8 — Create scenario from template
`POST /scenario-templates/{scenarioTemplateId}/create`

---

# 26) Database design guidance

## `scenarios`
- scenario_id
- household_id
- tax_year
- baseline_snapshot_id
- baseline_run_id
- scenario_snapshot_id
- scenario_run_id
- scenario_type
- title
- description
- originating_opportunity_id
- status
- recommended
- version
- created_by
- created_at
- updated_at

## `scenario_overrides`
- scenario_id
- override_json

## `scenario_assumptions`
- scenario_id
- assumptions_json

## `scenario_notes`
- note_id
- scenario_id
- note_type
- body
- created_by
- created_at

## `scenario_comparisons`
- comparison_id
- household_id
- tax_year
- baseline_run_id
- comparison_run_ids_json
- comparison_payload_json
- created_at

## `scenario_audit_events`
- event_id
- scenario_id
- actor
- action
- before_json
- after_json
- created_at

## `scenario_templates`
- scenario_template_id
- name
- scenario_type
- template_json
- enabled
- created_at
- updated_at

---

# 27) Connectivity requirements

This phase must connect cleanly to earlier phases.

## Upstream dependencies
From Phase 3:
- baseline snapshots
- baseline run outputs
- scenario run outputs
- diff engine
- warnings and trace refs

From Phase 4:
- originating opportunities
- suggested scenario templates
- seeded action data

## Downstream dependencies
To Phase 6:
- scenario explanation payloads
- comparison summaries
- advisor talking point seeds

To Phase 7:
- recommended scenario
- comparison payloads
- scenario notes and assumptions

To Phase 8:
- scenario-derived task requests
- scenario review status

To analytics:
- scenario creation counts
- recommendation designation
- scenario-to-report conversion
- scenario-to-implementation conversion

---

# 28) Supersede logic

Scenarios depend on baseline and facts.
If those change materially, scenarios may become stale.

## Trigger events
- approved fact updated
- baseline run superseded
- opportunity superseded if scenario originated from it
- tax rules package updated
- engine version changes materially

## Required behavior
- stale scenarios should be marked for refresh or superseded
- historical scenario objects must remain available for audit
- advisors should be notified when re-run is recommended
- scenario comparison outputs should not silently change without new run IDs

---

# 29) AI role in this phase

AI can support the workspace, but should remain bounded.

## Allowed AI uses
- draft scenario title and summary language
- create interpretation notes from deterministic comparison results
- draft client-facing explanation
- draft advisor talking points
- summarize tradeoffs

## Not allowed
- invent scenario outputs
- bypass deterministic tax calculation
- silently change assumptions
- remove blockers or warnings
- mark a scenario recommended autonomously

## Design rule
AI helps interpret scenarios.
The deterministic engine computes them.
The advisor decides.

---

# 30) QA framework

## Scenario creation QA
Need tests for:
- create from baseline
- create from opportunity
- create from template
- duplicate scenario
- invalid override handling

## Calculation QA
Need tests for:
- identical baseline + identical override = identical scenario
- changed override triggers correct diff
- immutable baseline preserved
- versioning preserved across recalculations

## Comparison QA
Need tests for:
- baseline vs single scenario
- baseline vs multiple scenarios
- scenario vs scenario
- field deltas accurate
- warning deltas preserved

## Lifecycle QA
Need tests for:
- recommendation designation
- archive flow
- supersede behavior
- scenario re-run behavior after source changes

---

# 31) Golden scenario dataset requirements

Create benchmark scenarios for:
- Roth conversion household
- charitable bunching household
- QCD household
- gain harvesting household
- withholding mismatch household
- retirement-year wage reduction household
- incomplete-data scenario household

Each should include expected:
- scenario outputs
- comparison deltas
- warnings
- blockers
- recommendation-eligibility behavior

---

# 32) Admin and governance requirements

Firms need control over scenario behavior.

## Required admin features
- enable/disable scenario templates
- configure default comparison fields
- configure required notes for recommended scenarios
- set review rules for certain scenario types
- define naming conventions if desired
- define which scenario types can be marked recommended directly

## Compliance requirement
Each scenario must be reconstructible:
- source baseline
- overrides
- assumptions
- run version
- warnings
- who marked as recommended
- notes present at that time

---

# 33) Deliverables of this phase

By the end of Phase 5, the team should deliver:

## Product deliverables
- scenario workspace object model
- scenario creation flows
- template-based creation
- comparison framework
- scenario notes and statuses
- recommended scenario designation
- scenario persistence and audit trail

## Engineering deliverables
- scenario API layer
- scenario persistence layer
- scenario snapshot/run orchestration
- comparison payload generator
- scenario lifecycle engine
- supersede logic
- QA suite and golden datasets

## Design deliverables
- scenario list view spec
- scenario editor spec
- comparison workspace spec
- notes and warnings panel patterns
- recommended scenario pattern

---

# 34) What “great” looks like

A great Scenario Planning Workspace feels like this:

> “I can take a planning idea, model it quickly, compare it clearly, understand the tradeoffs, and decide what I actually want to recommend.”

That is the finish line.

---

# 35) Recommended build sequence inside Phase 5

## Sprint 1
- scenario object schema
- override model
- assumption model
- template framework

## Sprint 2
- create scenario from baseline
- create scenario from opportunity
- persistence basics

## Sprint 3
- scenario calculation flow
- baseline vs scenario comparison
- notes and warning model

## Sprint 4
- multiple scenario comparison
- duplicate scenario flow
- recommendation designation

## Sprint 5
- lifecycle states
- scenario hooks to reports/tasks
- supersede logic

## Sprint 6
- QA hardening
- golden datasets
- admin controls
- analytics hooks

---

# 36) Final instruction to the AI builders

Do not build this like a generic spreadsheet interface.

Build it like an **advisor decision workspace**.

The standard is not:
- “Can the user change a number?”

The standard is:
- “Can the advisor quickly model a planning path, compare it clearly, understand the tradeoffs, and decide what to recommend with confidence?”

That is the real goal.

---

# 37) Next likely document after this

After this PRD, the most useful next document is:

**Phase 5 Technical Build Pack — Scenario Planning Workspace**

That should include:
- typed schemas
- scenario snapshot contracts
- comparison payload structures
- API contracts
- database DDL
- event payloads
- template registry structure
- lifecycle state machine
- QA and golden scenario test pack
