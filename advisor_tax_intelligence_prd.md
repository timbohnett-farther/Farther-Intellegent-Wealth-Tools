# PRD — Advisor Tax Intelligence Platform
**Goal:** Build a best-in-class AI-powered tax planning system for advisors that combines fast return review, deep scenario modeling, cited tax research, and client/advisor-ready deliverables.

## 1) Product Vision
Create the advisor tax platform that feels:
- **As easy as a modern AI workspace**
- **As reliable as a rules-driven tax engine**
- **As defensible as a cited tax research tool**
- **As actionable as an operations workflow product**

This product is **not** tax-prep software. It is a **tax planning, tax intelligence, and tax-delivery system** for advisory firms.

## 2) Product Thesis
Today’s leaders each win a different layer of the workflow:
- Holistiplan wins on **speed of tax return review + advisor scenario workflows**
- Hazel wins on **AI-native multi-source context + client-ready plans**
- Blue J wins on **defensible research + citations + drafting**

The winning next-generation product should combine all three:
1. **Structured tax extraction**
2. **Multi-year household context**
3. **Scenario and recommendation engine**
4. **Cited AI reasoning**
5. **Client/advisor deliverable generation**
6. **Workflow, tasks, approvals, and auditability**

## 3) Core Product Principles
1. **Trust first** — always show source, math, assumptions, and confidence.
2. **Advisor in control** — AI drafts; humans approve.
3. **Speed matters** — value should appear in the first session.
4. **Planning beats reporting** — outputs must lead to decisions and action.
5. **Household context matters** — single-return review is not enough.
6. **Workflow is product** — recommendations without tasks die.
7. **Deliverables are part of the product** — report generation is not an afterthought.
8. **Compliance by design** — every recommendation needs evidence and an audit trail.

## 4) Users and Personas
### Primary users
- Lead advisor
- Associate advisor / paraplanner
- Planning specialist / tax strategist
- Operations / service team
- Compliance reviewer
- Firm admin

### Secondary users
- Client
- CPA / tax preparer
- Internal investment team / estate specialist

## 5) Jobs To Be Done
### Advisor JTBD
- Help me review a household’s tax situation quickly and accurately.
- Show me the most relevant tax opportunities this year and over multiple years.
- Let me test scenarios without rebuilding the household manually.
- Give me language I can use with clients and CPAs.
- Produce polished reports and letters fast.
- Keep me safe with citations, assumptions, and review controls.

### Client JTBD
- Help me understand where I’m losing money to taxes.
- Show me what actions matter most.
- Explain tradeoffs in plain English.
- Give me a clear plan and next steps.

### Firm JTBD
- Standardize quality across advisors.
- Scale tax planning beyond a few power users.
- Prove value delivered.
- Track recommendations to implementation.

## 6) Non-Goals
- Filing returns
- Replacing a CPA firm’s tax prep system
- Generating legally final advice without human review
- Covering every entity type and jurisdiction in V1
- Fully autonomous action without advisor approval

## 7) Strategic Product Positioning
### Positioning statement
For advisory firms that want to deliver advanced tax planning at scale, **Advisor Tax Intelligence Platform** is the planning operating system that turns client data into clear recommendations, modeled scenarios, and client-ready documents—while preserving explainability, compliance, and advisor control.

### What makes it different
- Multi-source household context, not just one PDF return
- Multi-year tax intelligence, not just one tax season snapshot
- Deterministic calc engine + AI reasoning layer
- Cited answers and assumption traceability
- Embedded deliverables and workflow orchestration
- Quantified value of advice

## 8) Product Requirements Summary
The platform must do six things exceptionally well:
1. **Ingest and normalize tax data**
2. **Detect opportunities and risks**
3. **Model scenarios**
4. **Generate recommendations**
5. **Produce deliverables**
6. **Track action, approval, and impact**

## 9) Module-by-Module Build Requirements

