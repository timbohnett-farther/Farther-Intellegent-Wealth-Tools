# Phase 4 PRD — Opportunity Detection Engine
## Advisor Tax Intelligence Platform
**Purpose:** Build the rules-driven and AI-assisted recommendation layer that turns trusted tax facts and deterministic calculation outputs into actionable planning opportunities for advisors.

---

# 1) Why this is the next best section to build

After Phase 2 and Phase 3, the platform can:
- ingest documents
- create approved facts
- normalize household tax inputs
- compute deterministic baseline tax outcomes
- generate traces, warnings, and scenario-ready outputs

That is necessary, but not sufficient.

Without an opportunity engine, the system is still mostly:
- an intake tool
- a review tool
- a tax calculator

The next leap is to make it a **planning system**.

This phase is where the product starts to answer the advisor’s real question:

> “What should I do for this household, why does it matter, and what should I discuss with the client next?”

That is why this is the most important next section to build.

---

# 2) Phase 4 objective

Build an Opportunity Detection Engine that:
1. identifies tax planning opportunities using approved facts + deterministic outputs
2. ranks opportunities by relevance, impact, urgency, and complexity
3. explains why each opportunity surfaced
4. connects each opportunity to evidence, scenarios, and next actions
5. generates advisor-safe recommendation objects that can later flow into:
   - scenario modeling
   - reporting
   - AI drafting
   - workflow/task systems
   - compliance review

This engine must feel:
- intelligent
- structured
- explainable
- controllable
- audit-safe

---

# 3) Phase 4 product promise

When an advisor opens a household, the system should not just show tax numbers.

It should say things like:
- “This client may have room for a Roth conversion this year.”
- “Charitable bunching may create more value than annual giving.”
- “Capital gains could be harvested up to a threshold with limited federal impact.”
- “This household is near an IRMAA cliff.”
- “Withholding and estimated payment strategy may need attention.”
- “Social Security + IRA sequencing may deserve review.”
- “This household likely has a strong QCD conversation.”

That is the goal of this phase.

---

# 4) In-scope for Phase 4

## This phase includes
- recommendation framework
- opportunity rule library
- scoring/ranking logic
- evidence model
- recommendation object schema
- recommendation lifecycle states
- opportunity cards and detail payloads
- recommendation-to-scenario hooks
- recommendation-to-task hooks
- firm templates/playbooks support
- explainability framework
- warning/uncertainty logic
- eventing for downstream modules

## This phase does not yet include
- full scenario workspace UI
- final document/report renderer
- CPA portal
- complete AI copilot experience
- full workflow engine
- state tax engine
- client portal

Those come later, but this phase must connect cleanly to them.

---

# 5) Core design principles

## Principle 1 — Recommendation must be explainable
Every surfaced opportunity must answer:
- what surfaced
- why it surfaced
- what evidence supports it
- what assumption gaps remain
- what likely value exists
- what next step should happen

## Principle 2 — Deterministic signals first
The engine should primarily rely on:
- approved facts
- calculated outputs
- derived thresholds
- rule-based logic

AI can assist with explanation and prioritization later, but it should not invent the core opportunity.

## Principle 3 — Human review remains central
The system surfaces opportunities.
Advisors decide what is appropriate.

## Principle 4 — Opportunities should feel actionable
Every opportunity should support downstream actions:
- create scenario
- create task
- draft note
- mark reviewed
- defer
- dismiss
- escalate to specialist

## Principle 5 — Ranking matters
Too many recommendations creates noise.
This phase must prioritize signal over volume.

---

# 6) Target users

## Primary
- lead advisor
- associate advisor / paraplanner
- planning specialist
- tax strategist

## Secondary
- compliance reviewer
- firm admin
- internal specialist teams

---

# 7) Key jobs to be done

## Advisor JTBD
- show me the planning opportunities worth discussing
- help me focus on the most important items first
- quantify likely value where possible
- explain the reasoning in plain English
- let me turn opportunities into scenarios and tasks quickly

