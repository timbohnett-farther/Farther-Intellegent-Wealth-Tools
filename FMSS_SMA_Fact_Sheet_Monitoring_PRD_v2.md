# FMSS SMA Fact Sheet Monitoring PRD
## Full Product Requirements Document for Claude Code
### Version 2.0 — compiled April 3, 2026

> **READ THIS FIRST.**
> This PRD extends the core **Farther Market Scoring System (FMSS)** build specification and is the source of truth for the **SMA provider registry, discovery crawler, fact sheet ingestion, change detection, and scoring workflow**.
>
> This document must be implemented **inside the existing FMSS repository and architecture**. It does **not** replace the master FMSS build spec. It adds the SMA monitoring/database layer on top of it.
>
> **Absolute implementation rule:** Do not deviate from the core FMSS stack, schema naming conventions, or architectural constraints already established in the master specification.

---

## Table of Contents

1. Project Objective
2. Relationship to the Master FMSS Build Spec
3. Business Problem
4. Product Goals
5. Non-Goals
6. Success Metrics
7. Users
8. Scope
9. Core Functional Requirements
10. System Architecture
11. Scheduler and Run Cadence
12. Technical Stack
13. Repository Integration
14. Environment Variables
15. Data Model and Database Requirements
16. Provider Registry Requirements
17. Seed URL Registry Requirements
18. URL Discovery Workflow
19. Acquisition Workflow
20. PDF Processing Workflow
21. Parsing and Normalization Workflow
22. AI Extraction and Scoring Workflow
23. Change Detection and Alerting
24. Admin UI and Internal Operations
25. API Requirements
26. Worker Design
27. Storage and File Handling Rules
28. Error Handling and Observability
29. Provider Tiering
30. Initial Top-50 Provider Universe
31. Tier 1 Seed Registry — Current Working Set
32. BlackRock Provider Rules
33. J.P. Morgan Provider Rules
34. Crawl Rules and Pattern Library
35. Build Phases
36. Acceptance Criteria
37. Claude Code Absolute Rules
38. Deliverables

---

## 1. Project Objective

Build a production-grade SMA monitoring subsystem inside FMSS that:

- maintains a database of the top 50 wealth and asset managers offering SMA strategies
- discovers SMA strategy pages, resource hubs, and fact sheet PDF URLs
- checks daily for new or updated fact sheets
- downloads only new or materially changed documents
- extracts structured strategy data from PDFs
- uses AI to normalize, summarize, compare, and score the resulting data
- creates an auditable change history so advisors can see what changed and when

The system must be reliable enough to support internal Farther advisor research workflows and scalable enough to expand the seed universe over time.

---

## 2. Relationship to the Master FMSS Build Spec

This PRD is **additive** to the FMSS master build spec.

### This PRD must preserve:
- Next.js 15 App Router
- TypeScript frontend
- Tailwind CSS
- Drizzle ORM
- PostgreSQL on Railway
- Python 3.11 workers
- Bright Data as primary web acquisition layer
- Tavily as backup/discovery layer
- MiniMax M2.7 via Anthropic-compatible endpoint as the standard AI model
- admin secret header authentication
- `src/lib/db/schema.ts` as the single source of truth for table definitions
- migration discipline via Drizzle

### This PRD must not do:
- replace FMSS core tables
- replace the existing `sma_strategies` or `sma_url_manifest` concepts
- change the base model provider away from MiniMax M2.7 without an explicit future decision
- store raw HTML or raw PDF binary directly in Postgres

Instead, this PRD extends the SMA system with a provider registry, seed-path registry, document-version tracking, parsed-document history, and monitoring/alerting workflows.

---

## 3. Business Problem

Farther advisors do not have a normalized internal tool for comparing SMA strategies across managers.