### Module A — Data Intake and Household Tax Graph
#### Objective
Build the canonical household tax profile.

#### Inputs
- 1040s and supporting schedules
- W-2s, 1099s, K-1s
- Paystubs
- Account statements
- CRM data
- Custodial data
- Meeting notes / transcripts
- Prior-year returns
- Optional manual entry

#### Requirements
- OCR + document classification
- Field extraction to normalized schema
- Household entity graph:
  - taxpayers
  - dependents
  - entities/businesses
  - retirement accounts
  - taxable accounts
  - real estate
  - charitable entities
  - income sources
  - deductions / credits
- Multi-year timeline model
- Version control on all imported data
- Confidence score for every extracted field
- Human review queue for low-confidence extraction

#### Key screens
- Household overview
- Document inbox
- Extracted fields review
- Data lineage / source viewer

#### Acceptance criteria
- Uploading documents creates a usable tax profile
- Every extracted number links back to its source page/snippet
- Reviewer can approve, edit, or reject extracted fields
- System can compare current year vs prior years

---

### Module B — Deterministic Tax Calculation Engine
#### Objective
Create the source-of-truth tax engine that powers scenarios and reports.

#### Requirements
- Federal tax calculation engine first
- State layer second
- Separate rules engine from UI and AI
- Every scenario recomputes:
  - AGI / MAGI
  - taxable income
  - ordinary income tax
  - capital gains treatment
  - NIIT
  - AMT where supported
  - QBI where supported
  - Medicare / IRMAA impacts where applicable
  - withholding / safe-harbor estimates
- Scenario diff engine
- Calculation audit trail
- Assumption library by tax year

#### Design rule
**Never let the LLM perform final tax math.**  
LLM explains. Deterministic engine calculates.

#### Acceptance criteria
- Same inputs always yield same outputs
- Full calculation trace is exportable
- Tax law changes can be versioned by year

---

### Module C — Opportunity Detection Engine
#### Objective
Surface the right recommendations automatically.

#### Opportunity library examples
- Roth conversion / bracket fill
- Capital gain harvesting
- Tax loss harvesting
- Charitable bunching
- Donor-advised fund evaluation
- QCD evaluation
- Estimated payment / withholding gap
- NIIT proximity alerts
- IRMAA cliff alerts
- RMD sequencing opportunities
- Retirement withdrawal sequencing
- Equity comp withholding / concentration tax issues
- Home sale timing / exclusion issues
- Business entity or self-employment observations
- State move / residency planning
- Widow penalty / survivor filing status shifts
- Backdoor Roth / IRA coordination checks
- ACA subsidy interactions for eligible households

#### Requirements
- Rules-based triggers
- Score recommendations by:
  - estimated tax impact
  - confidence
  - complexity
  - urgency
  - client relevance
- Explain “why this surfaced”
- Allow firm-level templates / recommendation defaults
- Allow hiding, editing, or customizing recommendations

#### Acceptance criteria
- System surfaces opportunity cards with evidence
- Each opportunity links to source facts and scenario levers
- Advisor can turn an opportunity into a scenario or task

---

### Module D — Scenario Modeling Workspace
#### Objective
Make scenario planning intuitive, fast, and visual.

#### Core capabilities
- Baseline scenario
- Duplicate scenario
- Multi-year scenarios
- Compare scenarios side-by-side
- Sensitivity analysis
- “Solve for” targets
- Range testing
- Scenario assumptions panel
- Scenario notes / memo field
- Save/share/export

#### Common scenario presets
- Fill 12% / 22% / 24% bracket
- Cap income before IRMAA tier
- Harvest gain up to threshold
- Add charitable gift / bunch deduction
- Model retirement date change
- Model home sale
- Model bonus or liquidity event
- Model RMD + withdrawal sequence
- Model state move

