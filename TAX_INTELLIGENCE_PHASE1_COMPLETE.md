# Tax Intelligence Platform — Phase 1 Complete ✅

**Implementation Date:** March 30, 2026
**Status:** Database Schema & Core Infrastructure Complete
**Next Phase:** Phase 2 (File Upload System)

---

## What Was Accomplished

### 1. Database Schema (6 New Models)

Added to `prisma/schema.prisma` starting at line ~1353:

#### **TaxDocument**
- Uploaded tax documents with OCR pipeline
- Fields: documentType, taxYear, fileUrl, ocrStatus, reviewStatus, sourcePagesMap
- Relations: Household, Advisor, TaxForm[], AuditLog[]
- Indexes: householdId+taxYear, ocrStatus, reviewStatus

#### **TaxForm**
- Extracted line-by-line tax data with confidence scoring
- Fields: formType, fieldData (JSON), agi, totalIncome, taxableIncome, totalTax
- Versioning: checksum, version, supersededBy (immutable)
- Relations: TaxDocument, Household, TaxScenario[], AuditLog[]
- Indexes: householdId+taxYear+formType, documentId

#### **TaxScenario**
- Baseline + alternate scenarios with deterministic calculation results
- Fields: type (baseline|opportunity|what_if|multi_year), adjustments (JSON), results (JSON), vsBaseline (JSON)
- Relations: Household, Plan?, TaxForm (baseline), TaxOpportunity[], TaxDeliverable[], AuditLog[]
- Indexes: householdId+taxYear, planId, status

#### **TaxOpportunity**
- Detected opportunities with AI explanations + citations
- Fields: category, priority, status, analysisData (JSON), aiSummary, aiCitations (JSON)
- Relations: Household, TaxScenario?, TaxDeliverable[], AuditLog[]
- Indexes: householdId+category, status, priority

#### **TaxDeliverable**
- Generated reports with immutable versioning
- Fields: type (tax_snapshot|client_letter|advisor_summary|scenario_comparison|cpa_memo), version, checksum, containsPHI
- Relations: Household, TaxScenario?, TaxOpportunity?, AuditLog[]
- Indexes: householdId+type, scenarioId, status

#### **AuditLog**
- Compliance audit trail
- Fields: entityType, entityId, action, actor, actorType, changesBefore/After (JSON), ipAddress, userAgent
- Relations: All 5 tax models (nullable)
- Indexes: entityType+entityId, documentId, formId, scenarioId, actor, timestamp

### 2. Extended Existing Models

**Household** (line 62-79):
- Added relations: `taxDocuments`, `taxForms`, `taxScenarios`, `taxOpportunities`, `taxDeliverables`

**Advisor** (line 38-60):
- Added relation: `uploadedTaxDocuments`

**Plan** (line 237):
- Added relation: `taxScenarios`

### 3. Migration Executed

```bash
npx prisma migrate dev --name add_tax_intelligence
npx prisma generate
```

**Migration File:** `prisma/migrations/20260330195404_add_tax_intelligence/migration.sql`

**Result:**
- ✅ Migration applied successfully
- ✅ Prisma client regenerated
- ✅ Database in sync with schema

### 4. Navigation Updated

**File:** `src/app/tax-planning/(authenticated)/layout.tsx` (line 25-54)

Added "Tax Intelligence" navigation item:
- Label: Tax Intelligence
- Icon: Sparkle/star icon (AI theme)
- Href: `/tax-planning/intelligence`
- Required Role: `ADVISOR` or `ADMIN`

### 5. Dashboard Page Created

**File:** `src/app/tax-planning/(authenticated)/intelligence/page.tsx`

Features:
- ✅ Phase 1 completion banner with model list
- ✅ 9 feature cards showing coming phases (Phase 2-10)
- ✅ Next steps section
- ✅ Fully responsive with Tailwind v4 semantic tokens
- ✅ Dark mode optimized

---

## Testing Checklist

### ✅ Completed
- [x] Prisma migration runs without errors
- [x] Database schema includes 6 new models
- [x] Relations to Household, Advisor, Plan are valid
- [x] Prisma client generated successfully
- [x] Navigation includes Tax Intelligence item
- [x] Dashboard page accessible at `/tax-planning/intelligence`

### ⏳ Pending (Phase 2+)
- [ ] Upload 5 sample PDFs (Phase 2)
- [ ] OCR processing pipeline (Phase 3)
- [ ] Human review workflow (Phase 4)
- [ ] Federal tax calculation (Phase 5)
- [ ] State tax calculation (Phase 6)

