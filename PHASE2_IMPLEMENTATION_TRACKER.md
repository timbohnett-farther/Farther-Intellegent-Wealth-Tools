# Phase 2 Implementation Tracker — Document Intake & Review System

**Started:** March 30, 2026
**Goal:** Build the intake and extraction system that converts messy client tax documents into a clean, reviewable, source-linked household tax dataset.

**Core Principle:** *No number should appear in the system without showing where it came from.*

---

## ✅ Completed: Database Schema

**Migration:** `20260330201617_phase2_intake_review_system`

### New Models Added (6 models)

1. **DocumentPage** — Page-level OCR and layout data
   - Fields: pageNumber, pageImageUrl, rawText, textLayerJson, ocrConfidence
   - Relations: TaxDocument, ExtractedField[]

2. **ExtractedField** — Raw extraction candidates (the "what we think we found" layer)
   - Fields: fieldName, rawValue, normalizedValue, confidenceScore, confidenceTier
   - Source tracking: pageNumber, sourceBbox, sourceSnippet
   - Relations: TaxDocument, DocumentPage, ApprovedFact, ReviewAction[]

3. **ApprovedFact** — Reviewer-approved facts (the "what the firm accepts as truth" layer)
   - Fields: canonicalField, value, taxYear, sourceFieldIds, approvedBy
   - Versioning: version, supersededBy
   - Relations: Household, ExtractedField[] (source tracking)

4. **ReviewAction** — Full audit trail of human review actions
   - Actions: approved, edited, rejected, marked_uncertain, requested_second_review
   - Fields: reviewerId, valueBefore, valueAfter, reason, notes
   - Relations: ExtractedField

5. **ConflictRecord** — Detected conflicts requiring resolution
   - Types: duplicate_value, year_mismatch, logical_inconsistency, missing_schedule, staleness
   - Severity: critical, warning, info
   - Status: open, reviewing, resolved, dismissed

6. **MissingDataItem** — Tracking what's missing from household intake
   - Types: document, field, schedule
   - Priority: critical, high, medium, low
   - Status: missing, requested, received, dismissed

### Extended Models

**TaxDocument** — Extended with Phase 2 fields:
- `processingStatus` — Full pipeline tracking (uploaded → queued → processing → ... → approved)
- `fileHash` — SHA-256 for duplicate detection
- `classificationConfidence` — How certain we are about document type
- `pageCount`, `hasTextLayer` — PDF metadata
- `processingError`, `retryCount` — Error handling
- `taxpayerName`, `spouseName` — Extracted identity

**Household** — Added relations:
- `approvedFacts[]`
- `conflictRecords[]`
- `missingDataItems[]`

---

## 📋 Sprint Breakdown (8 Sprints)

### ✅ Sprint 0: Phase 1 Complete
- Database schema (6 base models)
- Navigation integration
- Dashboard placeholder

### 🔄 Sprint 1: Intake Foundation (Week 1) — **IN PROGRESS**

**Goal:** Create a clean, reliable way to get documents into the system.

**Deliverables:**
- [x] Database schema extended
- [x] Migration applied
- [ ] Document upload UI (drag-drop, multi-file)
- [ ] Document type selector component
- [ ] Upload progress tracker component
- [ ] File storage service (S3 or local)
- [ ] Upload API route (`/api/tax/documents/upload`)
- [ ] Duplicate detection (hash-based)
- [ ] Processing queue initialization
- [ ] Status tracking system

**Acceptance Criteria:**
- User can upload 1-50 files in one action
- System stores original file + metadata
- Duplicate detection works
- Household association preserved
- Files enter processing queue with status
- Non-PDF files rejected
- Files >10MB rejected

**Files to Create:**
```
src/app/tax-planning/(authenticated)/intelligence/upload/page.tsx
src/components/tax-intelligence/DocumentUploadZone.tsx
src/components/tax-intelligence/UploadProgressList.tsx
src/components/tax-intelligence/DocumentTypeSelector.tsx
src/components/tax-intelligence/ProcessingStatusBadge.tsx
src/lib/tax-intelligence/file-storage.ts
src/lib/tax-intelligence/duplicate-detection.ts
src/lib/tax-intelligence/processing-queue.ts
src/app/api/tax/documents/upload/route.ts
```