#### UX requirements
- Editable line items with explanation
- Plain-English summary at top
- Impact cards:
  - total tax
  - marginal rate
  - effective rate
  - IRMAA
  - cash flow
  - lifetime tax estimate (where supported)
- Comparison visuals
- Assumption traceability

#### Acceptance criteria
- Advisor can create a baseline from imported data in <10 minutes
- Advisor can compare at least 3 scenarios easily
- Scenario summary reads like an advisor memo

---

### Module E — AI Tax Copilot
#### Objective
Use AI for interpretation, research assistance, and drafting—without letting it become the final calculator.

#### AI roles
1. Summarize household tax posture
2. Explain surfaced opportunities
3. Suggest additional planning ideas
4. Draft client language
5. Draft CPA coordination notes
6. Answer tax questions with citations
7. Create meeting prep and follow-up notes
8. Highlight missing data
9. Suggest assumptions that should be reviewed

#### Hard rules
- AI never issues final recommendation without:
  - source evidence
  - rule/calc backing
  - confidence label
- AI must separate:
  - facts
  - assumptions
  - calculations
  - opinion / planning ideas
- AI can say “I don’t know” or “insufficient data”
- AI outputs must be reviewable and editable

#### Retrieval architecture
- Retrieve from:
  - internal product knowledge
  - tax law / source libraries
  - household data graph
  - prior approved recommendations
  - firm-approved planning playbooks
- Every answer includes:
  - citations
  - confidence
  - date of authority
  - assumptions used

#### Acceptance criteria
- Advisor sees cited answer, not black-box text
- AI can draft a client explanation from a scenario
- AI can create internal and client-safe versions of the same conclusion

---

### Module F — Deliverables and Document Generation
#### Objective
Turn analysis into polished outputs immediately.

#### Core deliverables
1. Tax Snapshot
2. Opportunity Summary
3. Scenario Comparison Report
4. Annual Tax Planning Letter
5. CPA Collaboration Memo
6. Client Meeting Prep Sheet
7. Advisor Internal Notes
8. Implementation Checklist
9. Client-friendly explainer
10. Executive summary for HNW/UHNW households

#### Output formats
- Web report
- PDF
- DOCX/Word-style export
- PowerPoint/slide summary
- Email draft
- CRM note
- Task payload / workflow object

#### Document requirements
- Firm branding
- Configurable disclaimers
- Audience mode:
  - client
  - advisor
  - CPA
  - internal compliance
- Plain-English mode vs technical mode
- Include “why it matters,” “tradeoffs,” and “recommended next step”
- Include appendix with assumptions and citations

#### Acceptance criteria
- Same scenario can generate multiple audience-specific outputs
- Advisor can export reports in one click
- Document engine preserves traceability to scenario/version

---

### Module G — Workflow, Tasks, and Collaboration
#### Objective
Convert planning into execution.

#### Requirements
- Turn recommendation into task
- Assign owner and due date
- Track status:
  - identified
  - reviewed
  - approved
  - client presented
  - client accepted
  - implemented
  - deferred
  - rejected
- CPA collaboration workflow
- Internal reviewer / compliance approval workflow
- Meeting agenda builder
- Activity timeline
- Notes and mentions
- CRM sync

#### Acceptance criteria
- Every recommendation can be operationalized
- Manager can see pipeline of tax opportunities across households
- Client value can be traced from idea to implementation

---

### Module H — Firm Admin, Governance, and Controls
#### Objective
Make the platform scalable for firms.

#### Requirements
- Role-based access control
- Permission tiers by firm / team / user
- Template management
- Approved recommendation library
- Firm-specific tax playbooks
- Review thresholds
- Audit logs
- Data retention controls
- Multi-office / multi-team support
- White-label settings

#### Acceptance criteria
- Firms can standardize outputs and controls
- Audit log captures edits, approvals, exports, and AI usage

---

### Module I — Analytics and ROI Dashboard
#### Objective
Help firms prove value and improve adoption.

