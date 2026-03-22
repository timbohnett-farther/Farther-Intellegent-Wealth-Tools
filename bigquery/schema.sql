-- ============================================================================
-- FARTHER INTELLIGENT WEALTH TOOLS — COMPLETE BIGQUERY SCHEMA
-- ============================================================================
-- Dataset: farther_wealth
--
-- This schema covers ALL programs in the platform:
--   1. Core Entities (Firms, Advisors, Households, Clients, Plans)
--   2. Box Spread Calculator
--   3. Tax Planning (FP-TaxIQ)
--   4. Prism Financial Planning (FP-Prism)
--   5. Debt Analysis (FP-DebtIQ)
--   6. Risk Profiling (FP-Focus)
--   7. Proposal Engine (FP-Propose)
--   8. Practice Analytics (FP-Pulse)
--   9. AI Engine (Insights, Recommendations, Alerts)
--  10. Compliance & Audit
--  11. Market Data & Regulatory Updates
--  12. Calculation Event Log (analytics backbone)
--
-- Generated: 2026-03-01
-- ============================================================================


-- ============================================================================
-- SECTION 1: CORE ENTITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.firms` (
  firm_id             STRING        NOT NULL,
  name                STRING        NOT NULL,
  crd_number          STRING,
  sec_number          STRING,
  address_city        STRING,
  address_state       STRING,
  plan_tier           STRING,       -- free | starter | professional | enterprise
  created_at          TIMESTAMP     NOT NULL,
  updated_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.advisors` (
  advisor_id          STRING        NOT NULL,
  firm_id             STRING        NOT NULL,
  auth_user_id        STRING,
  first_name          STRING,
  last_name           STRING,
  email               STRING,
  crd_number          STRING,
  role                STRING,       -- admin | lead_advisor | advisor | associate | support
  created_at          TIMESTAMP     NOT NULL,
  updated_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.households` (
  household_id        STRING        NOT NULL,
  firm_id             STRING        NOT NULL,
  advisor_id          STRING        NOT NULL,
  name                STRING,
  external_crm_id     STRING,
  wealth_tier         STRING,       -- emerging | mass_affluent | hnw | uhnw
  created_at          TIMESTAMP     NOT NULL,
  updated_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.clients` (
  client_id           STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  first_name          STRING,
  last_name           STRING,
  date_of_birth       DATE,
  filing_status       STRING,       -- single | mfj | mfs | hoh | qw
  marital_status      STRING,
  employment_status   STRING,
  annual_income       FLOAT64,
  total_net_worth     FLOAT64,
  liquid_net_worth    FLOAT64,
  state_of_residence  STRING,
  risk_profile_id     STRING,
  current_plan_id     STRING,
  created_at          TIMESTAMP     NOT NULL,
  updated_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.plans` (
  plan_id             STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  plan_type           STRING,       -- comprehensive | retirement | tax | estate | education | insurance | debt | quick
  status              STRING,       -- draft | in_progress | review | active | archived
  start_year          INT64,
  end_year            INT64,
  completion_score    FLOAT64,
  client_portal_enabled BOOL,
  created_at          TIMESTAMP     NOT NULL,
  updated_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.dependents` (
  dependent_id        STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  first_name          STRING,
  date_of_birth       DATE,
  relationship        STRING,       -- child | stepchild | grandchild | parent | other
  is_special_needs    BOOL,
  created_at          TIMESTAMP     NOT NULL
);


-- ============================================================================
-- SECTION 2: BOX SPREAD CALCULATOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.box_spread_calculations` (
  calc_id             STRING        NOT NULL,
  session_id          STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  -- Loan inputs
  portfolio_value     FLOAT64,
  loan_amount         FLOAT64,
  term_years          FLOAT64,
  box_rate            FLOAT64,
  manager_fee         FLOAT64,
  margin_type         STRING,       -- reg_t | portfolio_margin
  portfolio_composition STRING,     -- equities | etfs | mixed

  -- Tax inputs
  filing_status       STRING,
  taxable_income      FLOAT64,
  state               STRING,
  annual_cg_realized  FLOAT64,

  -- Portfolio inputs
  cost_basis          FLOAT64,
  expected_return     FLOAT64,
  volatility          FLOAT64,

  -- Comparison rates
  margin_rate         FLOAT64,
  sbloc_rate          FLOAT64,
  heloc_rate          FLOAT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.box_spread_results` (
  result_id           STRING        NOT NULL,
  calc_id             STRING        NOT NULL,
  calculated_at       TIMESTAMP     NOT NULL,

  -- Executive Summary
  annual_interest_savings    FLOAT64,
  after_tax_cost             FLOAT64,
  margin_safety_decline_pct  FLOAT64,
  mc_probability_margin_call FLOAT64,
  tax_deduction_value        FLOAT64,
  opportunity_cost_of_selling FLOAT64,
  monthly_cash_flow_freed    FLOAT64,
  overall_score              FLOAT64,
  recommendation             STRING,
  recommendation_level       STRING,   -- strong_for | for | neutral | against | strong_against

  -- Loan Structure
  contracts_needed           INT64,
  face_value                 FLOAT64,
  net_premium                FLOAT64,
  implied_interest_cost      FLOAT64,
  annualized_rate            FLOAT64,
  all_in_rate                FLOAT64,
  actual_proceeds            FLOAT64,
  actual_repayment           FLOAT64,
  interest_paid              FLOAT64,

  -- Cost Comparison
  box_total_interest         FLOAT64,
  margin_total_interest      FLOAT64,
  sbloc_total_interest       FLOAT64,
  heloc_total_interest       FLOAT64,
  savings_vs_margin          FLOAT64,
  savings_vs_sbloc           FLOAT64,
  savings_vs_heloc           FLOAT64,

  -- Tax Analysis
  blended_1256_rate          FLOAT64,
  after_tax_rate             FLOAT64,
  total_tax_savings          FLOAT64,
  deduction_type             STRING,

  -- Stress Test
  margin_call_portfolio_value FLOAT64,
  decline_to_margin_call_pct  FLOAT64,

  -- Monte Carlo (5000 runs)
  mc_probability_of_margin_call FLOAT64,
  mc_median_terminal_portfolio  FLOAT64,
  mc_median_net_wealth          FLOAT64,
  mc_p5_terminal                FLOAT64,
  mc_p25_terminal               FLOAT64,
  mc_p75_terminal               FLOAT64,
  mc_p95_terminal               FLOAT64,
  mc_probability_portfolio_grows FLOAT64,

  -- Opportunity Cost
  break_even_return           FLOAT64,
  wealth_difference_borrow_vs_sell FLOAT64,

  -- Liquidation Comparison
  unrealized_gain             FLOAT64,
  tax_on_liquidation          FLOAT64,
  net_after_tax_proceeds      FLOAT64,
  irmaa_surcharge             FLOAT64
);


-- ============================================================================
-- SECTION 3: TAX PLANNING (FP-TaxIQ)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.tax_return_documents` (
  document_id         STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  tax_year            INT64         NOT NULL,
  doc_type            STRING,       -- FORM1040_PDF | IRS_RETURN_TRANSCRIPT_PDF | OTHER
  status              STRING,       -- UPLOADED | QUEUED | PROCESSING | EXTRACTED | FAILED
  file_hash_sha256    STRING,
  uploaded_at         TIMESTAMP     NOT NULL,
  extracted_at        TIMESTAMP,
  field_count         INT64,
  avg_confidence      FLOAT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.tax_extracted_fields` (
  field_id            STRING        NOT NULL,
  document_id         STRING        NOT NULL,
  tax_line_ref        STRING        NOT NULL,  -- e.g. f1040:l1z:wages
  value_cents         INT64,
  confidence          FLOAT64,      -- 0.0 to 1.0
  source_kind         STRING,       -- OCR | PDF_TEXT | TRANSCRIPT_TABLE | USER
  page_num            INT64,
  extracted_at        TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.tax_scenarios` (
  scenario_id         STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  tax_year            INT64         NOT NULL,
  name                STRING,
  is_base_case        BOOL,
  filing_status       STRING,
  created_at          TIMESTAMP     NOT NULL,
  updated_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.tax_scenario_overrides` (
  override_id         STRING        NOT NULL,
  scenario_id         STRING        NOT NULL,
  target_tax_line_ref STRING        NOT NULL,
  mode                STRING,       -- ABSOLUTE | DELTA
  amount_cents        INT64,
  created_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.tax_scenario_results` (
  result_id           STRING        NOT NULL,
  scenario_id         STRING        NOT NULL,
  calc_run_id         STRING,
  status              STRING,       -- OK | WARN | ERROR
  calculated_at       TIMESTAMP     NOT NULL,

  -- Key metrics
  federal_total_tax   INT64,        -- cents
  federal_agi         INT64,
  federal_taxable_income INT64,
  federal_effective_rate FLOAT64,
  federal_marginal_rate  FLOAT64
);


-- ============================================================================
-- SECTION 4: PRISM FINANCIAL PLANNING (FP-Prism)
-- ============================================================================

-- 4a. Cash Flow Projections (one row per plan-year)
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_cash_flow_projections` (
  projection_id       STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  scenario_id         STRING,
  calculated_at       TIMESTAMP     NOT NULL,
  calc_engine_version STRING,

  year                INT64         NOT NULL,
  client_age          INT64,
  co_age              INT64,
  is_retired          BOOL,

  -- Income
  salary_income       FLOAT64,
  self_employment_income FLOAT64,
  pension_income      FLOAT64,
  ss_client_gross     FLOAT64,
  ss_co_gross         FLOAT64,
  ss_taxable          FLOAT64,
  rental_income       FLOAT64,
  investment_income   FLOAT64,
  qualified_dividends FLOAT64,
  capital_gains_realized FLOAT64,
  rmd_income          FLOAT64,
  roth_distributions  FLOAT64,
  annuity_income      FLOAT64,
  trust_income        FLOAT64,
  business_distributions FLOAT64,
  other_income        FLOAT64,
  total_gross_income  FLOAT64,
  agi                 FLOAT64,

  -- Expenses
  living_expenses     FLOAT64,
  healthcare_premiums FLOAT64,
  ltc_expenses        FLOAT64,
  goal_withdrawals    FLOAT64,
  debt_payments       FLOAT64,
  total_expenses      FLOAT64,

  -- Taxes
  federal_tax         FLOAT64,
  state_tax           FLOAT64,
  se_tax              FLOAT64,
  niit                FLOAT64,
  total_tax           FLOAT64,
  effective_fed_rate  FLOAT64,

  -- Cash Flow
  net_cash_flow       FLOAT64,
  surplus_deficit     FLOAT64,

  -- Portfolio
  portfolio_contributions FLOAT64,
  portfolio_withdrawals   FLOAT64,
  portfolio_growth        FLOAT64,
  taxable_portfolio       FLOAT64,
  tax_deferred_portfolio  FLOAT64,
  tax_free_portfolio      FLOAT64,
  total_investable_portfolio FLOAT64,

  -- Balance Sheet
  real_estate_value   FLOAT64,
  other_assets        FLOAT64,
  total_assets        FLOAT64,
  total_liabilities   FLOAT64,
  net_worth           FLOAT64
);

-- 4b. Monte Carlo Results (one row per plan simulation run)
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_monte_carlo_results` (
  result_id           STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  scenario_id         STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  runs                INT64,
  years               INT64,
  start_year          INT64,
  initial_portfolio   FLOAT64,

  -- Asset allocation used
  equity_pct          FLOAT64,
  bond_pct            FLOAT64,
  cash_pct            FLOAT64,
  alt_pct             FLOAT64,

  -- Return assumptions
  equity_mean         FLOAT64,
  equity_std_dev      FLOAT64,
  bond_mean           FLOAT64,
  bond_std_dev        FLOAT64,
  inflation_mean      FLOAT64,

  -- Results
  probability_of_success     FLOAT64,
  probability_of_success_adj FLOAT64,
  median_terminal_value      FLOAT64,
  average_terminal_value     FLOAT64,
  worst_case                 FLOAT64,
  best_case                  FLOAT64,
  p5                         FLOAT64,
  p10                        FLOAT64,
  p25                        FLOAT64,
  p50                        FLOAT64,
  p75                        FLOAT64,
  p90                        FLOAT64,
  p95                        FLOAT64,
  average_depletion_year     INT64
);

-- 4c. Monte Carlo Percentile Bands (per-year fan chart data)
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_mc_percentile_bands` (
  band_id             STRING        NOT NULL,
  result_id           STRING        NOT NULL,  -- FK to plan_monte_carlo_results
  year                INT64         NOT NULL,
  p5                  FLOAT64,
  p10                 FLOAT64,
  p25                 FLOAT64,
  p50                 FLOAT64,
  p75                 FLOAT64,
  p90                 FLOAT64,
  p95                 FLOAT64
);

-- 4d. Federal Tax Calculations
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_federal_tax_calculations` (
  calc_id             STRING        NOT NULL,
  plan_id             STRING,
  household_id        STRING,
  tax_year            INT64,
  calculated_at       TIMESTAMP     NOT NULL,

  filing_status       STRING,
  gross_income        FLOAT64,
  adjusted_gross_income FLOAT64,
  deduction_amount    FLOAT64,
  deduction_type      STRING,       -- standard | itemized
  taxable_income      FLOAT64,
  ordinary_tax        FLOAT64,
  capital_gains_tax   FLOAT64,
  niit                FLOAT64,
  total_tax_before_credits FLOAT64,
  total_credits       FLOAT64,
  federal_income_tax  FLOAT64,
  effective_rate      FLOAT64,
  marginal_rate       FLOAT64,
  next_bracket_headroom FLOAT64
);

-- 4e. State Tax Calculations
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_state_tax_calculations` (
  calc_id             STRING        NOT NULL,
  plan_id             STRING,
  household_id        STRING,
  state               STRING        NOT NULL,
  tax_year            INT64,
  calculated_at       TIMESTAMP     NOT NULL,

  state_agi           FLOAT64,
  state_deduction     FLOAT64,
  state_taxable_income FLOAT64,
  state_tax           FLOAT64,
  effective_rate      FLOAT64
);

-- 4f. Self-Employment Tax
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_se_tax_calculations` (
  calc_id             STRING        NOT NULL,
  plan_id             STRING,
  tax_year            INT64,
  calculated_at       TIMESTAMP     NOT NULL,

  net_se_income       FLOAT64,
  net_earnings        FLOAT64,
  ss_taxable          FLOAT64,
  medicare_taxable    FLOAT64,
  ss_tax              FLOAT64,
  medicare_tax        FLOAT64,
  additional_medicare FLOAT64,
  total_se_tax        FLOAT64,
  deductible_half     FLOAT64
);

-- 4g. Social Security Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_social_security_analysis` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  client_or_co        STRING,       -- client | co_client
  calculated_at       TIMESTAMP     NOT NULL,

  pia                 FLOAT64,
  full_retirement_age FLOAT64,
  claim_age           FLOAT64,
  cola_rate           FLOAT64,
  monthly_benefit_at_fra FLOAT64,
  adjustment_factor   FLOAT64,
  monthly_benefit_at_claim FLOAT64,
  annual_benefit_at_claim  FLOAT64,
  wep_reduction       FLOAT64,
  gpo_reduction       FLOAT64,
  final_annual_benefit FLOAT64,
  break_even_age_vs_62  FLOAT64,
  break_even_age_vs_fra FLOAT64,

  -- Taxation
  provisional_income  FLOAT64,
  taxable_ss          FLOAT64,
  taxable_ss_pct      FLOAT64
);

-- 4h. IRMAA Calculations
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_irmaa_calculations` (
  calc_id             STRING        NOT NULL,
  plan_id             STRING,
  tax_year            INT64,
  calculated_at       TIMESTAMP     NOT NULL,

  magi_two_years_ago  FLOAT64,
  filing_status       STRING,
  age                 INT64,
  applies             BOOL,
  part_b_monthly_premium FLOAT64,
  part_d_monthly_surcharge FLOAT64,
  annual_irmaa_surcharge   FLOAT64,
  total_annual_medicare_premium FLOAT64,
  bracket_applied     STRING
);

-- 4i. RMD Calculations
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_rmd_calculations` (
  calc_id             STRING        NOT NULL,
  plan_id             STRING,
  account_id          STRING,
  tax_year            INT64,
  calculated_at       TIMESTAMP     NOT NULL,

  account_balance     FLOAT64,
  owner_age           INT64,
  account_type        STRING,
  is_inherited        BOOL,
  rmd_required        BOOL,
  distribution_period FLOAT64,
  rmd_amount          FLOAT64,
  rmd_start_age       INT64,
  method              STRING
);

-- 4j. Roth Conversion Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_roth_conversion_analysis` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  calculated_at       TIMESTAMP     NOT NULL,

  current_taxable_income  FLOAT64,
  filing_status           STRING,
  traditional_balance     FLOAT64,
  roth_balance            FLOAT64,
  years_to_retirement     INT64,
  expected_retirement_rate FLOAT64,
  client_age              INT64,

  -- Results
  recommended_conversion_amount FLOAT64,
  tax_on_conversion             FLOAT64,
  marginal_rate_on_conversion   FLOAT64,
  irmaa_impact                  FLOAT64,
  ss_taxation_increase          FLOAT64,
  net_tax_cost_now              FLOAT64,
  projected_tax_savings_lifetime FLOAT64,
  net_benefit                   FLOAT64,
  worth_converting              BOOL,
  conversion_strategy           STRING
);

-- 4k. Retirement Readiness
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_retirement_readiness` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  calculated_at       TIMESTAMP     NOT NULL,

  current_age         INT64,
  retirement_age      INT64,
  current_portfolio   FLOAT64,
  annual_contributions FLOAT64,
  estimated_social_security FLOAT64,
  estimated_pension   FLOAT64,
  desired_retirement_income FLOAT64,

  -- Results
  is_ready            BOOL,
  portfolio_at_retirement FLOAT64,
  annual_income_from_portfolio FLOAT64,
  total_annual_retirement_income FLOAT64,
  income_replacement_ratio FLOAT64,
  income_gap          FLOAT64,
  years_portfolio_lasts INT64,
  additional_monthly_savings_needed FLOAT64
);

-- 4l. Education Funding
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_education_funding` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  goal_id             STRING,
  dependent_name      STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  current_age         INT64,
  enrollment_age      INT64,
  years_of_school     INT64,
  annual_cost_today   FLOAT64,
  education_inflation FLOAT64,
  current_savings_529 FLOAT64,
  monthly_contribution FLOAT64,

  -- Results
  projected_total_cost FLOAT64,
  projected_savings_at_enrollment FLOAT64,
  funded_ratio        FLOAT64,
  shortfall           FLOAT64,
  additional_monthly_needed FLOAT64
);

-- 4m. Goal Funding Status
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_goal_funding` (
  funding_id          STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  goal_id             STRING        NOT NULL,
  goal_type           STRING,
  goal_name           STRING,
  target_amount       FLOAT64,
  target_year         INT64,
  priority            STRING,       -- critical | high | medium | low
  calculated_at       TIMESTAMP     NOT NULL,

  funded_ratio        FLOAT64,
  probability_of_meeting FLOAT64,
  status              STRING,       -- on_track | at_risk | funded | underfunded
  shortfall           FLOAT64,
  additional_monthly_savings_needed FLOAT64
);

-- 4n. Insurance Needs Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_insurance_analysis` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  insurance_type      STRING        NOT NULL,  -- life | disability | ltc
  calculated_at       TIMESTAMP     NOT NULL,

  -- Life Insurance specific
  life_annual_income           FLOAT64,
  life_years_replacement       INT64,
  life_outstanding_debts       FLOAT64,
  life_mortgage_balance        FLOAT64,
  life_total_need              FLOAT64,
  life_existing_coverage       FLOAT64,
  life_gap                     FLOAT64,

  -- Disability specific
  disability_annual_income     FLOAT64,
  disability_monthly_expenses  FLOAT64,
  disability_monthly_need      FLOAT64,
  disability_existing_benefit  FLOAT64,
  disability_gap               FLOAT64,

  -- LTC specific
  ltc_current_age              INT64,
  ltc_gender                   STRING,
  ltc_state                    STRING,
  ltc_estimated_annual_cost    FLOAT64,
  ltc_projected_cost_at_need   FLOAT64,
  ltc_total_benefit_needed     FLOAT64,
  ltc_existing_coverage        FLOAT64,
  ltc_gap                      FLOAT64,

  recommendation               STRING
);

-- 4o. Estate Planning Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_estate_analysis` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  calculated_at       TIMESTAMP     NOT NULL,

  gross_estate        FLOAT64,
  marital_deduction   FLOAT64,
  charitable_deduction FLOAT64,
  debts_and_expenses  FLOAT64,
  adjusted_gross_estate FLOAT64,
  lifetime_gifts      FLOAT64,
  tentative_tax_base  FLOAT64,
  tentative_tax       FLOAT64,
  applicable_credit   FLOAT64,
  net_estate_tax      FLOAT64,
  state_estate_tax    FLOAT64,
  total_transfer_tax  FLOAT64,
  net_to_heirs        FLOAT64,
  effective_rate      FLOAT64,

  -- GRAT analysis
  grat_annuity_payment FLOAT64,
  grat_remainder_interest FLOAT64,
  grat_gift_taxable_amount FLOAT64,
  grat_wealth_transferred  FLOAT64,
  grat_estate_tax_savings  FLOAT64,

  -- CRT analysis
  crt_payout_rate     FLOAT64,
  crt_charitable_deduction FLOAT64,
  crt_remainder_interest   FLOAT64,

  -- CLAT analysis
  clat_gift_taxable_remainder FLOAT64,
  clat_transfer_tax_savings   FLOAT64
);

-- 4p. Business Valuation
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_business_valuation` (
  valuation_id        STRING        NOT NULL,
  plan_id             STRING,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  gross_revenue       FLOAT64,
  cogs                FLOAT64,
  operating_expenses  FLOAT64,
  owner_salary        FLOAT64,
  raw_ebitda          FLOAT64,
  normalized_ebitda   FLOAT64,
  ebitda_multiple     FLOAT64,
  revenue_multiple    FLOAT64,
  discount_rate       FLOAT64,
  ownership_pct       FLOAT64,

  -- Results
  income_approach_value FLOAT64,
  market_approach_value FLOAT64,
  dcf_value           FLOAT64,
  blended_enterprise_value FLOAT64,
  equity_value_100    FLOAT64,
  client_equity_interest FLOAT64
);

-- 4q. Business Sale Tax Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_business_sale_analysis` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  gross_sale_price    FLOAT64,
  ownership_pct       FLOAT64,
  entity_type         STRING,
  basis               FLOAT64,
  sale_structure      STRING,       -- asset_sale | stock_sale
  filing_status       STRING,

  -- Results
  gross_proceeds      FLOAT64,
  total_gain          FLOAT64,
  federal_cg_tax      FLOAT64,
  niit_on_sale        FLOAT64,
  state_tax           FLOAT64,
  transaction_costs   FLOAT64,
  net_proceeds        FLOAT64,
  effective_tax_rate  FLOAT64
);

