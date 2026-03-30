# Sprint 1 Testing Guide — Tax Intelligence Upload System

**Phase 2 Sprint 1 Testing**
**Status:** Ready for Testing
**Goal:** Verify complete document upload flow works end-to-end

---

## Prerequisites

### 1. Environment Setup

```bash
# Navigate to project
cd C:\Users\tim\Projects\Farther-Intellegent-Wealth-Tools

# Install dependencies (if needed)
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### 2. Required Test Files

Create test files in `C:\Users\tim\Projects\Farther-Intellegent-Wealth-Tools\test-documents\`:

- `test_1040.pdf` (2MB, valid PDF)
- `test_w2.pdf` (1MB, valid PDF)
- `test_1099.pdf` (500KB, valid PDF)
- `large_file.pdf` (11MB, >10MB - should reject)
- `test_document.docx` (invalid type - should reject)
- `test_spreadsheet.xlsx` (invalid type - should reject)
- `duplicate_1040.pdf` (same content as test_1040.pdf)
- `similar_1040_copy.pdf` (different content, similar filename)

---

## Test Suite (20 Test Cases)

### Section 1: Upload Validation (7 Cases)

#### Test 1.1: Upload Single PDF
**Steps:**
1. Navigate to `http://localhost:3000/tax-planning/intelligence/upload`
2. Select household from dropdown
3. Select tax year (2024)
4. Drag `test_1040.pdf` into upload zone
5. Click "Upload Documents"

**Expected:**
- ✅ File appears in preview
- ✅ Upload button enabled
- ✅ Upload succeeds
- ✅ Progress shows 100%
- ✅ Status badge shows "Approved"
- ✅ Success message displayed

**Actual:** _____

---

#### Test 1.2: Upload 10 PDFs at Once
**Steps:**
1. Navigate to upload page
2. Select household
3. Drag 10 valid PDF files into upload zone
4. Click "Upload Documents"

**Expected:**
- ✅ All 10 files appear in preview
- ✅ Upload succeeds for all files
- ✅ Progress tracked individually
- ✅ All files reach "Approved" status

**Actual:** _____

---

#### Test 1.3: Upload 50 PDFs at Once (Maximum)
**Steps:**
1. Navigate to upload page
2. Select household
3. Drag 50 valid PDF files into upload zone
4. Click "Upload Documents"

**Expected:**
- ✅ All 50 files appear in preview
- ✅ Upload succeeds for all files
- ✅ No performance issues
- ✅ All files reach "Approved" status

**Actual:** _____

---

#### Test 1.4: Try to Upload 51 PDFs (Over Limit)
**Steps:**
1. Navigate to upload page
2. Select household
3. Drag 51 PDF files into upload zone

**Expected:**
- ❌ Alert: "You can only upload up to 50 files at once"
- ❌ Files not added to preview
- ❌ Upload button disabled

**Actual:** _____

---

#### Test 1.5: Upload 11MB PDF (Over Size Limit)
**Steps:**
1. Navigate to upload page
2. Select household
3. Drag `large_file.pdf` (11MB) into upload zone
4. Click "Upload Documents"

**Expected:**
- ❌ File shows in preview with error badge
- ❌ Error message: "File size 11.00MB exceeds maximum allowed size of 10MB"
- ✅ Other valid files can still upload
- ❌ Large file excluded from upload

**Actual:** _____

---

#### Test 1.6: Upload .docx File (Invalid Type)
**Steps:**
1. Navigate to upload page
2. Select household
3. Drag `test_document.docx` into upload zone
4. Click "Upload Documents"

**Expected:**
- ❌ File shows in preview with error badge
- ❌ Error message: "File type application/vnd.openxmlformats-officedocument.wordprocessingml.document not allowed"
- ✅ Upload button warns about validation errors
- ❌ File excluded from upload

**Actual:** _____

---

#### Test 1.7: Upload .xlsx File (Invalid Type)
**Steps:**
1. Navigate to upload page
2. Select household
3. Drag `test_spreadsheet.xlsx` into upload zone
4. Click "Upload Documents"

**Expected:**
- ❌ File shows in preview with error badge
- ❌ Error message similar to Test 1.6
- ❌ File excluded from upload

**Actual:** _____

---

### Section 2: Duplicate Detection (4 Cases)