#### Metrics
- households reviewed
- opportunities surfaced
- opportunities presented
- opportunities implemented
- estimated tax savings
- quantified value of advice
- time saved per review
- advisor adoption by team
- client engagement with reports
- report export/open rates
- workflow completion rates

#### Acceptance criteria
- Dashboard shows firm, team, and advisor-level metrics
- ROI can be presented to leadership

## 10) Step-by-Step Build Plan

### Phase 0 — Product Strategy and Specification
#### Deliverables
- final problem statement
- target customer profile
- competitive teardown
- core personas
- v1/v2 boundary
- risk register
- PRD sign-off

#### Must decide now
- Which tax years to support first
- Which entity/return types are in V1
- Whether state modeling is V1 or V1.5
- Which integrations are mandatory for launch
- How “value of advice” is defined

---

### Phase 1 — Canonical Data Model
#### Build
- household schema
- taxpayer schema
- document schema
- field lineage schema
- scenario schema
- recommendation schema
- task schema
- citation schema
- audit/event schema

#### Output
A stable domain model that all modules depend on.

---

### Phase 2 — Document Intake, OCR, Parsing, Review
#### Build
- upload pipeline
- classifier
- OCR extraction
- confidence scoring
- structured review UI
- source-page viewer
- correction + feedback loop

#### Gold standard
No extracted field should feel “magic.” Users need to inspect where it came from.

---

### Phase 3 — Calculation Engine
#### Build
- tax rule service
- calculation audit service
- scenario compute service
- tests by tax year
- regression harness
- explanation layer that converts tax outputs into user-readable narratives

#### Critical rule
This engine must be independently testable from the AI system.

---

### Phase 4 — Opportunity Detection Engine
#### Build
- opportunity rules registry
- thresholds and severity logic
- recommendation scoring
- opportunity card UI
- recommendation explainability object

#### Ship first opportunities
- Roth conversion
- capital gain management
- charitable gifting
- NIIT/IRMAA alerts
- withholding / safe harbor
- retirement withdrawal sequencing

---

### Phase 5 — Scenario Workspace
#### Build
- baseline builder
- scenario clone
- line-item editor
- compare view
- solve-for tools
- scenario note layer
- save/share/export

#### UX rule
Advisors should feel like they are editing a planning workbook, not a tax form.

---

### Phase 6 — AI Copilot With Citations
#### Build
- orchestration layer
- retrieval layer
- answer schema
- confidence model
- prompt framework
- red-team prompts
- “I don’t know” fallback
- user feedback capture

#### AI response schema
- answer
- plain-English explanation
- sources/citations
- assumptions
- confidence
- recommended next actions
- related scenarios
- warnings / limitations

---

### Phase 7 — Deliverables Engine
#### Build
- templating system
- branding engine
- PDF generator
- DOCX/HTML generator
- email draft generator
- presentation summary generator
- appendix generator
- disclaimer framework

#### Ship first deliverables
- tax snapshot
- client tax letter
- advisor summary
- scenario comparison
- CPA memo

---

### Phase 8 — Workflow and Integrations
#### Build
- task engine
- approval workflow
- CRM sync
- custodian sync
- meeting note ingestion
- export to collaboration tools
- event/webhook architecture

#### Initial integration priorities
1. CRM
2. Custodian/account data
3. Meeting notes / AI notetaker
4. document intake/onboarding tools
5. portfolio / planning platform connections

---

### Phase 9 — Admin, Security, Compliance
#### Build
- RBAC
- tenant isolation
- encryption
- audit trails
- redaction support
- retention policies
- approval gates
- model monitoring
- usage logging
- policy center

#### Compliance design rules
- AI output must be labeled as draft/reviewed/finalized
- Every final recommendation has reviewer attribution
- Exports are versioned
- Sensitive data access is logged

---

