# Deploy FMSS SMA Monitoring to Railway - Execute Now

## Quick Deploy (Choose One Method)

### Method 1: PowerShell Automated Deployment (Recommended for Windows)

```powershell
cd workers
.\deploy-to-railway.ps1
```

This script will:
1. ✅ Link to "Farther Intelligent Wealth" Railway project
2. ✅ Prompt for all API keys (TAVILY, BRIGHT_DATA, MINIMAX, SMTP)
3. ✅ Set environment variables automatically
4. ✅ Deploy workers service
5. ✅ Guide you through cron service creation

**Prerequisites:**
- Have your API keys ready (see below)
- Railway CLI logged in (`railway login` if needed)

---

### Method 2: Manual Railway Dashboard Deployment

If you prefer GUI over CLI, follow: `workers/RAILWAY_QUICKSTART.md`

---

## API Keys You'll Need

Before running deployment, gather these API keys:

| Service | API Key Name | Where to Get |
|---------|-------------|--------------|
| **Tavily** | `TAVILY_API_KEY` | [tavily.com](https://tavily.com) → Dashboard → API Keys |
| **Bright Data** | `BRIGHT_DATA_API_KEY` | [brightdata.com](https://brightdata.com) → Account → API Tokens |
| **MiniMax** | `MINIMAX_API_KEY` | [minimax.chat](https://www.minimax.chat) → API Keys |
| **SMTP** (Optional) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Your email provider |

### SMTP Configuration (Optional - for Email Alerts)

**Gmail Example:**
- SMTP_HOST: `smtp.gmail.com`
- SMTP_PORT: `587`
- SMTP_USER: `your-email@gmail.com`
- SMTP_PASSWORD: `your-app-password` (not regular password - use App Passwords)
- ALERT_FROM_EMAIL: `alerts@yourcompany.com`
- ALERT_TO_EMAILS: `advisor1@company.com,advisor2@company.com`

**Note:** For Gmail, you MUST use "App Passwords" (not your regular password):
1. Go to Google Account → Security → 2-Step Verification
2. Scroll to "App passwords"
3. Generate new app password for "Mail"
4. Use that password as SMTP_PASSWORD

---

## Step-by-Step Manual Deployment (If Not Using Scripts)

### Step 1: Link Railway Project

```bash
cd "C:\Users\tim\Projects\Farther-Intellegent-Wealth-Tools"
railway link
```

When prompted, select: **"Farther Intelligent Wealth"**

### Step 2: Verify Database Exists

```bash
railway service
```

Look for PostgreSQL database service. If not present:

```bash
railway add --plugin postgresql
```

This creates a PostgreSQL database and auto-sets `DATABASE_URL`.

### Step 3: Set Environment Variables

```bash
# Required API keys
railway variables set TAVILY_API_KEY="your_tavily_key_here"
railway variables set BRIGHT_DATA_API_KEY="your_bright_data_key_here"
railway variables set MINIMAX_API_KEY="your_minimax_key_here"
railway variables set STORAGE_PATH="/app/storage/fact_sheets"

# Optional: Email alerts
railway variables set SMTP_HOST="smtp.gmail.com"
railway variables set SMTP_PORT="587"
railway variables set SMTP_USER="your-email@gmail.com"
railway variables set SMTP_PASSWORD="your-app-password"
railway variables set ALERT_FROM_EMAIL="alerts@yourcompany.com"
railway variables set ALERT_TO_EMAILS="advisor1@co.com,advisor2@co.com"
```

### Step 4: Deploy Workers Service

```bash
cd workers
railway up
```

This deploys the Python workers service to Railway.

### Step 5: Create Cron Services (Railway Dashboard)

**Cron services must be created via Railway Dashboard** (not CLI).

Go to: [Railway Dashboard → Farther Intelligent Wealth Project](https://railway.app/project/3679da16-f826-4b02-bb56-f3d4682b5e9d)

#### Service 1: Discovery Cron (Weekly)

1. Click **"+ New"** → **"Empty Service"**
2. Service name: `sma-discovery-cron`
3. **Settings → Deploy:**
   - Root Directory: `workers`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python cron_discovery.py`
4. **Settings → Cron:**
   - ✅ Enable Cron
   - Schedule: `0 4 * * 1` (Every Monday at 4:00 UTC)
5. **Variables:**
   - Click "Raw Editor"
   - Copy all variables from main service

#### Service 2: Acquisition Cron (Daily)

1. Click **"+ New"** → **"Empty Service"**
2. Service name: `sma-acquisition-cron`
3. **Settings → Deploy:**
   - Root Directory: `workers`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python cron_acquisition.py`
4. **Settings → Cron:**
   - ✅ Enable Cron
   - Schedule: `0 5 * * *` (Every day at 5:00 UTC)
5. **Variables:** Copy from main service

#### Service 3: Parsing + Change Cron (Daily)

1. Click **"+ New"** → **"Empty Service"**
2. Service name: `sma-parsing-change-cron`
3. **Settings → Deploy:**
   - Root Directory: `workers`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python cron_parsing_change.py`
4. **Settings → Cron:**
   - ✅ Enable Cron
   - Schedule: `0 6 * * *` (Every day at 6:00 UTC)
5. **Variables:** Copy from main service

#### Service 4: Email Alerts Cron (Optional, Daily)

1. Click **"+ New"** → **"Empty Service"**
2. Service name: `sma-alert-cron`
3. **Settings → Deploy:**
   - Root Directory: `workers`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m sma_monitoring.alert_worker --send-pending`
4. **Settings → Cron:**
   - ✅ Enable Cron
   - Schedule: `0 7 * * *` (Every day at 7:00 UTC)
5. **Variables:** Copy from main service (ensure SMTP vars are set)

### Step 6: Verify Deployment

```bash
# Check deployment status
railway status

# View logs
railway logs

# View cron logs (after scheduled time)
railway logs -s sma-discovery-cron
railway logs -s sma-acquisition-cron
railway logs -s sma-parsing-change-cron
```

### Step 7: Test Manual Run (Optional)

```bash
railway run python -m sma_monitoring.discovery_worker --provider jpmorgan
```

This runs a manual discovery for JPMorgan to verify the system works.

---

## Deployment Verification Checklist

After deployment, verify:

- [ ] **Environment Variables Set** (11 required + 6 optional)
  - [ ] TAVILY_API_KEY
  - [ ] BRIGHT_DATA_API_KEY
  - [ ] MINIMAX_API_KEY
  - [ ] STORAGE_PATH
  - [ ] DATABASE_URL (auto-set by Railway)
  - [ ] SMTP credentials (if using email alerts)

- [ ] **Services Deployed**
  - [ ] Main workers service: Active
  - [ ] sma-discovery-cron: Active, Cron enabled (`0 4 * * 1`)
  - [ ] sma-acquisition-cron: Active, Cron enabled (`0 5 * * *`)
  - [ ] sma-parsing-change-cron: Active, Cron enabled (`0 6 * * *`)
  - [ ] sma-alert-cron: Active, Cron enabled (`0 7 * * *`) - Optional

- [ ] **Database Ready**
  - [ ] PostgreSQL service exists
  - [ ] DATABASE_URL environment variable set
  - [ ] Can connect to database (check logs)

- [ ] **First Runs Scheduled**
  - [ ] Next Monday 4:00 UTC: Discovery worker
  - [ ] Tomorrow 5:00 UTC: Acquisition worker
  - [ ] Tomorrow 6:00 UTC: Parsing/change worker
  - [ ] Tomorrow 7:00 UTC: Alert worker (if enabled)

- [ ] **Admin UI Accessible**
  - [ ] `/admin/sma-runs` - Run history
  - [ ] `/admin/sma-documents` - Document tracking
  - [ ] `/admin/sma-changes` - Change events

- [ ] **Advisor UI Accessible**
  - [ ] `/fmss/sma` - Strategy list
  - [ ] `/fmss/sma/[id]` - Strategy detail
  - [ ] `/fmss/sma/compare` - Comparison tool
  - [ ] `/api/fmss/sma/export?format=csv` - CSV export

---

## What Happens After Deployment

### First Week Timeline

**Day 1 (Deployment Day):**
- ✅ All services deployed
- ⏳ Waiting for first scheduled runs

**Monday 4:00 UTC (Next Monday):**
- 🔄 Discovery worker runs (15-30 minutes)
- Expected: 50-200 new fact sheet URLs discovered
- Check logs: `railway logs -s sma-discovery-cron`

**Daily 5:00 UTC:**
- 🔄 Acquisition worker runs (10-20 minutes)
- Expected: 20-100 PDFs/HTML pages downloaded
- Check logs: `railway logs -s sma-acquisition-cron`

**Daily 6:00 UTC:**
- 🔄 Parsing + Change worker runs (10-15 minutes)
- Expected: 20-100 documents parsed, 5-20 change events
- Check logs: `railway logs -s sma-parsing-change-cron`

**Daily 7:00 UTC:**
- 🔄 Alert worker runs (1-2 minutes)
- Expected: 0-10 high-severity change alert emails
- Check logs: `railway logs -s sma-alert-cron`

### Monitoring First Week

**Day 1-2:**
- Monitor logs for errors
- Verify environment variables are correct
- Check database connectivity

**Day 3-7:**
- Verify data appearing in admin UI
- Check discovery is finding new URLs
- Confirm acquisition is downloading documents
- Validate parsing extracting correct data
- Test email alerts (if configured)

**End of Week 1:**
- Review success rates (target >85%)
- Tune cron schedules if needed
- Adjust API rate limits
- Optimize worker performance

---

## Troubleshooting

### Issue: Cron Not Running

**Symptom:** Service shows "Waiting for next run" indefinitely

**Solution:**
1. Verify cron is **enabled** in Settings → Cron
2. Check schedule syntax (use [crontab.guru](https://crontab.guru))
3. Wait for next scheduled time (may take 24 hours)
4. Check service logs for deployment errors

### Issue: Database Connection Failed

**Symptom:** `Error: connection to server failed`

**Solution:**
1. Verify PostgreSQL database exists in Railway project
2. Check `DATABASE_URL` is set in environment variables
3. Ensure database and services are in same Railway project
4. Check Railway database status (may be sleeping on Hobby plan)

### Issue: API Key Invalid

**Symptom:** `401 Unauthorized` or `Invalid API key`

**Solution:**
1. Verify API keys are correct (no extra spaces)
2. Check API key quotas on provider dashboards
3. Ensure keys are set in **all** services (main + 4 cron services)
4. Test keys manually: `railway run python -c "import os; print(os.getenv('TAVILY_API_KEY'))"`

### Issue: Email Alerts Not Sending

**Symptom:** No emails received

**Solution:**
1. Verify all SMTP variables are set correctly
2. Check `ALERT_TO_EMAILS` format (comma-separated, no spaces)
3. For Gmail: Use "App Passwords", not regular password
4. Check spam/junk folder
5. Review alert worker logs: `railway logs -s sma-alert-cron`

---

## Cost Estimation

### Railway Costs

**Hobby Plan: $5/month**
- 500 execution hours included
- Expected usage: ~15 hours/month
- ✅ **Recommendation:** Start with Hobby plan

**Pro Plan: $20/month + usage**
- Unlimited execution hours (pay per use)
- Needed if: workers timeout frequently or need more resources
- ✅ **Recommendation:** Upgrade only if Hobby plan insufficient

### External API Costs

| Service | Cost Per | Est. Monthly Usage | Monthly Cost |
|---------|----------|-------------------|--------------|
| **Tavily** | $0.005/search | 1,000 searches | $5 |
| **Bright Data** | $0.01/page | 3,000 pages | $30 |
| **MiniMax** | $0.015/1K tokens | 500K tokens | $7.50 |
| **SMTP** | Free (Gmail) | 10,000 emails | $0 |
| **Total** | - | - | **$42.50/month** |

**Total Cost: Railway ($5) + APIs ($42.50) = $47.50/month**

---

## Next Steps After Successful Deployment

1. **Week 1:** Monitor logs daily, verify all runs succeed
2. **Week 2:** Review data quality in admin UI, tune change detection thresholds
3. **Week 3:** Optimize cron schedules based on data freshness needs
4. **Month 1:** Add more providers, implement webhook alerts, scale if needed

---

## Success Criteria

After first week, you should see:

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
- All pages loading
- Data displaying correctly
- Filters working

✅ **Advisor UI:**
- Strategy list populated
- Detail pages functional
- Comparison tool working
- CSV export functional

---

## Get Help

**Documentation:**
- Full deployment guide: `workers/RAILWAY_QUICKSTART.md`
- Detailed architecture: `workers/RAILWAY_DEPLOYMENT.md`
- Worker README: `workers/README.md`

**Railway Resources:**
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Cron Jobs Guide](https://docs.railway.app/reference/cron-jobs)

**API Provider Docs:**
- [Tavily API](https://docs.tavily.com)
- [Bright Data](https://docs.brightdata.com)
- [MiniMax API](https://platform.minimax.chat/document)

---

## Ready to Deploy? 🚀

**Choose your deployment method:**

### Option A: Automated (Recommended)
```powershell
cd workers
.\deploy-to-railway.ps1
```

### Option B: Manual
Follow steps above starting from "Step 1: Link Railway Project"

**Deployment time: 30 minutes**

**Once deployed, FMSS will automatically:**
- Discover new SMA fact sheets every Monday
- Download updated documents daily
- Parse and extract structured data daily
- Detect and alert on material changes daily
- Provide advisor-facing research interface 24/7

**Let's deploy!** 🎉