## Paraplanner JTBD
- prepare households efficiently before advisor meetings
- review and triage recommended opportunities
- identify missing data that blocks stronger planning

## Firm JTBD
- standardize tax planning quality across advisors
- scale opportunity detection beyond power users
- reduce missed tax planning opportunities

---

# 8) What the engine must produce

For each household and tax year, the engine must be able to produce:
- zero or more opportunity objects
- ranked opportunities
- grouped opportunity sections
- evidence bundle for each opportunity
- estimated impact range where supported
- confidence level
- missing-data flags
- suggested next step
- suggested scenario template(s)
- suggested workflow action(s)

---

# 9) Opportunity categories for V1

Start with high-value, mainstream RIA tax opportunities.

## Category A — Roth conversion and bracket management
Examples:
- fill current bracket opportunity
- partial Roth conversion opportunity
- bracket headroom observation
- “conversion may increase IRMAA risk” warning paired with opportunity

## Category B — Capital gains and investment tax management
Examples:
- capital gain harvesting
- loss harvesting observation
- concentration / gain timing review
- preferential rate utilization opportunity

## Category C — Charitable planning
Examples:
- charitable bunching opportunity
- donor-advised fund discussion
- QCD opportunity
- appreciated securities gifting observation

## Category D — Payment and withholding
Examples:
- withholding gap
- estimated payment gap
- overpayment / refund inefficiency observation
- safe harbor review needed

## Category E — Retirement income sequencing
Examples:
- Social Security + IRA sequencing review
- RMD-related tax planning opportunity
- taxable distribution timing review
- charitable/QCD sequencing

## Category F — Threshold management
Examples:
- IRMAA proximity alert
- NIIT threshold alert
- deduction phase-out proximity
- high-income surtax proximity where supported

## Category G — Household transitions
Examples:
- retirement year planning
- widow penalty / filing status shift
- bonus/liquidity-event review
- home sale timing observation
- relocation/state move note placeholder for future state layer

---

# 10) Opportunity object design

This is the central object of the phase.

## Opportunity object requirements
Each opportunity must include:
- unique ID
- household ID
- tax year
- opportunity type
- category
- title
- short summary
- evidence bundle
- detection logic reference
- score
- confidence
- estimated impact range
- complexity level
- urgency level
- data completeness score
- missing info list
- recommendation status
- suggested next actions
- suggested scenario hooks
- created timestamp
- updated timestamp
- engine version
- rules version
- source run ID

## Suggested schema
```ts
export interface Opportunity {
  opportunityId: string;
  householdId: string;
  taxYear: number;
  sourceRunId: string;
  opportunityType: string;
  category:
    | 'roth'
    | 'capital_gains'
    | 'charitable'
    | 'payments'
    | 'retirement_income'
    | 'thresholds'
    | 'transition';
  title: string;
  summary: string;
  whyItSurfaced: string;
  evidence: OpportunityEvidence;
  score: OpportunityScore;
  confidence: 'high' | 'medium' | 'low';
  estimatedImpact: EstimatedImpact | null;
  complexity: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  dataCompleteness: number;
  missingInfo: MissingInfoItem[];
  recommendationStatus:
    | 'new'
    | 'reviewed'
    | 'scenario_created'
    | 'presented'
    | 'accepted'
    | 'deferred'
    | 'dismissed';
  suggestedNextActions: SuggestedAction[];
  suggestedScenarioTemplates: ScenarioTemplateRef[];
  detectionRuleId: string;
  engineVersion: string;
  rulesVersion: string;
  createdAt: string;
  updatedAt: string;
}
```

---

# 11) Opportunity evidence model

Every opportunity needs evidence.

## Evidence must be structured, not prose only
The evidence model should include:
- source approved facts
- calculation outputs used
- threshold references
- supporting intermediate outputs
- validation warnings
- unsupported item flags
- supporting trace references