### Phase 10 — Testing and Evaluation
#### Testing tracks
1. tax calc correctness
2. extraction accuracy
3. scenario reliability
4. AI citation quality
5. hallucination control
6. performance and load
7. permissions/security
8. document rendering quality
9. workflow success
10. advisor usability

#### Evaluation harness
- benchmark dataset of anonymized returns
- synthetic edge-case households
- known-answer tax scenarios
- document generation golden sets
- AI answer scorecard:
  - citation accuracy
  - completeness
  - faithfulness
  - tone suitability
  - actionability

---

### Phase 11 — Beta Launch
#### Beta target
A small group of advisor teams with varied complexity:
- mass affluent
- HNW
- business-owner households
- retirees
- equity comp households
- multi-state households

#### Beta goals
- validate workflow
- validate recommendation quality
- measure time-to-value
- collect missing feature list
- compare human-only vs platform-assisted work

---

### Phase 12 — General Availability
#### Launch conditions
- extraction accuracy acceptable
- scenario engine validated
- AI citation quality stable
- deliverables polished
- compliance workflows approved
- support + onboarding ready
- analytics dashboard live

## 11) Detailed UX Blueprint

### Primary advisor flow
1. Create or sync household
2. Upload documents / pull connected data
3. Review extracted facts
4. View household tax posture summary
5. Inspect surfaced opportunities
6. Open recommended scenarios
7. Compare scenarios
8. Approve recommendation set
9. Generate client/advisor/CPA outputs
10. Assign tasks and track execution

### Client meeting flow
1. Advisor opens meeting prep brief
2. Reviews 3–5 prioritized talking points
3. Walks client through scenario visuals
4. Selects action plan
5. Sends branded report and follow-up

### CPA collaboration flow
1. Advisor generates technical memo
2. Memo includes assumptions, citations, scenario impacts
3. CPA comments / approves / pushes changes
4. Revised output archived in timeline

## 12) AI Guardrails and Safety Design

### Mandatory controls
- AI cannot fabricate tax authority
- AI cannot silently change assumptions
- AI cannot produce final numbers outside calc engine
- AI must cite sources used
- AI must display uncertainty
- AI must preserve user edits and approvals

### Confidence thresholds
- High confidence: auto-draft allowed
- Medium confidence: highlight for review
- Low confidence: block finalization, request human review

### Sensitive cases requiring elevated review
- entity selection
- multi-state residency
- trust/estate intersections
- large liquidity events
- concentrated equity compensation
- unusual K-1 or partnership structures
- major charitable structures
- ambiguous source documents

## 13) Data Model (High Level)
### Core objects
- Household
- Person
- Entity
- Document
- ExtractedField
- SourceCitation
- TaxProfile
- Scenario
- ScenarioInput
- ScenarioResult
- Recommendation
- Deliverable
- Task
- Approval
- AuditEvent

### Critical relationships
- Household has many documents
- Document yields many extracted fields
- Extracted fields link to source citations
- Tax profile rolls up extracted fields over time
- Scenario references tax profile + assumptions
- Recommendation references evidence + scenario
- Deliverable references scenario/recommendation/version
- Task references recommendation/deliverable

## 14) Functional Requirements by Launch Tier

### V1 Must-Haves
- household creation
- 1040 + key supporting doc ingestion
- extracted fact review
- federal baseline calculation
- core opportunities
- scenario comparison
- AI summaries with citations
- PDF outputs
- task tracking
- audit log

### V1.5
- state modeling
- expanded forms/schedules
- CPA collaboration portal
- value-of-advice analytics
- meeting transcript ingestion
- richer workflows

### V2
- direct IRS/tax transcript connectivity
- continuous monitoring
- deeper business-owner workflows
- advanced estate/trust intersections
- deeper multi-year planning automations
- client portal experience

## 15) Recommended Initial Opportunity Packs
1. Retirement / pre-retiree pack
2. HNW charitable pack
3. Equity compensation pack
4. Business owner pack
5. Multi-state / relocation pack
6. Year-end tax moves pack

