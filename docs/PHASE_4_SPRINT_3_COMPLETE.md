# Phase 4 Sprint 3: API Implementation - COMPLETE ✅

**Date:** 2026-03-30
**Status:** All Endpoints Implemented
**Sprint Duration:** 1 session

---

## Overview

Sprint 3 implemented 6 RESTful API endpoints for the Opportunity Detection Engine with complete request/response validation, error handling, and audit logging. All endpoints use Zod for type-safe validation and return consistent error responses.

---

## Deliverables

### 1. Zod Validation Schemas ✅

**File:** `src/lib/opportunity-engine/schemas.ts` (368 lines)

**Complete Type System:**
- Request schemas (4 schemas)
- Response schemas (7 schemas)
- Error response schema
- Supporting schemas (Evidence, CompositeScore, Opportunity, DetectionRun)

**Validation Coverage:**
- All request parameters validated
- Query string parsing with type coercion
- Required field enforcement
- Range validation (scores 0-100, positive integers, etc.)
- Enum validation (category, status, priority, confidence)

---

### 2. API Endpoints ✅

#### Endpoint 1: POST /api/opportunities/detect
**File:** `src/app/api/opportunities/detect/route.ts` (75 lines)

**Purpose:** Trigger opportunity detection for a calculation run

**Request:**
```typescript
{
  calculationRunId: string,
  options?: {
    minPriority?: number,        // 0-100
    maxOpportunities?: number,    // Max results
    categories?: string[],        // Filter by category
    sortBy?: Array<{
      field: 'finalScore' | 'estimatedValue' | 'priority' | 'detectedAt',
      direction: 'asc' | 'desc'
    }>
  }
}
```

**Response:**
```typescript
{
  detectionRun: OpportunityDetectionRun,
  opportunities: Opportunity[]
}
```

**Status Codes:**
- 200: Success
- 400: Validation error
- 500: Internal server error

---

#### Endpoint 2: GET /api/opportunities/:id
**File:** `src/app/api/opportunities/[id]/route.ts` (95 lines)

**Purpose:** Fetch a single opportunity by ID with complete details

**Response:**
```typescript
{
  opportunity: Opportunity
}
```

**Status Codes:**
- 200: Success
- 404: Opportunity not found
- 500: Internal server error

**Features:**
- Parses JSON fields (evidence, score, context, statusHistory)
- Includes detection run relationship
- Complete audit trail

---

#### Endpoint 3: PATCH /api/opportunities/:id/status
**File:** `src/app/api/opportunities/[id]/status/route.ts` (155 lines)

**Purpose:** Update opportunity status with audit trail

**Request:**
```typescript
{
  status: 'detected' | 'reviewed' | 'recommended' | 'in_progress' | 'implemented' | 'dismissed',
  notes?: string,
  updatedBy: string  // User ID
}
```

**Response:**
```typescript
{
  opportunity: Opportunity
}
```

**Features:**
- Status history tracking (append-only)
- Automatic timestamp updates (reviewedAt, implementedAt, dismissedAt)
- Audit event creation
- Dismissal reason capture

**Status Codes:**
- 200: Success
- 400: Validation error
- 404: Opportunity not found
- 500: Internal server error

---

#### Endpoint 4: POST /api/opportunities/:id/ai-summary
**File:** `src/app/api/opportunities/[id]/ai-summary/route.ts` (118 lines)

**Purpose:** Generate AI-powered summary (placeholder for Sprint 4)

**Request:**
```typescript
{
  regenerate?: boolean,           // Force regenerate (default: false)
  includeComparisons?: boolean,   // Include baseline comparison (default: true)
  includeCitations?: boolean      // Include IRS citations (default: true)
}
```

**Response:**
```typescript
{
  opportunityId: string,
  summary: string,
  citations?: Array<{
    source: string,
    section?: string,
    url?: string
  }>,
  generatedAt: Date
}
```

**Current Implementation:**
- Placeholder response for Sprint 3
- TODO comments for Claude API integration (Sprint 4)
- Structure ready for AI enhancement

**Status Codes:**
- 200: Success
- 400: Validation error
- 404: Opportunity not found
- 500: Internal server error

---

#### Endpoint 5: GET /api/opportunities/runs/:runId
**File:** `src/app/api/opportunities/runs/[runId]/route.ts` (108 lines)

**Purpose:** Fetch complete detection run with all opportunities

**Response:**
```typescript
{
  detectionRun: OpportunityDetectionRun,
  opportunities: Opportunity[]  // Sorted by rank
}
```

**Features:**
- Includes all opportunities from the run
- Sorted by rank (ascending)
- Complete run metadata (timing, counts, status)
- Error details if run failed

**Status Codes:**
- 200: Success
- 404: Detection run not found
- 500: Internal server error

---

#### Endpoint 6: GET /api/households/:householdId/opportunities
**File:** `src/app/api/households/[householdId]/opportunities/route.ts` (135 lines)

**Purpose:** List opportunities for a household with filtering and pagination

**Query Parameters:**
```typescript
{
  taxYear?: number,              // Filter by tax year
  category?: string,             // Filter by category
  status?: string,               // Filter by status
  priority?: string,             // Filter by priority
  minScore?: number,             // Filter by minimum score (0-100)
  limit?: number,                // Page size (max 100, default 25)
  offset?: number,               // Pagination offset (default 0)
  sortBy?: string,               // Sort field (default: finalScore)
  sortDirection?: 'asc' | 'desc' // Sort direction (default: desc)
}
```

