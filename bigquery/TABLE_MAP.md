# BigQuery Table Map — Farther Intelligent Wealth Tools

> Quick reference: which tables belong to which program, and what each stores.

## How to Run Setup

```bash
chmod +x bigquery/setup.sh
./bigquery/setup.sh
```

That's it. The script walks you through everything.

---

## Dataset: `farther_wealth`

### Section 1: Core Entities

| Table | What It Stores | Source Program |
|-------|---------------|----------------|
| `firms` | RIA firms (multi-tenant root) | All |
| `advisors` | Financial advisors per firm | All |
| `households` | Client households (filing units) | All |
| `clients` | Individual client profiles | All |
| `plans` | Financial plan containers | Prism |
| `dependents` | Children and dependents | Prism |

### Section 2: Box Spread Calculator

| Table | What It Stores |
|-------|---------------|
| `box_spread_calculations` | Every calculator run — loan inputs, tax inputs, portfolio inputs, comparison rates |
| `box_spread_results` | Full results per calculation — executive summary, loan structure, cost comparison, tax analysis, stress test, Monte Carlo, opportunity cost, liquidation comparison |

### Section 3: Tax Planning (FP-TaxIQ)

| Table | What It Stores |
|-------|---------------|
| `tax_return_documents` | Ingested Form 1040 PDFs and IRS transcripts — status, hash, field count |
| `tax_extracted_fields` | OCR-extracted tax line values with confidence scores |
| `tax_scenarios` | Named what-if scenarios per household |
| `tax_scenario_overrides` | Per-scenario tax line overrides (absolute or delta) |
| `tax_scenario_results` | Computed results — total tax, AGI, effective/marginal rates |

### Section 4: Prism Financial Planning (FP-Prism)

| Table | What It Stores |
|-------|---------------|
| `plan_cash_flow_projections` | Year-by-year: income (15 sources), expenses, taxes, portfolio balances, net worth |
| `plan_monte_carlo_results` | Simulation summary: probability of success, percentiles p5–p95, depletion year |
| `plan_mc_percentile_bands` | Per-year fan chart data (p5 through p95 per year) |
| `plan_federal_tax_calculations` | Federal income tax: gross income → AGI → deductions → taxable income → tax |
| `plan_state_tax_calculations` | State income tax per state |
| `plan_se_tax_calculations` | Self-employment tax (SS + Medicare) |
| `plan_social_security_analysis` | SS benefit at claim age, WEP/GPO reductions, break-even ages, taxation |
| `plan_irmaa_calculations` | Medicare IRMAA surcharge: Part B/D premiums by MAGI bracket |
| `plan_rmd_calculations` | Required Minimum Distributions per account |
| `plan_roth_conversion_analysis` | Roth conversion: recommended amount, tax cost, IRMAA impact, lifetime benefit |
| `plan_retirement_readiness` | Readiness score: portfolio at retirement, income gap, years portfolio lasts |
| `plan_education_funding` | 529 projections: total cost, savings at enrollment, shortfall |
| `plan_goal_funding` | Per-goal: funded ratio, probability, status, shortfall |
| `plan_insurance_analysis` | Life, disability, LTC needs: total need, existing coverage, gap |
| `plan_estate_analysis` | Estate tax, GRAT, CRT, CLAT analysis: net to heirs, effective rate |
| `plan_business_valuation` | Business value: income/market/DCF approaches, blended enterprise value |
| `plan_business_sale_analysis` | Sale tax analysis: CG tax, NIIT, state tax, net proceeds |
| `plan_equity_comp_analysis` | RSU, NQSO, ISO, ESPP tax analysis per grant |
| `plan_charitable_analysis` | DAF comparison, bunching optimizer, QCD vs cash giving |

### Section 5: Debt Analysis (FP-DebtIQ)

| Table | What It Stores |
|-------|---------------|
| `debt_scores` | Farther Debt Score (0–850): 5 dimensions, change tracking |
| `debt_score_opportunities` | Per-score: identified savings opportunities with urgency |
| `mortgage_analyses` | Refinance, home equity, mortgage-vs-invest, PMI elimination |
| `student_loan_analyses` | Federal plan comparison (IBR/PAYE/SAVE/PSLF), private refi, marriage penalty |
| `credit_card_analyses` | Payoff strategies (avalanche/snowball), balance transfers, utilization |
| `debt_payoff_strategies` | 7-strategy comparison: interest saved, debt-free date, net worth at 10 years |
| `sbloc_analyses` | Securities-backed lending: max borrowing, margin call risk, cost vs liquidation |
| `auto_loan_analyses` | Auto loan: equity, payoff analysis, lease vs buy |
| `business_debt_analyses` | Business leverage metrics, DSCR, Section 163(j) deductibility |

