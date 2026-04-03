# SMA Monitoring Workers

Python workers for SMA fact sheet discovery, acquisition, parsing, and change detection.

## Setup

### 1. Install Dependencies

```bash
cd workers
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the `workers/` directory:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
TAVILY_API_KEY=your_tavily_api_key
BRIGHT_DATA_API_KEY=your_bright_data_key  # For acquisition worker
MINIMAX_API_KEY=your_minimax_key          # For parsing worker
```

Or export them in your shell:

```bash
export DATABASE_URL="postgresql://..."
export TAVILY_API_KEY="tvly-..."
```

## Workers

### Discovery Worker (`sma_monitoring/discovery_worker.py`)

Discovers SMA fact sheet URLs using Tavily and link crawling.

**Features:**
- Tavily search API integration
- Link extraction from seed URLs
- Heuristic URL classification (fact_sheet, brochure, commentary, etc.)
- Run logging to `fmss_sma_provider_runs`
- Discovered URL storage in `fmss_sma_discovered_urls`

**Usage:**

```bash
# Discover URLs for a single provider
python -m sma_monitoring.discovery_worker --provider jpmorgan

# Discover URLs for all active providers
python -m sma_monitoring.discovery_worker --all-active

# Discover URLs by provider UUID
python -m sma_monitoring.discovery_worker --provider-id <uuid>
```

**Output:**
- Discovered URLs stored in `fmss_sma_discovered_urls` table
- Run logs stored in `fmss_sma_provider_runs` table
- Console output with discovery stats

**Example:**

```bash
$ python -m sma_monitoring.discovery_worker --provider blackrock

2026-04-04 02:30:00 - INFO - Starting discovery for provider: blackrock
2026-04-04 02:30:01 - INFO - Created discovery run: a1b2c3d4-...
2026-04-04 02:30:01 - INFO - Found 2 seed URLs for BlackRock
2026-04-04 02:30:02 - INFO - Processing seed URL: https://www.blackrock.com/...
2026-04-04 02:30:05 - INFO - Extracted 47 links from https://www.blackrock.com/...
2026-04-04 02:30:10 - INFO - Tavily search returned 18 results for query: BlackRock SMA fact sheet
2026-04-04 02:30:15 - INFO - Discovery complete for BlackRock: 65 URLs discovered

✅ Discovery complete:
   URLs discovered: 65
   Errors: 0
```

### Acquisition Worker (Phase 3)

Downloads fact sheet PDFs and HTML pages using Bright Data.

### Parsing Worker (Phase 4)

Extracts text from PDFs using PyMuPDF.

### Change Detection Worker (Phase 5)

Detects material changes between document versions using AI.

## Database Schema

Workers interact with these tables:

- `fmss_sma_providers` - Provider registry
- `fmss_sma_provider_seed_urls` - Crawl starting points
- `fmss_sma_discovered_urls` - Discovered URLs (output of discovery worker)
- `fmss_sma_fact_sheet_documents` - Document tracking
- `fmss_sma_fact_sheet_versions` - Version history
- `fmss_sma_parsed_documents` - Extracted data
- `fmss_sma_change_events` - Material changes
- `fmss_sma_provider_runs` - Run logging
- `fmss_sma_document_alerts` - Notification queue

## Architecture

```
┌─────────────────┐
│  Seed URLs      │  (fmss_sma_provider_seed_urls)
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Discovery       │  ← discovery_worker.py
│ (Tavily +       │    - Tavily search
│  Link Crawl)    │    - Link extraction
└────────┬────────┘   - URL classification
         │
         v
┌─────────────────┐
│ Discovered URLs │  (fmss_sma_discovered_urls)
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Acquisition     │  ← acquisition_worker.py (Phase 3)
│ (Bright Data)   │    - PDF/HTML download
└────────┬────────┘   - Content hashing
         │
         v
┌─────────────────┐
│ Documents       │  (fmss_sma_fact_sheet_documents)
└────────┬────────┘   (fmss_sma_fact_sheet_versions)
         │
         v
┌─────────────────┐
│ Parsing         │  ← parsing_worker.py (Phase 4)
│ (PyMuPDF)       │    - Text extraction
└────────┬────────┘   - Field parsing
         │
         v
┌─────────────────┐
│ Parsed Data     │  (fmss_sma_parsed_documents)
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Change          │  ← change_worker.py (Phase 5)
│ Detection (AI)  │    - Version comparison
└────────┬────────┘   - Material change detection
         │
         v
┌─────────────────┐
│ Change Events   │  (fmss_sma_change_events)
│ & Alerts        │  (fmss_sma_document_alerts)
└─────────────────┘
```

## Scheduling (Phase 7)

Workers will be scheduled via Railway Cron:

- **Daily Monitoring** (5:00 UTC): Acquisition + parsing for known documents
- **Weekly Discovery** (Monday 4:00 UTC): Discovery for all active providers
- **Quarterly Validation** (1st of quarter): Full re-crawl and validation

## Development

### Running Locally

1. Ensure PostgreSQL is running with FMSS schema
2. Run database migration: `npm run db:migrate`
3. Seed provider data: `tsx src/lib/db/seed/sma-providers-seed.ts`
4. Run discovery worker: `python -m sma_monitoring.discovery_worker --provider jpmorgan`

### Testing

```bash
# Run single provider discovery
python -m sma_monitoring.discovery_worker --provider jpmorgan

# Check discovered URLs
psql $DATABASE_URL -c "SELECT * FROM fmss_sma_discovered_urls WHERE provider_id = (SELECT id FROM fmss_sma_providers WHERE provider_key = 'jpmorgan');"

# Check run logs
psql $DATABASE_URL -c "SELECT * FROM fmss_sma_provider_runs ORDER BY started_at DESC LIMIT 5;"
```

## Deployment (Railway)

### Railway Service Configuration

```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r workers/requirements.txt"
  },
  "deploy": {
    "startCommand": "python -m sma_monitoring.discovery_worker --all-active",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Cron Configuration

```yaml
# Discovery Worker (Weekly - Monday 4:00 UTC)
0 4 * * 1 python -m sma_monitoring.discovery_worker --all-active

# Acquisition Worker (Daily - 5:00 UTC)
0 5 * * * python -m sma_monitoring.acquisition_worker --all-pending

# Change Detection (Daily - 6:00 UTC)
0 6 * * * python -m sma_monitoring.change_worker --all-active
```

## Logging

All workers log to stdout with structured logging:

```
2026-04-04 02:30:00 - discovery_worker - INFO - Starting discovery for provider: jpmorgan
2026-04-04 02:30:01 - discovery_worker - INFO - Created discovery run: a1b2c3d4-...
2026-04-04 02:30:15 - discovery_worker - INFO - Discovery complete: 65 URLs discovered
```

Logs are captured by Railway and available in the Railway dashboard.

## Error Handling

- Network errors: Retry with exponential backoff (3 attempts)
- Database errors: Logged and run marked as 'failed'
- Invalid data: Logged as warning, processing continues
- API rate limits: Respect Tavily/Bright Data rate limits with delays

## Contributing

When adding new workers:

1. Create worker file in `workers/sma_monitoring/`
2. Add dependencies to `workers/requirements.txt`
3. Document usage in this README
4. Add database migration if new tables needed
5. Test locally before deploying to Railway