**Response:**
```typescript
{
  opportunities: Opportunity[],
  total: number,
  hasMore: boolean
}
```

**Features:**
- Flexible filtering (tax year, category, status, priority, score)
- Pagination (limit/offset)
- Sorting by any field
- Total count for pagination UI
- HasMore flag for infinite scroll

**Status Codes:**
- 200: Success
- 400: Validation error (invalid query params)
- 500: Internal server error

---

## Implementation Patterns

### Consistent Error Handling

All endpoints follow the same error handling pattern:

```typescript
try {
  // Validate request
  const validated = Schema.parse(data);

  // Business logic
  const result = await someOperation(validated);

  // Return success
  return NextResponse.json(response, { status: 200 });

} catch (error) {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid request data',
        statusCode: 400,
        details: error.errors
      },
      { status: 400 }
    );
  }

  // Other errors
  console.error('[API] Error:', error);
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: error.message,
      statusCode: 500
    },
    { status: 500 }
  );
}
```

### JSON Field Parsing

All endpoints consistently parse JSON fields from Prisma:

```typescript
const evidence = JSON.parse(opportunity.evidence as string);
const score = JSON.parse(opportunity.score as string);
const context = JSON.parse(opportunity.context as string);
const statusHistory = opportunity.statusHistory
  ? JSON.parse(opportunity.statusHistory as string)
  : [];
```

### Type Safety

All endpoints use TypeScript types from schemas:

```typescript
import type { DetectOpportunitiesResponse } from '@/lib/opportunity-engine/schemas';

const response: DetectOpportunitiesResponse = {
  detectionRun: { ... },
  opportunities: [ ... ]
};
```

---

## Testing

### Manual Testing Checklist
- [ ] POST /api/opportunities/detect (valid calculationRunId)
- [ ] POST /api/opportunities/detect (invalid request → 400)
- [ ] POST /api/opportunities/detect (missing calculationRunId → 400)
- [ ] GET /api/opportunities/:id (existing ID)
- [ ] GET /api/opportunities/:id (non-existent ID → 404)
- [ ] PATCH /api/opportunities/:id/status (valid status change)
- [ ] PATCH /api/opportunities/:id/status (invalid status → 400)
- [ ] PATCH /api/opportunities/:id/status (non-existent ID → 404)
- [ ] POST /api/opportunities/:id/ai-summary (placeholder response)
- [ ] GET /api/opportunities/runs/:runId (existing run)
- [ ] GET /api/opportunities/runs/:runId (non-existent run → 404)
- [ ] GET /api/households/:householdId/opportunities (no filters)
- [ ] GET /api/households/:householdId/opportunities (with filters)
- [ ] GET /api/households/:householdId/opportunities (pagination)
- [ ] GET /api/households/:householdId/opportunities (invalid query → 400)

---

## API Documentation

### Authentication
- All endpoints require authentication (Next.js middleware)
- User context available via session

### Rate Limiting
- TODO: Implement in Sprint 5
- Suggested: 100 requests/minute per user
- Suggested: 10 requests/minute for /detect endpoint

### Content Type
- Request: `application/json`
- Response: `application/json`

### Error Response Format
```typescript
{
  error: string,        // Error type
  message: string,      // Human-readable message
  statusCode: number,   // HTTP status code
  details?: any         // Optional details (e.g., Zod errors)
}
```

---

## Next Steps

### Sprint 4: AI Enhancement
1. Integrate Claude API for summary generation
2. Load IRS publication knowledge base
3. Implement citation validation
4. Create AI prompt templates
5. Add hallucination detection
6. Test summary quality (manual review)

### Sprint 5: Scoring & Ranking Refinement
1. Add rate limiting to all endpoints
2. Implement caching for read endpoints
3. Add more detection rules (expand from 3 to 10-15)
4. Tune scoring formulas
5. Add multi-year scenario detection

### Sprint 6: UI Components
1. Create OpportunityCard component
2. Create OpportunityList with filtering
3. Create OpportunityDetailDrawer
4. Create detection run dashboard
5. Integrate with tax planning dashboard

### Sprint 7: Integration & Polish
1. Integrate with calculation run workflow
2. Add real-time detection triggers
3. Performance optimization
4. Final QA and bug fixes

---

## Files Created

1. `src/lib/opportunity-engine/schemas.ts` (368 lines)
2. `src/app/api/opportunities/detect/route.ts` (75 lines)
3. `src/app/api/opportunities/[id]/route.ts` (95 lines)
4. `src/app/api/opportunities/[id]/status/route.ts` (155 lines)
5. `src/app/api/opportunities/[id]/ai-summary/route.ts` (118 lines)
6. `src/app/api/opportunities/runs/[runId]/route.ts` (108 lines)
7. `src/app/api/households/[householdId]/opportunities/route.ts` (135 lines)
8. `docs/PHASE_4_SPRINT_3_COMPLETE.md` (this file)

**Total:** 1,054 lines of API code

---

## Sprint 3: COMPLETE ✅

**Status:** All 6 endpoints implemented with validation and error handling
**Blockers:** None
**Ready for:** Sprint 4 (AI Enhancement)

**Key Achievement:** Complete RESTful API with type-safe validation, consistent error handling, and audit logging ready for frontend integration.
