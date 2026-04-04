# AX Code Review Command Center — Consolidated Report
**Project:** Farther Intelligent Wealth Tools
**Date:** 2026-04-04
**Codebase:** 1,023 source files | 132K+ lines | 180+ API routes | 41 DB models

---

## Section 1: Executive Summary

**Findings by Severity:**
| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 8 |
| MEDIUM | 12 |
| LOW | 7 |
| INFO | 5 |

**Overall System Health Grade: C+ (70/100)**

**Top 5 Most Urgent Issues:**
1. **No authentication on any API route** — all 180+ endpoints are publicly accessible with zero auth checks
2. **450 `any` types + 21 `prisma as any` bypasses** — defeats TypeScript's type system in financial calculation code
3. **Float used for money in Prisma schema** — all monetary fields (account balances, income, expenses, gift amounts) use `Float` instead of `Decimal`, risking precision loss in financial calculations
4. **No timeouts on external API calls** — MiniMax, Anthropic, Tavily, Bright Data calls have no timeout/retry, risking hung requests
5. **No input validation on ~60% of API routes** — most routes parse `request.json()` without Zod or manual validation

**Estimated Total Remediation:** 8-12 days

---

## Section 2: Critical & High Priority Findings

| # | Severity | Category | Finding | File(s) | Impact | Fix | Est. |
|---|----------|----------|---------|---------|--------|-----|------|
| 1 | CRITICAL | Security | **Zero authentication** on all 180+ API routes. No middleware, no session checks, no auth guards. | All `src/app/api/` routes | Anyone can read/write all data | Add NextAuth or JWT middleware | 2d |
| 2 | CRITICAL | Data | **Float for money** in Prisma schema. `currentBalance`, `annualAmount`, `giftAmount`, etc. all use `Float`. | `prisma/schema.prisma` | Floating-point precision errors in financial calculations | Migrate to `Decimal` type | 1d |
| 3 | CRITICAL | Security | **HubSpot webhook has no HMAC verification** — accepts any POST payload as trusted | `src/app/api/integrations/hubspot/webhook/route.ts` | Webhook spoofing, data injection | Add HMAC signature validation | 2h |
| 4 | HIGH | TypeScript | **450 `: any` types** across 161 files, with concentration in tax-planning analytics (37 in kpi-engine alone) | Multiple (see detail below) | Type errors go undetected, runtime crashes possible | Replace with proper types | 2d |
| 5 | HIGH | TypeScript | **21 files use `prisma as any`** to bypass type safety on Prisma queries | scenario-planning, tax-intelligence, opportunity-engine routes | Queries against nonexistent fields silently fail | Fix Prisma client generation or add proper type assertions | 1d |
| 6 | HIGH | API | **No request validation** on ~113 routes that parse JSON bodies. No Zod schemas, no manual field checks. | Most `/api/prism/`, `/api/v1/` routes | Malformed input causes unhandled errors | Add Zod validation schemas | 2d |
| 7 | HIGH | API | **No timeouts on external API calls** to MiniMax, Anthropic, Tavily, Bright Data, AIZOLO | `src/lib/ai/gateway.ts`, `src/lib/fmss/` | Hung requests block server, no fallback | Add AbortController with 30s timeout | 4h |
| 8 | HIGH | Code | **383 console.log/warn/error** statements in production code (115 in API routes alone) | Across entire `src/` | Log noise, potential data leakage in logs | Replace with structured logging or remove | 4h |
| 9 | HIGH | Frontend | **God components** — 5 components over 500 lines (IntakeForm: 759, AccountForm: 723) | `src/components/risk-profile/`, `src/components/prism/forms/` | Unmaintainable, hard to test | Extract sub-components | 1d |
| 10 | HIGH | Database | **No Prisma indexes** beyond @id and @unique — no @@index on query filter fields | `prisma/schema.prisma` | Slow queries as data grows (full table scans) | Add indexes for common WHERE/ORDER fields | 4h |
| 11 | HIGH | Deploy | **SQLite in production on Railway** — ephemeral filesystem means data loss on redeploy | `prisma/schema.prisma` (provider = "sqlite") | Complete data loss when Railway container restarts | Migrate to PostgreSQL or use persistent volume | 1d |

---

## Section 3: Medium & Low Priority Findings