### ⏸️ Sprint 2: OCR & Rendering (Week 2)

**Goal:** Extract text and structure from uploaded documents.

**Deliverables:**
- [ ] Azure Form Recognizer integration
- [ ] Page image rendering service
- [ ] Text layer extraction
- [ ] Coordinate mapping system
- [ ] Page-level OCR confidence scoring
- [ ] Document preview component

**Files to Create:**
```
src/lib/tax-intelligence/ocr/azure-form-recognizer.ts
src/lib/tax-intelligence/ocr/page-renderer.ts
src/lib/tax-intelligence/ocr/coordinate-mapper.ts
src/components/tax-intelligence/DocumentViewer.tsx
src/components/tax-intelligence/PageNavigator.tsx
```

**Azure Setup Required:**
- Azure Form Recognizer resource
- Environment variables: `AZURE_FORM_RECOGNIZER_ENDPOINT`, `AZURE_FORM_RECOGNIZER_KEY`

### ⏸️ Sprint 3: Classification (Week 3)

**Goal:** Determine what the document is, what year, and who it belongs to.

**Deliverables:**
- [ ] Rule-based form detection (Layer 1)
- [ ] Layout-based classification (Layer 2)
- [ ] AI-assisted fallback (Layer 3)
- [ ] Tax year detection
- [ ] Taxpayer association logic
- [ ] Packet splitting (multi-form PDFs)
- [ ] Classification confidence scoring

**Files to Create:**
```
src/lib/tax-intelligence/classification/rules-engine.ts
src/lib/tax-intelligence/classification/layout-classifier.ts
src/lib/tax-intelligence/classification/ai-classifier.ts
src/lib/tax-intelligence/classification/tax-year-detector.ts
src/lib/tax-intelligence/classification/page-splitter.ts
```

**Classification Taxonomy:**
```typescript
// Priority Tier 1
"1040" | "Schedule_1" | "Schedule_2" | "Schedule_3" | "Schedule_A" |
"Schedule_B" | "Schedule_C" | "Schedule_D" | "Form_8606" |
"Form_8889" | "Form_8949" | "Form_8960" | "SSA-1099" | "W-2" |
"1099-INT" | "1099-DIV" | "1099-B" | "1099-R" | "1099-NEC" | "1099-MISC"

// Priority Tier 2
"K-1" | "brokerage_statement" | "IRA_statement" | "custodian_statement" |
"pay_stub" | "property_tax_statement" | "charitable_summary" | "estimated_tax_voucher"

// Priority Tier 3
"prior_year_return" | "spouse_document" | "CPA_projection" | "meeting_notes" |
"client_questionnaire"
```

### ⏸️ Sprint 4: Extraction v1 (Week 4)

**Goal:** Extract structured tax facts from documents.

**Deliverables:**
- [ ] 1040 field extraction
- [ ] W-2 field extraction
- [ ] 1099 series extraction
- [ ] Schedule extraction (A, B, C, D)
- [ ] Field normalization engine
- [ ] Confidence scoring system
- [ ] Source provenance tracking

**Files to Create:**
```
src/lib/tax-intelligence/extraction/form-1040.ts
src/lib/tax-intelligence/extraction/form-w2.ts
src/lib/tax-intelligence/extraction/form-1099.ts
src/lib/tax-intelligence/extraction/schedules.ts
src/lib/tax-intelligence/extraction/field-normalizer.ts
src/lib/tax-intelligence/extraction/confidence-scorer.ts
```

**Canonical Field Taxonomy (V1):**
```typescript
// Identity
filing_status | num_dependents | taxpayer_name | spouse_name

// Income
agi | taxable_income | wages | taxable_interest | qualified_dividends |
ordinary_dividends | net_capital_gain_loss | ira_distributions |
taxable_ira_distributions | pension_income | social_security_total |
social_security_taxable | business_income | rental_income

// Deductions & Credits
itemized_deductions_total | charitable_contributions_cash |
charitable_contributions_noncash | mortgage_interest | salt_deduction

// Retirement & Planning
hsa_contribution | ira_contribution | roth_contribution_indicator |
qcd_indicator | basis_in_ira

// Tax Result
total_tax | federal_withholding | estimated_tax_payments | refund_or_balance_due

// Planning Flags
niit_relevant_investment_income | form_8606_present | form_8949_present |
schedule_d_present
```

