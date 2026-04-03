# Railway Deployment Guide - SMA Monitoring Workers

## Overview

The SMA monitoring system consists of Python workers that run on Railway with scheduled cron jobs.

## Railway Project Setup

### 1. Create Railway Service

```bash
# From project root
railway link

# Or create new service
railway init
```

### 2. Configure Environment Variables

Set these in Railway dashboard → Variables:

```bash
DATABASE_URL=postgresql://...  # Auto-provided by Railway Postgres
MINIMAX_API_KEY=your_minimax_api_key
BRIGHT_DATA_API_KEY=your_bright_data_key
TAVILY_API_KEY=your_tavily_api_key
STORAGE_PATH=/app/storage/fact_sheets  # Railway persistent volume path
```

### 3. Add Persistent Volume (Optional)

For PDF/HTML storage:
- Railway Dashboard → Service → Volumes
- Mount path: `/app/storage`
- Size: 10 GB (adjust as needed)

## Cron Job Configuration

Railway supports Cron services via separate deployments. Create **3 separate Railway services** for scheduled jobs.

### Service 1: Weekly Discovery Worker

**Name:** `sma-discovery-cron`

**Cron Schedule:** `0 4 * * 1` (Every Monday at 4:00 UTC)

**Start Command:**
```bash
python -m sma_monitoring.discovery_worker --all-active
```

**Environment Variables:** Same as above

**Purpose:** Discovers new SMA fact sheet URLs from provider websites

**Expected Runtime:** 15-30 minutes

**Expected Output:**
- 50-200 URLs discovered per run
- New URLs stored in `fmss_sma_discovered_urls`
- Run logged in `fmss_sma_provider_runs`

---

### Service 2: Daily Acquisition Worker

**Name:** `sma-acquisition-cron`

**Cron Schedule:** `0 5 * * *` (Every day at 5:00 UTC)

**Start Command:**
```bash
python -m sma_monitoring.acquisition_worker --all-pending
```

**Environment Variables:** Same as above + STORAGE_PATH

**Purpose:** Downloads pending fact sheet PDFs and HTML pages

**Expected Runtime:** 10-20 minutes

**Expected Output:**
- 20-100 documents downloaded per run
- Files stored to persistent volume
- Versions created in `fmss_sma_fact_sheet_versions`

---

### Service 3: Daily Parsing + Change Detection

**Name:** `sma-parsing-change-cron`

**Cron Schedule:** `0 6 * * *` (Every day at 6:00 UTC)

**Start Command:**
```bash
cd /app/workers && \
python -m sma_monitoring.parsing_worker --all-pending && \
python -m sma_monitoring.change_worker --all-active
```

**Environment Variables:** Same as above

**Purpose:** Parses new documents and detects changes

**Expected Runtime:** 10-15 minutes

**Expected Output:**
- 20-100 documents parsed
- 5-20 change events created
- Parsed data in `fmss_sma_parsed_documents`
- Changes in `fmss_sma_change_events`

---

### Service 4: Quarterly Validation (Optional)

**Name:** `sma-validation-cron`

**Cron Schedule:** `0 0 1 */3 *` (1st day of every quarter at midnight UTC)

**Start Command:**
```bash
python -m sma_monitoring.discovery_worker --all-active && \
python -m sma_monitoring.acquisition_worker --all-pending && \
python -m sma_monitoring.parsing_worker --all-pending
```

**Purpose:** Full re-crawl and validation of all providers

**Expected Runtime:** 1-2 hours

---

## Cron Schedule Reference

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday=0)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 5 * * *` - Every day at 5:00 AM UTC
- `0 4 * * 1` - Every Monday at 4:00 AM UTC
- `0 0 1 */3 *` - 1st day of every quarter at midnight UTC
- `*/15 * * * *` - Every 15 minutes
- `0 */6 * * *` - Every 6 hours

---

## Railway Deployment Steps

### Step 1: Deploy Workers to Railway

```bash
# From workers/ directory
cd workers

# Push to Railway
railway up