Current pain points:
- strategy information is scattered across manager websites
- fact sheets are updated on inconsistent schedules
- strategy pages are often JS-rendered or bot-protected
- PDFs vary in structure and naming conventions
- it is difficult to detect which updates are actually meaningful
- there is no internal change history layer showing performance, fee, holdings, or benchmark changes over time

The system needs to solve both:
1. **discovery** — where the relevant pages and PDFs live
2. **monitoring** — whether anything materially changed since the last ingestion

---

## 4. Product Goals

### Primary goals
- maintain a living registry of top SMA providers
- maintain a living registry of seed URLs and discovered document URLs
- discover new fact sheet URLs with high coverage
- download updated PDFs with high reliability
- parse key metrics consistently across managers
- produce AI summaries and structured extraction output
- detect material changes between versions
- expose the data inside FMSS in a clean internal admin workflow

### Secondary goals
- make provider onboarding easy
- allow incremental expansion beyond the initial 50 providers
- support multiple site patterns: hub pages, literature libraries, strategy tabs, direct PDF paths, advisor-gated content
- support audits and troubleshooting

---

## 5. Non-Goals

This version is **not** intended to:
- support public user access
- support full OCR-heavy scan restoration for image-only PDFs
- automate credentialed advisor portal logins in the first launch
- ingest every marketing PDF on a provider website
- replace the broader FMSS scoring engine for alternatives, ETFs, or equities
- store raw documents in Postgres

---

## 6. Success Metrics

### Coverage
- at least 50 providers in registry
- at least 90% of Tier 1 providers have one or more active seed URLs
- at least 80% of Tier 1 providers yield one or more valid strategy or fact sheet documents

### Reliability
- successful daily run completion >= 95%
- successful weekly discovery completion >= 95%
- failed URL retry coverage >= 90%
- duplicate processing rate < 5%

### Quality
- parsed strategy name accuracy >= 95%
- parsed return/fee field accuracy >= 90% on sampled audit set
- material change detection precision >= 85%

### Operations
- provider-level run logging
- document-level status visibility
- admin ability to add/edit/deactivate seed URLs without code changes

---

## 7. Users

### Primary users
- Farther advisors
- Farther internal research and platform teams
- internal admins maintaining SMA coverage

### Secondary users
- product and data teams
- leadership using FMSS as a research differentiator

---

## 8. Scope

### In scope
- provider registry
- seed URL database
- discovery and acquisition workflows
- PDF ingestion and parsing
- AI extraction and scoring
- change detection and alerts
- admin UI for SMA URLs and providers
- cron-driven daily and weekly jobs

### Out of scope for first release
- login vault / automated credential orchestration
- human review queue UI for every document field
- multi-tenant permissions beyond the FMSS admin secret
- advisor-facing alert subscriptions by user preference

---

## 9. Core Functional Requirements

### FR-1 Provider Registry
The system shall maintain a structured registry of SMA providers with metadata, tiering, domains, and crawl preferences.

### FR-2 Seed URL Registry
The system shall store seed URLs by provider and classify them by seed type:
- provider root
- SMA hub
- strategy hub
- library/resources
- strategy tab anchor
- direct PDF
- sitemap
- literature directory

### FR-3 Weekly Discovery
The system shall run a discovery process to identify:
- new strategy pages
- new fact sheet URLs
- new literature pages
- dead or redirected seed URLs

### FR-4 Daily Monitoring
The system shall check known document URLs for change using metadata and hashes.

### FR-5 Acquisition
The system shall fetch content using:
- standard HTTP requests when possible
- Bright Data Web Unlocker for protected or JS-sensitive pages
- Bright Data Scraping Browser for interaction-heavy or rendered pages
- Tavily for discovery and as fallback extraction support

### FR-6 PDF Processing
The system shall:
- validate candidate PDFs
- compute SHA-256 hashes
- extract text with PyMuPDF
- store parsed text outside Postgres if needed
- trigger parsing only on new or changed files

### FR-7 Structured Extraction
The system shall extract strategy metrics into normalized schema fields.

