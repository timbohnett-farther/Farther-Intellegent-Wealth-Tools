# Deployment Guide
## Farther-Intelligent-Wealth-Tools

**Last Updated:** 2026-04-01

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Steps](#deployment-steps)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedure](#rollback-procedure)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Common Issues](#common-issues)

---

## Pre-Deployment Checklist

**Run before EVERY production deploy:**

### Build & Tests
- [ ] `npm run build` exits 0 (no TypeScript errors)
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] `npm run test` shows 0 failed tests (all 1273+ tests pass)
- [ ] Test coverage ≥ 70% (check `npm run test -- --coverage`)
- [ ] No security vulnerabilities: `npm audit --audit-level=high` passes
- [ ] ESLint passes: `npm run lint`

### Database
- [ ] `npx prisma migrate status` shows all migrations applied
- [ ] No uncommitted schema changes in `prisma/schema.prisma`
- [ ] Railway volume `/app/data` configured (1GB minimum, 10GB recommended)
- [ ] Latest database backup exists (check Railway snapshots)
- [ ] Migration tested on staging environment

### Configuration
- [ ] All required environment variables set in Railway dashboard
- [ ] `railway.toml` healthcheck points to `/api/health`
- [ ] Health endpoint returns 200 on staging
- [ ] No secrets committed to repository (verify with `git log -S "API_KEY"`)

### Code Quality
- [ ] No `console.log` in production code (use `logger` instead)
- [ ] No hardcoded secrets or API keys
- [ ] Critical routes have Zod validation
- [ ] Error boundaries in place for UI components

### Communication
- [ ] Team notified of deployment window
- [ ] Changelog/release notes prepared
- [ ] Stakeholders informed of new features/changes

---

## Environment Configuration

### Required Environment Variables

**Railway dashboard → Project → Variables:**

```bash
# === REQUIRED ===
DATABASE_URL="file:/app/data/prod.db"  # Auto-set by Railway volume
NODE_ENV=production
PORT=3000  # Auto-set by Railway

# === REQUIRED FOR AI FEATURES ===
AI_API_KEY=sk-ant-...  # Anthropic API key
# OR
ANTHROPIC_API_KEY=sk-ant-...  # Alternative key name

# === OPTIONAL - INTEGRATIONS ===
HUBSPOT_API_KEY=pat-...  # HubSpot Private App token
HUBSPOT_CLIENT_SECRET=...  # For webhook signature verification
ENABLE_HUBSPOT_SYNC=true  # Feature flag

# === OPTIONAL - AI PROVIDERS ===
AI_ZOLO_KEY=...  # Zolo AI integration
GAMMA_API_KEY=...  # Gamma AI integration
AI_MODEL=claude-sonnet-4-20250514
AI_BASE_URL=https://api.anthropic.com

# === OPTIONAL - OBSERVABILITY ===
LOG_LEVEL=info  # debug|info|warn|error
SENTRY_DSN=...  # Error tracking (if enabled)
```

### Railway Volume Configuration (CRITICAL)

**SQLite database requires persistent storage:**

1. Railway Dashboard → Project Settings → Volumes
2. Add New Volume
3. **Mount Path:** `/app/data`
4. **Size:** 1GB minimum (10GB recommended for production)
5. Save and redeploy

**Without this volume, ALL DATA IS LOST on container restart.**

**Verification:**
```bash
railway run ls -la /app/data
# Should show: prod.db file
```

---

## Deployment Steps

### Staging Deployment

**Always deploy to staging first:**