# Or link to GitHub for automatic deploys
railway link
```

### Step 2: Create Cron Services

For each cron job:

1. **Railway Dashboard** → New Service → Empty Service
2. **Name:** e.g., `sma-discovery-cron`
3. **Settings** → Deploy
   - **Builder:** Nixpacks
   - **Root Directory:** `/workers`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** See cron commands above
4. **Settings** → Cron
   - Enable Cron
   - Set schedule (e.g., `0 4 * * 1`)
5. **Variables** → Copy environment variables from main service

### Step 3: Verify Cron Jobs

Check Railway Logs after scheduled time:

```bash
# View logs for discovery cron
railway logs -s sma-discovery-cron

# View logs for acquisition cron
railway logs -s sma-acquisition-cron
```

---

## Manual Worker Execution

For testing or manual runs:

```bash
# Connect to Railway environment
railway run bash

# Run discovery for single provider
python -m sma_monitoring.discovery_worker --provider jpmorgan

# Run acquisition for pending URLs
python -m sma_monitoring.acquisition_worker --all-pending

# Run parsing for unparsed documents
python -m sma_monitoring.parsing_worker --all-pending

# Run change detection
python -m sma_monitoring.change_worker --all-active
```

---

## Monitoring & Logs

### View Recent Runs

Use admin UI:
- `/admin/sma-runs` - Run history with success/failure rates
- `/admin/sma-documents` - Document tracking
- `/admin/sma-changes` - Change events

### Database Queries

```sql
-- Recent discovery runs
SELECT * FROM fmss_sma_provider_runs
WHERE run_type = 'discovery'
ORDER BY started_at DESC LIMIT 10;

-- Success rate by worker type
SELECT
  run_type,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM fmss_sma_provider_runs
GROUP BY run_type;

-- Recent change events
SELECT * FROM fmss_sma_change_events
ORDER BY detected_at DESC LIMIT 20;
```

---

## Error Handling & Alerts

### Automatic Retry

Railway Cron automatically retries failed jobs based on `restartPolicyMaxRetries: 3` in `railway.json`.

### Alert Configuration (Future)

Integration with:
- Railway notifications (webhook to Slack/Discord)
- Email alerts for high-severity changes
- Dashboard alerts in admin UI

---

## Deployment Checklist

- [ ] Railway project created
- [ ] Environment variables configured
- [ ] Persistent volume mounted (if storing files)
- [ ] Discovery cron service created (Monday 4:00 UTC)
- [ ] Acquisition cron service created (Daily 5:00 UTC)
- [ ] Parsing + change cron service created (Daily 6:00 UTC)
- [ ] Verified first run in logs
- [ ] Admin UI accessible at `/admin/sma-runs`
- [ ] Database tables populated

---

## Troubleshooting

### Cron Not Running

1. Check Railway Logs for errors
2. Verify cron schedule syntax
3. Ensure environment variables are set
4. Check DATABASE_URL is accessible

### Worker Failures

1. Check run logs in `fmss_sma_provider_runs`
2. Verify API keys (Tavily, Bright Data, MiniMax)
3. Check PostgreSQL connection
4. Review Railway service health

### Storage Issues

1. Verify persistent volume is mounted
2. Check STORAGE_PATH environment variable
3. Ensure directory has write permissions
4. Monitor volume usage (Railway dashboard)

---

## Scaling Considerations

### Current Configuration
- Single replica per cron service
- Sequential processing (one provider at a time)
- Expected load: 50 providers, 200-500 documents

### Future Optimization
- Parallel processing with worker pools
- Rate limit handling with exponential backoff
- Batch processing with configurable concurrency
- Horizontal scaling for high-volume providers

---

## Cost Estimation

**Railway Pricing (as of 2024):**
- Hobby Plan: $5/month (500 execution hours)
- Pro Plan: $20/month (usage-based)

**Estimated Usage:**
- Discovery: 30 min/week × 4 = 2 hours/month
- Acquisition: 15 min/day × 30 = 7.5 hours/month
- Parsing: 10 min/day × 30 = 5 hours/month
- **Total:** ~15 hours/month (well within Hobby plan)

**External API Costs:**
- Tavily: $0.005/search (est. $20-50/month)
- Bright Data: $0.01/page (est. $50-100/month)
- MiniMax: $0.015/1K tokens (est. $10-30/month)

---

## Next Steps After Deployment

1. Monitor first week of runs
2. Tune cron schedules based on data freshness needs
3. Implement alert webhooks for high-severity changes
4. Add retry logic for transient failures
5. Optimize worker performance based on logs
6. Consider Phase 8: FMSS Surface Integration
