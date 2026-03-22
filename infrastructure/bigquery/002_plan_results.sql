-- =============================================================================
-- Farther Prism — Plan Results Table
-- =============================================================================
-- Stores the output of every financial plan calculation, including nested
-- annual projections, Monte Carlo confidence bands, and goal results.
--
-- Partitioned by DATE(calculated_at) for efficient time-range queries.
-- Clustered by firm_id, advisor_id for fast firm/advisor dashboard lookups.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `farther_plans.plan_results` (
  -- Primary identifiers
  plan_id           STRING        NOT NULL,
  firm_id           STRING        NOT NULL,
  advisor_id        STRING        NOT NULL,
  client_id         STRING        NOT NULL,
  scenario_id       STRING        NOT NULL,

  -- Calculation metadata
  calculated_at     TIMESTAMP     NOT NULL,

  -- Monte Carlo summary
  probability_of_success    FLOAT64   NOT NULL,
  mc_runs                   INT64     NOT NULL,
  mc_median_terminal_value  FLOAT64   NOT NULL,
  mc_percentiles            STRUCT<
    p5    FLOAT64,
    p10   FLOAT64,
    p25   FLOAT64,
    p50   FLOAT64,
    p75   FLOAT64,
    p90   FLOAT64,
    p95   FLOAT64
  > NOT NULL,

  -- Tax summary
  total_taxes_lifetime      FLOAT64   NOT NULL,
  avg_effective_tax_rate    FLOAT64   NOT NULL,

  -- Estate summary
  projected_estate_value    FLOAT64   NOT NULL,
  projected_estate_tax_due  FLOAT64   NOT NULL,

  -- Nested annual projections (one per year in the plan horizon)
  annual_projections  ARRAY<STRUCT<
    year                    INT64,
    client_age              INT64,
    co_age                  INT64,
    is_retired              BOOL,

    -- Income
    salary_income           FLOAT64,
    se_income               FLOAT64,
    pension_income          FLOAT64,
    ss_client_gross         FLOAT64,
    ss_co_gross             FLOAT64,
    ss_taxable              FLOAT64,
    rental_income           FLOAT64,
    investment_income       FLOAT64,
    qualified_dividends     FLOAT64,
    capital_gains           FLOAT64,
    rmd_income              FLOAT64,
    roth_distributions      FLOAT64,
    annuity_income          FLOAT64,
    business_distributions  FLOAT64,
    total_gross_income      FLOAT64,
    agi                     FLOAT64,

    -- Expenses
    living_expenses         FLOAT64,
    healthcare_premiums     FLOAT64,
    ltc_expenses            FLOAT64,
    goal_withdrawals        FLOAT64,
    debt_payments           FLOAT64,
    total_expenses          FLOAT64,

    -- Taxes
    federal_tax             FLOAT64,
    state_tax               FLOAT64,
    se_tax                  FLOAT64,
    niit                    FLOAT64,
    total_tax               FLOAT64,
    effective_fed_rate      FLOAT64,
    marginal_rate           FLOAT64,

    -- Balance sheet
    taxable_portfolio       FLOAT64,
    tax_deferred_portfolio  FLOAT64,
    tax_free_portfolio      FLOAT64,
    total_investable        FLOAT64,
    real_estate_value       FLOAT64,
    total_assets            FLOAT64,
    total_liabilities       FLOAT64,
    net_worth               FLOAT64,

    -- Cash flow
    surplus_deficit         FLOAT64,
    portfolio_contributions FLOAT64,
    portfolio_withdrawals   FLOAT64,
    roth_conversion         FLOAT64
  >>,

  -- Monte Carlo confidence bands (one per year)
  mc_bands  ARRAY<STRUCT<
    year  INT64,
    p5    FLOAT64,
    p10   FLOAT64,
    p25   FLOAT64,
    p50   FLOAT64,
    p75   FLOAT64,
    p90   FLOAT64,
    p95   FLOAT64
  >>,

  -- Goal-level results
  goal_results  ARRAY<STRUCT<
    goal_id       STRING,
    goal_name     STRING,
    goal_type     STRING,
    target_amount FLOAT64,
    target_year   INT64,
    probability   FLOAT64,
    funded_ratio  FLOAT64,
    on_track      BOOL
  >>
)
PARTITION BY DATE(calculated_at)
CLUSTER BY firm_id, advisor_id
OPTIONS (
  description = 'Financial plan calculation results with nested annual projections, Monte Carlo bands, and goal outcomes.',
  labels = [('platform', 'farther_prism')],
  require_partition_filter = FALSE
);
