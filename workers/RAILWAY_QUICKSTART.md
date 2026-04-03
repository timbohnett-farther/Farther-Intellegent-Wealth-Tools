# Railway Deployment Quick Start Guide

**FMSS SMA Monitoring System** - Complete Railway deployment in 30 minutes

---

## Prerequisites

- [ ] Railway account ([railway.app](https://railway.app))
- [ ] GitHub repository connected
- [ ] Railway CLI installed (optional): `npm install -g @railway/cli`

### Required API Keys

- **TAVILY_API_KEY** - Web discovery ([tavily.com](https://tavily.com))
- **BRIGHT_DATA_API_KEY** - Web scraping ([brightdata.com](https://brightdata.com))
- **MINIMAX_API_KEY** - AI change detection ([minimax.chat](https://www.minimax.chat))
- **SMTP Credentials** - Email alerts (optional)

---

## Deployment Methods

### Option A: Automated Deployment (Recommended)

**Windows (PowerShell):**
```powershell
cd workers
.\deploy-to-railway.ps1
```

**Mac/Linux (Bash):**
```bash
cd workers
chmod +x deploy-to-railway.sh
./deploy-to-railway.sh
```

### Option B: Manual Deployment (Step-by-Step)

Follow the steps below for manual Railway Dashboard configuration.

---

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose: `Farther-Intellegent-Wealth-Tools`
5. Wait for initial deployment

---

## Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway automatically sets `DATABASE_URL` environment variable
4. ✅ Database ready (no manual configuration needed)

---

## Step 3: Configure Environment Variables

1. Click on your main service (the one that deployed from GitHub)
2. Go to **"Variables"** tab
3. Add the following variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `TAVILY_API_KEY` | `your_key_here` | Web discovery API |
| `BRIGHT_DATA_API_KEY` | `your_key_here` | Web scraping API |
| `MINIMAX_API_KEY` | `your_key_here` | AI change detection |
| `STORAGE_PATH` | `/app/storage/fact_sheets` | PDF/HTML storage path |

**Optional (for email alerts):**

| Variable | Value | Description |
|----------|-------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `587` | SMTP port (TLS) |
| `SMTP_USER` | `your@email.com` | SMTP username |
| `SMTP_PASSWORD` | `your_password` | SMTP password |
| `ALERT_FROM_EMAIL` | `alerts@yourcompany.com` | From email |
| `ALERT_TO_EMAILS` | `advisor1@co.com,advisor2@co.com` | Comma-separated recipients |

4. Click **"Add"** for each variable
5. Service will automatically redeploy with new variables

---

## Step 4: Add Persistent Volume (Optional)

For PDF/HTML file storage:

1. Click on your main service
2. Go to **"Volumes"** tab
3. Click **"+ New Volume"**
4. Configure:
   - **Mount Path:** `/app/storage`
   - **Size:** `10 GB` (adjust as needed)
5. Click **"Add"**
6. Service will redeploy with mounted volume

---

## Step 5: Configure Root Directory

1. Click on your service
2. Go to **"Settings"** → **"Deploy"**
3. Set **Root Directory:** `workers`
4. Set **Build Command:** `pip install -r requirements.txt`
5. Click **"Save"**
6. Service will redeploy

---

## Step 6: Create Cron Services

Railway requires separate services for each cron job. Create **3 cron services**:

### Service 1: Discovery Worker (Weekly)

1. In project, click **"+ New"** → **"Empty Service"**
2. Name: `sma-discovery-cron`
3. **Settings → Deploy:**
   - **Builder:** Nixpacks
   - **Root Directory:** `workers`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python cron_discovery.py`
4. **Settings → Cron:**
   - ✅ Enable Cron
   - **Schedule:** `0 4 * * 1` (Monday 4:00 UTC)
5. **Variables:**
   - Click "Copy from service" → Select main service
   - Or manually copy all environment variables
6. Click **"Deploy"**

### Service 2: Acquisition Worker (Daily)

1. Click **"+ New"** → **"Empty Service"**
2. Name: `sma-acquisition-cron`
3. **Settings → Deploy:**
   - **Builder:** Nixpacks
   - **Root Directory:** `workers`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python cron_acquisition.py`
4. **Settings → Cron:**
   - ✅ Enable Cron
   - **Schedule:** `0 5 * * *` (Daily 5:00 UTC)
5. **Variables:** Copy from main service
6. Click **"Deploy"**

### Service 3: Parsing + Change Worker (Daily)

1. Click **"+ New"** → **"Empty Service"**
2. Name: `sma-parsing-change-cron`
3. **Settings → Deploy:**
   - **Builder:** Nixpacks
   - **Root Directory:** `workers`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python cron_parsing_change.py`
4. **Settings → Cron:**
   - ✅ Enable Cron
   - **Schedule:** `0 6 * * *` (Daily 6:00 UTC)
5. **Variables:** Copy from main service
6. Click **"Deploy"**

### Service 4: Email Alerts (Optional, Daily)

1. Click **"+ New"** → **"Empty Service"**
2. Name: `sma-alert-cron`
3. **Settings → Deploy:**
   - **Builder:** Nixpacks
   - **Root Directory:** `workers`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python -m sma_monitoring.alert_worker --send-pending`
4. **Settings → Cron:**
   - ✅ Enable Cron
   - **Schedule:** `0 7 * * *` (Daily 7:00 UTC)
5. **Variables:** Copy from main service (ensure SMTP vars are set)
6. Click **"Deploy"**

---

## Step 7: Verify Deployment

### Check Service Status

1. Go to Railway Dashboard
2. All services should show **"Active"** status
3. Click on each service to view logs

### View Logs

Click on any service → **"Logs"** tab to see real-time output.

**What to look for:**
- ✅ `INFO - Starting worker...`
- ✅ `INFO - Connected to database`
- ✅ `INFO - Worker completed successfully`

**Common errors:**
- ❌ `Error: DATABASE_URL not set` → Check environment variables
- ❌ `Error: Invalid API key` → Verify API keys are correct
- ❌ `ModuleNotFoundError` → Check build command and requirements.txt

### Test Manual Run (Optional)

Using Railway CLI:

```bash
railway link  # Link to your project
railway run python -m sma_monitoring.discovery_worker --provider jpmorgan
```

This will run a manual discovery for JPMorgan to test the system.

---

## Step 8: Monitor First Cron Runs

### Cron Schedule Summary

| Service | Schedule | Time (UTC) | Frequency |
|---------|----------|------------|-----------|
| Discovery | `0 4 * * 1` | Mon 4:00 AM | Weekly |
| Acquisition | `0 5 * * *` | Daily 5:00 AM | Daily |
| Parsing/Change | `0 6 * * *` | Daily 6:00 AM | Daily |
| Alerts | `0 7 * * *` | Daily 7:00 AM | Daily |

### What Happens Each Run

**Discovery (Monday 4:00 UTC):**
- Searches for new SMA fact sheet URLs on provider websites
- Expected: 50-200 new URLs discovered
- Runtime: 15-30 minutes
- Output: New rows in `fmss_sma_discovered_urls`

**Acquisition (Daily 5:00 UTC):**
- Downloads pending PDFs and HTML pages
- Expected: 20-100 documents downloaded
- Runtime: 10-20 minutes
- Output: Files in persistent volume, rows in `fmss_sma_fact_sheet_versions`

**Parsing + Change (Daily 6:00 UTC):**
- Parses new documents to extract structured data
- Detects changes between versions using AI
- Expected: 20-100 parsed documents, 5-20 change events
- Runtime: 10-15 minutes
- Output: Rows in `fmss_sma_parsed_documents` and `fmss_sma_change_events`

**Alerts (Daily 7:00 UTC):**
- Sends email notifications for high-severity changes
- Expected: 0-10 emails sent (only high-severity)
- Runtime: 1-2 minutes
- Output: Rows in `fmss_sma_document_alerts`

---

## Step 9: Access Admin UI

Once deployment is complete and first run finishes:

1. Go to your main Next.js app URL (e.g., `your-app.railway.app`)
2. Navigate to admin pages:

| Page | URL | Purpose |
|------|-----|---------|
| **Run History** | `/admin/sma-runs` | View worker execution history |
| **Documents** | `/admin/sma-documents` | Track downloaded fact sheets |
| **Changes** | `/admin/sma-changes` | View detected changes |

### Admin Dashboard Features

**Run History (`/admin/sma-runs`):**
- View all discovery, acquisition, parsing, and change detection runs
- Filter by worker type and status
- See success/failure rates
- Click on run to view detailed logs

**Documents (`/admin/sma-documents`):**
- List all tracked SMA fact sheet documents
- See parsing status (pending, success, failed)
- View version count (how many times document has changed)
- Filter by provider

**Changes (`/admin/sma-changes`):**
- Feed of all detected changes
- Severity badges (low, medium, high)
- Material changes summary
- Field-level change comparison
- Link to strategy detail page

---

## Step 10: Access Advisor UI

FMSS advisor-facing pages:

| Page | URL | Purpose |
|------|-----|---------|
| **Strategy List** | `/fmss/sma` | Browse all SMA strategies |
| **Strategy Detail** | `/fmss/sma/[id]` | Full strategy profile with change history |
| **Comparison** | `/fmss/sma/compare?ids=...` | Side-by-side comparison |
| **Export** | `/api/fmss/sma/export?format=csv` | CSV export |

---

## Troubleshooting

### Cron Jobs Not Running

**Problem:** Cron service shows "Waiting for next run"

**Solution:**
1. Check cron schedule syntax (use [crontab.guru](https://crontab.guru))
2. Verify service has **Cron enabled** in Settings
3. Wait for next scheduled time (may take 24 hours for daily jobs)
4. Check Railway service logs for errors

### Database Connection Errors

**Problem:** `Error: connection to server failed`

**Solution:**
1. Verify PostgreSQL database is added to project
2. Check `DATABASE_URL` is set in environment variables
3. Ensure database and service are in same Railway project
4. Check Railway database status (may be sleeping on Hobby plan)

### API Key Errors

**Problem:** `Invalid API key` or `Unauthorized`

**Solution:**
1. Verify API keys are correct (no extra spaces)
2. Check API key quotas/limits on provider dashboards
3. Ensure keys are set in **all services** (main + 3 cron services)
4. Test keys manually via Railway CLI: `railway run python test_api.py`

### File Storage Errors

**Problem:** `Permission denied` or `No such file or directory`

**Solution:**
1. Verify persistent volume is mounted at `/app/storage`
2. Check `STORAGE_PATH` environment variable matches mount path
3. Ensure volume has enough space (check Railway dashboard)
4. Check volume is attached to correct service

### Email Alerts Not Sending

**Problem:** Alerts not arriving in inbox

**Solution:**
1. Verify all SMTP variables are set correctly
2. Check `ALERT_TO_EMAILS` format (comma-separated, no spaces)
3. Test SMTP credentials outside Railway
4. Check spam/junk folder
5. Review alert worker logs for send failures
6. For Gmail: Enable "App Passwords" (not regular password)

---

## Next Steps After Deployment

### Week 1: Monitor & Tune

- [ ] Check logs daily for first week
- [ ] Verify run success rates >90%
- [ ] Confirm data is appearing in admin UI
- [ ] Test email alerts (trigger manual high-severity change)

### Week 2: Optimize

- [ ] Adjust cron schedules based on data freshness needs
- [ ] Tune change detection sensitivity thresholds
- [ ] Add more providers to discovery list
- [ ] Configure alert filtering (reduce noise)

### Month 1: Scale

- [ ] Review API usage and costs
- [ ] Optimize worker performance (parallel processing)
- [ ] Add retry logic for transient failures
- [ ] Implement webhook alerts to Slack/Discord

---

## Cost Estimation

### Railway Costs

**Hobby Plan ($5/month):**
- 500 execution hours
- Expected usage: ~15 hours/month
- **Recommendation:** Start with Hobby plan

**Pro Plan ($20/month + usage):**
- Usage-based billing
- Needed if: >500 hours/month or require more resources
- **Recommendation:** Upgrade if workers consistently timeout

### External API Costs

| Service | Rate | Estimated Usage | Monthly Cost |
|---------|------|----------------|--------------|
| **Tavily** | $0.005/search | 1,000 searches | $5-10 |
| **Bright Data** | $0.01/page | 3,000 pages | $30-50 |
| **MiniMax** | $0.015/1K tokens | 500K tokens | $7-15 |
| **Total** | - | - | **$42-75/month** |

**Cost Optimization Tips:**
- Cache Tavily search results (7-day TTL)
- Batch Bright Data requests (reduce API calls)
- Only run change detection on updated documents
- Use PostgreSQL for deduplication (avoid re-downloading)

---

## Support & Resources

### Documentation

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md) - Full deployment reference
- [Workers README](./README.md) - Worker architecture and usage
- [PLAN_LOG.md](../PLAN_LOG.md) - Development history and phases

### Railway Resources

- [Railway Docs](https://docs.railway.app) - Official Railway documentation
- [Railway Discord](https://discord.gg/railway) - Community support
- [Cron Jobs Guide](https://docs.railway.app/reference/cron-jobs) - Cron configuration

### API Provider Docs

- [Tavily API](https://docs.tavily.com) - Web discovery
- [Bright Data](https://docs.brightdata.com) - Web scraping
- [MiniMax API](https://platform.minimax.chat/document) - AI models

---

## Deployment Checklist

Use this checklist to track deployment progress:

### Infrastructure Setup
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] Railway CLI installed (optional)

### Database & Storage
- [ ] PostgreSQL database added
- [ ] Persistent volume configured (optional)
- [ ] DATABASE_URL auto-provided

### Environment Variables
- [ ] TAVILY_API_KEY set
- [ ] BRIGHT_DATA_API_KEY set
- [ ] MINIMAX_API_KEY set
- [ ] STORAGE_PATH set
- [ ] SMTP credentials set (if using email alerts)

### Service Deployment
- [ ] Main workers service deployed
- [ ] Discovery cron service created
- [ ] Acquisition cron service created
- [ ] Parsing/change cron service created
- [ ] Alert cron service created (optional)

### Cron Configuration
- [ ] Discovery: Monday 4:00 UTC (`0 4 * * 1`)
- [ ] Acquisition: Daily 5:00 UTC (`0 5 * * *`)
- [ ] Parsing/Change: Daily 6:00 UTC (`0 6 * * *`)
- [ ] Alerts: Daily 7:00 UTC (`0 7 * * *`)

### Verification
- [ ] All services show "Active" status
- [ ] Logs show successful execution
- [ ] Admin UI accessible
- [ ] Data appearing in database
- [ ] Email alerts working (if configured)

### Monitoring
- [ ] First discovery run completed
- [ ] First acquisition run completed
- [ ] First parsing run completed
- [ ] Change events detected
- [ ] Alerts sent (if any high-severity changes)

---

## Success Metrics

After first week of operation, verify:

✅ **Discovery Worker:**
- 100+ new URLs discovered
- Success rate >90%
- Runtime <30 minutes

✅ **Acquisition Worker:**
- 50+ documents downloaded
- Success rate >85%
- Runtime <20 minutes

✅ **Parsing Worker:**
- 50+ documents parsed
- Success rate >80%
- Runtime <15 minutes

✅ **Change Detection:**
- 10+ change events created
- High-severity changes <5%
- AI summaries accurate

✅ **Admin UI:**
- All pages loading correctly
- Data displaying accurately
- Filters and search working

✅ **Advisor UI:**
- Strategy list populated
- Detail pages loading
- Comparison tool working
- CSV export functional

---

## Congratulations! 🎉

Your FMSS SMA Monitoring System is now live on Railway!

**What you've deployed:**
- ✅ Automated SMA fact sheet monitoring
- ✅ AI-powered change detection
- ✅ Email alerts for material changes
- ✅ Admin operations dashboard
- ✅ Advisor research interface
- ✅ Scheduled data pipeline (cron jobs)

**Next:** Monitor first week of runs and optimize based on results.