## Example schema
```ts
export interface OpportunityEvidence {
  supportingFacts: EvidenceFactRef[];
  supportingOutputs: EvidenceOutputRef[];
  supportingThresholds: EvidenceThresholdRef[];
  supportingTraceRefs: string[];
  warnings: string[];
  unsupportedItems: string[];
}
```

## Example fact reference
```ts
export interface EvidenceFactRef {
  field: string;
  value: number | string | boolean | null;
  sourceFactId?: string;
  sourceFactVersion?: number;
}
```

## Example output reference
```ts
export interface EvidenceOutputRef {
  field: string;
  value: number | string | boolean | null;
  sourceRunId: string;
}
```

## Example threshold reference
```ts
export interface EvidenceThresholdRef {
  thresholdName: string;
  currentValue: number;
  thresholdValue: number;
  delta: number;
}
```

---

# 12) Opportunity score model

Every opportunity should be scored in a repeatable way.

## Score dimensions
1. estimated impact
2. advisor relevance
3. urgency
4. data completeness
5. complexity
6. confidence
7. household fit
8. firm priority weighting

## Example scoring model
```ts
export interface OpportunityScore {
  overall: number; // 0-100
  impactScore: number; // 0-100
  relevanceScore: number; // 0-100
  urgencyScore: number; // 0-100
  confidenceScore: number; // 0-100
  completenessScore: number; // 0-100
  complexityPenalty: number; // 0-100
}
```

## Ranking rule
Overall score should not be a black box.
Store the weighted formula used.

Example:
- impact 30%
- relevance 20%
- urgency 15%
- confidence 15%
- completeness 10%
- household fit 10%
- minus complexity penalty

Firms should later be able to tune weights.

---

# 13) Confidence framework

Confidence is not the same as value.

An item may be high-value but low-confidence if data is incomplete.

## Confidence should consider:
- fact completeness
- calculation certainty
- missing forms
- warnings from validation
- unsupported complexity
- reliability of triggering inputs
- degree of assumption required

## Confidence labels
### High
Sufficient facts and clear deterministic trigger

### Medium
Strong signal but some assumptions or missing data

### Low
Interesting lead, but requires more information before recommendation should be trusted

Opportunity cards must display confidence visibly.

---

# 14) Missing-data framework

The engine should not only surface opportunities.
It should surface **blocked opportunities** too.

Example:
- “Possible Roth conversion opportunity, but IRA basis is incomplete.”
- “Possible capital gains planning opportunity, but detailed lot-level cost basis is missing.”
- “Possible QCD opportunity, but charitable intent/activity is unclear.”
- “Safe harbor review may be needed, but estimated payment history is incomplete.”

This is valuable because it helps the advisor know what to gather next.

## Schema
```ts
export interface MissingInfoItem {
  field: string;
  message: string;
  severity: 'info' | 'warning' | 'blocking';
}
```

---

# 15) Detection engine architecture

The engine should be layered.

## Layer 1 — Deterministic rule triggers
Use:
- approved facts
- baseline outputs
- intermediate calculations
- threshold distances
- status/transition markers

This is the backbone.

## Layer 2 — Derived heuristics
Use:
- income mix
- deduction method
- distribution pattern
- gains concentration
- charitable activity patterns
- household age profile
- tax-year context
- transition flags

## Layer 3 — AI-assisted narrative support
Use AI only for:
- improving explanation language
- identifying potential missing context
- suggesting advisor talking points
- summarizing grouped opportunity themes

AI should not be required to determine the core trigger.

---

# 16) Opportunity rule library

The system needs a formal rules library.

## Rule object requirements
- rule ID
- rule name
- category
- description
- eligibility conditions
- triggering conditions
- blocking conditions
- evidence requirements
- scoring hints
- scenario template links
- next-action suggestions
- rules version applicability
- enabled/disabled status

