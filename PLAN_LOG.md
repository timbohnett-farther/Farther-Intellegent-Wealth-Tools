# Plan Log — Farther Intelligent Wealth Tools

## 2026-04-03 22:15 — NEW TOOL: Farther Market Scoring System (FMSS)

### Project Overview
Build a unified advisor intelligence platform that scores and compares Separately Managed Accounts (SMAs), alternative investments, ETFs, and individual equities from a single interface.

**The moat:** AI digestion layer that reads raw SMA fact sheets, earnings transcripts, EDGAR filings, and news — then uses MiniMax M2.7 to normalize and score them into a consistent 0–100 rubric.

### Tech Stack (NON-NEGOTIABLE)
- **Frontend:** Next.js 15 App Router, TypeScript, Tailwind CSS
- **ORM:** Drizzle ORM (NOT Prisma)
- **Database:** PostgreSQL on Railway
- **Python Workers:** Python 3.11 (separate Railway service)
- **Web Scraping:** Bright Data Web Unlocker (primary) + Tavily Extract (backup)
- **AI Model:** MiniMax M2.7 (standard) + MiniMax M2.7-highspeed (batch)
- **Hosting:** Railway with cron schedules

### Architecture Summary
1. **Web Crawlers:** Bright Data (primary) → Tavily (backup) → unified `fetch_url_as_markdown()`
2. **5 Public API Workers:** Finnhub, Aletheia, FRED, Alpha Vantage, Econdb
3. **AI Digestion:** MiniMax M2.7 extracts structured data from all sources
4. **Scoring Engine:** 8 dimensions (risk-adjusted perf, manager pedigree, fee efficiency, etc.)
5. **Frontend:** Next.js routes for SMAs, alts, equities, ETFs, comparison tool

### Database Schema
14 tables total:
- **Core Assets:** `sma_strategies`, `sma_url_manifest`, `alternative_funds`, `equities`, `etfs`
- **Signals:** `scoring_signals`, `scores`, `macro_indicators`, `earnings_call_sentiment`, `news_sentiment_signals`
- **System:** `ingest_log`

### Build Phases (8 weeks estimated)
**Phase 1:** Foundation — Repository setup, Next.js init, Drizzle ORM, schema migration
**Phase 2:** SMA Ingestion — Bright Data + Tavily scraper, MiniMax extraction, URL manager
**Phase 3:** EDGAR Worker — Form ADV/D for alternative funds
**Phase 4:** FMP Worker — Equity/ETF fundamentals
**Phase 5:** Public API Workers — Finnhub, Aletheia, FRED, Alpha Vantage, Econdb
**Phase 6:** Signal & Scoring Workers — SOV.AI/QuiverQuant signals, composite scoring
**Phase 7:** Next.js Frontend — Dashboard, list views, detail pages, comparison tool
**Phase 8:** Testing & Hardening — End-to-end testing, error handling, pilot launch

### Critical Implementation Rules
1. Schema.ts is single source of truth — never create tables outside it
2. Use Drizzle ORM, NOT Prisma (explicitly forbidden)
3. Use App Router, NOT Pages Router
4. Never store raw HTML/PDF — only text content from scrapers
5. Use `fetch_url_as_markdown()` unified function — never call Bright Data/Tavily directly
6. MiniMax M2.7 for standard extractions, MiniMax M2.7-highspeed for batch loops
7. All API calls must respect rate limits with `time.sleep()` delays
8. Log all worker runs to `ingest_log` table
9. Use upsert (`ON CONFLICT DO UPDATE`) for all worker inserts
10. Never commit `.env.local`

### Questions for User Before Starting
1. **Which phase to start?** Full Phase 1 foundation, or specific component?
2. **Repository location?** Add to existing `Farther-Intellegent-Wealth-Tools` repo or create new repo?
3. **Route structure?** Should FMSS be at `/fmss/` or separate domain?
4. **Environment keys?** Do you have all API keys ready (MiniMax, Bright Data, SOV.AI, etc.)?
5. **Scope for this session?** Full Phase 1, or smaller initial setup?

### Next Steps (Awaiting User Direction)
⏳ Confirm repository structure and route placement
⏳ Confirm which build phase to start with
⏳ Verify API keys are available
⏳ Begin Phase 1 foundation work

### Status: PLANNING — AWAITING USER DIRECTION
Comprehensive build spec received. Ready to start once user confirms scope and approach.

---

## 2026-04-03 21:25 — Architecture Refactor: Separate Standalone Tools from Tax Planning

### Status: COMPLETE ✅
Tool separation complete. All 3 tools (Rollover, Debt IQ, Relocation) now standalone.