### Section 6: Risk Profiling (FP-Focus)

| Table | What It Stores |
|-------|---------------|
| `risk_profiles` | 5-axis psychometric scores, risk bands 1–7, confidence |
| `risk_profile_portfolios` | Model portfolios (conservative/recommended/aggressive): 11 asset classes, return, volatility, Sharpe |
| `risk_profile_backtests` | Historical backtest: CAGR, max drawdown, crash scenarios (2008, COVID, 2022) |
| `risk_profile_biases` | Detected behavioral biases: loss aversion, recency, overconfidence, etc. |

### Section 7: Proposal Engine (FP-Propose)

| Table | What It Stores |
|-------|---------------|
| `proposals` | Portfolio proposals: risk scores, recommended allocation |
| `proposal_analytics` | Current vs proposed: return, volatility, Sharpe, stress test results |
| `proposal_fee_analyses` | Fee comparison: advisory, expense ratio, transaction costs, 30-year compounding |
| `proposal_tax_transitions` | 5 transition strategies: full liquidation, phased, harvest-first, direct indexing, hold |

### Section 8: Practice Analytics (FP-Pulse)

| Table | What It Stores |
|-------|---------------|
| `advisor_scorecards` | Per-advisor metrics: AUM, revenue, retention, NPS, meetings |
| `churn_predictions` | Per-household churn probability with 13 contributing signals |
| `practice_alerts` | System alerts: severity, category, recommended action, deadline |

### Section 9: AI Engine

| Table | What It Stores |
|-------|---------------|
| `ai_opportunities` | Identified opportunities: Roth windows, tax-loss harvesting, SS delay, etc. |
| `ai_recommendations` | Specific recommendations: Roth conversion, SS claiming, rebalancing |
| `ai_estate_alerts` | Estate alerts: stale documents, exemption proximity, beneficiary mismatches |
| `plan_insights` | Ranked actionable insights with estimated impact amounts |

### Section 10: Compliance & Audit

| Table | What It Stores |
|-------|---------------|
| `audit_trail` | Full audit log: every action, before/after state, IP, actor |
| `reg_bi_documentation` | SEC Reg BI records: client profile snapshots, recommendations, conflicts |

### Section 11: Market Data & Regulatory

| Table | What It Stores |
|-------|---------------|
| `market_data_snapshots` | Daily: S&P 500, treasuries, fed funds, CPI, AFR rates, 7520 rate |
| `tax_tables` | Versioned tax brackets/limits by year, type, and filing status |
| `regulatory_updates` | Detected regulatory changes: source, impact, affected plans, status |

### Section 12: Analytics Backbone

| Table | What It Stores | Notes |
|-------|---------------|-------|
| `calculation_events` | Every calculation across every tool | Partitioned by date, clustered by event_type + firm_id |
| `user_sessions` | Platform usage: pages visited, tools used, session duration | Partitioned by date |

---

## Pre-Built Views

| View | What It Shows |
|------|--------------|
| `v_firm_aum_summary` | Firm-level: household count, advisor count, plan count, total AUM |
| `v_advisor_dashboard` | Per-advisor: AUM, revenue, retention, NPS, high-risk client count |
| `v_households_at_risk` | Households with HIGH or CRITICAL churn risk |
| `v_daily_calc_volume` | Daily calculation counts and avg duration by tool |
| `v_box_spread_analytics` | Box spread usage: avg loan, avg savings, favorable/unfavorable split |

---

## Relationship to Existing Infrastructure

The `infrastructure/bigquery/` directory contains Prism-specific tables with nested STRUCT/ARRAY types for analytical querying of plan results. The setup script runs those too.

| Existing Dataset | Coverage |
|-----------------|----------|
| `farther_plans` | Plan results with nested annual projections |
| `farther_tax_tables` | Versioned tax tables with current-view |
| `farther_analytics` | Firm + advisor daily snapshots |
| `farther_audit` | SEC/FINRA compliance activity log |
| `farther_update_engine` | Regulatory scraper runs + detected changes |

The new `farther_wealth` dataset provides flat-table coverage across **all** programs for simpler cross-tool querying and dashboards.
