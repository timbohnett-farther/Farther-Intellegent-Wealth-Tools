# Farther Intelligent Wealth Tools — Claude Project Guide

## CRITICAL: Repository Boundaries

**This repository is ONLY for Intelligent Wealth Tools (financial planning & client portal).**

### What BELONGS in THIS Repo (Farther-Intelligent-Wealth-Tools)
✅ PRISM financial planning suite (27+ planning modules)
✅ Client portal (finances, plan view, document vault, life events)
✅ Risk profiling (AI-powered questionnaires)
✅ Tax planning and tax-loss harvesting tools
✅ Box spread calculator (options strategy)
✅ Practice analytics (firm-level advisor tools)
✅ Admin panel (advisors, billing config, compliance, integrations, tax tables)
✅ Update engine (data synchronization & review queues)
✅ HubSpot sync webhooks (integration point only — read-only)

### What DOES NOT Belong Here
❌ Advisor pipeline, onboarding, CRM operations → **Farther-AX**
❌ Billing data, fee analysis, AUM analytics → **farther-billing-portal**
❌ Marketing content, social media, brand center → **Farther-Marketing**

---

## GitHub & Deployment

| Field | Value |
|-------|-------|
| **GitHub** | https://github.com/timbohnett-farther/Farther-Intellegent-Wealth-Tools |
| **Deploy** | Railway (Docker multi-stage) |
| **Local Path** | `C:\Users\tim\Projects\Farther-Intelligent-Wealth-Tools` |

**Note**: The GitHub repo name has a typo ("Intellegent"). Do not change it — deployment links depend on it.

---

## Tech Stack

Next.js 14.2, React 18.3, TypeScript 5.3, Tailwind CSS v4, Tremor Raw, Prisma 7.4 + SQLite (libsql), React Hook Form + Zod, TanStack Table + Query, Lucide React, Anthropic Claude SDK, Zolo AI, Gamma AI, jsPDF, html2canvas, date-fns, decimal.js.

**Styling**: Tailwind v4 with semantic tokens, Tremor Raw components.

---

## Database

SQLite with Prisma 7 + libsql adapter. 41 models (Firm, Advisor, Household, Client, Plan, Portfolio, Goals, TaxLoss, etc.).
- Local dev: `file:./dev.db`
- Production: Railway persistent volume

---

## Key Features

### PRISM Modules (27+)
Goals, Profile, Net Worth, Income, Expenses, Insurance, Medicare, Social Security, Retirement, Education, Business, Equity Comp, Estate, Charitable, Alternatives, Tax, Scenarios, Reports, Present, Plan Builder, Settings.

### Client Portal
Finances, Plan View, Document Vault, Life Event Tracking.

### Admin Tools
Advisor Management, Billing Configuration, Compliance Settings, Integration Config, Tax Table Management, Update Engine with Review Queues.

---

## Command to Return to Work

```bash
cd C:\Users\tim\Projects\Farther-Intelligent-Wealth-Tools
git pull origin main
npm install
npm run dev
```

---

## Development Workflow Rules

### Sprint Completion Protocol
**CRITICAL: Always push to main after completing each sprint.**

After completing any sprint or phase:
1. ✅ Run `npm run build` — if it fails, fix errors before proceeding
2. ✅ Run `npx vitest run` on the affected directory — all tests must pass
3. ✅ Commit all changes with descriptive message
4. ✅ **Immediately push to origin/main** (`git push origin main`)
5. ✅ Verify push succeeded
6. ✅ Update documentation if needed

### Test-Deploy Rule
**CRITICAL: Always test-deploy (build + test) after each build. Only push to main if both pass. If either fails, fix errors first.**

```bash
npm run build          # Must pass with zero errors
npx vitest run         # Must pass with zero test failures
git push origin main   # Only after both checks pass
```

**Rationale:** Ensures work is backed up immediately and available to team. Never leave completed sprints unpushed. Never push broken builds.

---

## Reminder: Cross-Repo Communication

If you need to work on advisor operations, billing analytics, or marketing features, **STOP** and switch to the appropriate repository. Do NOT implement those features here.