---

## Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Added 6 models (TaxDocument, TaxForm, TaxScenario, TaxOpportunity, TaxDeliverable, AuditLog) + extended 3 models |
| `src/app/tax-planning/(authenticated)/layout.tsx` | Added Tax Intelligence nav item |
| `src/app/tax-planning/(authenticated)/intelligence/page.tsx` | Created dashboard page |
| `.env` | Created from `.env.example` |

---

## Key Design Decisions

### 1. Immutability for Compliance
- **TaxForm**: Uses `version` + `supersededBy` for immutable history
- **TaxDeliverable**: Uses `version` + `checksum` for tamper detection
- **AuditLog**: Records `changesBefore` and `changesAfter` as JSON snapshots

### 2. Deterministic Calculation
- **TaxScenario.results**: JSON field stores calculation output (NEVER AI-generated)
- **calculationEngine**: Version string (e.g., "v1") for reproducibility
- **calculatedAt**: Timestamp for audit trail

### 3. AI with Citations
- **TaxOpportunity.aiSummary**: Plain-language explanation
- **TaxOpportunity.aiCitations**: JSON array with IRS publication references
- **Validation**: All citations must exist in knowledge base (Phase 10)

### 4. Data Lineage
- **TaxDocument.sourcePagesMap**: JSON mapping fields to PDF page numbers
- **TaxForm.fieldData**: JSON with per-field confidence scores
- **AuditLog**: Complete change history for all entities

### 5. Human-in-Loop
- **TaxDocument.reviewStatus**: Requires human approval for low-confidence OCR
- **TaxForm.verifiedAt**: Timestamp when advisor verified extraction
- **TaxOpportunity.status**: Workflow states (identified → reviewed → recommended → implemented)

---

## Database Schema Diagram

```
Household (1) ─┬─> TaxDocument (n)
               ├─> TaxForm (n)
               ├─> TaxScenario (n)
               ├─> TaxOpportunity (n)
               └─> TaxDeliverable (n)

Advisor (1) ───> TaxDocument (n) [uploadedBy]

Plan (1) ──────> TaxScenario (n)

TaxDocument (1) ─> TaxForm (n)

TaxForm (1) ────> TaxScenario (n) [baselineForm]

TaxScenario (1) ─┬─> TaxOpportunity (n)
                 └─> TaxDeliverable (n)

TaxOpportunity (1) ─> TaxDeliverable (n)

[All 5 models] ──> AuditLog (n)
```

---

## Access Control

| Route | Required Role |
|-------|---------------|
| `/tax-planning/intelligence` | `ADVISOR`, `ADMIN` |
| `/tax-planning/intelligence/upload` | `ADVISOR`, `ADMIN` |
| `/tax-planning/intelligence/review-queue` | `ADVISOR`, `ADMIN` |
| `/tax-planning/intelligence/households/[id]` | `ADVISOR`, `ADMIN` (household owner) |
| `/tax-planning/admin/audit` | `ADMIN`, `OPS` |

---

## Next Phase: Phase 2 (File Upload System)

### Deliverable
Upload flow working with S3 storage + database records

### Routes to Create
- `intelligence/upload/page.tsx` — Multi-file drag-drop uploader

### Components to Build
- `src/components/tax-intelligence/DocumentUploadZone.tsx`
- `src/components/tax-intelligence/UploadProgressList.tsx`
- `src/components/tax-intelligence/DocumentTypeSelector.tsx`

### API Routes
- `src/app/api/tax/documents/upload/route.ts` (POST)
  - Accept PDF files (validate mime type, max 10MB)
  - Upload to S3: `/tax-documents/{householdId}/{taxYear}/{documentId}.pdf`
  - Create TaxDocument record
  - Return documentId + fileUrl

### Testing
- Upload 5 PDFs (1040, W-2, 1099, Schedule D, K-1)
- Reject non-PDF files
- Reject >10MB files
- Verify S3 storage + database record creation

---

## Architecture Notes

### Tax Calculation Engine (Phase 5+)
```typescript
interface FederalTaxInputs {
  filingStatus: "single" | "married_joint" | "married_separate" | "head_of_household";
  wages: number;
  interest: number;
  dividends: number;
  // ... all 1040 inputs
}

interface FederalTaxResults {
  agi: number;
  taxableIncome: number;
  ordinaryTax: number;
  capitalGainsTax: number;
  niit: number;
  totalTax: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

// CRITICAL: Pure function, no AI, 100% test coverage
export function calculateFederalTax(inputs: FederalTaxInputs, taxYear: number): FederalTaxResults
```