### ⏸️ Sprint 5: Review Workspace v1 (Week 5)

**Goal:** Fast, intuitive interface for validating extracted facts.

**Deliverables:**
- [ ] Source viewer (PDF with highlighting)
- [ ] Extracted fields panel (grouped by category)
- [ ] Approve/edit/reject actions
- [ ] Confidence badges
- [ ] Review queue system
- [ ] Field correction form
- [ ] Data lineage viewer (click field → highlights source)

**Files to Create:**
```
src/app/tax-planning/(authenticated)/intelligence/review-queue/page.tsx
src/app/tax-planning/(authenticated)/intelligence/review-queue/[documentId]/page.tsx
src/components/tax-intelligence/SourceViewer.tsx
src/components/tax-intelligence/ExtractedFieldsPanel.tsx
src/components/tax-intelligence/FieldReviewActions.tsx
src/components/tax-intelligence/ConfidenceBadge.tsx
src/components/tax-intelligence/DataLineageViewer.tsx
src/components/tax-intelligence/FieldCorrectionForm.tsx
```

**Review Modes:**
1. **Fast Review** — For clean returns (high-confidence auto-accept)
2. **Guided Review** — Walks through highest-value fields first
3. **Deep Review** — For complex households (validate all categories)

### ⏸️ Sprint 6: Fact Builder + Conflict Layer (Week 6)

**Goal:** Turn reviewed fields into normalized household tax profile.

**Deliverables:**
- [ ] Approved fact creation service
- [ ] Household tax profile builder
- [ ] Conflict detection engine
- [ ] Missing data checklist generator
- [ ] Year-over-year comparison
- [ ] Fact versioning system

**Files to Create:**
```
src/lib/tax-intelligence/facts/approved-fact-builder.ts
src/lib/tax-intelligence/facts/household-profile-builder.ts
src/lib/tax-intelligence/facts/conflict-detector.ts
src/lib/tax-intelligence/facts/missing-data-detector.ts
src/components/tax-intelligence/HouseholdTaxProfile.tsx
src/components/tax-intelligence/ConflictResolutionPanel.tsx
src/components/tax-intelligence/MissingDataChecklist.tsx
```

**Conflict Detection Rules:**
```typescript
// Document Conflicts
- same_field_different_values
- prior_year_mismatch_large
- spouse_name_mismatch
- tax_year_mixed

// Logical Conflicts
- filing_status_inconsistent
- charitable_high_no_detail
- 1099r_present_but_ira_missing
- withholding_but_no_income
- schedule_d_references_missing_8949
- form_8606_basis_missing

// Staleness Conflicts
- old_return_for_current_planning
- pay_stub_too_old
- statement_date_outside_window
```

### ⏸️ Sprint 7: Hardening (Week 7)

**Goal:** Production-ready error handling, performance, edge cases.

**Deliverables:**
- [ ] Error handling framework
- [ ] Retry logic for failed processing
- [ ] Performance optimization
- [ ] Edge case coverage
- [ ] Reprocessing workflows
- [ ] Admin monitoring tools

**Edge Cases to Handle:**
- Upside-down scans
- Mixed current + prior year returns
- Spouse name similarity confusion
- Poor OCR on brokerage statements
- Masked SSNs
- Cut-off PDF pages
- Duplicate uploads with different filenames
- Amended returns
- Draft returns from CPA
- Handwritten notes on PDFs
- Combined PDF (return + statements)
- Phone photos instead of PDFs

### ⏸️ Sprint 8: Pilot Readiness (Week 8)

**Goal:** QA, analytics, training materials.

