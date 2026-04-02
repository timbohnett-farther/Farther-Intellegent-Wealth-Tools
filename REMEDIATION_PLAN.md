# Comprehensive Remediation Plan
## Farther-Intelligent-Wealth-Tools - Code Audit Fixes

**Generated:** 2026-04-01
**Total Issues:** 52 (7 P0, 17 P1, 13 P2, 15 P3)
**Estimated Total Effort:** 280-320 hours (8-9 weeks)
**Target Completion:** 2026-05-30

---

## 📋 Table of Contents

1. [Sprint Overview](#sprint-overview)
2. [Sprint 1: Critical Blockers](#sprint-1-critical-blockers-week-1)
3. [Sprint 2: Quick Wins](#sprint-2-quick-wins-week-1-2)
4. [Sprint 3: Production Hardening](#sprint-3-production-hardening-week-2-3)
5. [Sprint 4: API Reliability](#sprint-4-api-reliability-week-3-4)
6. [Sprint 5: Performance & Caching](#sprint-5-performance--caching-week-4-5)
7. [Sprint 6: Testing & Quality](#sprint-6-testing--quality-week-5-7)
8. [Sprint 7: Scalability](#sprint-7-scalability-week-7-8)
9. [Sprint 8: Polish & Documentation](#sprint-8-polish--documentation-week-8-9)
10. [Validation & Deployment](#validation--deployment)

---

## 🎯 Sprint Overview

| Sprint | Focus | P0 | P1 | P2 | P3 | Hours | Status |
|--------|-------|----|----|----|----|-------|--------|
| 1 | Critical Blockers | 7 | 0 | 0 | 0 | 20-24 | 🔴 Not Started |
| 2 | Quick Wins | 0 | 5 | 2 | 1 | 10-12 | 🔴 Not Started |
| 3 | Production Hardening | 0 | 4 | 3 | 2 | 24-28 | 🔴 Not Started |
| 4 | API Reliability | 0 | 3 | 4 | 3 | 32-36 | 🔴 Not Started |
| 5 | Performance & Caching | 0 | 2 | 1 | 2 | 20-24 | 🔴 Not Started |
| 6 | Testing & Quality | 0 | 3 | 0 | 2 | 80-100 | 🔴 Not Started |
| 7 | Scalability | 0 | 0 | 3 | 3 | 48-56 | 🔴 Not Started |
| 8 | Polish & Documentation | 0 | 0 | 0 | 2 | 8-12 | 🔴 Not Started |

**Total:** 242-292 hours (30-37 working days for 1 developer, 15-18 days for 2 developers)

---

## 🚨 Sprint 1: Critical Blockers (Week 1)

**Goal:** Unblock production deployments
**Duration:** 5 days (20-24 hours)
**Team Size:** 2 developers recommended
**Deliverable:** Application can deploy successfully to Railway staging

### Day 1: TypeScript & Build Fixes

#### Issue: RAILWAY-001 - TypeScript Build Failure
**Priority:** P0 | **Effort:** 4-6h | **Owner:** Backend Lead

**Steps:**
1. Regenerate Prisma client
   ```bash
   cd C:\Users\tim\Projects\Farther-Intellegent-Wealth-Tools
   npx prisma generate
   ```

2. Fix Opportunity model property mismatches
   ```typescript
   // src/app/api/households/[householdId]/opportunities/route.ts:81
   // Change:
   const evidence = JSON.parse(opp.evidence as string);
   const score = JSON.parse(opp.score as string);
   const context = JSON.parse(opp.context as string);

   // To:
   const evidence = JSON.parse(opp.evidenceJson as string);
   const score = JSON.parse(opp.scoreJson as string);
   const context = JSON.parse(opp.contextJson as string);
   ```

3. Find and fix all similar property mismatches
   ```bash
   # Search for other instances
   grep -r "opp\.evidence" src/app/api/
   grep -r "opportunity\.score" src/app/api/
   grep -r "opportunity\.context" src/app/api/
   ```

4. Verify build passes
   ```bash
   npm run build
   npx tsc --noEmit
   ```

**Acceptance Criteria:**
- ✅ `npm run build` exits with code 0
- ✅ `npx tsc --noEmit` shows 0 errors
- ✅ No TypeScript errors in CI

**Files to Modify:**
- `src/app/api/households/[householdId]/opportunities/route.ts`
- `src/app/api/opportunities/[id]/route.ts`
- `src/app/api/opportunities/detect/route.ts`

---

#### Issue: RELEASE-002 - No Test Coverage Threshold
**Priority:** P0 | **Effort:** 1h | **Owner:** Backend Lead

**Steps:**
1. Update vitest configuration
   ```typescript
   // vitest.config.ts
   export default defineConfig({
     test: {
       // ... existing config
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html', 'lcov'],
         thresholds: {
           lines: 70,
           branches: 70,
           functions: 70,
           statements: 70,
         },
         exclude: [
           'node_modules/**',
           'src/**/__tests__/**',
           'src/**/*.test.ts',
           '**/*.d.ts',
           '.next/**',
           'coverage/**',
         ],
       },
     },
   });
   ```

2. Update CI to enforce coverage
   ```yaml
   # .github/workflows/ci-sentinel.yml
   - name: Run tests with coverage
     run: npx vitest run --coverage

   # Remove this line:
   # continue-on-error: true
   ```

3. Generate baseline coverage report
   ```bash
   npm run test -- --coverage
   ```

**Acceptance Criteria:**
- ✅ Vitest shows coverage report with thresholds
- ✅ CI fails if coverage drops below 70%
- ✅ Coverage badge added to README

**Files to Modify:**
- `vitest.config.ts`
- `.github/workflows/ci-sentinel.yml`

---

### Day 2: Railway Configuration & Health Checks

#### Issue: RAILWAY-002 - Missing Health Endpoint
**Priority:** P0 | **Effort:** 30min | **Owner:** Backend Lead

**Steps:**
1. Create health endpoint
   ```typescript
   // src/app/api/health/route.ts
   import { NextResponse } from 'next/server';
   import { prisma } from '@/lib/prism/db';

   export const runtime = 'nodejs';
   export const dynamic = 'force-dynamic';

   export async function GET() {
     try {
       // Quick DB connection check
       await prisma.$queryRaw`SELECT 1`;

       // Check environment variables
       const requiredVars = ['DATABASE_URL', 'NODE_ENV'];
       const missingVars = requiredVars.filter(v => !process.env[v]);

       if (missingVars.length > 0) {
         return NextResponse.json(
           {
             status: 'unhealthy',
             timestamp: new Date().toISOString(),
             database: 'connected',
             environment: 'incomplete',
             missing: missingVars,
           },
           { status: 503 }
         );
       }

       return NextResponse.json({
         status: 'healthy',
         timestamp: new Date().toISOString(),
         database: 'connected',
         environment: 'ready',
         version: process.env.npm_package_version || 'unknown',
       });
     } catch (error) {
       console.error('[Health Check] Failed:', error);
       return NextResponse.json(
         {
           status: 'unhealthy',
           timestamp: new Date().toISOString(),
           database: 'disconnected',
           error: error instanceof Error ? error.message : 'Unknown error',
         },
         { status: 503 }
       );
     }
   }
   ```

2. Update Railway configuration
   ```toml
   # railway.toml
   [build]
   builder = "DOCKERFILE"
   dockerfilePath = "Dockerfile"

   [deploy]
   healthcheckPath = "/api/health"
   healthcheckTimeout = 30  # Reduced from 300
   restartPolicyType = "ON_FAILURE"
   restartPolicyMaxRetries = 3
   ```

3. Test locally
   ```bash
   npm run dev
   curl http://localhost:3000/api/health
   # Should return: {"status":"healthy",...}
   ```

**Acceptance Criteria:**
- ✅ `/api/health` returns 200 when healthy
- ✅ `/api/health` returns 503 when DB disconnected
- ✅ Railway healthcheck uses new endpoint

**Files to Create:**
- `src/app/api/health/route.ts`

**Files to Modify:**
- `railway.toml`

---

#### Issue: RAILWAY-003 - SQLite Persistence Not Configured
**Priority:** P0 | **Effort:** 1-2h | **Owner:** DevOps/Backend Lead

**Steps:**
1. Configure Railway persistent volume (via Railway dashboard)
   - Navigate to project settings
   - Add volume: Mount path `/app/data`
   - Size: 1GB minimum (10GB recommended)
   - Save and redeploy

2. Update documentation
   ```markdown
   # CLAUDE.md - Add to deployment section

   ## Railway Volume Configuration (REQUIRED)

   SQLite database requires persistent storage to survive container restarts.

   **Setup:**
   1. Railway Dashboard → Project Settings → Volumes
   2. Add New Volume
   3. Mount Path: `/app/data`
   4. Minimum Size: 1GB (10GB recommended for production)
   5. Save and redeploy

   **Verification:**
   ```bash
   railway run ls -la /app/data
   # Should show: prod.db file
   ```

   **Backup Strategy:**
   - Railway automatic snapshots: Daily
   - Manual backup: Use backup API endpoint (see below)
   - Retention: 30 days

   **Without this volume, ALL DATA IS LOST on container restart.**
   ```

3. Verify volume mounting in Dockerfile
   ```dockerfile
   # Dockerfile - Verify this exists (already configured)
   # Line 64-65:
   ENV DATABASE_URL="file:/app/data/prod.db"
   ```

4. Test persistence
   ```bash
   # Deploy to Railway
   railway up

   # Create test data
   curl -X POST https://<railway-url>/api/prism/households \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Household"}'

   # Note the ID
   export TEST_ID="cuid_from_response"

   # Force restart
   railway restart

   # Verify data persists
   curl https://<railway-url>/api/prism/households/$TEST_ID
   # Should return the household (not 404)
   ```

**Acceptance Criteria:**
- ✅ Railway volume configured in dashboard
- ✅ Database file persists across restarts
- ✅ Documentation updated with setup steps

**Files to Modify:**
- `CLAUDE.md`
- Railway project settings (UI only)

---

### Day 3: Database Migrations & Startup Safety

#### Issue: RELEASE-003 - Production Using `prisma db push`
**Priority:** P0 | **Effort:** 4h | **Owner:** Backend Lead

**Steps:**
1. Update startup script to use migrations
   ```bash
   # start.sh - Replace lines 13-19

   # OLD (REMOVE):
   # node node_modules/prisma/build/index.js db push \
   #   --schema prisma/schema.prisma \
   #   --url "$DATABASE_URL" \
   #   --skip-generate 2>&1 || {
   #     echo "!!! prisma db push failed (exit $?), attempting to continue..."
   #   }

   # NEW (ADD):
   echo "--- Running database migrations ---"
   if ! node node_modules/prisma/build/index.js migrate deploy \
     --schema prisma/schema.prisma 2>&1; then
     echo "!!! FATAL: Database migration failed"
     echo "!!! Schema is not in sync with migrations"
     echo "!!! Refusing to start application"
     exit 1
   fi
   echo "--- Migrations complete ---"
   echo ""
   ```

2. Verify all migrations are committed
   ```bash
   git status prisma/migrations/
   # Should show no uncommitted migrations

   # If migrations are uncommitted:
   git add prisma/migrations/
   git commit -m "feat: add production database migrations"
   ```

3. Add migration validation to CI
   ```yaml
   # .github/workflows/ci-sentinel.yml
   # Add after "Install dependencies" step

   - name: Validate Prisma migrations
     run: |
       npx prisma migrate status
       npx prisma generate
   ```

4. Document migration workflow
   ```markdown
   # docs/MIGRATIONS.md (NEW FILE)

   # Database Migration Guide

   ## Development

   1. Modify Prisma schema: `prisma/schema.prisma`
   2. Create migration:
      ```bash
      npx prisma migrate dev --name descriptive_migration_name
      ```
   3. Test migration locally
   4. Commit migration files to git

   ## Production Deployment

   Migrations run automatically via `start.sh`:
   - `prisma migrate deploy` runs on container startup
   - Startup fails if migrations cannot be applied
   - No rollback capability (design migrations carefully)

   ## Rollback Procedure

   SQLite doesn't support migration rollback natively.

   **If migration breaks production:**
   1. Restore database from Railway volume snapshot
   2. Revert git commit with bad migration
   3. Redeploy with reverted code
   4. Manually clean up any partial migration state

   ## Best Practices

   - ✅ Test migrations on staging first
   - ✅ Always include `up` and `down` migration notes in comments
   - ✅ Keep migrations small and focused
   - ✅ Take manual backup before risky migrations
   - ❌ Never edit existing migrations (create new ones)
   - ❌ Never delete migration files
   ```

**Acceptance Criteria:**
- ✅ `start.sh` uses `migrate deploy` not `db push`
- ✅ Startup fails fast if migrations fail
- ✅ CI validates migrations before deploy
- ✅ Migration documentation created

**Files to Modify:**
- `start.sh`
- `.github/workflows/ci-sentinel.yml`

**Files to Create:**
- `docs/MIGRATIONS.md`

---

#### Issue: RAILWAY-005 - Startup Continues on Migration Failure
**Priority:** P0 | **Effort:** 30min | **Owner:** Backend Lead

**Steps:**
1. Add database connection verification
   ```bash
   # start.sh - Add after migration section

   echo "--- Verifying database connection ---"
   if ! node -e "
     const { PrismaClient } = require('@prisma/client');
     const prisma = new PrismaClient();
     prisma.\$connect()
       .then(() => {
         console.log('✓ Database connected');
         return prisma.\$disconnect();
       })
       .then(() => process.exit(0))
       .catch((e) => {
         console.error('✗ Database connection failed:', e.message);
         process.exit(1);
       });
   "; then
     echo "!!! FATAL: Database connection test failed"
     echo "!!! Check DATABASE_URL and database availability"
     exit 1
   fi
   echo "--- Database verified ---"
   echo ""
   ```

2. Add startup logging improvements
   ```bash
   # start.sh - Update header
   #!/bin/sh
   set -e  # Exit on any error

   echo "========================================="
   echo " Farther Intelligent Wealth Tools"
   echo " Starting Production Server"
   echo "========================================="
   echo "NODE_ENV=$NODE_ENV"
   echo "PORT=$PORT"
   echo "DATABASE_URL=${DATABASE_URL:0:30}..." # Only show first 30 chars
   echo "AI_ENABLED=$([ -n "$AI_API_KEY" ] && echo "yes" || echo "no")"
   echo "========================================="
   echo ""
   ```

3. Test failure scenarios locally
   ```bash
   # Test with invalid DATABASE_URL
   DATABASE_URL="file:./does-not-exist.db" ./start.sh
   # Should fail immediately with clear error

   # Test with valid DATABASE_URL
   DATABASE_URL="file:./dev.db" ./start.sh
   # Should start successfully
   ```

**Acceptance Criteria:**
- ✅ Startup script exits immediately on any error
- ✅ Clear error messages for each failure mode
- ✅ Database connection verified before starting Next.js

**Files to Modify:**
- `start.sh`

---

### Day 4-5: API Security & Environment Validation

#### Issue: API-001 - HubSpot Webhook No HMAC Verification
**Priority:** P0 | **Effort:** 2h | **Owner:** Backend Lead

**Steps:**
1. Add HMAC signature verification utility
   ```typescript
   // src/lib/integrations/hubspot/webhook-verify.ts (NEW FILE)
   import crypto from 'crypto';

   export interface HubSpotWebhookVerification {
     isValid: boolean;
     error?: string;
   }

   /**
    * Verify HubSpot webhook signature using HMAC-SHA256
    * @see https://developers.hubspot.com/docs/api/webhooks/validating-requests
    */
   export function verifyHubSpotSignature(
     requestBody: string,
     signature: string,
     clientSecret: string
   ): HubSpotWebhookVerification {
     if (!signature) {
       return { isValid: false, error: 'Missing X-HubSpot-Signature header' };
     }

     if (!clientSecret) {
       return { isValid: false, error: 'HUBSPOT_CLIENT_SECRET not configured' };
     }

     try {
       // HubSpot uses HMAC-SHA256 with client secret
       const expectedSignature = crypto
         .createHmac('sha256', clientSecret)
         .update(requestBody)
         .digest('hex');

       // Timing-safe comparison to prevent timing attacks
       const isValid = crypto.timingSafeEqual(
         Buffer.from(signature),
         Buffer.from(expectedSignature)
       );

       return { isValid };
     } catch (error) {
       return {
         isValid: false,
         error: error instanceof Error ? error.message : 'Signature verification failed',
       };
     }
   }
   ```

2. Update webhook endpoint to verify signatures
   ```typescript
   // src/app/api/integrations/hubspot/webhook/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { verifyHubSpotSignature } from '@/lib/integrations/hubspot/webhook-verify';

   export async function POST(request: NextRequest) {
     try {
       // Get raw body for signature verification
       const body = await request.text();
       const signature = request.headers.get('X-HubSpot-Signature') || '';
       const clientSecret = process.env.HUBSPOT_CLIENT_SECRET || '';

       // Verify signature
       const verification = verifyHubSpotSignature(body, signature, clientSecret);

       if (!verification.isValid) {
         console.error('[HubSpot Webhook] Invalid signature:', verification.error);
         return NextResponse.json(
           { error: 'Invalid signature' },
           { status: 401 }
         );
       }

       // Parse payload after verification
       const payload = JSON.parse(body);

       // ... existing webhook processing logic

       return NextResponse.json({ success: true });
     } catch (error) {
       console.error('[HubSpot Webhook] Error:', error);
       return NextResponse.json(
         { error: 'Webhook processing failed' },
         { status: 500 }
       );
     }
   }
   ```

3. Add environment variable for HubSpot client secret
   ```bash
   # .env.example - Add:
   HUBSPOT_CLIENT_SECRET=your_client_secret_here
   ```

4. Test webhook verification
   ```typescript
   // src/lib/integrations/hubspot/__tests__/webhook-verify.test.ts (NEW FILE)
   import { describe, it, expect } from 'vitest';
   import { verifyHubSpotSignature } from '../webhook-verify';
   import crypto from 'crypto';

   describe('HubSpot Webhook Verification', () => {
     const clientSecret = 'test_secret';
     const payload = '{"events":[{"id":"123"}]}';

     it('should verify valid signature', () => {
       const signature = crypto
         .createHmac('sha256', clientSecret)
         .update(payload)
         .digest('hex');

       const result = verifyHubSpotSignature(payload, signature, clientSecret);
       expect(result.isValid).toBe(true);
     });

     it('should reject invalid signature', () => {
       const result = verifyHubSpotSignature(payload, 'invalid', clientSecret);
       expect(result.isValid).toBe(false);
     });

     it('should reject missing signature', () => {
       const result = verifyHubSpotSignature(payload, '', clientSecret);
       expect(result.isValid).toBe(false);
       expect(result.error).toContain('Missing');
     });
   });
   ```

**Acceptance Criteria:**
- ✅ Webhook endpoint verifies HMAC signature
- ✅ Returns 401 for invalid signatures
- ✅ Unit tests verify all scenarios
- ✅ Environment variable documented

**Files to Create:**
- `src/lib/integrations/hubspot/webhook-verify.ts`
- `src/lib/integrations/hubspot/__tests__/webhook-verify.test.ts`

**Files to Modify:**
- `src/app/api/integrations/hubspot/webhook/route.ts`
- `.env.example`

---

#### Issue: API-002 - No Timeout on AI API Calls
**Priority:** P0 | **Effort:** 1h | **Owner:** Backend Lead

**Steps:**
1. Create timeout utility wrapper
   ```typescript
   // src/lib/utils/fetch-with-timeout.ts (NEW FILE)

   export interface FetchWithTimeoutOptions extends RequestInit {
     timeout?: number; // milliseconds
   }

   /**
    * Fetch with timeout support using AbortController
    * @param url - URL to fetch
    * @param options - Fetch options including timeout
    * @returns Promise<Response>
    */
   export async function fetchWithTimeout(
     url: string,
     options: FetchWithTimeoutOptions = {}
   ): Promise<Response> {
     const { timeout = 30000, ...fetchOptions } = options;

     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), timeout);

     try {
       const response = await fetch(url, {
         ...fetchOptions,
         signal: controller.signal,
       });
       return response;
     } catch (error) {
       if (error instanceof Error && error.name === 'AbortError') {
         throw new Error(`Request timeout after ${timeout}ms`);
       }
       throw error;
     } finally {
       clearTimeout(timeoutId);
     }
   }
   ```

2. Update AI service to use timeout wrapper
   ```typescript
   // src/lib/risk-profile/ai-service.ts
   import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';

   async function callAnthropicAPI(/* params */) {
     // Replace:
     // const response = await fetch('https://api.anthropic.com/v1/messages', { ... });

     // With:
     const response = await fetchWithTimeout(
       'https://api.anthropic.com/v1/messages',
       {
         method: 'POST',
         headers: { /* ... */ },
         body: JSON.stringify(/* ... */),
         timeout: 30000, // 30 second timeout
       }
     );

     // ... rest of function
   }
   ```

3. Update all AI service files
   ```bash
   # Files to update:
   # - src/lib/risk-profile/ai-service.ts
   # - src/lib/tax-planning/copilot/ai-client.ts
   # - src/lib/opportunity-engine/ai-service.ts
   ```

4. Add tests
   ```typescript
   // src/lib/utils/__tests__/fetch-with-timeout.test.ts
   import { describe, it, expect, vi } from 'vitest';
   import { fetchWithTimeout } from '../fetch-with-timeout';

   describe('fetchWithTimeout', () => {
     it('should timeout after specified duration', async () => {
       // Mock slow response
       global.fetch = vi.fn(() =>
         new Promise(resolve => setTimeout(resolve, 100000))
       );

       await expect(
         fetchWithTimeout('https://example.com', { timeout: 100 })
       ).rejects.toThrow('Request timeout');
     });

     it('should succeed for fast responses', async () => {
       global.fetch = vi.fn(() =>
         Promise.resolve(new Response('OK'))
       );

       const response = await fetchWithTimeout('https://example.com');
       expect(response.ok).toBe(true);
     });
   });
   ```

**Acceptance Criteria:**
- ✅ All AI API calls have 30s timeout
- ✅ Timeout errors are caught and handled
- ✅ Unit tests verify timeout behavior

**Files to Create:**
- `src/lib/utils/fetch-with-timeout.ts`
- `src/lib/utils/__tests__/fetch-with-timeout.test.ts`

**Files to Modify:**
- `src/lib/risk-profile/ai-service.ts`
- `src/lib/tax-planning/copilot/ai-client.ts`
- `src/lib/opportunity-engine/ai-service.ts`

---

#### Issue: RAILWAY-006 - Missing Environment Variable Validation
**Priority:** P2 (doing now for completeness) | **Effort:** 1h | **Owner:** Backend Lead

**Steps:**
1. Create environment validation module
   ```typescript
   // src/lib/env-validation.ts (NEW FILE)

   const REQUIRED_ENV_VARS = {
     DATABASE_URL: 'SQLite database URL (file:./dev.db)',
     NODE_ENV: 'Node environment (production|development)',
   } as const;

   const OPTIONAL_ENV_VARS = {
     AI_API_KEY: 'Anthropic API key for AI features',
     ANTHROPIC_API_KEY: 'Alternative Anthropic API key',
     AI_ZOLO_KEY: 'Zolo AI integration',
     GAMMA_API_KEY: 'Gamma AI integration',
     HUBSPOT_CLIENT_SECRET: 'HubSpot webhook signature verification',
     PORT: 'Server port (default: 3000)',
   } as const;

   export function validateEnv(): void {
     const missing: string[] = [];
     const warnings: string[] = [];

     // Check required variables
     for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
       if (!process.env[key]) {
         missing.push(`${key}: ${description}`);
       }
     }

     if (missing.length > 0) {
       console.error('❌ Missing required environment variables:');
       missing.forEach(m => console.error(`   - ${m}`));
       throw new Error(
         `Missing ${missing.length} required environment variable(s). ` +
         `Check .env.example for details.`
       );
     }

     // Check optional but recommended
     if (!process.env.AI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
       warnings.push('No AI API key configured - AI features will be disabled');
     }

     if (!process.env.HUBSPOT_CLIENT_SECRET) {
       warnings.push('No HubSpot client secret - webhook verification disabled');
     }

     // Log success
     console.log('✅ Environment validation passed');
     console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
     console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
     console.log(`   - AI features: ${process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled'}`);

     if (warnings.length > 0) {
       console.warn('⚠️  Optional configuration warnings:');
       warnings.forEach(w => console.warn(`   - ${w}`));
     }
   }
   ```

2. Call validation on startup
   ```bash
   # start.sh - Add after environment logging

   echo "--- Validating environment ---"
   if ! node -e "require('./src/lib/env-validation').validateEnv()"; then
     echo "!!! FATAL: Environment validation failed"
     exit 1
   fi
   echo "--- Environment validated ---"
   echo ""
   ```

3. Update .env.example with all variables
   ```bash
   # .env.example - Ensure all variables documented

   # === REQUIRED ===
   DATABASE_URL="file:./dev.db"
   NODE_ENV=development

   # === OPTIONAL - AI Features ===
   AI_API_KEY=
   ANTHROPIC_API_KEY=
   AI_ZOLO_KEY=
   GAMMA_API_KEY=
   AI_MODEL=claude-sonnet-4-20250514
   AI_BASE_URL=https://api.anthropic.com

   # === OPTIONAL - Integrations ===
   HUBSPOT_CLIENT_SECRET=

   # === OPTIONAL - Server ===
   PORT=3000
   ```

**Acceptance Criteria:**
- ✅ Startup fails if required vars missing
- ✅ Clear error messages show which vars are missing
- ✅ Warnings for recommended vars

**Files to Create:**
- `src/lib/env-validation.ts`

**Files to Modify:**
- `start.sh`
- `.env.example`

---

### Sprint 1 Validation Checklist

Before marking Sprint 1 complete, verify:

- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm run test` shows 0 failed tests
- [ ] Test coverage report shows ≥70% for new code
- [ ] `/api/health` returns 200 locally
- [ ] Railway volume configured (check dashboard)
- [ ] `start.sh` fails fast on migration errors
- [ ] HubSpot webhook signature verification works
- [ ] AI API calls timeout after 30s
- [ ] Environment validation catches missing vars
- [ ] CI pipeline passes all checks

**Deploy to Staging:**
```bash
git checkout -b sprint-1-critical-fixes
git add .
git commit -m "fix: Sprint 1 - Critical deployment blockers resolved

- Fix TypeScript build errors (RAILWAY-001)
- Add health endpoint (RAILWAY-002)
- Configure persistent volume (RAILWAY-003)
- Switch to prisma migrate deploy (RELEASE-003)
- Add startup error handling (RAILWAY-005)
- Add HubSpot webhook signature verification (API-001)
- Add timeout to AI API calls (API-002)
- Add test coverage thresholds (RELEASE-002)
- Add environment variable validation (RAILWAY-006)

Closes #1 #2 #3 #4 #5 #6 #7"

git push origin sprint-1-critical-fixes

# Create PR and deploy to staging
# Wait for CI to pass
# Manually test on staging
# Merge to main
```

**Sprint 1 Success Criteria:**
- ✅ Application builds successfully
- ✅ Application deploys to Railway without errors
- ✅ Health check passes
- ✅ Database persists across restarts
- ✅ All P0 issues resolved

---

## ⚡ Sprint 2: Quick Wins (Week 1-2)

**Goal:** High-value improvements with minimal effort
**Duration:** 3 days (10-12 hours)
**Team Size:** 1-2 developers
**Deliverable:** Improved performance and UX with minimal risk

### Day 1: Caching Improvements

#### Issue: DATA-001 - Tax Tables Not Cached
**Priority:** P1 | **Effort:** 30min | **Owner:** Backend

**Steps:**
1. Add singleton cache for tax tables
   ```typescript
   // src/lib/calc-engine/utils/tax-table-loader.ts

   // Add at top of file:
   let cachedTables: AllTaxTables | null = null;
   let cacheTimestamp: number = 0;
   const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

   export function getDefaultTaxTables(): AllTaxTables {
     const now = Date.now();

     // Return cached if still valid
     if (cachedTables && (now - cacheTimestamp) < CACHE_TTL) {
       return cachedTables;
     }

     // Clone and cache
     cachedTables = structuredClone(DEFAULT_TAX_TABLES_2026);
     cacheTimestamp = now;

     return cachedTables;
   }

   // Add cache invalidation for tests
   export function clearTaxTableCache(): void {
     cachedTables = null;
     cacheTimestamp = 0;
   }
   ```

2. Update tests to clear cache
   ```typescript
   // In tax table tests, add beforeEach:
   import { clearTaxTableCache } from '../tax-table-loader';

   beforeEach(() => {
     clearTaxTableCache();
   });
   ```

**Expected Impact:** 500ms saved per calculation, reduced GC pressure

---

#### Issue: DATA-004 - Monte Carlo Results Not Cached
**Priority:** P1 | **Effort:** 1h | **Owner:** Backend

**Steps:**
1. Add cache key builder for plan results
   ```typescript
   // src/lib/cache/cache-keys.ts (NEW FILE)
   import crypto from 'crypto';

   export function buildPlanCacheKey(
     planId: string,
     assumptions: Record<string, any>
   ): string {
     // Hash assumptions to detect changes
     const assumptionsHash = crypto
       .createHash('sha256')
       .update(JSON.stringify(assumptions))
       .digest('hex')
       .slice(0, 8);

     return `plan:${planId}:monte-carlo:${assumptionsHash}`;
   }
   ```

2. Add caching to calculation route
   ```typescript
   // src/app/api/prism/plans/[planId]/calculate/route.ts
   import { CacheManager, CACHE_TTL } from '@/lib/cache/cache-manager';
   import { buildPlanCacheKey } from '@/lib/cache/cache-keys';

   const cache = new CacheManager();

   export async function POST(req: NextRequest, { params }: { params: { planId: string } }) {
     const { planId } = params;
     const body = await req.json();

     // Build cache key from plan + assumptions
     const cacheKey = buildPlanCacheKey(planId, body.assumptions || {});

     // Check cache first
     const cached = cache.get(cacheKey);
     if (cached) {
       console.log(`[Cache Hit] Plan calculation: ${planId}`);
       return NextResponse.json(cached);
     }

     // ... existing calculation logic ...

     // Cache result before returning
     cache.set(cacheKey, result, CACHE_TTL.plan_results);
     console.log(`[Cache Set] Plan calculation: ${planId}`);

     return NextResponse.json(result);
   }
   ```

**Expected Impact:** 3x faster for repeat calculations, reduced CPU usage

---

#### Issue: DATA-005 - AI Summaries Not Deduplicated
**Priority:** P2 | **Effort:** 1h | **Owner:** Backend

**Steps:**
1. Add content-hash based caching
   ```typescript
   // src/lib/opportunity-engine/ai-service.ts
   import crypto from 'crypto';
   import { CacheManager, CACHE_TTL } from '@/lib/cache/cache-manager';

   const aiCache = new CacheManager();

   function hashPrompt(system: string, user: string): string {
     return crypto
       .createHash('sha256')
       .update(system + user)
       .digest('hex')
       .slice(0, 16);
   }

   export async function generateAiSummary(request: AiSummaryRequest) {
     const promptHash = hashPrompt(SYSTEM_PROMPT, request.userPrompt);
     const cacheKey = `ai:summary:${promptHash}`;

     // Check cache
     const cached = aiCache.get<AiSummaryResponse>(cacheKey);
     if (cached) {
       console.log(`[AI Cache Hit] ${promptHash}`);
       return cached;
     }

     // Make API call
     const response = await callAnthropicAPI(/* ... */);

     // Cache for 24 hours
     aiCache.set(cacheKey, response, CACHE_TTL.insights);
     console.log(`[AI Cache Set] ${promptHash}`);

     return response;
   }
   ```

**Expected Impact:** 75% fewer AI API calls, $100+/month savings

---

### Day 2: Navigation & Documentation Fixes

#### Issue: ROUTE-001 - Client Portal Navigation to 404s
**Priority:** P1 | **Effort:** 1h | **Owner:** Frontend

**Steps:**
1. Create placeholder pages
   ```typescript
   // src/app/client/messages/page.tsx (NEW FILE)
   export default function MessagesPage() {
     return (
       <div className="max-w-content mx-auto px-6 py-6">
         <h1 className="text-2xl font-bold text-text mb-4">Messages</h1>
         <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
           <p className="text-text-muted">
             Secure messaging with your advisor is coming soon.
           </p>
         </div>
       </div>
     );
   }

   // src/app/client/profile/page.tsx (NEW FILE)
   export default function ProfilePage() {
     return (
       <div className="max-w-content mx-auto px-6 py-6">
         <h1 className="text-2xl font-bold text-text mb-4">Profile Settings</h1>
         <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
           <p className="text-text-muted">
             Profile management is coming soon.
           </p>
         </div>
       </div>
     );
   }

   // src/app/client/request-meeting/page.tsx (NEW FILE)
   export default function RequestMeetingPage() {
     return (
       <div className="max-w-content mx-auto px-6 py-6">
         <h1 className="text-2xl font-bold text-text mb-4">Request a Meeting</h1>
         <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
           <p className="text-text-muted">
             Meeting scheduler is coming soon.
           </p>
         </div>
       </div>
     );
   }
   ```

**Expected Impact:** No more 404 errors in client portal navigation

---

#### Issue: ROUTE-002 - Prism Help Page Missing
**Priority:** P2 | **Effort:** 30min | **Owner:** Frontend

**Steps:**
1. Create help page
   ```typescript
   // src/app/prism/help/page.tsx (NEW FILE)
   import { HelpCircle, BookOpen, Video, Mail } from 'lucide-react';

   export default function HelpPage() {
     return (
       <div className="max-w-content mx-auto px-6 py-6">
         <h1 className="text-2xl font-bold text-text mb-6">Help & Support</h1>

         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
           <div className="rounded-lg border border-border bg-surface p-6">
             <div className="flex items-center gap-3 mb-3">
               <BookOpen className="size-5 text-brand-500" />
               <h2 className="text-lg font-semibold">Documentation</h2>
             </div>
             <p className="text-text-muted text-sm">
               Coming soon: Comprehensive guides for PRISM features.
             </p>
           </div>

           <div className="rounded-lg border border-border bg-surface p-6">
             <div className="flex items-center gap-3 mb-3">
               <Video className="size-5 text-brand-500" />
               <h2 className="text-lg font-semibold">Video Tutorials</h2>
             </div>
             <p className="text-text-muted text-sm">
               Coming soon: Step-by-step video guides.
             </p>
           </div>

           <div className="rounded-lg border border-border bg-surface p-6">
             <div className="flex items-center gap-3 mb-3">
               <Mail className="size-5 text-brand-500" />
               <h2 className="text-lg font-semibold">Contact Support</h2>
             </div>
             <p className="text-text-muted text-sm">
               Email: support@farther.com<br />
               Response time: Within 24 hours
             </p>
           </div>

           <div className="rounded-lg border border-border bg-surface p-6">
             <div className="flex items-center gap-3 mb-3">
               <HelpCircle className="size-5 text-brand-500" />
               <h2 className="text-lg font-semibold">FAQ</h2>
             </div>
             <p className="text-text-muted text-sm">
               Coming soon: Frequently asked questions.
             </p>
           </div>
         </div>
       </div>
     );
   }
   ```

---

#### Issue: ARCH-003 - Duplicate Prisma Clients
**Priority:** P1 | **Effort:** 1h | **Owner:** Backend

**Steps:**
1. Audit Prisma imports
   ```bash
   grep -r "from '@/lib/prisma'" src/
   grep -r "from '@/lib/prism/db'" src/
   ```

2. Delete duplicate file
   ```bash
   # If src/lib/prisma.ts exists and is duplicate:
   git rm src/lib/prisma.ts
   ```

3. Update all imports
   ```bash
   # Find and replace across codebase:
   # Old: import { prisma } from '@/lib/prisma'
   # New: import { prisma } from '@/lib/prism/db'
   ```

4. Add tsconfig path alias
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"],
         "@/lib/db": ["./src/lib/prism/db"]
       }
     }
   }
   ```

**Expected Impact:** Eliminate connection pool conflicts

---

### Day 3: Documentation & Package Manager

#### Issue: RELEASE-008 - No Rollback Procedure
**Priority:** P2 | **Effort:** 2h | **Owner:** DevOps/Backend

**Steps:**
1. Create deployment documentation
   ```markdown
   # docs/DEPLOYMENT.md (NEW FILE - See detailed content in next section)
   ```

2. Add to README
   ```markdown
   ## Deployment

   See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment procedures.
   ```

---

#### Issue: RELEASE-006 - Package Manager Inconsistency
**Priority:** P1 | **Effort:** 30min | **Owner:** DevOps

**Steps:**
1. Remove pnpm from CI
   ```yaml
   # .github/workflows/ci-sentinel.yml

   # Replace:
   # - uses: pnpm/action-setup@v2
   # - run: pnpm install --frozen-lockfile

   # With:
   - uses: actions/setup-node@v4
     with:
       node-version: 20
       cache: 'npm'
   - run: npm ci
   ```

2. Verify deploy workflow uses npm
   ```yaml
   # .github/workflows/deploy-railway.yml
   # Should already use: npm ci
   # No changes needed
   ```

---

### Sprint 2 Validation

- [ ] Tax table cache working (verify logs show cache hits)
- [ ] Monte Carlo cache working (repeat calls return instantly)
- [ ] AI summary cache working (75% dedup rate)
- [ ] Client portal pages load (no 404s)
- [ ] Help page accessible
- [ ] Single Prisma client used everywhere
- [ ] Deployment docs complete
- [ ] CI uses npm (not pnpm)

---

## 🛡️ Sprint 3: Production Hardening (Week 2-3)

**Goal:** Reliability, validation, and error handling
**Duration:** 6 days (24-28 hours)
**Team Size:** 2 developers
**Deliverable:** Production-ready reliability improvements

### API Validation & Error Handling

#### Issue: API-003 - No Retry with Exponential Backoff
**Priority:** P1 | **Effort:** 3h | **Owner:** Backend

**Steps:**
1. Create retry utility with exponential backoff
   ```typescript
   // src/lib/utils/retry-with-backoff.ts (NEW FILE)

   export interface RetryOptions {
     maxAttempts?: number;
     baseDelayMs?: number;
     maxDelayMs?: number;
     retryableStatuses?: number[];
   }

   const DEFAULT_OPTIONS: Required<RetryOptions> = {
     maxAttempts: 3,
     baseDelayMs: 1000,
     maxDelayMs: 30000,
     retryableStatuses: [429, 500, 502, 503, 504],
   };

   export async function retryWithBackoff<T>(
     fn: () => Promise<T>,
     options: RetryOptions = {}
   ): Promise<T> {
     const opts = { ...DEFAULT_OPTIONS, ...options };
     let lastError: Error | null = null;

     for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
       try {
         return await fn();
       } catch (error) {
         lastError = error instanceof Error ? error : new Error(String(error));

         // Check if error is retryable
         const isRetryable =
           (error as any).status &&
           opts.retryableStatuses.includes((error as any).status);

         if (!isRetryable || attempt === opts.maxAttempts) {
           throw lastError;
         }

         // Calculate backoff delay: min(maxDelay, baseDelay * 2^(attempt-1))
         const delay = Math.min(
           opts.maxDelayMs,
           opts.baseDelayMs * Math.pow(2, attempt - 1)
         );

         console.warn(
           `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed. ` +
           `Retrying in ${delay}ms... (${lastError.message})`
         );

         await sleep(delay);
       }
     }

     throw lastError;
   }

   function sleep(ms: number): Promise<void> {
     return new Promise(resolve => setTimeout(resolve, ms));
   }
   ```

2. Update AI service to use retry
   ```typescript
   // src/lib/risk-profile/ai-service.ts
   import { retryWithBackoff } from '@/lib/utils/retry-with-backoff';
   import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';

   async function callAnthropicAPI(/* params */) {
     const response = await retryWithBackoff(
       async () => {
         const res = await fetchWithTimeout(
           'https://api.anthropic.com/v1/messages',
           {
             method: 'POST',
             headers: { /* ... */ },
             body: JSON.stringify(/* ... */),
             timeout: 30000,
           }
         );

         if (!res.ok) {
           const error: any = new Error(`API request failed: ${res.status}`);
           error.status = res.status;
           throw error;
         }

         return res;
       },
       {
         maxAttempts: 3,
         baseDelayMs: 1000,
         retryableStatuses: [429, 500, 502, 503, 504],
       }
     );

     return response.json();
   }
   ```

3. Add tests
   ```typescript
   // src/lib/utils/__tests__/retry-with-backoff.test.ts
   import { describe, it, expect, vi } from 'vitest';
   import { retryWithBackoff } from '../retry-with-backoff';

   describe('retryWithBackoff', () => {
     it('should succeed on first attempt', async () => {
       const fn = vi.fn(() => Promise.resolve('success'));
       const result = await retryWithBackoff(fn);
       expect(result).toBe('success');
       expect(fn).toHaveBeenCalledTimes(1);
     });

     it('should retry on 429 error', async () => {
       let attempts = 0;
       const fn = vi.fn(() => {
         attempts++;
         if (attempts < 3) {
           const error: any = new Error('Rate limited');
           error.status = 429;
           return Promise.reject(error);
         }
         return Promise.resolve('success');
       });

       const result = await retryWithBackoff(fn);
       expect(result).toBe('success');
       expect(fn).toHaveBeenCalledTimes(3);
     });

     it('should not retry on 400 error', async () => {
       const error: any = new Error('Bad request');
       error.status = 400;
       const fn = vi.fn(() => Promise.reject(error));

       await expect(retryWithBackoff(fn)).rejects.toThrow('Bad request');
       expect(fn).toHaveBeenCalledTimes(1);
     });
   });
   ```

**Expected Impact:** 95%+ success rate for transient API failures

---

#### Issue: API-004 - Inconsistent Zod Validation
**Priority:** P1 | **Effort:** 4h | **Owner:** Backend

**Steps:**
1. Create validation helper
   ```typescript
   // src/lib/api/validate-request.ts (NEW FILE)
   import { NextResponse } from 'next/server';
   import { z } from 'zod';

   export interface ValidationResult<T> {
     success: true;
     data: T;
   }

   export interface ValidationError {
     success: false;
     error: NextResponse;
   }

   export function validateBody<T>(
     schema: z.ZodSchema<T>,
     body: unknown
   ): ValidationResult<T> | ValidationError {
     const result = schema.safeParse(body);

     if (!result.success) {
       return {
         success: false,
         error: NextResponse.json(
           {
             error: 'VALIDATION_ERROR',
             message: 'Invalid request body',
             details: result.error.flatten().fieldErrors,
           },
           { status: 400 }
         ),
       };
     }

     return {
       success: true,
       data: result.data,
     };
   }

   export function validateParams<T>(
     schema: z.ZodSchema<T>,
     params: unknown
   ): ValidationResult<T> | ValidationError {
     const result = schema.safeParse(params);

     if (!result.success) {
       return {
         success: false,
         error: NextResponse.json(
           {
             error: 'VALIDATION_ERROR',
             message: 'Invalid route parameters',
             details: result.error.flatten().fieldErrors,
           },
           { status: 400 }
         ),
       };
     }

     return {
       success: true,
       data: result.data,
     };
   }
   ```

2. Create common schemas
   ```typescript
   // src/lib/api/schemas.ts (NEW FILE)
   import { z } from 'zod';

   // Common parameter schemas
   export const cuidSchema = z.string().cuid();
   export const planIdSchema = z.object({ planId: cuidSchema });
   export const householdIdSchema = z.object({ householdId: cuidSchema });
   export const clientIdSchema = z.object({ clientId: cuidSchema });

   // Pagination schema
   export const paginationSchema = z.object({
     page: z.number().int().min(1).default(1),
     limit: z.number().int().min(1).max(100).default(20),
   });
   ```

3. Update 10 highest-traffic API routes
   ```typescript
   // Example: src/app/api/prism/plans/[planId]/calculate/route.ts
   import { validateParams, validateBody } from '@/lib/api/validate-request';
   import { planIdSchema } from '@/lib/api/schemas';
   import { z } from 'zod';

   const calculateRequestSchema = z.object({
     assumptions: z.object({
       inflationRate: z.number().min(0).max(0.15),
       expectedReturn: z.number().min(0).max(0.20),
       // ... other assumptions
     }).optional(),
   });

   export async function POST(
     req: NextRequest,
     { params }: { params: { planId: string } }
   ) {
     // Validate params
     const paramsValidation = validateParams(planIdSchema, params);
     if (!paramsValidation.success) return paramsValidation.error;
     const { planId } = paramsValidation.data;

     // Validate body
     const body = await req.json();
     const bodyValidation = validateBody(calculateRequestSchema, body);
     if (!bodyValidation.success) return bodyValidation.error;
     const { assumptions } = bodyValidation.data;

     // ... proceed with validated data
   }
   ```

**Expected Impact:** Consistent error responses, prevented invalid requests

---

#### Issue: API-006 - No Rate Limiting
**Priority:** P1 | **Effort:** 3h | **Owner:** Backend

**Steps:**
1. Create rate limiter
   ```typescript
   // src/lib/api/rate-limiter.ts (NEW FILE)

   interface RateLimitConfig {
     points: number;     // Number of requests
     duration: number;   // Time window in seconds
   }

   interface RateLimitEntry {
     count: number;
     resetAt: number;
   }

   export class RateLimiter {
     private store = new Map<string, RateLimitEntry>();
     private config: RateLimitConfig;

     constructor(config: RateLimitConfig) {
       this.config = config;
     }

     async isRateLimited(key: string): Promise<boolean> {
       const now = Date.now();
       const entry = this.store.get(key);

       // Clean up expired entries periodically
       if (Math.random() < 0.01) this.cleanup(now);

       if (!entry || now > entry.resetAt) {
         // First request or window expired
         this.store.set(key, {
           count: 1,
           resetAt: now + this.config.duration * 1000,
         });
         return false;
       }

       if (entry.count >= this.config.points) {
         return true; // Rate limited
       }

       entry.count++;
       return false;
     }

     private cleanup(now: number): void {
       for (const [key, entry] of this.store.entries()) {
         if (now > entry.resetAt) {
           this.store.delete(key);
         }
       }
     }
   }

   // Export configured rate limiters
   export const aiRateLimiter = new RateLimiter({
     points: 20,    // 20 requests
     duration: 60,  // per minute
   });

   export const apiRateLimiter = new RateLimiter({
     points: 100,   // 100 requests
     duration: 60,  // per minute
   });
   ```

2. Add rate limiting middleware
   ```typescript
   // src/lib/api/with-rate-limit.ts (NEW FILE)
   import { NextRequest, NextResponse } from 'next/server';
   import { RateLimiter } from './rate-limiter';

   export function withRateLimit(
     rateLimiter: RateLimiter,
     getUserKey: (req: NextRequest) => string = (req) => req.ip || 'anonymous'
   ) {
     return async function (
       handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
     ) {
       return async (req: NextRequest, ...args: any[]) => {
         const key = getUserKey(req);
         const isLimited = await rateLimiter.isRateLimited(key);

         if (isLimited) {
           return NextResponse.json(
             {
               error: 'RATE_LIMITED',
               message: 'Too many requests. Please try again later.',
             },
             {
               status: 429,
               headers: {
                 'Retry-After': '60',
                 'X-RateLimit-Limit': String(rateLimiter['config'].points),
                 'X-RateLimit-Remaining': '0',
               },
             }
           );
         }

         return handler(req, ...args);
       };
     };
   }
   ```

3. Apply to AI endpoints
   ```typescript
   // src/app/api/v1/copilot/ask/route.ts
   import { aiRateLimiter } from '@/lib/api/rate-limiter';

   export async function POST(req: NextRequest) {
     // Check rate limit
     const userKey = req.headers.get('x-user-id') || req.ip || 'anonymous';
     if (await aiRateLimiter.isRateLimited(userKey)) {
       return NextResponse.json(
         { error: 'RATE_LIMITED', message: 'Too many AI requests' },
         { status: 429 }
       );
     }

     // ... existing logic
   }
   ```

**Expected Impact:** Prevent API abuse, control costs

---

#### Issue: ARCH-004 - Console.log Statements
**Priority:** P1 | **Effort:** 4h | **Owner:** Backend

**Steps:**
1. Install pino
   ```bash
   npm install pino pino-pretty
   ```

2. Create logger
   ```typescript
   // src/lib/logger.ts (NEW FILE)
   import pino from 'pino';

   const isDevelopment = process.env.NODE_ENV === 'development';

   export const logger = pino({
     level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
     transport: isDevelopment
       ? {
           target: 'pino-pretty',
           options: {
             colorize: true,
             translateTime: 'SYS:standard',
             ignore: 'pid,hostname',
           },
         }
       : undefined,
     formatters: {
       level: (label) => ({ level: label }),
     },
   });

   // Convenience methods
   export const createLogger = (name: string) => logger.child({ module: name });
   ```

3. Replace console.log in high-value files
   ```bash
   # Priority files (API routes, services):
   # - src/app/api/**/*.ts
   # - src/lib/integrations/**/*.ts
   # - src/lib/calc-engine/**/*.ts
   ```

   ```typescript
   // Example replacement:
   // Old:
   console.log('Processing plan calculation', planId);
   console.error('Calculation failed:', error);

   // New:
   import { createLogger } from '@/lib/logger';
   const logger = createLogger('plan-calculator');

   logger.info({ planId }, 'Processing plan calculation');
   logger.error({ error, planId }, 'Calculation failed');
   ```

4. Add ESLint rule to prevent console usage
   ```json
   // .eslintrc.json
   {
     "rules": {
       "no-console": ["warn", { "allow": ["warn", "error"] }]
     }
   }
   ```

**Expected Impact:** Production-ready logging, searchable audit trail

---

### Testing & Quality

#### Issue: RELEASE-004 - 18 Failing Unit Tests
**Priority:** P1 | **Effort:** 6h | **Owner:** Backend

**Steps:**
1. Run tests and analyze failures
   ```bash
   npm run test -- --reporter=verbose

   # Expected failures in:
   # - src/lib/tax-engine/modules/__tests__/tax-liability.test.ts
   # - src/lib/tax-planning/copilot/__tests__/staleness.test.ts
   ```

2. Fix tax liability calculation issues
   ```typescript
   // Debug tax-liability.test.ts failures
   // Check gross income calculation logic
   // Verify expected values match IRS tax tables for 2025
   ```

3. Fix staleness detection test isolation
   ```typescript
   // src/lib/tax-planning/copilot/__tests__/staleness.test.ts

   import { beforeEach } from 'vitest';

   // Add proper test isolation
   beforeEach(() => {
     // Clear any in-memory caches
     // Reset singleton instances
     vi.clearAllMocks();
   });
   ```

4. Verify all tests pass
   ```bash
   npm run test
   # Expected: 1273 passed | 0 failed
   ```

**Expected Impact:** Reliable test suite, catch regressions

---

#### Issue: DATA-002 - All Routes force-dynamic
**Priority:** P1 | **Effort:** 3h | **Owner:** Backend

**Steps:**
1. Audit routes and categorize
   ```bash
   grep -r "force-dynamic" src/app/api/ | wc -l
   # Shows 116 routes

   # Categorize:
   # - Read-only GET (can cache): tax-tables, plan results
   # - User-specific (cannot cache): authenticated data
   # - POST/PUT/DELETE (must be dynamic): mutations
   ```

2. Enable caching for read-only routes
   ```typescript
   // src/app/api/prism/tax-tables/route.ts

   // Remove:
   // export const dynamic = 'force-dynamic';

   // Add:
   export const revalidate = 86400; // 24 hours

   export async function GET() {
     // ... existing logic
   }
   ```

3. Apply to 20+ eligible routes
   ```typescript
   // Routes to cache:
   // - /api/prism/tax-tables (24h)
   // - /api/prism/plans/[id] (1h)
   // - /api/v1/household/[id]/360 (5min)
   // - etc.
   ```

**Expected Impact:** 80% faster cached responses, reduced DB queries

---

### Sprint 3 Validation

- [ ] Retry logic handles 429 errors
- [ ] All API POST routes validate with Zod
- [ ] Rate limiting active on AI endpoints
- [ ] Structured logging in production
- [ ] All 1273 tests pass
- [ ] HTTP caching enabled on 20+ routes
- [ ] Response times improved 80% for cached routes

---

## 🌐 Sprint 4: API Reliability (Week 3-4)

**Goal:** Complete API integration hardening
**Duration:** 8 days (32-36 hours)
**Team Size:** 2 developers
**Deliverable:** Production-ready API integrations

### API Integration Improvements

#### Issue: API-005 - Stub Implementations
**Priority:** P1 | **Effort:** 40h per integration | **Owner:** Backend

**Recommendation:** Prioritize HubSpot integration first (highest business value)

**Steps for HubSpot Integration:**

1. Install HubSpot SDK
   ```bash
   npm install @hubspot/api-client
   ```

2. Replace stub implementation
   ```typescript
   // src/lib/integrations/hubspot/hubspot-client.ts
   import { Client } from '@hubspot/api-client';

   const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_API_KEY });

   export async function searchContacts(query: string) {
     // Replace stub with real API call
     const result = await hubspotClient.crm.contacts.searchApi.doSearch({
       query,
       limit: 100,
     });
     return result.results;
   }
   ```

3. Add feature flag
   ```typescript
   // src/lib/integrations/hubspot/config.ts
   export const isHubSpotEnabled = () => {
     return process.env.ENABLE_HUBSPOT_SYNC === 'true' &&
            !!process.env.HUBSPOT_API_KEY;
   };
   ```

4. Gradual rollout
   ```bash
   # Start with staging only
   # Monitor for errors
   # Enable for 10% of users
   # Full rollout after 1 week
   ```

**Note:** Defer other integrations (Custodian, Market Data, BigQuery) to Sprint 7

---

#### Issue: API-007 - HubSpot Sequential Sync
**Priority:** P2 | **Effort:** 4h | **Owner:** Backend

**Steps:**
1. Implement batch upsert
   ```typescript
   // src/lib/integrations/hubspot/batch-sync.ts (NEW FILE)
   import { Client } from '@hubspot/api-client';

   const BATCH_SIZE = 100;

   export async function batchUpsertContacts(
     households: Array<{ id: string; name: string; /* ... */ }>
   ) {
     const client = new Client({ accessToken: process.env.HUBSPOT_API_KEY });
     const stats = { success: 0, failed: 0, total: households.length };

     // Split into batches of 100
     for (let i = 0; i < households.length; i += BATCH_SIZE) {
       const batch = households.slice(i, i + BATCH_SIZE);

       try {
         const response = await client.crm.contacts.batchApi.upsert({
           inputs: batch.map(h => ({
             id: h.id,
             properties: {
               firstname: h.name.split(' ')[0],
               lastname: h.name.split(' ')[1],
               // ... other properties
             },
           })),
         });

         stats.success += batch.length;
         console.log(`✓ Batch ${i / BATCH_SIZE + 1}: ${batch.length} contacts upserted`);
       } catch (error) {
         stats.failed += batch.length;
         console.error(`✗ Batch ${i / BATCH_SIZE + 1} failed:`, error);
       }
     }

     return stats;
   }
   ```

2. Update sync route
   ```typescript
   // src/app/api/integrations/hubspot/sync/route.ts
   import { batchUpsertContacts } from '@/lib/integrations/hubspot/batch-sync';

   export async function POST(req: NextRequest) {
     const households = await prisma.household.findMany();
     const stats = await batchUpsertContacts(households);

     return NextResponse.json({
       message: 'Sync complete',
       stats,
     });
   }
   ```

**Expected Impact:** 99% fewer API calls, 98% faster sync

---

#### Issue: API-008 - Custodian Sequential Sync
**Priority:** P2 | **Effort:** 2h | **Owner:** Backend

**Steps:**
1. Add controlled concurrency
   ```bash
   npm install p-limit
   ```

2. Implement parallel sync with limits
   ```typescript
   // src/lib/integrations/custodian/custodian-sync.ts
   import pLimit from 'p-limit';

   export async function syncAllConnections(connections: CustodianConnection[]) {
     const limit = pLimit(3); // Max 3 concurrent connections

     const results = await Promise.all(
       connections.map(conn =>
         limit(() => syncSingleConnection(conn))
       )
     );

     return results;
   }
   ```

**Expected Impact:** 3x faster sync with safe concurrency

---

### Sprint 4 continues with medium priority issues...

Due to length constraints, I'll provide the complete REMEDIATION_PLAN.md file now and we can expand specific sprints as needed.

---

## Summary of Remaining Sprints

**Sprint 5: Performance & Caching** (Week 4-5)
- DATA-003: Migrate household store to Prisma
- ARCH-006: Add input validation
- ARCH-007: Remove hardcoded firmId
- API-009: Redis cache manager

**Sprint 6: Testing & Quality** (Week 5-7)
- ARCH-005: Increase test coverage to 80%
- RELEASE-005: Add E2E smoke tests
- RELEASE-007: Post-deploy validation
- RELEASE-009: Migration testing

**Sprint 7: Scalability** (Week 7-8)
- ARCH-002: Refactor state-income-tax.ts
- ARCH-008: Split massive form components
- DATA-006: Implement BigQuery integration
- RAILWAY-007: Database backup strategy

**Sprint 8: Polish & Documentation** (Week 8-9)
- All P3 issues
- Documentation completion
- SEO improvements
- Monitoring setup

---

## 📅 Timeline Summary

| Week | Sprint | Focus | Hours | Deliverable |
|------|--------|-------|-------|-------------|
| 1 | 1 | Critical Blockers | 20-24 | Can deploy to staging |
| 1-2 | 2 | Quick Wins | 10-12 | Performance improvements |
| 2-3 | 3 | Production Hardening | 24-28 | Reliability & validation |
| 3-4 | 4 | API Reliability | 32-36 | Production APIs |
| 4-5 | 5 | Performance & Caching | 20-24 | Scalability |
| 5-7 | 6 | Testing & Quality | 80-100 | 80% test coverage |
| 7-8 | 7 | Scalability | 48-56 | Multi-tenant ready |
| 8-9 | 8 | Polish & Documentation | 8-12 | Production launch |

**Total: 242-292 hours (8-9 weeks)**

---

## ✅ Definition of Done

Each sprint is complete when:

- [ ] All issues in sprint resolved
- [ ] Unit tests pass (100%)
- [ ] Integration tests pass
- [ ] Code reviewed and approved
- [ ] Deployed to staging
- [ ] Smoke tests pass on staging
- [ ] Documentation updated
- [ ] Team demo completed
- [ ] Metrics baseline established

---

## 🚀 Production Launch Criteria

Before launching to production:

- [ ] All P0 issues resolved
- [ ] All P1 issues resolved
- [ ] 80%+ P2 issues resolved
- [ ] Test coverage ≥ 80%
- [ ] E2E smoke tests passing
- [ ] Load testing complete (500 req/s)
- [ ] Monitoring & alerts configured
- [ ] Rollback procedure tested
- [ ] Team trained on new features
- [ ] Documentation complete
- [ ] Security audit passed
- [ ] Performance benchmarks met

---

*End of Remediation Plan*
