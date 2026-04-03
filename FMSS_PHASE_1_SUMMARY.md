# FMSS Phase 1 Foundation — Complete ✅

**Date:** 2026-04-03 22:45
**Status:** Ready for API Keys & Migration
**Build:** ✅ Passed (65 pages, 0 errors)

---

## What Was Built

### 1. Drizzle ORM Installation
- ✅ `drizzle-orm` ^0.45.2
- ✅ `drizzle-kit` ^0.31.10
- ✅ `postgres` ^3.4.8

### 2. Configuration Files
**`drizzle.config.ts`** (project root)
- Configured for PostgreSQL (Railway)
- Table filter: `fmss_*` (only manages FMSS tables)
- Migration output: `./drizzle/migrations`

### 3. Database Schema
**`src/lib/db/schema.ts`** — 14 tables, 186 columns, 28 indexes

**Core Asset Tables (5):**
1. `fmss_sma_strategies` — SMA investment strategies (25 columns, manager data, performance, risk metrics)
2. `fmss_sma_url_manifest` — Scraping URLs for SMA fact sheets (content hash tracking, scrape status)
3. `fmss_alternative_funds` — Alternative investments (hedge funds, PE, VC, real estate)
4. `fmss_equities` — Individual stocks (ticker, fundamentals, analyst ratings)
5. `fmss_etfs` — Exchange-traded funds (provider, expense ratio, holdings)

**Signal Tables (5):**
6. `fmss_scoring_signals` — Raw signals for composite scoring (insider buys, earnings beats, etc.)
7. `fmss_scores` — 8-dimension composite scores (0-100 scale, percentile ranks)
8. `fmss_macro_indicators` — Economic data (FRED, Econdb, Alpha Vantage)
9. `fmss_earnings_call_sentiment` — AI-extracted sentiment from earnings transcripts
10. `fmss_news_sentiment_signals` — Financial news sentiment analysis

**System Tables (4):**
11. `fmss_ingest_log` — Worker run audit trail (all data ingestion logged)
12. `fmss_data_sources` — External API configurations (rate limits, status tracking)
13. `fmss_asset_categories` — Lookup table for categorization
14. `fmss_scoring_dimensions` — 8 scoring dimension configs (weights, calculation methods)

### 4. Database Client
**`src/lib/db/index.ts`**
- PostgreSQL connection via `postgres` package
- Connection pool: max 10, idle timeout 20s, connect timeout 10s
- Uses Railway DATABASE_URL environment variable
- Exports Drizzle client and full schema

### 5. Migration Generated
**`drizzle/migrations/0000_nostalgic_gunslinger.sql`**
- All 14 tables with proper constraints
- UUID primary keys (gen_random_uuid())
- Indexes for query optimization
- Default values and NOT NULL constraints
- Ready to apply to Railway PostgreSQL

### 6. NPM Scripts Added
```json
"db:generate": "drizzle-kit generate",  // Generate migrations from schema
"db:migrate": "drizzle-kit migrate",    // Apply migrations to database
"db:push": "drizzle-kit push",          // Push schema changes (dev)
"db:studio": "drizzle-kit studio"       // Visual database explorer
```

### 7. Environment Variables Documented
**`.env.example`** updated with FMSS API keys section:
- `MINIMAX_API_KEY` — MiniMax M2.7 AI for document extraction
- `BRIGHT_DATA_API_KEY` — Web scraping (primary)
- `TAVILY_API_KEY` — Web scraping (backup)
- `FMP_API_KEY` — Financial Modeling Prep (equity/ETF fundamentals)
- `FINNHUB_API_KEY` — Real-time market data, insider trades
- `ALETHEIA_API_KEY` — Earnings call sentiment
- `SOV_AI_API_KEY` — Social sentiment signals
- `FRED_API_KEY` — Federal Reserve economic data
- `ALPHA_VANTAGE_API_KEY` — Forex, commodities, economic indicators
- `ECONDB_API_KEY` — International economic data

---

## Tech Stack Confirmation

✅ **Drizzle ORM** — NOT Prisma (FMSS requirement met)
✅ **PostgreSQL** — Railway DATABASE_URL
✅ **Separate from Prisma** — Existing tools use Prisma, FMSS uses Drizzle
✅ **App Router** — Next.js 15 (no Pages Router)
✅ **TypeScript** — Full type safety with Drizzle schema

---

## Next Steps (Awaiting User)

### 1. Add API Keys to Railway Environment
User must add the following environment variables to Railway:

**Required for Phase 2:**
- `MINIMAX_API_KEY` (MiniMax M2.7 AI)
- `BRIGHT_DATA_API_KEY` (web scraping primary)
- `FMP_API_KEY` (Financial Modeling Prep)

**Required for Phase 3-5:**
- `FINNHUB_API_KEY`
- `ALETHEIA_API_KEY`
- `FRED_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `ECONDB_API_KEY`
- `SOV_AI_API_KEY` (if using SOV.AI for signals)

### 2. Apply Migration to Railway
Once DATABASE_URL is confirmed in Railway:
```bash
npm run db:migrate
```

This will create all 14 FMSS tables in the Railway PostgreSQL database.

### 3. Verify Migration Success
Check Railway logs for successful migration:
```bash
railway logs
```

Expected output: "✓ Migration applied: 0000_nostalgic_gunslinger.sql"

### 4. Seed Initial Data (Phase 2 Start)
Once migration is applied, seed:
- 8 scoring dimensions (risk-adjusted performance, manager pedigree, etc.)
- Asset categories (Equity, Fixed Income, Alternative, Multi-Asset, etc.)
- Data sources (Bright Data, Tavily, FMP, Finnhub, etc.)

### 5. Create FMSS Routes
Build Next.js routes at `/fmss/`:
- `/fmss/` — Dashboard/landing
- `/fmss/sma` — SMA strategies list
- `/fmss/alternatives` — Alternative funds list
- `/fmss/equities` — Equities list
- `/fmss/etfs` — ETFs list
- `/fmss/compare` — Comparison tool

---

## 8-Dimension Scoring System

**Total Score:** 0-100 (weighted sum)

1. **Risk-Adjusted Performance** (25%) — Sharpe ratio, Sortino ratio, max drawdown vs. benchmark
2. **Manager Pedigree** (15%) — Track record, AUM, tenure, regulatory history
3. **Fee Efficiency** (10%) — Management fees vs. category median, fee compression trends
4. **Insider Conviction** (15%) — Insider buying, form 4 filings, director purchases
5. **Regulatory Signal** (10%) — SEC filings, Form ADV changes, compliance issues
6. **Concentration** (10%) — Position concentration, diversification metrics
7. **Benchmark Consistency** (10%) — Tracking error, active share, style drift
8. **ESG Alignment** (5%) — ESG scores, sustainability initiatives, impact metrics

---

## Critical Implementation Rules (10 Absolute Rules)

1. ✅ Schema.ts is single source of truth — never create tables outside it
2. ✅ Use Drizzle ORM, NOT Prisma (explicitly forbidden for FMSS)
3. ✅ Use App Router, NOT Pages Router
4. ⏳ Never store raw HTML/PDF — only text content from scrapers
5. ⏳ Use `fetch_url_as_markdown()` unified function — never call Bright Data/Tavily directly
6. ⏳ MiniMax M2.7 for standard extractions, MiniMax M2.7-highspeed for batch loops
7. ⏳ All API calls must respect rate limits with delays
8. ⏳ Log all worker runs to `fmss_ingest_log` table
9. ⏳ Use upsert (`ON CONFLICT DO UPDATE`) for all worker inserts
10. ✅ Never commit `.env.local`

---

## Build Status

✅ **Build:** Passed (65 pages generated, 0 TypeScript errors)
✅ **Migration:** Generated successfully
⏳ **Database:** Awaiting migration to Railway
⏳ **API Keys:** Awaiting user to add to Railway environment

---

## Phase 2 Preview: SMA Ingestion

**Objective:** Scrape SMA fact sheets, extract structured data with AI, populate database

**Components to Build:**
1. Unified scraper: `fetch_url_as_markdown()` (Bright Data → Tavily fallback)
2. SMA URL manifest manager (add URLs, track scrape status, detect content changes)
3. MiniMax M2.7 extraction worker (parse fact sheets → structured JSON)
4. Batch processing with rate limiting (3 docs/batch, 1s delays)
5. Upsert to `fmss_sma_strategies` table with full audit trail

**Estimated Time:** 4-6 hours

---

## Questions?

- **Where is the schema?** `src/lib/db/schema.ts`
- **Where is the migration?** `drizzle/migrations/0000_nostalgic_gunslinger.sql`
- **How do I run migration?** `npm run db:migrate` (after adding API keys to Railway)
- **How do I see the database?** `npm run db:studio` (opens Drizzle Studio in browser)
- **What's next?** User adds API keys → Run migration → Seed data → Build Phase 2

---

**Ready for Phase 2 once API keys are added and migration is applied! 🚀**