1. **Create deployment branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b deploy/staging-$(date +%Y%m%d)
   ```

2. **Push to staging:**
   ```bash
   git push origin deploy/staging-$(date +%Y%m%d)
   ```

3. **Monitor CI pipeline:**
   - Navigate to GitHub Actions
   - Verify all checks pass (build, tests, lint, security)
   - Check deployment status in Railway dashboard

4. **Run smoke tests:**
   ```bash
   # Set staging URL
   export STAGING_URL="https://farther-wealth-staging.railway.app"

   # Test health endpoint
   curl -f $STAGING_URL/api/health
   # Should return: {"status":"healthy","database":"connected"}

   # Test home page
   curl -f $STAGING_URL/
   # Should return: 200 OK

   # Test critical API endpoint
   curl -f $STAGING_URL/api/prism/tax-tables
   # Should return: JSON with tax tables
   ```

5. **Manual verification:**
   - Log in to application
   - Create test household
   - Run tax calculation
   - Generate opportunity report
   - Create scenario
   - Verify all features work end-to-end

6. **Review logs:**
   ```bash
   railway logs --tail 100 --project farther-wealth-staging

   # Look for:
   # ✓ "prisma migrate deploy" success
   # ✓ "Database verified"
   # ✓ "Starting Next.js server"
   # ✗ No error stack traces
   ```

### Production Deployment

**Only after staging validation passes:**

1. **Create production PR:**
   ```bash
   git checkout main
   git merge deploy/staging-$(date +%Y%m%d)
   git push origin main
   ```

2. **Approve deployment:**
   - Railway auto-deploys on push to `main`
   - Or manually trigger: `railway up --environment production`

3. **Monitor deployment:**
   ```bash
   railway logs --tail 100 --environment production

   # Watch for:
   # - Migration success
   # - Server startup
   # - First health check passing
   ```

4. **Run production smoke tests:**
   ```bash
   export PROD_URL="https://farther-wealth.railway.app"

   # Critical path verification
   curl -f $PROD_URL/api/health
   curl -f $PROD_URL/
   curl -f $PROD_URL/api/prism/tax-tables

   # Monitor response times
   time curl -f $PROD_URL/api/health
   # Should be < 500ms
   ```

5. **Verify metrics:**
   - Railway Dashboard → Metrics
   - Check: CPU < 50%, Memory < 512MB, Response time < 500ms p95
   - No error spikes in logs

---

## Post-Deployment Verification

**Complete within 30 minutes of deployment:**

### Deployment Status
- [ ] Railway deployment status: **SUCCESS** (not CRASHED/FAILED)
- [ ] Container started within 60 seconds
- [ ] No restart loops (check Railway dashboard)
- [ ] Migrations applied successfully:
  ```bash
  railway logs | grep "prisma migrate deploy"
  # Should show: "Migrations applied successfully"
  ```

### Health Checks
- [ ] Health endpoint returns 200:
  ```bash
  curl -f https://farther-wealth.railway.app/api/health
  # Expected: {"status":"healthy","database":"connected"}
  ```
- [ ] Railway healthcheck passing (dashboard shows green)
- [ ] All required env vars loaded (check health response)

### Critical User Flows (E2E Smoke Tests)
- [ ] **Home page loads:** Visit `/` - renders without errors
- [ ] **Advisor can log in:** PRISM login flow works
- [ ] **Create household:** POST `/api/prism/households` succeeds
- [ ] **Run tax calculation:** Calculation completes in < 5s
- [ ] **Generate opportunity:** AI summary generated
- [ ] **Create scenario:** Scenario calculation succeeds
- [ ] **Client portal loads:** `/client` renders correctly

### Performance Metrics
- [ ] Response times < 500ms p95 (check Railway metrics)
- [ ] Memory usage < 512MB (check Railway dashboard)
- [ ] CPU usage < 50% idle
- [ ] No error spikes in logs (Railway logs panel)
- [ ] Database queries < 100ms average

### Data Integrity
- [ ] Database file size matches pre-deploy (no corruption)
- [ ] Sample household data persists (check known household ID)
- [ ] No duplicate records created (spot check Prisma queries)
- [ ] Migration history table accurate

### Monitoring & Alerts
- [ ] Railway alerts configured (CPU, memory, errors)
- [ ] Error tracking active (Sentry/logging service)
- [ ] Deployment notification sent to team (Slack/email)
- [ ] Metrics baseline recorded for comparison

---

## Rollback Procedure

### When to Rollback

Immediately rollback if:
- Health checks failing
- Error rate > 5%
- Response times > 2s p95
- Critical user flows broken
- Database corruption detected
- Memory/CPU exhaustion

### Rollback Steps

#### Option 1: Railway Dashboard (Fastest)

1. **Navigate to deployments:**
   - Railway Dashboard → Project → Deployments
   - Find previous working deployment (marked with ✓)

2. **Rollback:**
   - Click "⋮" menu on working deployment
   - Select "Redeploy"
   - Confirm rollback

3. **Verify:**
   - Wait for deployment to complete (~2 min)
   - Check health endpoint
   - Verify critical flows work

**Time to rollback: ~3 minutes**

#### Option 2: Git Revert (Most Reliable)

1. **Revert code:**
   ```bash
   git checkout main
   git revert HEAD --no-edit
   git push origin main
   # Railway auto-deploys reverted code
   ```

2. **Database rollback (if needed):**
   ```bash
   # If migration broke production:

   # 1. Download latest backup
   railway volumes download /app/data/prod.db --output backup.db

   # 2. Stop service temporarily
   railway down

   # 3. Restore from backup
   railway volumes upload backup.db --path /app/data/prod.db

   # 4. Restart service
   railway up
   ```

3. **Verify rollback:**
   ```bash
   curl -f https://farther-wealth.railway.app/api/health
   # Run full smoke test suite
   ```

**Time to rollback: ~10 minutes** (includes DB restore)

#### Option 3: Emergency Database Restore

**If database corrupted and code rollback insufficient:**

1. **Stop application:**
   ```bash
   railway down
   ```

2. **Restore from Railway snapshot:**
   - Railway Dashboard → Volumes → Snapshots
   - Select latest working snapshot (< 24 hours old)
   - Click "Restore"
   - Confirm restoration

3. **Restart application:**
   ```bash
   railway up
   ```

4. **Verify data integrity:**
   ```bash
   # Check known household exists
   curl https://farther-wealth.railway.app/api/prism/households/{known-id}
   ```

**Time to rollback: ~15 minutes** (includes snapshot restore)

### Post-Rollback Actions

After successful rollback:

1. **Incident report:**
   - Document what failed
   - Root cause analysis
   - Steps to prevent recurrence

2. **Fix forward:**
   - Create hotfix branch
   - Fix root cause
   - Deploy to staging first
   - Full validation before production

3. **Team communication:**
   - Notify stakeholders of rollback
   - Explain what broke
   - Provide timeline for fix

---

## Monitoring & Alerts

### Railway Metrics to Monitor

**Dashboard: Railway Project → Metrics**

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| CPU Usage | < 50% | > 80% for 5 min |
| Memory Usage | < 512MB | > 768MB |
| Response Time (p95) | < 500ms | > 2s |
| Error Rate | < 1% | > 5% |
| Request Rate | 10-100 req/s | > 500 req/s |

### Alerts to Configure

**Via Railway Dashboard → Settings → Notifications:**

1. **Critical:**
   - Health check failing (3 consecutive failures)
   - Memory > 80% for 5 minutes
   - Deployment failed
   - Service crashed

2. **Warning:**
   - CPU > 70% for 10 minutes
   - Response time p95 > 1s
   - Error rate > 2%

3. **Info:**
   - Deployment started
   - Deployment completed
   - Volume usage > 80%

### Log Monitoring

**View logs:**
```bash
railway logs --tail 500 --environment production