#### Test 2.1: Upload Same File Twice (Exact Duplicate)
**Steps:**
1. Upload `test_1040.pdf` successfully
2. Try to upload `duplicate_1040.pdf` (same SHA-256 hash)

**Expected:**
- ⚠️ Status: "duplicate"
- ⚠️ Warning message: "Exact duplicate detected: [filename] (uploaded on [date])"
- ⚠️ File shows in progress list with amber warning
- ❌ File not stored or inserted into database
- ✅ Stats show 1 duplicate, 0 successful

**Actual:** _____

---

#### Test 2.2: Upload File with Similar Name (Likely Duplicate)
**Steps:**
1. Upload `test_1040.pdf` successfully
2. Try to upload `similar_1040_copy.pdf` (>85% filename similarity, different content)

**Expected:**
- ⚠️ Status: "duplicate"
- ⚠️ Warning message: "Similar filename detected: [existing file] (92% match)"
- ⚠️ File shows with warning badge
- ❌ File not stored (prevented by likely duplicate detection)

**Actual:** _____

---

#### Test 2.3: Override Duplicate Warning (Future Feature)
**Steps:**
1. Upload duplicate file (triggers warning)
2. Click "Upload anyway" button

**Expected:**
- 🚧 Feature not yet implemented
- ⚠️ Alert: "Override duplicate not yet implemented"

**Actual:** _____

---

#### Test 2.4: Different Households Can Have Same Document
**Steps:**
1. Upload `test_1040.pdf` to Household A
2. Upload `test_1040.pdf` to Household B (different household)

**Expected:**
- ✅ Both uploads succeed
- ✅ No duplicate warning (scoped by householdId)
- ✅ Database shows 2 records with same fileHash, different householdId

**Actual:** _____

---

### Section 3: Processing Queue (4 Cases)

#### Test 3.1: Document Enters Queue Immediately
**Steps:**
1. Upload `test_1040.pdf`
2. Check database: `SELECT * FROM TaxDocument WHERE originalFilename = 'test_1040.pdf'`

**Expected:**
- ✅ processingStatus = 'uploaded'
- ✅ fileHash populated
- ✅ fileUrl populated
- ✅ retryCount = 0
- ✅ uploadedAt = current timestamp

**Actual:** _____

---

#### Test 3.2: Status Transitions from "uploaded" → "queued"
**Steps:**
1. Upload document
2. Call processing queue transition manually:
   ```javascript
   await transitionStatus({
     documentId: 'doc-xxx',
     from: 'uploaded',
     to: 'queued',
     actor: 'system'
   })
   ```
3. Check database

**Expected:**
- ✅ processingStatus = 'queued'
- ✅ updatedAt timestamp updated
- ❌ Cannot transition to invalid status

**Actual:** _____

---

#### Test 3.3: Progress Percentage Updates Correctly
**Steps:**
1. Check progress at each status:
   - uploaded → 10%
   - queued → 20%
   - processing → 40%
   - ocr_complete → 60%
   - classified → 70%
   - fields_extracted → 85%
   - needs_review → 95%
   - approved → 100%

**Expected:**
- ✅ Progress matches expected percentage for each status
- ✅ Progress bar in UI reflects current status

**Actual:** _____

---

#### Test 3.4: Failed Uploads Can Be Retried (Max 3 Times)
**Steps:**
1. Upload document
2. Simulate failure: `await markAsFailed(documentId, 'Test error', true)`
3. Check retryCount in database
4. Repeat 2 more times (total 3 retries)
5. Try 4th retry

**Expected:**
- ✅ retryCount increments on each retry (1, 2, 3)
- ✅ Max 3 retries allowed
- ❌ 4th retry prevented
- ✅ Error message stored in processingError field

**Actual:** _____

---

### Section 4: Integration (5 Cases)

#### Test 4.1: Household Selector Filters to User's Households
**Steps:**
1. Navigate to upload page
2. Check household dropdown options

**Expected:**
- ✅ Dropdown shows only households user has access to
- ✅ Mock data shows: Anderson Family, Brown Trust, Chen & Associates
- ❌ Cannot upload without selecting household

**Actual:** _____

---

#### Test 4.2: Tax Year Defaults to Current Year
**Steps:**
1. Navigate to upload page
2. Check tax year selector

