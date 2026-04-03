# Plan Log — Farther Intelligent Wealth Tools

## 2026-04-03 21:00 — Separate Tools: Extract Rollover & Debt IQ from Tax Planning

### Task
Separate 401(k) Rollover Analyzer and Debt IQ from Tax Planning system. Each tool should be standalone at the top level.

### Current Objective
1. Move `/tax-planning/(authenticated)/rollover/` → `/rollover/`
2. Move `/tax-planning/(authenticated)/debt-iq/` → `/debt-iq/`
3. Update all navigation links and hrefs
4. Update API routes from `/api/v1/rollover/` (keep as-is, or optionally move)
5. Verify no broken links or imports
6. Test build and routing
7. Commit and push changes

### Problem Identified
**Current Structure (INCORRECT):**
```
/tax-planning/
  ├── (authenticated)/
  │   ├── rollover/          ❌ Should be standalone
  │   ├── debt-iq/           ❌ Should be standalone
  │   ├── relocation/        ❌ Should be standalone
  │   ├── intelligence/      ✓ Belongs here
  │   ├── dashboard/         ✓ Belongs here
  │   └── ...other tax tools
```

**Correct Structure (NEEDED):**
```
/rollover/                   ✓ Standalone tool
/debt-iq/                    ✓ Standalone tool
/relocation/                 ✓ Standalone tool (or optionally keep in tax-planning)
/tax-planning/
  ├── intelligence/          ✓ Tax document OCR
  ├── dashboard/             ✓ Tax planning dashboard
  └── ...other tax-specific tools
```

### Files to Change

**Homepage Navigation:**
- `src/app/page.tsx` (Line 102, 118, 152)
  - Change `href: '/tax-planning/rollover'` → `href: '/rollover'`
  - Change `href: '/tax-planning/debt-iq'` → `href: '/debt-iq'`
  - Change `href: '/tax-planning/relocation'` → `href: '/relocation'`

**Directory Moves:**
- Move `src/app/tax-planning/(authenticated)/rollover/` → `src/app/rollover/`
- Move `src/app/tax-planning/(authenticated)/debt-iq/` → `src/app/debt-iq/`
- Move `src/app/tax-planning/(authenticated)/relocation/` → `src/app/relocation/`

**Internal Navigation Updates:**
- Search for all hardcoded `/tax-planning/rollover` links
- Search for all hardcoded `/tax-planning/debt-iq` links
- Search for all hardcoded `/tax-planning/relocation` links
- Update breadcrumbs, sidebar navigation, back buttons

**API Routes:**
- `/api/v1/rollover/` can stay as-is (versioned API pattern)
- `/api/relocation/` already correct (not nested under tax-planning)
- No Debt IQ API routes exist (just calculations)

### Expected Files to Change
- **MOVE:** `src/app/tax-planning/(authenticated)/rollover/` → `src/app/rollover/`
- **MOVE:** `src/app/tax-planning/(authenticated)/debt-iq/` → `src/app/debt-iq/`
- **MOVE:** `src/app/tax-planning/(authenticated)/relocation/` → `src/app/relocation/`
- **EDIT:** `src/app/page.tsx` — Update 3 href links
- **EDIT:** Any files with hardcoded `/tax-planning/rollover` or `/tax-planning/debt-iq` links
- **EDIT:** Layout files if they reference these routes
- **EDIT:** `PLAN_LOG.md` — This file
- **NEW/EDIT:** `CHANGE_LOG.md` — Post-push documentation

### Risks / Dependencies
- Must update ALL navigation references (grep for hardcoded paths)
- Rollover has extensive sub-routes: `/rollover/[id]`, `/rollover/admin`, `/rollover/new`
- Debt IQ has analysis sub-routes: `/analysis/mortgage`, `/analysis/credit-cards`, etc.
- Must preserve authentication on moved routes
- Next.js routing should handle directory moves cleanly
- Build must pass after moves

### Questions to Resolve
1. **Relocation Calculator**: Keep in `/tax-planning/relocation` or move to `/relocation`?
   - **Argument for tax-planning**: It's specifically about tax implications of state moves
   - **Argument for standalone**: It's a distinct calculator tool like Box Spread
   - **User preference?**

2. **Authentication**: Do moved routes keep same auth requirements?
   - Currently under `/tax-planning/(authenticated)/` route group
   - Need to create new `(authenticated)` groups under `/rollover/` and `/debt-iq/`

### Next Steps
1. ⏳ Confirm with user: Should Relocation stay in tax-planning or also move?
2. ⏳ Search for all hardcoded navigation references
3. ⏳ Move directories with git mv (preserves history)
4. ⏳ Update all navigation links
5. ⏳ Create authentication layout in new locations
6. ⏳ Verify build passes
7. ⏳ Test routing manually
8. ⏳ Commit and push

### Expected Outcome
- Rollover Analyzer: Standalone tool at `/rollover/`
- Debt IQ: Standalone tool at `/debt-iq/`
- Tax Planning: Clean separation, only contains tax-specific tools
- All navigation updated, no broken links
- Authentication preserved
- Build passes successfully

### Status: PLANNING
Awaiting user confirmation on Relocation Calculator placement and ready to proceed.

---

## 2026-04-03 20:30 — Sprint 3: AI Update System and Admin Review Workflow

### Status: COMPLETE ✅
Sprint 3 implementation complete. Build passes. Pushed to main (commit 2d1af80).

---

## 2026-04-03 16:45 — Health Endpoint Implementation for Railway Deployment

### Status: COMPLETE ✅
Health endpoint deployed. Railway staging verified.