-- 4r. Equity Compensation Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_equity_comp_analysis` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING,
  household_id        STRING,
  grant_type          STRING        NOT NULL,  -- RSU | NQSO | ISO | ESPP
  calculated_at       TIMESTAMP     NOT NULL,

  shares              INT64,
  exercise_price      FLOAT64,
  current_fmv         FLOAT64,
  purchase_price      FLOAT64,

  -- RSU results
  rsu_ordinary_income FLOAT64,
  rsu_federal_withholding FLOAT64,
  rsu_net_shares_delivered INT64,
  rsu_net_cash_value  FLOAT64,

  -- NQSO results
  nqso_spread_per_share FLOAT64,
  nqso_gross_ordinary_income FLOAT64,
  nqso_total_tax      FLOAT64,
  nqso_net_after_tax  FLOAT64,

  -- ISO results
  iso_amt_preference_item FLOAT64,
  iso_estimated_amt   FLOAT64,

  -- Concentrated position
  concentrated_current_value FLOAT64,
  concentrated_pct_of_portfolio FLOAT64,
  concentrated_unrealized_gain  FLOAT64
);

-- 4s. Charitable Planning Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.plan_charitable_analysis` (
  analysis_id         STRING        NOT NULL,
  plan_id             STRING,
  analysis_type       STRING        NOT NULL,  -- daf_comparison | bunching | qcd_vs_cash
  calculated_at       TIMESTAMP     NOT NULL,

  -- DAF comparison
  daf_amount          FLOAT64,
  daf_cost_basis      FLOAT64,
  daf_fmv             FLOAT64,
  daf_cash_gift_deduction  FLOAT64,
  daf_stock_gift_deduction FLOAT64,
  daf_cg_tax_avoided       FLOAT64,
  daf_tax_savings_of_stock FLOAT64,

  -- Bunching optimizer
  bunch_annual_charitable FLOAT64,
  bunch_standard_deduction FLOAT64,
  bunch_optimal_interval   INT64,
  bunch_annual_tax_savings FLOAT64,

  -- QCD vs Cash
  qcd_amount          FLOAT64,
  qcd_agi_reduction   FLOAT64,
  qcd_ss_tax_savings  FLOAT64,
  qcd_irmaa_savings   FLOAT64,
  qcd_net_savings     FLOAT64
);


