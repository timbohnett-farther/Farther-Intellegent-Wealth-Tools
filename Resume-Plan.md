# Brand Alignment + Full Code Audit + Risk Profile Persistence

## Context
The initial dark rebrand was done but token values don't match the official Farther branding guidelines. The user provided exact hex specs for charcoal, teal, ice, and slate scales, plus glass-morphism rules, typography patterns, chart configs, and component specs. A full audit is also needed: database connectivity, page styling consistency, and risk profile persistence.

---

## Phase 1: Token Correction (globals.css @theme block)
**File: `src/app/globals.css`**

### Charcoal (solid hex, not rgba)
```
charcoal-50: #f5f5f5    charcoal-400: #757575    charcoal-800: #1a1a1a
charcoal-100: #e0e0e0   charcoal-500: #333333    charcoal-900: #111111
charcoal-200: #bdbdbd   charcoal-600: #2a2a2a
charcoal-300: #9e9e9e   charcoal-700: #222222
```

### Teal (exact hex from brand spec)
```
teal-50: #e8f5f7   teal-400: #28a1af   teal-800: #0e3434
teal-100: #b8e0e5  teal-500: #1d7682   teal-900: #091e1a
teal-200: #88cbd3  teal-600: #186068
teal-300: #58b6c1  teal-700: #134a4e
```

### Ice (solid hex, not rgba)
```
ice-50: #f0f6fc    ice-200: #b6d0ed (default)   ice-400: #6a9ed9
ice-100: #dce9f7   ice-300: #90b7e3
```

### Slate
```
slate-500: #5b6a71
```

### Body gradient: `165deg, #2a2a2a 0%, #1a1a1a 50%, #111111 100%`
### Card border: `rgba(255,255,255,0.12)` (was 0.06)
### Card shadow: `0 8px 32px 0 rgba(0,0,0,0.36)`
### Button primary gradient: `135deg, #1d7682 → #28a1af` (was → #186068)
### Input border-radius: `rounded-xl` (12px, was rounded-md 8px)
### Badge: add `border border-{color}-500/30`
### Bar chart radius: `[6,6,0,0]` (was [4,4,0,0])

### New shadow tokens
```
shadow-glass: 0 8px 32px 0 rgba(0,0,0,0.36)
shadow-glass-hover: 0 12px 40px 0 rgba(0,0,0,0.45)
shadow-glass-sm: 0 4px 16px 0 rgba(0,0,0,0.25)
shadow-glow-teal: 0 0 20px rgba(29,118,130,0.3)
shadow-glow-ice: 0 0 20px rgba(182,208,237,0.2)
```

### Add `.stat-card` utility with 3px top gradient bar

---

## Phase 2: Typography + Layout Fixes

### Sidebar (Sidebar.tsx)
- Logo area: `h-20` (was h-16)
- Brand name: `font-serif`
- Subtitle: `text-ice-200/60 tracking-[0.2em] uppercase`
- Active nav: `bg-white/[0.08]` + 3px left gradient pill `from-teal-400 to-teal-600`
- Icons: active = `text-teal-400`, inactive = `text-white/30`

### Typography sweep (~170 TSX files)
- Page titles → `font-serif text-3xl text-white tracking-wide`
- Card titles → `font-serif text-lg text-white`
- KPI labels → `text-xs text-white/40 uppercase tracking-wider`
- Section labels → `text-[10px] font-medium text-white/30 uppercase tracking-[0.15em]`

---

## Phase 3: Component Library (18 UI files)
- Card.tsx: border `rgba(255,255,255,0.12)`, shadow-glass
- Button.tsx: primary gradient `#1d7682 → #28a1af`, shadow `0 4px 16px rgba(29,118,130,0.3)`
- Input.tsx: `rounded-xl`
- Badge.tsx: add `border border-{color}-500/30`
- BarChart.tsx: bar radius `[6,6,0,0]`
- chart-config.ts: axis stroke `rgba(255,255,255,0.3)`, pie colors `['#1d7682','#28a1af','#b6d0ed','#88cbd3','#5b6a71','#8a9aa2']`

---