### FR-8 AI Enrichment
The system shall generate:
- normalized summaries
- strengths
- risks
- extraction backfill for fields not reliably handled with rules alone
- change narratives

### FR-9 Change Detection
The system shall compare prior and current versions of parsed documents and create change events.

### FR-10 Internal Operations
The system shall provide admin pages to manage providers and URLs.

---

## 10. System Architecture

### High-level flow
1. Railway Cron triggers jobs
2. Tavily performs discovery and mapping
3. Bright Data acquires pages/PDFs reliably
4. PDF processor validates and hashes files
5. parser extracts text and structured data
6. MiniMax M2.7 performs enrichment and scoring
7. PostgreSQL stores provider, URL, document, parsed, and alert data
8. FMSS frontend/admin surfaces state and results

### Canonical architecture rules
- Tavily is the **discovery layer**
- Bright Data is the **acquisition layer**
- MiniMax M2.7 is the **AI extraction/scoring layer**
- Postgres is the **metadata and normalized data store**
- raw files live in filesystem or object storage, not in Postgres

---

## 11. Scheduler and Run Cadence

### Daily job
Run every day at 5:00 UTC.

Purpose:
- check known document URLs
- download new/changed files
- parse newly changed documents
- create alerts and updates

### Weekly job
Run every Monday at 4:00 UTC or 6:00 UTC based on deployment convention, but choose one canonical schedule in production and document it.

Purpose:
- remap provider seeds
- discover new strategy pages or documents
- refresh the URL registry
- then run the daily acquisition pipeline

### Quarterly validation job
Run once per quarter.
Purpose:
- full provider revalidation
- broader sitemap and SERP fallback checks
- stale URL cleanup
- coverage audits

---

## 12. Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router |
| Styling | Tailwind CSS |
| ORM | Drizzle ORM |
| Database | PostgreSQL on Railway |
| Workers | Python 3.11 |
| Discovery | Tavily |
| Acquisition | Bright Data Web Unlocker + Scraping Browser |
| PDF Parsing | PyMuPDF |
| AI | MiniMax M2.7 via Anthropic-compatible endpoint |
| Hosting | Railway |
| Auth | Admin secret header |

### Important implementation note
The user-shared architecture sketch used “Anthropic” as shorthand for the model interface. Production implementation must keep FMSS aligned to **MiniMax M2.7 via the Anthropic-compatible API shape**, not Anthropic as the canonical model provider.

---

## 13. Repository Integration

This feature lives inside the existing FMSS repo.

### Existing locations to extend
- `src/lib/db/schema.ts`
- `src/api/admin/sma-urls/route.ts`
- `src/app/admin/sma-urls/page.tsx`
- `workers/shared/scraper.py`
- `workers/sma_worker.py`
- `workers/data/url_manifest.json`

### New recommended worker files
- `workers/sma_discovery_worker.py`
- `workers/sma_acquisition_worker.py`
- `workers/sma_pdf_parser.py`
- `workers/sma_change_worker.py`
- `workers/sma_alert_worker.py`

### New recommended frontend/admin pages
- `src/app/admin/sma-providers/page.tsx`
- `src/app/admin/sma-runs/page.tsx`
- `src/app/admin/sma-documents/page.tsx`

---

## 14. Environment Variables

Required environment variables:

```bash
DATABASE_URL=
ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
ANTHROPIC_API_KEY=
BRIGHT_DATA_API_KEY=
BRIGHT_DATA_ZONE=
TAVILY_API_KEY=
ADMIN_SECRET=
NEXTJS_BASE_URL=
```

Optional future variables:
```bash
SMA_FILE_STORAGE_PATH=
S3_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SLACK_WEBHOOK_URL=
SMA_ALERT_EMAIL_TO=
```

---

## 15. Data Model and Database Requirements