| # | Severity | Category | Finding | Fix |
|---|----------|----------|---------|-----|
| 12 | MEDIUM | Code | 8 files over 1,000 lines (largest: `db/schema.ts` at 1,893 lines) | Extract modules |
| 13 | MEDIUM | Code | Test ratio only 7.8% (80 test files / 1,023 source files). No tests for any migration routes, FMSS routes, admin routes | Add integration tests for critical paths |
| 14 | MEDIUM | Code | No ESLint configuration — no automated style enforcement | Add `eslint-config-next` |
| 15 | MEDIUM | Frontend | Missing error boundaries around chart components — Recharts crash = full page crash | Add `<ErrorBoundary>` wrappers |
| 16 | MEDIUM | Frontend | No empty state components — empty data renders blank spaces | Create reusable `<EmptyState>` |
| 17 | MEDIUM | Frontend | Hardcoded hex colors in a few modal/portal components | Use semantic tokens |
| 18 | MEDIUM | API | No pagination on list endpoints (`findMany` without `take`/`skip`) | Add cursor/offset pagination |
| 19 | MEDIUM | API | No rate limiting on any endpoint | Add rate limiter middleware |
| 20 | MEDIUM | Database | Prisma schema missing `onDelete`/`onUpdate` on many relations | Add referential actions |
| 21 | MEDIUM | Database | No `$transaction` usage for multi-table writes in PRISM API routes | Wrap related writes in transactions |
| 22 | MEDIUM | Calc | calc-engine uses regular JS `number` for most calculations rather than `Decimal.js` (which is installed) | Migrate critical money math to Decimal.js |
| 23 | MEDIUM | Deploy | No error tracking (Sentry, LogRocket, etc.) | Add Sentry integration |
| 24 | LOW | Deps | `@types/better-sqlite3` and `drizzle-kit` in `dependencies` instead of `devDependencies` | Move to devDeps |
| 25 | LOW | Code | 15 test failures in current suite | Fix failing tests |
| 26 | LOW | Code | Orphaned seed file (`prisma/seed-relocation.ts`) references nonexistent models | Clean up or fix |
| 27 | LOW | Frontend | No `<Suspense>` boundaries on data-fetching pages | Add loading states |
| 28 | LOW | Schema | Drizzle schema and admin pages had mismatched column references (already fixed this session) | Verified fixed |
| 29 | INFO | Deps | 20 npm audit vulnerabilities (9 moderate, 10 high, 1 critical) | Run `npm audit fix` |
| 30 | INFO | Code | `CHANGE_LOG.md`, `PLAN_LOG.md`, `TODO.md` at root — good docs but heavy (963 lines in PLAN_LOG) | Consider archiving old entries |

---

## Section 4: Opportunities for Improvement

### Performance
- Add database indexes for `householdId`, `planId`, `advisorId` foreign keys — will speed queries 10-100x as data grows
- Add `select` to Prisma queries that only need 2-3 fields — currently over-fetching entire rows
- Consider moving from SQLite to PostgreSQL for the main app (already have Drizzle/PG for FMSS)

### Architecture
- Unify on one ORM — currently running both Prisma (SQLite) and Drizzle (PostgreSQL). Pick one.
- Extract shared API middleware (auth, validation, error handling, logging) into reusable functions
- Create a centralized error response helper to standardize `{ success, data, error }` envelope

### Developer Experience
- Add ESLint + Prettier configuration
- Add pre-commit hooks (lint-staged) to catch issues before push
- Consider adding Sentry for production error tracking

### Scalability (10x load)
- SQLite will not scale — migrate to PostgreSQL
- Add connection pooling configuration
- Add Redis for caching frequently-accessed data (tax tables, jurisdictions)
- Add pagination to all list endpoints

---

## Section 5: Execution Plan

### Sprint 1 — Immediate (Days 1-3): Critical Fixes
1. Add auth middleware to all API routes (NextAuth session check)
2. Add HMAC validation to HubSpot webhook
3. Add Zod validation to top 20 most-used API routes
4. Add 30s timeout to all external API calls (MiniMax, Anthropic, Tavily)
5. Plan SQLite → PostgreSQL migration for main app data

### Sprint 2 — Urgent (Days 4-10): High Priority
6. Migrate Prisma `Float` fields to `Decimal` for all monetary values
7. Replace top 50 `any` types in calculation engines with proper types
8. Eliminate `prisma as any` pattern (fix type generation)
9. Remove console.log from production API routes
10. Add @@index to Prisma schema for common query patterns
11. Break up god components (IntakeForm, AccountForm)

### Sprint 3 — Hardening (Days 11-20): Medium Priority + Testing
12. Add ESLint configuration
13. Add integration tests for migration, FMSS, admin routes
14. Add error boundaries to chart components
15. Add pagination to all list endpoints
16. Add rate limiting middleware
17. Add empty state components
18. Wrap multi-table writes in Prisma transactions

### Sprint 4 — Polish (Days 21-30): Low + Optimization
19. Fix 15 failing tests
20. Add Sentry error tracking
21. Run npm audit fix
22. Add Suspense boundaries
23. Move dev deps correctly
24. Archive old PLAN_LOG entries
25. Clean up orphaned seed files

---

## Section 6: Verification Checklist

After implementing fixes, verify each:

- [ ] #1: Auth — Unauthenticated request to any `/api/` route returns 401
- [ ] #2: Float→Decimal — `prisma.schema` has no `Float` fields for money
- [ ] #3: Webhook HMAC — POST to `/api/integrations/hubspot/webhook` without valid signature returns 403
- [ ] #4: Any types — `grep ': any' src/ --include='*.ts' | wc -l` < 50 (excluding generated)
- [ ] #5: Validation — Top 20 POST routes reject invalid bodies with 400 status
- [ ] #6: Timeouts — External API calls abort after 30 seconds
- [ ] #7: Console.log — `grep 'console.log' src/app/api/ | wc -l` = 0
- [ ] #8: Indexes — Run `EXPLAIN` on common queries, no full table scans
- [ ] #9: Tests — `npx vitest run` passes with 0 failures
- [ ] #10: Build — `npm run build` passes with 0 errors

---

*Generated by AX Code Review Command Center v1.0*
*8 specialist agents | Phase 0-2 complete | 2026-04-04*