## Example schema
```ts
export interface OpportunityRule {
  ruleId: string;
  name: string;
  category: string;
  description: string;
  appliesToTaxYears: number[];
  enabled: boolean;
  eligibilityConditions: RuleCondition[];
  triggerConditions: RuleCondition[];
  blockingConditions: RuleCondition[];
  evidenceRequirements: string[];
  scoringHints: Record<string, number>;
  suggestedScenarioTemplateIds: string[];
  suggestedActionTemplateIds: string[];
}
```

## RuleCondition example
```ts
export interface RuleCondition {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'exists'
    | 'missing'
    | 'between'
    | 'in';
  value?: unknown;
}
```

---

# 17) V1 opportunity rules to ship first

## Rule 1 — Roth conversion headroom
Trigger when:
- taxable income exists
- retirement accounts / IRA distributions relevant
- age / household type suggests planning potential
- current tax posture indicates bracket room may exist under selected threshold

Evidence:
- taxable income
- deduction method
- distribution profile
- current bracket or target bracket threshold
- missing basis warning if applicable

Suggested actions:
- create Roth conversion scenario
- review IRMAA effects
- confirm retirement account details

---

## Rule 2 — IRMAA proximity
Trigger when:
- income is near known Medicare surcharge threshold
- taxpayer age suggests relevance or Medicare enrollment likely

Evidence:
- AGI/MAGI proxy
- threshold delta
- household age

Suggested actions:
- model income reduction strategy
- review distribution timing
- review Roth conversion sizing
- flag for advisor discussion

---

## Rule 3 — NIIT proximity / exposure
Trigger when:
- investment income present
- AGI/MAGI near or above NIIT threshold

Evidence:
- investment income candidate
- AGI/MAGI proxy
- threshold comparison

Suggested actions:
- create gain timing scenario
- review loss harvesting
- review distribution mix

---

## Rule 4 — Charitable bunching
Trigger when:
- recurring charitable contributions present
- itemized deductions near standard deduction
- bunching may create incremental value

Evidence:
- charitable contributions
- itemized total
- standard deduction
- deduction delta

Suggested actions:
- create bunching scenario
- evaluate DAF
- review gifting approach

---

## Rule 5 — QCD review
Trigger when:
- taxpayer age supports QCD relevance
- IRA distributions present
- charitable intent/activity exists or likely

Evidence:
- taxpayer age
- IRA distribution
- charitable activity indicators

Suggested actions:
- create QCD scenario
- verify IRA type
- confirm giving intent

---

## Rule 6 — Preferential rate / gain harvesting opportunity
Trigger when:
- qualified dividends or capital gains present
- taxable income and threshold position imply additional gain room or planning need

Evidence:
- preferential income portion
- taxable income
- rate threshold comparison

Suggested actions:
- create gain harvesting scenario
- review holdings and gain concentrations

---

## Rule 7 — Withholding / payment mismatch
Trigger when:
- payments appear materially misaligned with total tax
- refund or balance due estimate is outside policy threshold

Evidence:
- total tax
- payments total
- withholding
- refund/balance estimate

Suggested actions:
- safe harbor review
- estimated payment check
- withholding adjustment task

---

## Rule 8 — Distribution sequencing review
Trigger when:
- Social Security present
- IRA distributions present
- taxable income elevated
- sequencing may matter

Evidence:
- Social Security taxability
- taxable distributions
- AGI/taxable income

Suggested actions:
- create withdrawal sequencing scenario
- review QCD
- review bracket management

---

# 18) Rule authoring framework

You will need a way to maintain opportunity rules safely.

## Required capabilities
- add/update rule definitions
- version rules
- enable/disable rules by firm
- mark rules as beta/internal only
- attach test cases to each rule
- simulate rule output before release
- publish rules with change logs

## Rule package versioning
The opportunity engine should store:
- engine version
- opportunity rules package version
- tax-year rules version
- source run ID

This is essential for auditability and reproducibility.

---

# 19) Opportunity pipeline flow