-- ============================================================================
-- SECTION 5: DEBT ANALYSIS (FP-DebtIQ)
-- ============================================================================

-- 5a. Farther Debt Score
CREATE TABLE IF NOT EXISTS `farther_wealth.debt_scores` (
  score_id            STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  calculated_at       TIMESTAMP     NOT NULL,

  score               INT64,        -- 0–850
  label               STRING,       -- DEBT_FREE | EXCELLENT | GOOD | FAIR | CONCERNING | CRITICAL
  leverage_dimension  FLOAT64,      -- 0–100
  cost_dimension      FLOAT64,
  structure_dimension FLOAT64,
  risk_dimension      FLOAT64,
  trajectory_dimension FLOAT64,
  score_change        INT64,
  total_debt          FLOAT64,
  total_monthly_payments FLOAT64,
  weighted_avg_rate   FLOAT64,
  debt_to_income_ratio FLOAT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.debt_score_opportunities` (
  opportunity_id      STRING        NOT NULL,
  score_id            STRING        NOT NULL,
  action              STRING,
  annual_savings      FLOAT64,
  complexity          STRING,       -- low | medium | high
  urgency             STRING        -- low | medium | high
);

-- 5b. Mortgage Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.mortgage_analyses` (
  analysis_id         STRING        NOT NULL,
  household_id        STRING,
  analysis_type       STRING        NOT NULL,  -- refinance | home_equity | mortgage_vs_invest | pmi_elimination
  calculated_at       TIMESTAMP     NOT NULL,

  -- Current loan
  current_balance     FLOAT64,
  current_rate        FLOAT64,
  current_payment     FLOAT64,
  remaining_months    INT64,
  home_value          FLOAT64,

  -- Refinance results
  refi_new_rate       FLOAT64,
  refi_new_payment    FLOAT64,
  refi_monthly_savings FLOAT64,
  refi_breakeven_months INT64,
  refi_total_interest_savings FLOAT64,
  refi_recommend      BOOL,

  -- Home Equity results
  equity_current      FLOAT64,
  equity_max_borrowable FLOAT64,

  -- Mortgage vs Invest results
  mvi_invest_net_worth FLOAT64,
  mvi_payoff_net_worth FLOAT64,
  mvi_crossover_year  INT64,
  mvi_recommendation  STRING,       -- PAY_MORTGAGE | INVEST | SPLIT

  -- PMI elimination
  pmi_current_ltv     FLOAT64,
  pmi_months_to_removal INT64,
  pmi_monthly_pmi     FLOAT64
);

-- 5c. Student Loan Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.student_loan_analyses` (
  analysis_id         STRING        NOT NULL,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  total_loan_balance  FLOAT64,
  loan_count          INT64,
  agi                 FLOAT64,
  family_size         INT64,
  is_pslf_eligible    BOOL,
  pslf_qualifying_payments INT64,

  -- Best plan results
  recommended_plan    STRING,       -- STANDARD_10YR | IBR_NEW | PAYE | SAVE | etc.
  recommended_total_paid FLOAT64,
  recommended_forgiveness FLOAT64,
  recommended_npv     FLOAT64,
  recommended_payoff_date DATE,

  -- Standard plan comparison
  standard_total_paid FLOAT64,
  standard_monthly_payment FLOAT64,

  -- PSLF analysis
  pslf_projected_forgiveness FLOAT64,
  pslf_total_paid     FLOAT64,

  -- Private refi comparison
  private_refi_rate   FLOAT64,
  private_refi_total_paid FLOAT64,
  private_refi_savings FLOAT64,

  -- Marriage penalty
  marriage_penalty_amount FLOAT64
);

-- 5d. Credit Card Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.credit_card_analyses` (
  analysis_id         STRING        NOT NULL,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  total_balance       FLOAT64,
  card_count          INT64,
  weighted_avg_apr    FLOAT64,
  total_minimum_payment FLOAT64,

  -- Payoff strategy results
  avalanche_total_interest FLOAT64,
  avalanche_payoff_months  INT64,
  snowball_total_interest  FLOAT64,
  snowball_payoff_months   INT64,
  minimum_only_total_interest FLOAT64,
  minimum_only_payoff_months  INT64,

  -- Balance transfer
  bt_opportunities    INT64,
  bt_total_interest_saved FLOAT64,
  bt_total_net_savings    FLOAT64,

  -- Utilization
  current_utilization_pct FLOAT64,
  target_utilization_pct  FLOAT64,
  estimated_fico_lift     INT64
);

-- 5e. Multi-Debt Payoff Optimizer
CREATE TABLE IF NOT EXISTS `farther_wealth.debt_payoff_strategies` (
  strategy_id         STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  calculated_at       TIMESTAMP     NOT NULL,

  total_debt          FLOAT64,
  monthly_extra_payment FLOAT64,
  debt_count          INT64,

  -- Strategy comparison
  strategy_name       STRING        NOT NULL,  -- AVALANCHE | SNOWBALL | HYBRID | TAX_OPTIMIZED | etc.
  total_interest_paid FLOAT64,
  total_interest_saved FLOAT64,
  debt_free_date      DATE,
  months_saved_vs_minimum INT64,
  net_worth_at_10_years   FLOAT64
);

-- 5f. SBLOC Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.sbloc_analyses` (
  analysis_id         STRING        NOT NULL,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  portfolio_total_value    FLOAT64,
  eligible_collateral      FLOAT64,
  loan_amount              FLOAT64,
  loan_rate                FLOAT64,
  loan_purpose             STRING,

  -- Results
  max_borrowing_power      FLOAT64,
  loan_to_value            FLOAT64,
  ltv_rating               STRING,   -- CONSERVATIVE | MODERATE | AGGRESSIVE
  margin_call_threshold    FLOAT64,
  margin_call_buffer_pct   FLOAT64,
  portfolio_drop_to_call   FLOAT64,
  mc_probability_6mo       FLOAT64,
  mc_probability_12mo      FLOAT64,

  annual_interest_cost     FLOAT64,
  after_tax_interest_cost  FLOAT64,
  cg_tax_avoided_vs_liquidate FLOAT64,
  growth_preserved         FLOAT64,
  net_advantage_vs_liquidate  FLOAT64,

  recommendation           STRING
);

-- 5g. Auto Loan Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.auto_loan_analyses` (
  analysis_id         STRING        NOT NULL,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  vehicle_value       FLOAT64,
  loan_balance        FLOAT64,
  interest_rate       FLOAT64,
  remaining_months    INT64,
  monthly_payment     FLOAT64,

  -- Results
  equity              FLOAT64,
  ltv                 FLOAT64,
  is_underwater       BOOL,
  total_interest_remaining FLOAT64,

  -- Payoff analysis
  payoff_interest_saved FLOAT64,
  payoff_opportunity_cost FLOAT64,
  payoff_net_advantage    FLOAT64,
  payoff_recommendation   STRING,

  -- Lease vs Buy
  lease_total_outflows    FLOAT64,
  buy_total_outflows      FLOAT64,
  lease_recommendation    STRING
);

-- 5h. Business Debt Analysis
CREATE TABLE IF NOT EXISTS `farther_wealth.business_debt_analyses` (
  analysis_id         STRING        NOT NULL,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  business_type       STRING,
  total_business_debt FLOAT64,
  business_income     FLOAT64,
  ebitda              FLOAT64,
  personal_guarantees_total FLOAT64,

  -- Results
  debt_to_ebitda      FLOAT64,
  dscr                FLOAT64,       -- Debt Service Coverage Ratio
  total_debt_to_revenue FLOAT64,
  personal_guarantee_pct_net_worth FLOAT64,
  personal_exposure_risk_rating    STRING,

  -- Section 163(j)
  sec_163j_limit      FLOAT64,
  deductible_this_year FLOAT64,
  disallowed_carryforward FLOAT64,
  tax_savings         FLOAT64
);


-- ============================================================================
-- SECTION 6: RISK PROFILING (FP-Focus)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.risk_profiles` (
  profile_id          STRING        NOT NULL,
  client_id           STRING        NOT NULL,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  wealth_tier         STRING,
  investment_experience_years INT64,

  -- Axis scores (0–100)
  tolerance_score     FLOAT64,
  capacity_score      FLOAT64,
  need_score          FLOAT64,
  bias_index_score    FLOAT64,
  complexity_score    FLOAT64,

  -- Risk bands (1–7)
  tolerance_band      INT64,
  capacity_band       INT64,
  recommended_band    INT64,

  confidence          FLOAT64,      -- 0–100
  question_count      INT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.risk_profile_portfolios` (
  portfolio_id        STRING        NOT NULL,
  profile_id          STRING        NOT NULL,
  portfolio_type      STRING        NOT NULL,  -- conservative | recommended | aggressive

  -- Allocation percentages
  us_equity_pct       FLOAT64,
  intl_equity_pct     FLOAT64,
  emerging_market_pct FLOAT64,
  gov_bonds_pct       FLOAT64,
  corp_bonds_pct      FLOAT64,
  high_yield_pct      FLOAT64,
  reits_pct           FLOAT64,
  commodities_pct     FLOAT64,
  alternatives_pct    FLOAT64,
  crypto_pct          FLOAT64,
  cash_pct            FLOAT64,

  -- Portfolio metrics
  expected_return     FLOAT64,
  expected_volatility FLOAT64,
  max_drawdown        FLOAT64,
  sharpe_ratio        FLOAT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.risk_profile_backtests` (
  backtest_id         STRING        NOT NULL,
  portfolio_id        STRING        NOT NULL,

  cagr                FLOAT64,
  volatility          FLOAT64,
  max_drawdown        FLOAT64,
  worst_year_return   FLOAT64,
  worst_3yr_return    FLOAT64,
  best_3yr_return     FLOAT64,
  pct_negative_years  FLOAT64,
  recovery_months     INT64,

  -- Crash scenarios
  crash_2008_return   FLOAT64,
  crash_covid_return  FLOAT64,
  crash_2022_return   FLOAT64,
  crash_dotcom_return FLOAT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.risk_profile_biases` (
  bias_id             STRING        NOT NULL,
  profile_id          STRING        NOT NULL,

  bias_type           STRING,       -- loss_aversion | recency | overconfidence | framing | herd
  severity            STRING,       -- low | moderate | high
  advisor_talking_point STRING
);


-- ============================================================================
-- SECTION 7: PROPOSAL ENGINE (FP-Propose)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.proposals` (
  proposal_id         STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  advisor_id          STRING,
  plan_id             STRING,
  status              STRING,       -- draft | review | presented | accepted | declined
  created_at          TIMESTAMP     NOT NULL,
  updated_at          TIMESTAMP     NOT NULL,

  -- Risk scoring
  behavioral_score    FLOAT64,
  capacity_score      FLOAT64,
  required_return_score FLOAT64,
  composite_score     FLOAT64,
  recommended_equity_pct FLOAT64,
  recommended_bond_pct   FLOAT64,
  recommended_cash_pct   FLOAT64,
  risk_gap_vs_current    FLOAT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.proposal_analytics` (
  analytics_id        STRING        NOT NULL,
  proposal_id         STRING        NOT NULL,
  portfolio_type      STRING        NOT NULL,  -- current | proposed

  expected_return     FLOAT64,
  volatility          FLOAT64,
  sharpe_ratio        FLOAT64,
  yield               FLOAT64,
  duration            FLOAT64,
  concentration_risk  FLOAT64,

  -- Stress test results
  stress_2008_pct     FLOAT64,
  stress_2008_dollar  FLOAT64,
  stress_covid_pct    FLOAT64,
  stress_covid_dollar FLOAT64,
  stress_2022_pct     FLOAT64,
  stress_2022_dollar  FLOAT64,
  stress_dotcom_pct   FLOAT64,
  stress_dotcom_dollar FLOAT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.proposal_fee_analyses` (
  fee_id              STRING        NOT NULL,
  proposal_id         STRING        NOT NULL,

  -- Current fees
  current_advisory_fee    FLOAT64,
  current_expense_ratio   FLOAT64,
  current_transaction_cost FLOAT64,
  current_total_annual    FLOAT64,

  -- Proposed fees
  proposed_advisory_fee   FLOAT64,
  proposed_expense_ratio  FLOAT64,
  proposed_transaction_cost FLOAT64,
  proposed_total_annual   FLOAT64,

  -- Savings
  annual_fee_savings      FLOAT64,
  annual_fee_savings_bps  FLOAT64,
  compounding_5yr         FLOAT64,
  compounding_10yr        FLOAT64,
  compounding_20yr        FLOAT64,
  compounding_30yr        FLOAT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.proposal_tax_transitions` (
  transition_id       STRING        NOT NULL,
  proposal_id         STRING        NOT NULL,
  strategy            STRING        NOT NULL,  -- full_liquidation | phased_3yr | harvest_first | direct_indexing | hold_in_place

  tax_cost            FLOAT64,
  net_proceeds        FLOAT64,
  time_to_full_transition STRING,
  recommendation      STRING
);


-- ============================================================================
-- SECTION 8: PRACTICE ANALYTICS (FP-Pulse)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.advisor_scorecards` (
  scorecard_id        STRING        NOT NULL,
  advisor_id          STRING        NOT NULL,
  firm_id             STRING        NOT NULL,
  period_start        DATE          NOT NULL,
  period_end          DATE          NOT NULL,
  calculated_at       TIMESTAMP     NOT NULL,

  aum                 FLOAT64,
  household_count     INT64,
  avg_plan_completion FLOAT64,
  revenue             FLOAT64,
  fee_yield_bps       FLOAT64,
  retention_rate      FLOAT64,
  meeting_count       INT64,
  nps_score           FLOAT64,
  plan_success_rate   FLOAT64,
  client_acquisition  INT64,
  client_attrition    INT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.churn_predictions` (
  prediction_id       STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  advisor_id          STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  churn_probability   FLOAT64,      -- 0.0 to 1.0
  churn_risk_label    STRING,       -- VERY_LOW | LOW | MODERATE | HIGH | CRITICAL

  -- Contributing signals
  days_since_last_contact INT64,
  days_since_last_portal_login INT64,
  portal_sessions_last_90d INT64,
  meetings_last_12_months  INT64,
  emails_opened_rate_90d   FLOAT64,
  probability_of_success   FLOAT64,
  plan_data_completeness   FLOAT64,
  aum_delta_6m             FLOAT64,
  net_flows_12m            FLOAT64,
  portfolio_drift          FLOAT64,
  days_since_last_proposal INT64,
  years_as_client          FLOAT64,
  household_complexity     INT64
);

CREATE TABLE IF NOT EXISTS `farther_wealth.practice_alerts` (
  alert_id            STRING        NOT NULL,
  household_id        STRING,
  plan_id             STRING,
  advisor_id          STRING,
  severity            STRING,       -- info | warning | critical
  category            STRING,
  title               STRING,
  recommended_action  STRING,
  estimated_impact    FLOAT64,
  deadline            DATE,
  auto_action_available BOOL,
  status              STRING,       -- active | acknowledged | resolved | dismissed
  created_at          TIMESTAMP     NOT NULL,
  resolved_at         TIMESTAMP
);


-- ============================================================================
-- SECTION 9: AI ENGINE (Insights, Recommendations, Alerts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.ai_opportunities` (
  opportunity_id      STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  opportunity_type    STRING,       -- roth_conversion | tax_loss_harvest | ss_delay | rmd_qcd | insurance_gap | charitable_bunching | hsa_max | business_succession
  title               STRING,
  description         STRING,
  estimated_value     FLOAT64,
  urgency             STRING,       -- high | medium | low
  category            STRING,
  applicable_window   STRING
);

CREATE TABLE IF NOT EXISTS `farther_wealth.ai_recommendations` (
  recommendation_id   STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  recommendation_type STRING        NOT NULL,  -- roth | social_security | rebalancing | estate | insurance
  calculated_at       TIMESTAMP     NOT NULL,

  -- Roth recommendation
  roth_recommended_amount FLOAT64,
  roth_bracket_fill_amount FLOAT64,
  roth_irmaa_safe     BOOL,

  -- SS recommendation
  ss_optimal_claim_age FLOAT64,
  ss_lifetime_benefit_increase FLOAT64,

  -- Rebalancing recommendation
  rebal_max_drift     FLOAT64,
  rebal_tax_efficient BOOL,
  rebal_estimated_tax_cost FLOAT64,

  summary             STRING
);

CREATE TABLE IF NOT EXISTS `farther_wealth.ai_estate_alerts` (
  alert_id            STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  household_id        STRING,
  calculated_at       TIMESTAMP     NOT NULL,

  alert_type          STRING,       -- stale_document | exemption_proximity | beneficiary_mismatch | titling_issue
  severity            STRING,
  title               STRING,
  description         STRING,
  recommended_action  STRING
);

CREATE TABLE IF NOT EXISTS `farther_wealth.plan_insights` (
  insight_id          STRING        NOT NULL,
  plan_id             STRING        NOT NULL,
  rank                INT64,
  category            STRING,
  insight_type        STRING,
  title               STRING,
  estimated_impact_amt FLOAT64,
  ai_generated        BOOL,
  created_at          TIMESTAMP     NOT NULL
);


-- ============================================================================
-- SECTION 10: COMPLIANCE & AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.audit_trail` (
  entry_id            STRING        NOT NULL,
  firm_id             STRING,
  actor_type          STRING,       -- advisor | system | client | api
  actor_id            STRING,
  action              STRING,
  resource_type       STRING,
  resource_id         STRING,
  before_state        STRING,       -- JSON
  after_state         STRING,       -- JSON
  ip_address          STRING,
  created_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.reg_bi_documentation` (
  doc_id              STRING        NOT NULL,
  household_id        STRING        NOT NULL,
  advisor_id          STRING        NOT NULL,
  created_at          TIMESTAMP     NOT NULL,

  client_profile_json STRING,       -- JSON snapshot
  recommendations_json STRING,      -- JSON snapshot
  conflicts_disclosed STRING,
  is_locked           BOOL,
  lock_hash           STRING,
  locked_at           TIMESTAMP
);


-- ============================================================================
-- SECTION 11: MARKET DATA & REGULATORY UPDATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.market_data_snapshots` (
  snapshot_id         STRING        NOT NULL,
  snapshot_date       DATE          NOT NULL,

  sp500_price         FLOAT64,
  ten_year_treasury   FLOAT64,
  fed_funds_rate      FLOAT64,
  cpi_yoy             FLOAT64,
  afr_short_term      FLOAT64,
  afr_mid_term        FLOAT64,
  afr_long_term       FLOAT64,
  sec_7520_rate       FLOAT64,
  captured_at         TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.tax_tables` (
  table_id            STRING        NOT NULL,
  tax_year            INT64         NOT NULL,
  table_type          STRING        NOT NULL,  -- federal_income | federal_cg | irmaa | ss_wage_base | standard_deduction | estate_exemption | gift_annual | hsa_limits | retirement_limits | rmd_uniform | rmd_joint | state_income
  filing_status       STRING,
  data_json           STRING,       -- Full bracket/limit data as JSON
  effective_date      DATE,
  source_url          STRING,
  created_at          TIMESTAMP     NOT NULL
);

CREATE TABLE IF NOT EXISTS `farther_wealth.regulatory_updates` (
  update_id           STRING        NOT NULL,
  source              STRING,       -- IRS | SSA | Treasury | CMS | Congress | state
  change_type         STRING,       -- annual_adjustment | new_legislation | rate_change | limit_change
  title               STRING,
  description         STRING,
  tax_year_affected   INT64,
  estimated_client_impact STRING,   -- high | medium | low
  affected_plans_count INT64,
  dollars_at_stake    FLOAT64,
  status              STRING,       -- detected | analyzed | validated | published
  detected_at         TIMESTAMP     NOT NULL,
  published_at        TIMESTAMP
);


-- ============================================================================
-- SECTION 12: CALCULATION EVENT LOG (Analytics Backbone)
-- ============================================================================
-- Every calculation across every tool logs here for analytics, performance
-- tracking, and usage patterns.

CREATE TABLE IF NOT EXISTS `farther_wealth.calculation_events` (
  event_id            STRING        NOT NULL,
  event_type          STRING        NOT NULL,  -- box_spread | tax_scenario | cash_flow | monte_carlo | debt_score | risk_profile | proposal | roth_conversion | estate | business_valuation | equity_comp | charitable | mortgage | student_loan | sbloc | auto_loan | education | insurance | retirement_readiness | ss_benefit | rmd | irmaa | federal_tax | state_tax
  firm_id             STRING,
  advisor_id          STRING,
  household_id        STRING,
  plan_id             STRING,
  session_id          STRING,

  -- Performance
  calc_duration_ms    INT64,
  calc_engine_version STRING,
  input_hash          STRING,       -- For dedup / caching

  -- Context
  source              STRING,       -- web_app | api | bulk_run | scheduled | ai_engine
  status              STRING,       -- success | error | timeout
  error_message       STRING,

  created_at          TIMESTAMP     NOT NULL
)
PARTITION BY DATE(created_at)
CLUSTER BY event_type, firm_id;


-- ============================================================================
-- SECTION 13: USER SESSIONS & PLATFORM USAGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS `farther_wealth.user_sessions` (
  session_id          STRING        NOT NULL,
  firm_id             STRING,
  advisor_id          STRING,
  client_portal       BOOL,
  started_at          TIMESTAMP     NOT NULL,
  ended_at            TIMESTAMP,
  duration_seconds    INT64,
  pages_visited       INT64,
  calculations_run    INT64,
  tools_used          STRING        -- JSON array of tool names used
)
PARTITION BY DATE(started_at);


-- ============================================================================
-- VIEWS: Pre-built analytics queries
-- ============================================================================

-- Firm-level AUM summary
CREATE OR REPLACE VIEW `farther_wealth.v_firm_aum_summary` AS
SELECT
  f.firm_id,
  f.name AS firm_name,
  COUNT(DISTINCT h.household_id) AS household_count,
  COUNT(DISTINCT a.advisor_id) AS advisor_count,
  COUNT(DISTINCT p.plan_id) AS plan_count,
  SUM(cf.total_investable_portfolio) AS total_aum
FROM `farther_wealth.firms` f
LEFT JOIN `farther_wealth.advisors` a ON a.firm_id = f.firm_id
LEFT JOIN `farther_wealth.households` h ON h.firm_id = f.firm_id
LEFT JOIN `farther_wealth.plans` p ON p.household_id = h.household_id
LEFT JOIN `farther_wealth.plan_cash_flow_projections` cf
  ON cf.plan_id = p.plan_id
  AND cf.year = EXTRACT(YEAR FROM CURRENT_DATE())
GROUP BY f.firm_id, f.name;

-- Advisor performance dashboard
CREATE OR REPLACE VIEW `farther_wealth.v_advisor_dashboard` AS
SELECT
  sc.advisor_id,
  a.first_name,
  a.last_name,
  sc.aum,
  sc.household_count,
  sc.revenue,
  sc.retention_rate,
  sc.plan_success_rate,
  sc.nps_score,
  cp.high_risk_count
FROM `farther_wealth.advisor_scorecards` sc
JOIN `farther_wealth.advisors` a ON a.advisor_id = sc.advisor_id
LEFT JOIN (
  SELECT advisor_id, COUNT(*) AS high_risk_count
  FROM `farther_wealth.churn_predictions`
  WHERE churn_risk_label IN ('HIGH', 'CRITICAL')
    AND DATE(calculated_at) = CURRENT_DATE()
  GROUP BY advisor_id
) cp ON cp.advisor_id = sc.advisor_id
WHERE sc.period_end = (
  SELECT MAX(period_end) FROM `farther_wealth.advisor_scorecards`
);

-- Households at risk
CREATE OR REPLACE VIEW `farther_wealth.v_households_at_risk` AS
SELECT
  cp.household_id,
  h.name AS household_name,
  a.first_name || ' ' || a.last_name AS advisor_name,
  cp.churn_probability,
  cp.churn_risk_label,
  cp.days_since_last_contact,
  cp.aum_delta_6m,
  cp.probability_of_success
FROM `farther_wealth.churn_predictions` cp
JOIN `farther_wealth.households` h ON h.household_id = cp.household_id
JOIN `farther_wealth.advisors` a ON a.advisor_id = h.advisor_id
WHERE cp.churn_risk_label IN ('HIGH', 'CRITICAL')
  AND cp.calculated_at = (
    SELECT MAX(calculated_at) FROM `farther_wealth.churn_predictions` cp2
    WHERE cp2.household_id = cp.household_id
  );

-- Calculation volume by tool (daily)
CREATE OR REPLACE VIEW `farther_wealth.v_daily_calc_volume` AS
SELECT
  DATE(created_at) AS calc_date,
  event_type,
  COUNT(*) AS calculation_count,
  AVG(calc_duration_ms) AS avg_duration_ms,
  COUNTIF(status = 'error') AS error_count
FROM `farther_wealth.calculation_events`
GROUP BY calc_date, event_type;

-- Box spread usage analytics
CREATE OR REPLACE VIEW `farther_wealth.v_box_spread_analytics` AS
SELECT
  DATE(calculated_at) AS calc_date,
  COUNT(*) AS calculations,
  AVG(loan_amount) AS avg_loan_amount,
  AVG(portfolio_value) AS avg_portfolio_value,
  AVG(r.annual_interest_savings) AS avg_annual_savings,
  COUNTIF(r.recommendation_level IN ('strong_for', 'for')) AS favorable_count,
  COUNTIF(r.recommendation_level IN ('strong_against', 'against')) AS unfavorable_count
FROM `farther_wealth.box_spread_calculations` c
JOIN `farther_wealth.box_spread_results` r ON r.calc_id = c.calc_id
GROUP BY calc_date;