### Design principles
- preserve FMSS core tables
- extend rather than replace
- keep `sma_strategies` as normalized strategy table
- keep `sma_url_manifest` as authoritative URL manifest for worker execution
- add provider/document/history tables to support discovery and monitoring

### Required core tables to preserve
- `sma_strategies`
- `sma_url_manifest`

### New additive tables required
- `sma_providers`
- `sma_provider_seed_urls`
- `sma_discovered_urls`
- `sma_fact_sheet_documents`
- `sma_fact_sheet_versions`
- `sma_parsed_documents`
- `sma_change_events`
- `sma_provider_runs`
- `sma_document_alerts`

---

## 16. Provider Registry Requirements

### Table: `sma_providers`
Purpose: authoritative provider list

Suggested fields:
- `id`
- `provider_key` unique machine key
- `provider_name`
- `provider_rank`
- `estimated_total_aum_text`
- `website_domain`
- `website_url`
- `primary_path`
- `secondary_paths_json`
- `allowed_domains_json`
- `allow_external_assets`
- `preferred_fetch_mode`
- `auth_sensitivity`
- `discovery_mode`
- `provider_tier`
- `is_active`
- `notes`
- timestamps

### Allowed values
`preferred_fetch_mode`:
- `http_first`
- `unlocker_first`
- `browser_first`

`auth_sensitivity`:
- `low`
- `medium`
- `high`

`discovery_mode`:
- `direct_pdf`
- `hub_page`
- `catalog_page`
- `library_page`
- `mixed`

`provider_tier`:
- `tier_1`
- `tier_2`
- `tier_3`

---

## 17. Seed URL Registry Requirements

### Table: `sma_provider_seed_urls`
Purpose: store provider-level starting points for discovery

Suggested fields:
- `id`
- `provider_id`
- `seed_url`
- `seed_type`
- `canonical_url`
- `anchor_fragment`
- `is_active`
- `discovery_priority`
- `last_checked_at`
- `last_status`
- `notes`
- timestamps

### Seed types
- `provider_root`
- `sma_hub`
- `strategy_hub`
- `library`
- `sitemap`
- `tab_anchor`
- `direct_pdf`
- `strategy_page`

---

## 18. URL Discovery Workflow

### Discovery sources
1. provider seed URLs
2. provider sitemaps
3. Tavily search
4. Tavily map
5. Tavily crawl
6. direct child-link inventory from rendered pages
7. Bright Data browser fallback for JS-heavy pages
8. optional SERP fallback later

### Discovery rules
- start from provider-specific seeds, not just homepages
- use shallow depth first
- respect allowed/excluded patterns
- discover both child pages and direct documents
- store strategy pages separately from documents
- classify each discovered URL

### Required outputs
- new strategy page URLs
- new document URLs
- dead/redirected URLs
- discovered metadata such as title, source page, pattern matched, and crawl source

---

## 19. Acquisition Workflow

### Order of operations
1. direct GET/HEAD when cheap and likely to work
2. Bright Data Web Unlocker for protected pages or PDFs
3. Bright Data Scraping Browser for interactive/JS-driven flows
4. fallback extraction support from Tavily for page analysis

### Acquisition rules
- do not browser-fetch everything by default
- escalate only when needed
- capture HTTP metadata when available
- validate file types before saving
- support redirects and literature CDNs
- mark sign-in redirects explicitly

### Output
- local or object-storage file path
- binary hash
- file size
- content type
- response metadata
- retrieval source used

---

## 20. PDF Processing Workflow

### Required behavior
- compute SHA-256 of file bytes
- skip parse if identical binary hash already exists for same canonical document
- extract text with PyMuPDF
- store parse status
- record page count and metadata
- support malformed PDF handling with retry/fallback states

### Change gate
A document should move to parse/AI only if:
- URL is new, or
- binary hash changed, or
- normalized text hash changed, or
- forced reprocess flag is set

---

## 21. Parsing and Normalization Workflow