## End-to-end flow
1. load completed baseline calculation run
2. load approved facts and explanation payload
3. evaluate household eligibility for each rule
4. evaluate triggers
5. evaluate blockers / missing info
6. create preliminary opportunity candidates
7. build evidence bundle
8. compute impact estimate if supported
9. compute score and confidence
10. deduplicate similar opportunities
11. rank opportunities
12. group opportunities into sections
13. persist results
14. emit downstream events

---

# 20) Deduplication logic

Without deduplication, advisors will be overwhelmed.

## Example overlaps
- Roth conversion opportunity and bracket headroom opportunity
- IRMAA alert and Roth conversion caution
- gain harvesting opportunity and NIIT exposure alert
- QCD opportunity and charitable bunching opportunity

## Deduplication rules
- merge overlapping cards when they point to the same core planning action
- preserve secondary caution tags
- avoid showing 4 separate cards when 1 primary card + 2 caution notes is better

## Example
Primary opportunity:
- “Roth Conversion Opportunity”

Attached considerations:
- “IRMAA threshold proximity”
- “IRA basis incomplete”

This is better than three unrelated cards.

---

# 21) Estimated impact model

Estimated impact should be included where feasible, but it must be presented carefully.

## Impact types
- estimated tax savings range
- estimated tax cost of inaction
- estimated bracket fill amount
- estimated surcharge avoidance range
- estimated deduction uplift
- estimated cash flow / payment alignment value

## V1 rule
If the system cannot confidently quantify exact value, it should return:
- qualitative impact
- range-based estimate
- or “scenario needed to quantify”

## Schema
```ts
export interface EstimatedImpact {
  type:
    | 'tax_savings'
    | 'tax_cost'
    | 'threshold_management'
    | 'deduction_value'
    | 'cash_flow_alignment'
    | 'scenario_required';
  minValue?: number;
  maxValue?: number;
  qualitativeLabel?: 'low' | 'medium' | 'high';
  notes?: string;
}
```

---

# 22) Opportunity lifecycle states

Opportunities need a lifecycle so the system can track execution later.

## States
- new
- reviewed
- scenario_created
- scenario_completed
- presented
- accepted
- deferred
- dismissed
- converted_to_task
- implemented
- superseded

## Why this matters
This becomes the backbone of:
- workflow
- analytics
- value-of-advice measurement
- compliance review
- recommendation aging

---

# 23) Opportunity UX requirements

Even if full UI is later, this phase must define the payloads the UI will need.

## Household Opportunities View
Should support:
- total surfaced opportunities
- grouped sections by category
- top 3 prioritized items
- confidence badges
- impact labels
- missing data indicators
- quick actions

## Opportunity card
Must show:
- title
- short summary
- why it surfaced
- confidence
- impact
- urgency
- key evidence values
- missing info
- recommended next step
- quick actions:
  - create scenario
  - mark reviewed
  - assign follow-up
  - dismiss
  - expand details

## Opportunity detail view
Must show:
- full explanation
- evidence table
- trace references
- warnings
- assumptions
- suggested scenarios
- action templates
- audit metadata

---

# 24) Suggested actions framework

Every opportunity should generate action suggestions.

## Examples
- create Roth conversion scenario
- review with client in next meeting
- request missing basis information
- prepare QCD discussion note
- coordinate with CPA
- adjust withholding estimate
- escalate to advanced planning specialist

## Schema
```ts
export interface SuggestedAction {
  actionType:
    | 'create_scenario'
    | 'request_data'
    | 'client_discussion'
    | 'coordinate_cpa'
    | 'assign_task'
    | 'specialist_review';
  label: string;
  priority: 'low' | 'medium' | 'high';
  details?: string;
}
```

---

# 25) Scenario template hooks

Phase 4 must connect to later scenario modeling.

## Each opportunity should optionally reference scenario templates
Examples:
- Roth conversion amount template
- charitable bunching template
- gain harvesting threshold template
- withholding adjustment template
- retirement distribution sequencing template

## Schema
```ts
export interface ScenarioTemplateRef {
  scenarioTemplateId: string;
  name: string;
  description: string;
}
```

