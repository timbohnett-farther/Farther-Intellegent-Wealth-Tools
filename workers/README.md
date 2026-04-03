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

### Acquisition Worker (`sma_monitoring/acquisition_worker.py`)

Downloads fact sheet PDFs and HTML pages using Bright Data Web Unlocker.

**Features:**
- Bright Data Web Unlocker API integration (primary)
- Direct HTTP fetch fallback
- PDF validation with signature detection
- HTML validation with size checks
- SHA-256 content hashing for change detection
- Version tracking (only creates new version if content changed)
- Document tracking in `fmss_sma_fact_sheet_documents`
- Version storage in `fmss_sma_fact_sheet_versions`

**Usage:**

```bash
# Acquire URLs for a single provider
python -m sma_monitoring.acquisition_worker --provider jpmorgan

# Acquire all pending URLs (status='pending')
python -m sma_monitoring.acquisition_worker --all-pending

# Acquire specific URL by ID
python -m sma_monitoring.acquisition_worker --url-id <uuid>
```

**Output:**
- Documents stored in `fmss_sma_fact_sheet_documents` table
- Versions tracked in `fmss_sma_fact_sheet_versions` table
- Files saved to local storage (STORAGE_PATH env var)
- Console output with acquisition stats

**Example:**

```bash
$ python -m sma_monitoring.acquisition_worker --provider blackrock

2026-04-04 03:00:00 - INFO - Starting acquisition for provider: blackrock
2026-04-04 03:00:01 - INFO - Found 12 pending URLs for BlackRock
2026-04-04 03:00:02 - INFO - Fetching: https://www.blackrock.com/us/...fact-sheet.pdf
2026-04-04 03:00:05 - INFO - Downloaded 2.4 MB, hash: a3b2c1d4...
2026-04-04 03:00:06 - INFO - Content changed, creating new version
2026-04-04 03:00:07 - INFO - Saved to storage: blackrock/doc_123/a3b2c1d4.pdf
2026-04-04 03:00:15 - INFO - Acquisition complete: 12 documents, 8 new versions

✅ Acquisition complete:
   Documents acquired: 12
   New versions created: 8
   Unchanged (skipped): 4
   Errors: 0
```

### Parsing Worker (`sma_monitoring/parsing_worker.py`)

Extracts text from PDF fact sheets using PyMuPDF and parses structured fields.

**Features:**
- PyMuPDF (fitz) text extraction from PDF documents
- Deterministic regex-based field extraction
- Multi-pattern matching for common fields (dates, currency, percentages)
- Performance metrics extraction (YTD, 1Y, 3Y, 5Y, 10Y, Inception)
- Parsed data storage in `fmss_sma_parsed_documents`
- PDF metadata extraction (page count, author, creation date)
- Fallback extraction patterns for non-standard layouts

**Extracted Fields:**
- Strategy name (from title or filename)
- Manager name (firm name)
- Inception date
- Assets under management (AUM)
- Minimum investment
- Management fee (basis points and percentage)
- Benchmark
- Performance metrics (YTD, 1Y, 3Y, 5Y, 10Y, Since Inception)
- PDF metadata (page count, author, dates)

**Usage:**

```bash
# Parse documents for a single provider
python -m sma_monitoring.parsing_worker --provider jpmorgan

# Parse all unparsed documents
python -m sma_monitoring.parsing_worker --all-pending

# Parse specific document by ID
python -m sma_monitoring.parsing_worker --document-id <uuid>
```

**Output:**
- Parsed data stored in `fmss_sma_parsed_documents` table
- Raw text (first 50k characters)
- Structured fields (strategy name, fees, performance, etc.)
- Metadata JSON with extraction details
- Console output with parsing stats

**Example:**

```bash
$ python -m sma_monitoring.parsing_worker --provider blackrock

2026-04-04 03:30:00 - INFO - Starting parsing for provider: BlackRock
2026-04-04 03:30:01 - INFO - Found 8 unparsed documents
2026-04-04 03:30:02 - INFO - Parsing document: doc_123 (blackrock/doc_123/a3b2c1d4.pdf)
2026-04-04 03:30:03 - INFO - Extracted 45000 characters from 4 pages
2026-04-04 03:30:04 - INFO - Extracted 9 fields: strategy_name, manager_name, inception_date, aum, minimum_investment, management_fee, benchmark, performance
2026-04-04 03:30:05 - INFO - Saved parsed data for document doc_123
2026-04-04 03:30:20 - INFO - Parsing complete: 8 documents parsed, 0 failures

✅ Parsing complete:
   Documents parsed: 8
   Failures: 0
```