### Deterministic extraction first
Use rule-based parsing and regex/section heuristics before AI.

### Core extracted fields
- strategy_name
- manager_firm
- strategy_type
- asset_class
- benchmark_index
- inception_date
- return_1yr
- return_3yr
- return_5yr
- return_10yr
- return_inception
- sharpe_ratio
- max_drawdown
- standard_deviation
- beta
- alpha
- information_ratio
- management_fee
- minimum_investment
- manager_name
- manager_tenure_years
- aum
- top10_holdings_json
- sector_weights_json
- geography_weights_json

### Parsing rules
- percentages normalized to decimals in final structured fields
- cumulative returns not mapped into annualized fields
- wrap/performance fees not substituted for management fee
- null is preferred over invented data

---

## 22. AI Extraction and Scoring Workflow

### Model
Use **MiniMax M2.7** through the Anthropic-compatible interface already defined by FMSS.

### AI tasks
- backfill hard-to-parse fields
- summarize strategy
- identify strengths and risks
- create score narrative
- compare current vs prior version
- classify material change impact
- support normalized rubric scoring

### AI output requirements
- strict JSON schema for extraction
- deterministic field names
- separate confidence markers where appropriate
- narrative stored separately from structured numeric fields

### Important rule
AI should not be the first signal for “did this document change.”
Deterministic metadata/hash/text comparison comes first. AI summarizes the delta after change is confirmed.

---

## 23. Change Detection and Alerting

### Comparison layers
1. URL diff
2. HTTP metadata diff
3. binary hash diff
4. normalized text hash diff
5. structured field diff
6. AI narrative summary of changes

### Material change fields
- returns
- benchmark
- fee
- AUM
- holdings
- sector weights
- manager name
- inception date
- minimum investment

### Table: `sma_change_events`
Suggested fields:
- `id`
- `provider_id`
- `strategy_id`
- `document_id`
- `old_version_id`
- `new_version_id`
- `change_type`
- `changed_fields_json`
- `change_summary`
- `is_material`
- `detected_at`
- `notified_at`
- `notification_status`

### Alerts
Support:
- internal admin dashboard alerts first
- Slack/email alerting second
- future advisor notifications later

---

## 24. Admin UI and Internal Operations

### Required pages
#### `/admin/sma-providers`
- provider list
- tier
- status
- fetch mode
- auth sensitivity
- allowed domains
- number of seed URLs
- last successful run

#### `/admin/sma-urls`
- all seed URLs
- provider name
- URL type
- active/inactive
- last checked
- last status
- last error
- scrape source used

#### `/admin/sma-documents`
- documents by provider
- last seen
- version count
- parse status
- AI status
- change event status

#### `/admin/sma-runs`
- run history
- counts
- failures
- provider-level summaries

### Required actions
- add provider
- add seed URL
- deactivate seed URL
- retry failed URL
- force reprocess document
- view change history

---

## 25. API Requirements

### Admin APIs
- `GET /api/admin/sma-providers`
- `POST /api/admin/sma-providers`
- `PATCH /api/admin/sma-providers/:id`
- `GET /api/admin/sma-urls`
- `POST /api/admin/sma-urls`
- `PATCH /api/admin/sma-urls/:id`
- `POST /api/admin/sma-urls/:id/retry`
- `GET /api/admin/sma-documents`
- `GET /api/admin/sma-runs`

### Existing FMSS integration
The existing SMA endpoints should continue to resolve normalized strategy data from `sma_strategies`.

---

## 26. Worker Design

### `sma_discovery_worker.py`
Responsibilities:
- iterate active providers
- execute Tavily discovery/map/crawl
- classify discovered URLs
- populate discovered URL tables
- seed document checks

### `sma_acquisition_worker.py`
Responsibilities:
- fetch documents and pages
- use unlocker or browser as needed
- validate file type
- save file
- compute hashes
- create/update document/version records