---

# 26) Event model

## Events to emit
### `opportunity_detection.started`
### `opportunity_detection.completed`
### `opportunity.created`
### `opportunity.updated`
### `opportunity.dismissed`
### `opportunity.converted_to_scenario`
### `opportunity.converted_to_task`
### `opportunity.superseded`

## Example payload
```json
{
  "eventName": "opportunity.created",
  "opportunityId": "opp_001",
  "householdId": "hh_123",
  "taxYear": 2025,
  "sourceRunId": "calc_001",
  "opportunityType": "roth_conversion_headroom",
  "score": 88,
  "confidence": "high",
  "createdAt": "2026-03-30T21:00:00Z"
}
```

## Downstream consumers
- scenario engine
- workflow engine
- AI copilot
- reporting engine
- analytics dashboard

---

# 27) API surface

## Endpoint 1 — Detect opportunities for a run
`POST /opportunity-detections`

Request:
```json
{
  "householdId": "hh_123",
  "taxYear": 2025,
  "sourceRunId": "calc_001"
}
```

Response:
```json
{
  "detectionId": "det_001",
  "status": "completed",
  "opportunityCount": 5
}
```

## Endpoint 2 — List opportunities by household
`GET /households/{householdId}/opportunities?taxYear=2025`

## Endpoint 3 — Get opportunity detail
`GET /opportunities/{opportunityId}`

## Endpoint 4 — Update opportunity status
`PATCH /opportunities/{opportunityId}`

## Endpoint 5 — Convert opportunity to scenario request
`POST /opportunities/{opportunityId}/create-scenario`

## Endpoint 6 — Convert opportunity to task request
`POST /opportunities/{opportunityId}/create-task`

## Endpoint 7 — Re-run opportunity detection
`POST /households/{householdId}/opportunities/redetect`

---

# 28) Database design guidance

## `opportunity_detection_runs`
- detection_id
- household_id
- tax_year
- source_run_id
- engine_version
- rule_package_version
- status
- created_at
- completed_at

## `opportunities`
- opportunity_id
- detection_id
- household_id
- tax_year
- source_run_id
- type
- category
- title
- summary
- why_it_surfaced
- score_json
- confidence
- impact_json
- complexity
- urgency
- completeness_score
- status
- detection_rule_id
- created_at
- updated_at

## `opportunity_evidence`
- opportunity_id
- evidence_json

## `opportunity_actions`
- opportunity_id
- action_json

## `opportunity_audit_events`
- event_id
- opportunity_id
- actor
- action
- before_json
- after_json
- created_at

---

# 29) Connectivity requirements

This phase must connect tightly to prior and future phases.

## Upstream dependencies
From Phase 2:
- approved facts
- missing-data flags
- fact version signatures

From Phase 3:
- baseline calculation summary
- intermediate outputs
- trace refs
- warnings
- unsupported items
- explanation payload

## Downstream dependencies
To Phase 5:
- scenario template hooks
- source opportunity context

To Phase 6:
- explanation payloads
- advisor talking point seeds

To Phase 7:
- surfaced opportunity summaries
- recommendation prioritization

To Phase 8:
- action objects
- lifecycle states

To Phase 10 analytics:
- conversion funnel by opportunity type

---

# 30) Supersede logic

If upstream data changes, opportunities cannot silently remain current.

## Trigger events
- approved fact updated
- baseline run superseded
- new baseline created
- rules package updated
- opportunity rule package updated

## Required behavior
- prior opportunities marked as superseded when materially invalidated
- new detection run can be generated
- historical opportunities must remain available for audit
- advisors should see that a refreshed view is recommended

---

# 31) AI role in this phase

AI can help, but must stay bounded.

## Allowed AI uses
- improve explanation phrasing
- suggest advisor talking points
- summarize grouped opportunities
- identify possible missing context
- classify opportunity narrative tone by audience
- draft “why it matters” language