## 16) Reporting and Document Specifications

### A. Client Tax Snapshot
- household overview
- current-year risk/opportunity summary
- plain-English interpretation
- next best actions

### B. Scenario Comparison Report
- baseline vs recommended
- tax difference
- cash flow difference
- notable tradeoffs
- key assumptions
- next step

### C. Annual Tax Planning Letter
- executive summary
- opportunities reviewed
- actions recommended
- actions completed
- coordination notes
- disclosures

### D. CPA Memo
- facts
- issue
- analysis
- assumptions
- scenario comparison
- requested coordination items

### E. Advisor Prep Brief
- talking points
- likely client questions
- red flags
- recommended order of discussion
- follow-up tasks

## 17) Deep Product Insights For The Team
1. **The best products make tax planning feel simpler than it is.**
2. **The math engine builds trust; the AI engine builds speed.**
3. **Advisors love reports, but clients love clarity.**
4. **Recommendations without tasks become forgotten ideas.**
5. **Most firms need repeatability more than maximal sophistication.**
6. **Multi-year context is a huge wedge.**
7. **Showing the source of truth is a competitive advantage.**
8. **“Quantify the value of advice” is a powerful retention and growth lever.**

## 18) Technical Architecture Direction
### Suggested service domains
- identity/auth
- household graph service
- document ingestion service
- OCR/extraction service
- tax rules/calculation service
- scenario service
- recommendation service
- AI orchestration service
- citation/retrieval service
- deliverables service
- workflow/tasks service
- analytics service
- admin/compliance service

### Architecture rules
- calculation engine is isolated
- AI orchestration is stateless where possible
- every critical object is versioned
- all exports reference a version
- data lineage is first-class
- event-driven integration model preferred

## 19) Success Metrics
### User success
- time from upload to first usable insight
- time to create first scenario
- time to generate first report
- advisor weekly active usage
- recommendation acceptance rate

### Business success
- households reviewed per advisor
- attach rate across firm
- value-of-advice generated
- retention / expansion by firm
- implementation rate of opportunities

### Product quality
- extraction accuracy
- scenario correctness
- citation precision
- hallucination rate
- report generation failure rate
- workflow completion rate

## 20) Risks and Mitigations
### Risk: AI overconfidence
Mitigation: confidence labels, citation requirement, human approval, “I don’t know” fallback

### Risk: incorrect math
Mitigation: deterministic engine, regression tests, calc audits, tax-year versioning

### Risk: poor extraction
Mitigation: review UI, confidence scoring, human correction workflow, training set expansion

### Risk: too much complexity
Mitigation: opinionated workflows, presets, opportunity packs, role-based UI simplification

### Risk: compliance concerns
Mitigation: audit trails, versioning, disclaimer framework, approval gates, user permissions

## 21) First 90-Day Build Sprint Outline
### Sprint 1–2
- finalize schema
- define V1 scope
- ingestion pipeline skeleton
- household model
- product design prototypes

### Sprint 3–4
- OCR + doc classification
- extracted field review UI
- first household summary page
- first audit trail objects

### Sprint 5–6
- deterministic baseline calc engine
- scenario object model
- baseline scenario creation
- diff engine

### Sprint 7–8
- first opportunity rules
- recommendation cards
- AI summary v1
- citation framework

### Sprint 9–10
- PDF tax snapshot
- scenario comparison export
- task workflow basics
- advisor feedback loop

### Sprint 11–12
- beta hardening
- permissions
- analytics basics
- support tooling
- pilot onboarding

## 22) Final Build Standard
Do not ship this as “an AI chatbot for tax planning.”  
Ship it as **an advisor operating system for tax intelligence**.

The winning product will not be the one with the most AI.  
It will be the one that best combines:
- fast data intake
- reliable tax logic
- explainable recommendations
- polished deliverables
- operational follow-through
- firm-safe governance