### `sma_pdf_parser.py`
Responsibilities:
- parse text from new/changed PDFs
- run deterministic extraction
- create parsed document record

### `sma_change_worker.py`
Responsibilities:
- compare current vs prior parsed versions
- generate changed fields JSON
- create change events

### `sma_alert_worker.py`
Responsibilities:
- consume material change events
- send Slack/email alerts if configured
- update notification status

### `sma_worker.py`
Can remain the high-level orchestration layer if preferred, but the above separation is recommended for clarity and retry behavior.

---

## 27. Storage and File Handling Rules

### Hard rules
- do not store raw PDF binary in Postgres
- do not store raw HTML blobs in Postgres
- store file paths or object storage keys instead
- keep normalized metadata in Postgres
- keep hashes for dedupe and audit

### Suggested directory pattern
```text
/storage/sma/
  /provider_key/
    /YYYY/
      /MM/
        /document_hash_or_version/
```

---

## 28. Error Handling and Observability

### Required statuses
At provider, URL, document, parse, and AI stages, track:
- pending
- success
- skipped
- failed
- retrying
- blocked
- sign_in_redirect
- unsupported

### Required logging
- provider run summary
- URL-level failures
- fetch method used
- parse exceptions
- AI parse failures
- change detection summary

### Required retry policy
- 3 retries for transient network issues
- browser escalation after repeated unlocker failure where appropriate
- dead URL deactivation only after repeated failures plus validation

---

## 29. Provider Tiering

### Tier 1
Highest-priority providers with strongest expected advisor relevance and best launch ROI.
Examples:
- BlackRock
- Vanguard
- Fidelity
- State Street GA
- JPMorgan AM
- Morgan Stanley
- Goldman Sachs AM
- Capital Group
- Parametric
- PIMCO

### Tier 2
High-relevance additional firms with likely meaningful SMA coverage.

### Tier 3
Longer-tail or less certain/less public providers that may need more custom rules.

---

## 30. Initial Top-50 Provider Universe

The build must support the full provider universe supplied by the user, ranked 1–50, beginning with BlackRock, Vanguard, Fidelity, State Street GA, and JPMorgan AM, and extending through SEI Investments. This list is the initial target registry and should be loaded into `sma_providers` as seed data during setup. Key examples in the list include BlackRock, Vanguard, Fidelity, JPMorgan AM, Parametric, PIMCO, Nuveen, Northern Trust, AllianceBernstein, AQR, Voya, and SEI Investments.

Implementation note:
- the provider registry seed should preserve the original ranking
- total AUM values may be stored as display text initially
- normalization to numeric AUM fields can be added later

---

## 31. Tier 1 Seed Registry — Current Working Set

This is the current curated working set gathered so far and must be inserted into the seed URL registry.

### J.P. Morgan Asset Management
1. `https://am.jpmorgan.com/us/en/asset-management/adv/investment-strategies/separately-managed-accounts/explore-smas/`

### BlackRock / Aperio
2. `https://www.blackrock.com/us/financial-professionals/investments/tax-managed-equity-sma-aperio`
3. `https://www.blackrock.com/us/financial-professionals/investments/tax-managed-equity-sma-aperio#active-tax`
4. `https://www.blackrock.com/us/financial-professionals/investments/tax-managed-equity-sma-aperio#factor-tilts`
5. `https://www.blackrock.com/us/financial-professionals/investments/tax-managed-equity-sma-aperio#vai`
6. `https://www.blackrock.com/us/financial-professionals/investments/products/managed-accounts/fixed-income`
7. `https://www.blackrock.com/us/financial-professionals/investments/products/managed-accounts/fixed-income#taxable-fixed-income`
8. `https://www.blackrock.com/us/financial-professionals/investments/products/managed-accounts/equity`

These must be tagged by provider and seed type at load time.

---

## 32. BlackRock Provider Rules