# Filter for errors
railway logs --tail 500 | grep -i "error"

# Filter for slow queries
railway logs --tail 500 | grep -i "slow query"

# Monitor health checks
railway logs --tail 100 --follow | grep "/api/health"
```

**Key log patterns to monitor:**

- ✅ `[Health Check] Database connected`
- ✅ `[Cache Hit]` vs `[Cache Miss]` ratio
- ⚠️ `[Retry] Attempt N/3 failed` (API retry warnings)
- 🚨 `FATAL: Database migration failed`
- 🚨 `TypeError:` / `ReferenceError:` (code errors)
- 🚨 `ECONNREFUSED` (database connection failed)

---

## Common Issues

### Issue: "Build Failed - TypeScript Errors"

**Symptoms:**
- Railway deployment fails
- Build logs show TypeScript errors

**Solution:**
```bash
# Locally verify build passes
npm run build
npx tsc --noEmit

# If errors found, fix them before pushing
# Regenerate Prisma client if needed:
npx prisma generate
```

---

### Issue: "Health Check Failing - Service Keeps Restarting"

**Symptoms:**
- Railway shows "CRASHED" status
- Logs show repeated restart attempts
- Health endpoint not responding

**Solution:**
```bash
# Check logs for startup errors
railway logs --tail 100

# Common causes:
# 1. Database migration failed
#    → Check: grep "prisma migrate" logs
#    → Fix: Verify migrations in prisma/migrations/

# 2. Missing environment variable
#    → Check: grep "Missing required" logs
#    → Fix: Set var in Railway dashboard