## Phase 4: Full Page Audit
Sweep all TSX files for:
1. Remaining hardcoded old-theme hex values
2. `border-white/[0.06]` on cards → `border-white/[0.12]`
3. Missing `font-serif` on headings
4. Missing `backdrop-blur-xl` on glass surfaces
5. Verify all pages connect to Prisma where needed (check API route imports)

---

## Phase 5: Risk Profile Database Persistence
**File: `prisma/schema.prisma`** — Add 4 models

```prisma
model RiskProfile {
  id                    String   @id @default(cuid())
  clientId              String?
  version               Int      @default(1)
  status                String   @default("active") // draft | active | superseded | archived
  scores                String   // JSON: tolerance, capacity, need, complexity, bias scores
  composite             String   // JSON: recommended_band, label, derivation
  assetClassEligibility String   // JSON: boolean map of eligible asset classes
  createdBySessionId    String?
  advisorOverride       Boolean  @default(false)
  advisorOverrideReason String?
  effectiveDate         DateTime @default(now())
  expiryDate            DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  session               QuestionnaireSession? @relation(fields: [createdBySessionId], references: [id])
  versions              ProfileVersion[]
}

model QuestionnaireSession {
  id              String   @id @default(cuid())
  clientId        String?
  profileId       String?
  sessionType     String   @default("full") // full | annual_check_in | life_event
  status          String   @default("in_progress") // in_progress | completed | abandoned
  wealthTier      String
  catEngineState  String?  // JSON: theta, SE, convergence
  aiContext       String?  // JSON: model, rephrasing, probes
  totalQuestions  Int      @default(15)
  completionPct   Float    @default(0)
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  durationSeconds Int?

  responses       SessionResponse[]
  profile         RiskProfile[]
}

model SessionResponse {
  id              String   @id @default(cuid())
  sessionId       String
  questionItemId  Int
  sequenceNumber  Int
  presentedStem   String
  responseValue   Int
  responseLabel   String?
  scoring         String?  // JSON: dimension, rawScore, irtInfo
  aiAnalysis      String?  // JSON: consistency, bias, followUp
  timeToAnswerMs  Int?
  presentedAt     DateTime @default(now())
  answeredAt      DateTime?

  session         QuestionnaireSession @relation(fields: [sessionId], references: [id])
}

model ProfileVersion {
  id              String   @id @default(cuid())
  profileId       String
  version         Int
  changeType      String   // initial | annual_review | life_event | advisor_adjustment
  trigger         String?
  previousScores  String?  // JSON snapshot
  newScores       String   // JSON snapshot
  materialChange  Boolean  @default(false)
  complianceNote  String?
  advisorAcked    Boolean  @default(false)
  advisorAckedAt  DateTime?
  changedAt       DateTime @default(now())
  changedBy       String?

  profile         RiskProfile @relation(fields: [profileId], references: [id])
}
```

**New API Routes (6):**
- `POST /api/risk-profile/sessions` — Start session, persist to DB
- `POST /api/risk-profile/sessions/[id]/respond` — Save response + return next question
- `POST /api/risk-profile/sessions/[id]/complete` — Finalize, create RiskProfile record
- `GET /api/risk-profile/profiles/[id]` — Retrieve saved profile with scores
- `PATCH /api/risk-profile/profiles/[id]/override` — Advisor band override with reason
- `GET /api/risk-profile/profiles/[id]/history` — Version history / audit log

**Update `src/app/risk-profile/page.tsx`** to use session-based API flow instead of in-memory state.

---

## Phase 6: Build + Test + Push
1. `npx prisma db push` — Apply schema changes
2. `npm run build` — Clean compile
3. `npx vitest run` — All tests pass
4. Commit and push to both branches

---

## Execution Order
```
Phase 1 (Tokens) → Phase 2 (Typography) + Phase 3 (Components) in parallel
                 → Phase 4 (Page Audit)
                 → Phase 5 (Risk Profile DB)
                 → Phase 6 (Verify + Push)
```

## Key Files (highest leverage)
1. `src/app/globals.css` — Token corrections affect entire app
2. `src/components/ui/*.tsx` — 18 component definitions
3. `src/lib/design-system/tokens/chart-config.ts` — All chart theming
4. `prisma/schema.prisma` — Risk profile persistence
5. `src/app/risk-profile/page.tsx` — Session flow rewire
6. `src/components/prism/layouts/Sidebar.tsx` — Primary nav chrome