### Provider classification
- `provider_key`: `blackrock`
- `provider_name`: `BlackRock`
- `provider_tier`: `tier_1`
- `website_domain`: `blackrock.com`
- `preferred_fetch_mode`: `browser_first`
- `auth_sensitivity`: `high`
- `discovery_mode`: `mixed`
- `allow_external_assets`: `true`

### Why
BlackRock exposes rich strategy hub pages and literature patterns, but some fact-sheet retrieval flows may redirect to sign-in or require session-sensitive handling.

### BlackRock rules
- treat Aperio landing pages as high-value strategy hubs
- treat tab-anchor URLs as valid seed variants
- inventory child literature links before broader crawl expansion
- treat `/literature/fact-sheet/` as a high-priority pattern
- record sign-in redirects explicitly rather than as generic failure

### Include patterns
- `/us/financial-professionals/investments/`
- `/investments/products/managed-accounts/`
- `/literature/fact-sheet/`
- `aperio`
- `tax-managed`
- `direct-indexing`
- `sma`

### Exclude patterns
- generic news
- login pages as discovery leaves
- irrelevant retail education pages

---

## 33. J.P. Morgan Provider Rules

### Provider classification
- `provider_key`: `jpmorgan_am`
- `provider_name`: `J.P. Morgan Asset Management`
- `provider_tier`: `tier_1`
- `website_domain`: `am.jpmorgan.com`
- `preferred_fetch_mode`: `browser_first`
- `auth_sensitivity`: `medium`
- `discovery_mode`: `catalog_page`
- `allow_external_assets`: `true`

### Why
The JPM “Explore SMAs” URL is a strategy catalog/hub page, not just a single PDF page. It is useful as a provider directory seed and adjacent navigation source.

### JPM rules
- treat “Explore SMAs” as a discovery hub
- inventory child strategy pages first
- inspect downstream resource/library pages for PDFs
- store hub pages separately from document URLs
- run weekly remap of the hub page

### Include patterns
- `/separately-managed-accounts/`
- `/explore-smas/`
- `/tax-smart-platform/`
- `/resources/library/`
- `sma`
- `brochure`
- `literature`
- `pdf`

### Exclude patterns
- `/login`
- `/podcasts`
- `/webcasts`
- generic media pages

---

## 34. Crawl Rules and Pattern Library

### Generic positive patterns
- `fact-sheet`
- `factsheet`
- `sma`
- `separately-managed-account`
- `separately-managed-accounts`
- `strategy-overview`
- `pack-sheet`
- `performance`
- `brochure`
- `literature`
- `.pdf`

### Generic negative patterns
- `podcast`
- `webcast`
- `career`
- `press-release`
- `privacy`
- `terms`
- `login`
- `sign-in`

### Discovery heuristics
- prefer URLs under strategy/resource/literature sections
- follow on-domain child links before generic site-wide crawl
- allow approved external asset domains
- store anchor-based seeds exactly as provided, but canonicalize them to base URLs plus fragment metadata

---

## 35. Build Phases

### Phase 1 — Database + Provider Registry
- create additive schema tables
- load top-50 provider seed data
- build provider admin UI
- build seed URL admin UI

### Phase 2 — Discovery Layer
- implement Tavily discovery worker
- implement sitemap parsing
- implement discovered URL classification
- build run logging

### Phase 3 — Acquisition Layer
- implement Bright Data unlocker fetch
- implement browser fallback
- validate PDFs
- save files and hashes
- version documents

### Phase 4 — Parsing Layer
- implement PyMuPDF extraction
- deterministic field parsing
- parsed document persistence

### Phase 5 — AI Enrichment + Change Detection
- MiniMax extraction backfill
- strengths/risks/summary
- change-event generation
- score narrative generation

### Phase 6 — Admin Ops + Alerts
- admin document/run views
- material change alerts
- retry workflows
- audit trail surfaces