### Change Detection Worker (`sma_monitoring/change_worker.py`)

Detects material changes between document versions using AI-powered semantic analysis.

**Features:**
- Field-level change detection with deterministic comparison
- Significance thresholds for numeric changes (AUM, fees, performance)
- MiniMax M2.7 AI-powered semantic change analysis
- Human-readable change summaries
- Material change classification (low/medium/high severity)
- Advisor action recommendations
- Change event storage in `fmss_sma_change_events`

**Change Detection:**
1. **Text Changes**: Strategy name, manager name, benchmark
2. **Numeric Changes**: AUM (5%+ threshold), fees (5 bps+ threshold), performance (2%+ threshold)
3. **Date Changes**: Inception date modifications
4. **Content Changes**: Document content hash differences

**Significance Thresholds:**
- AUM: 5% relative change
- Minimum investment: 10% relative change
- Management fee: 5 basis points absolute change
- YTD/1Y return: 2-3% absolute change
- 3Y/5Y/10Y return: 1.5-2% absolute change

**Severity Classification:**
- **High**: Major fee changes (≥10 bps), large performance shifts (≥5%), significant AUM changes (≥20%)
- **Medium**: Moderate changes above threshold, manager changes
- **Low**: Minor text updates, formatting changes

**Usage:**

```bash
# Detect changes for a single provider
python -m sma_monitoring.change_worker --provider jpmorgan

# Detect changes for all active documents
python -m sma_monitoring.change_worker --all-active

# Analyze specific document
python -m sma_monitoring.change_worker --document-id <uuid>
```

**Output:**
- Change events stored in `fmss_sma_change_events` table
- Change summary with severity classification
- Material changes list for advisor review
- Recommended actions (if applicable)
- Console output with change detection stats

**Example:**

```bash
$ python -m sma_monitoring.change_worker --provider blackrock

2026-04-04 04:00:00 - INFO - Starting change detection for provider: BlackRock
2026-04-04 04:00:01 - INFO - Found 5 documents with multiple versions
2026-04-04 04:00:02 - INFO - Detecting changes for document: doc_123
2026-04-04 04:00:03 - INFO - Comparing version 1 → 2
2026-04-04 04:00:04 - INFO - Running AI-powered change analysis...
2026-04-04 04:00:07 - INFO - Detected 3 material changes:
   - Management fee increased from 40 bps to 45 bps (HIGH severity)
   - YTD return updated from 8.5% to 11.2%
   - Benchmark changed from S&P 500 to Russell 1000
2026-04-04 04:00:08 - INFO - Saved change event for document doc_123
2026-04-04 04:00:15 - INFO - Change detection complete: 5 documents, 3 changes detected

✅ Change detection complete:
   Documents analyzed: 5
   Changes detected: 3
   Errors: 0
```

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

Workers are scheduled via Railway Cron services. See `RAILWAY_DEPLOYMENT.md` for complete setup guide.

### Cron Schedule Summary

| Job | Schedule | Command | Purpose |
|-----|----------|---------|---------|
| **Discovery** | Mon 4:00 UTC | `python cron_discovery.py` | Discover new fact sheet URLs |
| **Acquisition** | Daily 5:00 UTC | `python cron_acquisition.py` | Download pending documents |
| **Parsing + Change** | Daily 6:00 UTC | `python cron_parsing_change.py` | Parse docs & detect changes |
| **Quarterly Validation** | 1st of quarter | Manual trigger | Full re-crawl validation |

### Cron Entry Points

Three wrapper scripts provide clean entry points for Railway Cron:

- `cron_discovery.py` - Weekly discovery worker
- `cron_acquisition.py` - Daily acquisition worker
- `cron_parsing_change.py` - Daily parsing + change detection (combined)

### Railway Deployment

```bash
# Deploy workers to Railway
cd workers
railway up

# Create 3 separate Cron services in Railway dashboard:
# 1. sma-discovery-cron (0 4 * * 1)
# 2. sma-acquisition-cron (0 5 * * *)
# 3. sma-parsing-change-cron (0 6 * * *)
```

See `RAILWAY_DEPLOYMENT.md` for detailed deployment instructions.

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