## Not allowed
- invent an opportunity that lacks deterministic support
- assign final impact where deterministic evidence does not support it
- hide missing data
- override rule outcomes silently

## Design rule
The opportunity exists because of deterministic logic.
AI helps make it readable and useful.

---

# 32) QA framework

## Rule QA
Every rule must have:
- positive trigger cases
- negative trigger cases
- blocker cases
- missing-data cases
- conflicting-data cases

## Scoring QA
Need tests for:
- score order stability
- same inputs produce same ranking
- weighting changes behave predictably

## Deduplication QA
Need test cases where:
- overlapping opportunities merge correctly
- caution notes remain preserved
- duplicate cards do not flood the UI

## Regression QA
Any update to:
- rules package
- scoring model
- threshold definitions
must be regression-tested on golden household datasets

---

# 33) Golden dataset requirements

Create benchmark households for:
- retiree with IRA + Social Security
- charitable HNW household
- concentrated stock / gains household
- W-2 + bonus household
- bracket-fill Roth household
- safe-harbor mismatch household
- near-IRMAA household
- mixed-confidence / incomplete-data household

Each should have expected:
- opportunity count
- top-ranked items
- confidence labels
- blockers/missing info
- suggested scenarios

---

# 34) Admin and governance requirements

Firms need control over opportunity behavior.

## Required admin features
- enable/disable rules
- tune category visibility
- set default ranking weights
- define materiality thresholds
- set which opportunities can auto-surface
- define which opportunities require reviewer approval
- maintain firm playbook notes per opportunity type

## Compliance requirement
Every surfaced opportunity must be reconstructible:
- which rule fired
- which facts were used
- which run was used
- which version of rules package was active
- who changed status later

---

# 35) Deliverables of this phase

By the end of Phase 4, the team should deliver:

## Product deliverables
- opportunity detection engine
- opportunity rule library
- scoring and ranking framework
- opportunity persistence
- opportunity detail payloads
- opportunity lifecycle states
- scenario/task conversion hooks

## Engineering deliverables
- rule authoring framework
- evidence model
- detection events
- supersede logic
- QA suite and golden datasets
- API endpoints

## Design deliverables
- opportunity card pattern
- opportunity detail view spec
- grouped household opportunities view
- missing-data indicator pattern
- confidence / urgency / impact badge patterns

---

# 36) What “great” looks like

A great Phase 4 experience feels like this:

> “I didn’t just get a tax result. I got a prioritized set of real planning ideas, each with evidence, confidence, and a clear next step.”

That is what turns the platform from infrastructure into advisor value.

---

# 37) Recommended build sequence inside Phase 4

## Sprint 1
- opportunity object schema
- evidence schema
- rule authoring framework
- rule registry design

## Sprint 2
- build first 3 rules:
  - Roth conversion headroom
  - IRMAA proximity
  - withholding/payment mismatch

## Sprint 3
- build next 3 rules:
  - charitable bunching
  - QCD
  - preferential rate / gains

## Sprint 4
- scoring framework
- ranking logic
- confidence framework
- missing-data model

## Sprint 5
- deduplication
- grouped opportunity output
- API endpoints
- persistence

## Sprint 6
- scenario hooks
- task hooks
- lifecycle states
- supersede logic

## Sprint 7
- QA hardening
- golden datasets
- admin toggles
- analytics hooks

---

# 38) Final instruction to the AI builders

Do not build this like a loose alert system.

Build it like a **planning recommendation engine**.

The standard is not:
- “Did we flag something?”

The standard is:
- “Did we identify the right opportunity, explain it clearly, rank it intelligently, and make it easy for the advisor to act on it?”

That is the real finish line.

---

# 39) Next likely document after this

After this PRD, the next most useful document is:

**Phase 4 Technical Build Pack — Opportunity Detection Engine**

That should include:
- typed schemas
- rule package format
- scoring formulas
- database DDL
- API contracts
- event payloads
- sample opportunity outputs
- deduplication logic
- golden rule test pack