**Expected:**
- ✅ Default year = 2025 (current year)
- ✅ Options: 2025, 2024, 2023, 2022, 2021, 2020
- ✅ User can change year before upload

**Actual:** _____

---

#### Test 4.3: Document Type Selector is Optional
**Steps:**
1. Navigate to upload page
2. Check document type selector

**Expected:**
- ✅ Default value = "Unknown / Let System Classify"
- ✅ Can upload without changing document type
- ✅ 42 document types available in 3 tiers
- ✅ Help text: "Select document type if known, or choose 'Unknown'..."

**Actual:** _____

---

#### Test 4.4: Upload History Shows Recent Uploads (Future Feature)
**Steps:**
1. Upload 5 documents
2. Check upload page for history section

**Expected:**
- 🚧 Feature not yet implemented (Sprint 5)
- ✅ Upload progress list shows current upload batch

**Actual:** _____

---

#### Test 4.5: Audit Log Captures All Upload Events
**Steps:**
1. Upload document
2. Check database: `SELECT * FROM AuditLog WHERE entityType = 'TaxDocument' ORDER BY timestamp DESC LIMIT 5`

**Expected:**
- ✅ action = 'created'
- ✅ actor = uploadedBy (advisor ID)
- ✅ actorType = 'advisor'
- ✅ changesAfter contains: id, filename, taxYear, documentType, fileSize, fileHash
- ✅ metadata contains: uploadSource, userAgent
- ✅ ipAddress captured
- ✅ timestamp = upload time

**Actual:** _____

---

## Performance Targets

Measure and record actual performance:

| Operation | Target | Actual | Pass/Fail |
|-----------|--------|--------|-----------|
| File upload acknowledgment | <2s | _____ | _____ |
| Hash calculation (10MB file) | <500ms | _____ | _____ |
| Duplicate check | <1s | _____ | _____ |
| File storage | <1s | _____ | _____ |
| Database record creation | <500ms | _____ | _____ |
| Total upload time (per file) | <5s | _____ | _____ |

---

## Database Verification Queries

```sql
-- Check uploaded documents
SELECT id, originalFilename, processingStatus, fileSize, uploadedAt
FROM TaxDocument
ORDER BY uploadedAt DESC
LIMIT 10;

-- Check processing queue stats
SELECT processingStatus, COUNT(*) as count
FROM TaxDocument
GROUP BY processingStatus;

-- Check audit logs
SELECT entityType, action, actor, timestamp
FROM AuditLog
WHERE entityType = 'TaxDocument'
ORDER BY timestamp DESC
LIMIT 20;

-- Check file hashes (duplicate detection)
SELECT fileHash, COUNT(*) as count
FROM TaxDocument
GROUP BY fileHash
HAVING count > 1;

-- Check retry counts
SELECT id, originalFilename, retryCount, processingError
FROM TaxDocument
WHERE retryCount > 0;
```

---

## Bug Reporting Template

If you find a bug, record it using this template:

```markdown
### Bug: [Short description]

**Test Case:** Test X.Y - [Test name]
**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Screenshots/Logs:**


**Environment:**
- OS: Windows 11
- Browser: Chrome 123
- Node: v18.17.0
- Next.js: 14.2
```

---

## Sign-Off Criteria

Sprint 1 is **COMPLETE** when:

- [  ] All 20 test cases pass
- [  ] No Critical or High severity bugs
- [  ] Performance targets met for all operations
- [  ] Database audit logs capture all events
- [  ] TypeScript compiles without errors
- [  ] Dev server starts without errors
- [  ] Upload flow works end-to-end for 1 file
- [  ] Upload flow works end-to-end for 50 files
- [  ] Duplicate detection prevents exact duplicates
- [  ] Duplicate detection warns on similar filenames
- [  ] File validation rejects invalid types and sizes
- [  ] Processing queue tracks status correctly

---

## Next Steps After Testing

Once Sprint 1 testing is complete:

1. **Document all test results** (fill in "Actual" columns above)
2. **Fix any critical/high bugs** found during testing
3. **Re-test fixed bugs** to verify resolution
4. **Update SPRINT1_COMPLETE.md** with final test results
5. **Proceed to Sprint 2: OCR & Rendering**

---

**Testing Start Date:** _____
**Testing End Date:** _____
**Tested By:** _____
**Status:** ⏸️ Pending / ✅ Passed / ❌ Failed