**Deliverables:**
- [ ] QA benchmark dashboard
- [ ] Extraction accuracy scorecards
- [ ] Intake success analytics
- [ ] Support tools
- [ ] Training flows
- [ ] Admin monitoring
- [ ] Regression test suite

**Benchmark Datasets:**
- Clean returns (20 samples)
- Messy scans (20 samples)
- Partial uploads (10 samples)
- Combined packets (10 samples)
- Rotated images (10 samples)
- Low-resolution (10 samples)
- Handwritten annotations (10 samples)

**Accuracy Metrics:**
- Document classification accuracy (target: >95%)
- Field extraction accuracy (target: >90%)
- Tax year detection accuracy (target: >98%)
- Page split accuracy (target: >95%)
- Taxpayer association accuracy (target: >92%)

---

## 🎯 Success Criteria for Phase 2

Phase 2 is **COMPLETE** only when:

### Intake
- [x] Database models created
- [ ] Users can upload multi-file household tax packets
- [ ] Duplicate detection works
- [ ] Processing statuses are visible
- [ ] Files rejected appropriately (non-PDF, >10MB)

### Classification
- [ ] Primary tax documents classified correctly (>95% accuracy)
- [ ] System identifies tax year and likely taxpayer
- [ ] Confidence scores generated for classifications

### Extraction
- [ ] Core tax facts extracted into structured form
- [ ] Each fact has confidence score
- [ ] Source linkage preserved (page, bbox, snippet)
- [ ] Extraction accuracy >90% on clean docs

### Review
- [ ] Reviewer can approve, edit, reject, comment on facts
- [ ] Low-confidence values highlighted
- [ ] Conflicting values surfaced clearly
- [ ] Review feels fast (<3 min for clean return)

### Household Fact Layer
- [ ] Approved facts roll into canonical household tax profile
- [ ] Raw vs approved facts remain distinct
- [ ] Version history preserved
- [ ] Missing data flagged

### Auditability
- [ ] Edits and approvals logged
- [ ] Source traceability preserved
- [ ] Every number clickable back to source

---

## 🛠️ Technical Architecture

### Service Layer

```
Document Service      → File upload, storage, metadata, versioning
OCR Service          → Text extraction, layout, coordinate mapping
Classification       → Form type, tax year, taxpayer association
Extraction Service   → Parse fields, normalize, confidence scoring
Review Service       → Reviewer actions, conflict tracking, queue
Fact Builder Service → Canonical facts, household profile assembly
```

### Storage

**Relational Database (SQLite/Postgres):**
- Households, documents, extracted fields, approved facts
- Review actions, audit events, conflict records

**Object Storage (S3/Local):**
- Original documents
- Rendered pages
- Thumbnails
- OCR artifacts

**Search Layer (Future):**
- Document search
- Household search
- Field search

### Security

**Required Controls:**
- [x] Encryption at rest (SQLite file-level)
- [x] Encryption in transit (HTTPS)
- [ ] Role-based permissions
- [ ] Least-privilege access
- [ ] Secure file handling
- [ ] Access logging
- [ ] Deletion workflows
- [ ] Retention policies

---

## 📊 Performance Targets

| Operation | Target | Measured |
|-----------|--------|----------|
| Single PDF upload acknowledged | <2s | - |
| Standard return OCR + classification | <60s | - |
| Field review screen load | <3s | - |
| Page navigation in review | <1s | - |
| Household summary refresh | <5s | - |

---

## 🚨 What "Great" Looks Like

**The North Star:**

> "I uploaded a tax packet, and within minutes I had a clean household tax picture. I could see what the system found, where it came from, what it was unsure about, and what still needed review. I trusted it enough to move forward."

**Not:**
- Perfect OCR
- Flashy AI
- Endless automation

**But:**
- **Trustworthy**
- **Fast**
- **Reviewable**

Tax fact creation that can be used in court, compliance review, and in front of skeptical senior advisors.

---

## 📝 Current Status

**Sprint:** 1 (Intake Foundation)
**Progress:** Database schema complete, migration applied, Prisma client generated
**Next:** Build upload UI and file storage service

**Last Updated:** March 30, 2026 20:30 PST