# 3. Port binding issue
#    → Check: grep "EADDRINUSE" logs
#    → Fix: Verify PORT env var is set correctly
```

---

### Issue: "Database Lost After Deployment"

**Symptoms:**
- All data missing after deploy
- Empty database on startup
- Household/plan data disappeared

**Solution:**
```bash
# 1. Verify Railway volume is configured
railway volumes list
# Should show: /app/data → [volume-id]

# 2. If no volume exists, configure it immediately:
#    Railway Dashboard → Settings → Volumes
#    Add volume: /app/data (10GB)

# 3. Restore from backup (if available)
railway volumes download /app/data/prod.db

# 4. If no backup, data is unrecoverable
#    Implement backup strategy immediately (see REMEDIATION_PLAN.md Sprint 7)
```

---

### Issue: "API Rate Limiting Errors"

**Symptoms:**
- 429 Too Many Requests errors
- AI features failing intermittently
- HubSpot sync timing out

**Solution:**
```bash
# 1. Check rate limit configuration
grep -r "RateLimiter" src/lib/api/

# 2. Increase limits if legitimate traffic
# src/lib/api/rate-limiter.ts:
# aiRateLimiter = new RateLimiter({ points: 40, duration: 60 })

# 3. Check for abuse/bot traffic
railway logs | grep "429"
# Look for: Repeated IPs, unusual patterns
```

---

### Issue: "Slow Response Times"

**Symptoms:**
- Response times > 2s
- Timeout errors
- Poor user experience

**Solution:**
```bash
# 1. Check Railway metrics for CPU/memory usage
railway metrics

# 2. Enable cache if disabled
# Verify cache hit rate in logs:
railway logs | grep "Cache Hit"

# 3. Check for N+1 query issues
railway logs | grep "slow query"

# 4. Consider scaling up (Railway dashboard)
#    → Increase memory/CPU allocation
```

---

## Deployment Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRE-DEPLOYMENT                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. Run tests locally ✓                                          │
│ 2. Verify build passes ✓                                        │
│ 3. Check pre-deployment checklist ✓                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STAGING DEPLOYMENT                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Push to staging branch                                       │
│ 2. CI runs (build, test, lint) → MUST PASS                      │
│ 3. Railway auto-deploys to staging                              │
│ 4. Run smoke tests on staging                                   │
│ 5. Manual verification                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
                 STAGING OK?
                      │
              ┌───────┴───────┐
              NO              YES
              │               │
              ▼               ▼
        FIX ISSUES      ┌─────────────────────────────────────────┐
        & RETRY         │      PRODUCTION DEPLOYMENT               │
                        ├─────────────────────────────────────────┤
                        │ 1. Merge to main                         │
                        │ 2. Railway auto-deploys                  │
                        │ 3. Monitor health checks                 │
                        │ 4. Run production smoke tests            │
                        └─────────────────┬───────────────────────┘
                                          │
                                          ▼
                                    PROD OK?
                                          │
                                  ┌───────┴───────┐
                                  NO              YES
                                  │               │
                                  ▼               ▼
                            ROLLBACK        ┌─────────────────────┐
                            (3 min)         │  POST-DEPLOYMENT    │
                                            ├─────────────────────┤
                                            │ 1. Verify metrics   │
                                            │ 2. Monitor logs     │
                                            │ 3. Notify team      │
                                            │ 4. Update changelog │
                                            └─────────────────────┘
```

---

## Quick Reference

### Deploy to Staging
```bash
git checkout -b deploy/staging-$(date +%Y%m%d)
git push origin deploy/staging-$(date +%Y%m%d)
# Monitor CI, verify staging
```

### Deploy to Production
```bash
git checkout main
git merge deploy/staging-$(date +%Y%m%d)
git push origin main
# Monitor Railway, run smoke tests
```

### Emergency Rollback
```bash
# Option 1: Railway dashboard (fastest)
# Deployments → Previous → Redeploy

# Option 2: Git revert
git revert HEAD --no-edit
git push origin main
```

### Check Health
```bash
curl https://farther-wealth.railway.app/api/health
```

### View Logs
```bash
railway logs --tail 100 --follow
```

---

**For questions or incidents, contact:**
- **On-call Engineer:** [Slack: #engineering-oncall]
- **DevOps Lead:** [Email: devops@farther.com]
- **CTO:** [Emergency only]

---

*Last Updated: 2026-04-01*