### OCR Integration (Phase 3)
```typescript
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

export async function extractTaxForm(fileUrl: string, formType: string): Promise<OcrResult> {
  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
  const modelId = formType === "1040" ? "prebuilt-tax.us.1040" : "prebuilt-document";
  const poller = await client.beginAnalyzeDocumentFromUrl(modelId, fileUrl);
  const result = await poller.pollUntilDone();
  return mapAzureResponse(result);
}
```

---

## Success Criteria (Phase 1)

| Criteria | Status |
|----------|--------|
| Migration succeeds | ✅ PASS |
| All relations valid | ✅ PASS |
| Seed data creates test records | ⏸️ DEFERRED (Phase 2) |
| Navigate to `/tax-planning/intelligence` | ✅ PASS |
| Dashboard renders correctly | ✅ PASS |
| No console errors | ✅ PASS |

---

## Risk Mitigation

### High-Risk Areas Identified

**1. OCR Accuracy (<90%)**
- Risk: Poor document quality, handwritten forms
- Mitigation: Human review queue for low confidence, fallback to manual entry

**2. Tax Calculation Errors (>$100 discrepancy)**
- Risk: Incorrect rules, edge cases, rounding
- Mitigation: 100% test coverage, external CPA audit before launch, regression lock

**3. AI Hallucinations (tax law)**
- Risk: Claude invents fake IRS publications
- Mitigation: Strict prompts, citation validation, "AI-generated" badge, human review required

**4. State Tax Complexity**
- Risk: 10 states × 6 years = 60 rule sets
- Mitigation: Start with 5 states in Phase 1, add 5 more in Phase 1.5

**5. Entity Tax Treatment**
- Risk: K-1 passthrough varies by activity type
- Mitigation: Simplified QBI treatment in Phase 1, full activity classification in Phase 2

---

## Development Timeline

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| **1** | Database Schema | Week 1 | ✅ **COMPLETE** |
| 2 | File Upload | Week 1-2 | ⏸️ Pending |
| 3 | OCR Integration | Week 2-3 | ⏸️ Pending |
| 4 | Human Review | Week 3-4 | ⏸️ Pending |
| 5 | Federal Tax Engine | Week 4-5 | ⏸️ Pending |
| 6 | State Tax Engine | Week 5-6 | ⏸️ Pending |
| 7 | Entity Support | Week 6-7 | ⏸️ Pending |
| 8 | Opportunity Detection | Week 7-8 | ⏸️ Pending |
| 9 | Scenario Builder | Week 8-9 | ⏸️ Pending |
| 10 | AI Copilot | Week 9-10 | ⏸️ Pending |
| 11 | PDF Generation | Week 10-11 | ⏸️ Pending |
| 12 | Workflow Integration | Week 11-12 | ⏸️ Pending |

**Estimated Total:** 12 weeks (3 months) for full MVP

---

## Git Commands for Phase 1

```bash
# Review changes
git status
git diff

# Stage changes
git add prisma/schema.prisma
git add src/app/tax-planning/(authenticated)/layout.tsx
git add src/app/tax-planning/(authenticated)/intelligence/page.tsx
git add .env

# Commit
git commit -m "feat(tax-intelligence): Phase 1 - Database schema and core infrastructure

Added 6 new models for Tax Intelligence platform:
- TaxDocument (uploaded docs with OCR pipeline)
- TaxForm (extracted tax data with confidence)
- TaxScenario (baseline + alternate scenarios)
- TaxOpportunity (detected opportunities with AI)
- TaxDeliverable (generated reports)
- AuditLog (compliance trail)

Extended Household, Advisor, Plan models with tax relations.
Added Tax Intelligence navigation item.
Created dashboard placeholder page.

Migration: 20260330195404_add_tax_intelligence

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push
git push origin main
```

---

## How to Resume Phase 2

```bash
cd C:\Users\tim\Projects\Farther-Intelligent-Wealth-Tools
git pull origin main
npm install
npm run dev
```

Then navigate to:
- Dashboard: http://localhost:3000/tax-planning/intelligence
- Login: http://localhost:3000/tax-planning/login

**Next file to create:** `src/app/tax-planning/(authenticated)/intelligence/upload/page.tsx`

---

**Phase 1 Complete! Ready for Phase 2 implementation.**
