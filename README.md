# Farther Intelligent Wealth Tools

Comprehensive wealth planning and portfolio management platform for Farther RIA advisors. Financial planning (PRISM), tax optimization, risk profiling, client portal, and AI-powered advisory tools.

---

## Part of the Farther Platform

This is 1 of 4 interconnected Farther projects. Each is a standalone app today, designed to eventually unify into a single platform.

| Project | Repo | Purpose |
|---------|------|---------|
| **AX Command Center** | `Farther-AX` | Advisor pipeline, onboarding, CRM operations |
| **Billing Portal** | `farther-billing-portal` | Billing analytics, BI dashboards, fee analysis |
| **Marketing Command Center** | `Farther-Marketing` | AI marketing ops, content creation, compliance |
| **Intelligent Wealth Tools** (this) | `Farther-Intellegent-Wealth-Tools` | Financial planning, tax optimization, client portal |

**Integration points**: Wealth Tools is the advisor-facing platform for client relationships. Household/client data can sync with HubSpot (shared with AX). AUM data feeds into Billing analytics. Advisor profiles originate in AX and are referenced here for practice management.

---

## What Belongs in This Repo

| Yes | No |
|-----|-----|
| PRISM (financial planning suite) | Advisor pipeline, onboarding |
| Tax planning, tax-loss harvesting | Billing data, fee analysis |
| Risk profiling (AI questionnaires) | Marketing content, social media |
| Client portal (finances, vault, life events) | |
| Box spread calculator | |
| Practice analytics (firm-level advisor tools) | |
| Admin (tax tables, integrations, compliance) | |
| AI engine (NLP, forecasting, adaptive questionnaires) | |

## GitHub & Deployment

| Field | Value |
|-------|-------|
| **GitHub** | `https://github.com/timbohnett-farther/Farther-Intellegent-Wealth-Tools` |
| **Deploy** | Railway (Docker multi-stage) |
| **Branch** | `main` |

> Note: The GitHub repo name has a typo ("Intellegent"). Do not change it -- deployment links depend on it.

## Tech Stack

Next.js 14.2, React 18.3, TypeScript 5.3, Tailwind CSS v4, Tremor Raw, Prisma 7.4 + SQLite (libsql), React Hook Form + Zod, TanStack Table + Query, Lucide React, Anthropic Claude SDK, Zolo AI, Gamma AI, jsPDF, html2canvas, date-fns, decimal.js.

## Database

SQLite with Prisma 7 + libsql adapter. 41 models (Firm, Advisor, Household, Client, Plan, Portfolio, Goals, TaxLoss, etc.). Local dev uses `file:./dev.db`. Production uses Railway persistent volume.

## Setup (Any Machine)

```bash
cd ~/Projects
# Note: clean folder name locally despite the GitHub typo
git clone https://github.com/timbohnett-farther/Farther-Intellegent-Wealth-Tools.git Farther-Intelligent-Wealth-Tools
cd Farther-Intelligent-Wealth-Tools
npm install

# Create .env.local with: AI_API_KEY, GAMMA_API_KEY, DATABASE_URL

npx prisma generate
npx prisma db push
npm run dev
```

**Returning to work:**
```bash
cd ~/Projects/Farther-Intelligent-Wealth-Tools && git pull origin main && npm install && npm run dev
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Prisma generate + Next.js build |
| `npm start` | Production server |
| `npm run lint` | ESLint |

---

## Claude Code Session Rules

### Working Directory
Always work in `~/Projects/Farther-Intelligent-Wealth-Tools`. Never create alternative folders.

### Styling
Tailwind CSS v4 with `@theme` in globals.css. Use `cn()` from `@/lib/utils/cn` (tailwind-merge + clsx) for class merging. Components built on Tremor Raw in `src/components/ui/`.

### Session Continuity Protocol

**Every session must feel like a continuation, not a restart.**

1. **Read `CLAUDE.md` first** -- it contains architecture, patterns, and project state
2. **Read `CHANGELOG.md`** before starting work -- know what was built recently
3. **When starting a new feature**: Add a scope entry to `CHANGELOG.md` with the feature name, date started, and planned scope
4. **When completing work**: Update `CHANGELOG.md` with what was done
5. **Always push to `main`** after completing work

### Changelog Format

Maintain `CHANGELOG.md` in the repo root:

```markdown
## [In Progress] Feature Name — Started YYYY-MM-DD
**Scope**: What this feature does and what's planned
**Status**: What's done / what's remaining
**Files touched**: List of key files modified or created

## [Completed] Feature Name — YYYY-MM-DD
**What**: Brief description of what was built
**Files**: Key files added/modified
```

This ensures any Claude Code session on any machine can pick up exactly where the last one left off.
