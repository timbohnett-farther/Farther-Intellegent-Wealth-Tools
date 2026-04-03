# TODO — Farther Intelligent Wealth Tools

## High Priority

### FMSS Phase 1 Follow-Up

- [ ] **User adds API keys to Railway**
  - MINIMAX_API_KEY (MiniMax M2.7 AI)
  - BRIGHT_DATA_API_KEY (web scraping)
  - FMP_API_KEY (Financial Modeling Prep)
  - FINNHUB_API_KEY, ALETHEIA_API_KEY, FRED_API_KEY, ALPHA_VANTAGE_API_KEY, ECONDB_API_KEY

- [ ] **Run FMSS database migration on Railway**
  - Execute: `npm run db:migrate`
  - Verify all 14 tables created successfully
  - Confirm indexes are in place

- [ ] **Create initial FMSS route structure**
  - `/fmss/` — Dashboard/landing page
  - `/fmss/sma` — SMA strategies list
  - `/fmss/alternatives` — Alternative funds list
  - `/fmss/equities` — Equities list
  - `/fmss/etfs` — ETFs list
  - `/fmss/compare` — Comparison tool

- [ ] **Seed FMSS initial data**
  - Seed 8 scoring dimensions (risk-adjusted perf, manager pedigree, etc.)
  - Seed asset categories (equity, fixed income, alternatives, etc.)
  - Seed data sources (Bright Data, Tavily, Finnhub, etc.)

- [ ] **Begin Phase 2: SMA Ingestion**
  - Build unified `fetch_url_as_markdown()` scraper
  - Implement Bright Data Web Unlocker integration
  - Add Tavily Extract as backup
  - Create MiniMax M2.7 extraction worker
  - Build SMA URL manifest manager

### Sprint 3 Follow-Up

- [ ] **Manual testing: Admin dashboard workflow**
  - Test "Run Update Detection" button end-to-end
  - Verify scraping works for all 4 sources (Tax Foundation, NCSL, ACTEC, PR)
  - Verify AI extraction produces valid structured data
  - Test approve/reject actions with review notes
  - Verify changes apply correctly to jurisdiction rules

- [ ] **Add authentication to admin routes**
  - Protect `/admin/relocation-updates` with middleware
  - Require admin role for access
  - Add auth check to admin API routes (`/api/relocation/admin/*`)

- [ ] **Web scraping improvements**
  - Evaluate if headless browser needed for JavaScript-heavy sources
  - Add retry logic with exponential backoff
  - Handle rate limiting from source websites
  - Add monitoring/logging for scrape failures

- [ ] **AI extraction improvements**
  - Add rate limiting on AI API calls
  - Implement retry logic for transient failures
  - Add validation for extracted rule structure
  - Handle edge cases (multi-jurisdiction documents)

### From Code Audit (P1 High Priority)

- [ ] **API-004: HMAC verification on DocuSign webhooks**
  - Add HMAC signature validation
  - Reject unsigned/invalid webhook payloads

- [ ] **API-008: Timeouts on external API calls**
  - Add timeouts to Anthropic Claude API calls
  - Add timeouts to Tavily search API calls
  - Add timeouts to DocuSign API calls
  - Add timeouts to web scraping requests (currently 30s)

- [ ] **SEC-001: Empty catch blocks**
  - Review all empty catch blocks
  - Add proper error logging
  - Handle errors gracefully with user feedback

- [ ] **DATA-004: Cache write operations**
  - Implement actual cache writes (currently stubbed)
  - Add cache invalidation strategy
  - Test cache read/write performance

## Medium Priority

### From Code Audit (P2 Medium Priority)

- [ ] **273 `any` types need explicit typing**
  - Audit codebase for `any` types
  - Replace with proper TypeScript types
  - Add strict mode to tsconfig if possible

- [ ] **Add ESLint configuration**
  - Install ESLint with Next.js config
  - Configure rules for TypeScript
  - Run linter and fix issues

- [ ] **Replace mock data in stubs**
  - Identify stub implementations
  - Replace with real data/API calls
  - Remove hardcoded mock responses

- [ ] **Navigation link consolidation**
  - Audit navigation components
  - Remove duplicate links
  - Ensure consistent navigation patterns

## Low Priority

### Code Organization (P3)

- [ ] **Extract reusable components**
  - Review component duplication
  - Extract shared UI patterns
  - Create component library folder

- [ ] **Additional test coverage**
  - Add integration tests for API routes
  - Add E2E tests for critical user flows
  - Increase unit test coverage

- [ ] **Documentation updates**
  - Add JSDoc comments to public functions
  - Update README with deployment instructions
  - Document environment variables

## Completed

- [x] Sprint 1: Core Calculation Engine
- [x] Sprint 1: Database Schema & Seed Data
- [x] Sprint 1: API Routes
- [x] Sprint 2: Results Display & Visualization
- [x] Sprint 3: AI Update System
- [x] Sprint 3: Admin Review Workflow
- [x] Sprint 4: Testing & QA
- [x] Health endpoint for Railway deployment
- [x] Fix Next.js dynamic route warnings
- [x] FMSS Phase 1: Drizzle ORM setup, schema creation, migration generation
- [x] 401(k) Rollover: Statement upload with MiniMax extraction
- [x] Tool separation: Moved Rollover, Debt IQ, Relocation to standalone routes

---

**Last Updated:** 2026-04-03 22:45