### Phase 7 — FMSS Surface Integration
- expose normalized strategy data in FMSS pages and compare workflows
- connect change history where useful

---

## 36. Acceptance Criteria

The PRD is complete when:

### Data model
- all required tables exist via Drizzle migrations
- `sma_strategies` and `sma_url_manifest` remain intact
- provider and document history tables are additive and operational

### Registry
- top-50 providers are seeded
- current working-set URLs are seeded
- providers and URLs are editable in admin

### Discovery
- weekly discovery runs successfully against at least 10 Tier 1 providers
- discovered URLs are classified and stored

### Acquisition
- daily job fetches and hashes documents
- identical documents are skipped
- updated documents create new versions

### Parsing
- parsed documents populate normalized fields with null-safe behavior

### AI
- MiniMax M2.7 returns valid structured output
- summaries/strengths/risks are stored
- change narratives are created for updates

### Alerts
- material change events are persisted
- admin can see unnotified alerts

---

## 37. Claude Code Absolute Rules

1. All work must stay inside the FMSS project folder and repo.
2. Do not pull code from other local projects.
3. Preserve the master FMSS stack and schema naming rules.
4. Every schema change must be accompanied by a Drizzle migration.
5. Do not store raw PDF binary or raw HTML in Postgres.
6. Maintain a Plan Log before starting coding work.
7. Maintain a Change Log after each push.
8. Maintain a TODO file and continue through it when work completes.
9. Test deploy before pushing so Railway deployment does not fail.
10. Use MiniMax M2.7 via the Anthropic-compatible endpoint unless explicitly changed later.
11. Build provider-specific rules rather than relying on one generic crawler.
12. Discovery and acquisition are separate concerns and must stay separate in code.
13. Prefer deterministic parsing and hash-based change detection before AI interpretation.
14. Ask only when a true architectural conflict exists; otherwise implement according to this PRD and the master spec.

---

## 38. Deliverables

The Claude Code team must produce:

### Database / backend
- Drizzle migrations
- schema updates
- provider seed loader
- URL seed loader
- discovery worker
- acquisition worker
- parser worker
- change detection worker
- alert worker

### Frontend / admin
- SMA provider admin page
- SMA URL admin page
- SMA documents page
- SMA runs page

### Data / config
- provider seed JSON
- URL seed JSON
- pattern library config
- provider rules config
- scoring prompt config

### Documentation
- updated CLAUDE.md rules
- Plan Log
- Change Log
- TODO list
- deployment notes
- runbook for failed provider recovery

---

## Appendix A — Suggested Provider Seed JSON Shape

```json
{
  "provider_key": "blackrock",
  "provider_name": "BlackRock",
  "provider_rank": 1,
  "estimated_total_aum_text": "$14T",
  "website_domain": "blackrock.com",
  "website_url": "https://www.blackrock.com",
  "primary_path": "/us/financial-professionals/investments/products/managed-accounts",
  "allowed_domains": ["blackrock.com"],
  "allow_external_assets": true,
  "preferred_fetch_mode": "browser_first",
  "auth_sensitivity": "high",
  "discovery_mode": "mixed",
  "provider_tier": "tier_1",
  "is_active": true
}
```

---

## Appendix B — Suggested Seed URL JSON Shape

```json
{
  "provider_key": "blackrock",
  "seed_url": "https://www.blackrock.com/us/financial-professionals/investments/tax-managed-equity-sma-aperio#active-tax",
  "seed_type": "tab_anchor",
  "canonical_url": "https://www.blackrock.com/us/financial-professionals/investments/tax-managed-equity-sma-aperio",
  "anchor_fragment": "active-tax",
  "is_active": true,
  "discovery_priority": 10,
  "notes": "Aperio Active Tax tab with embedded fact sheet directory"
}
```

---

## Appendix C — Suggested Run Status Taxonomy

```text
pending
success
skipped
failed
retrying
blocked
sign_in_redirect
unsupported
```
