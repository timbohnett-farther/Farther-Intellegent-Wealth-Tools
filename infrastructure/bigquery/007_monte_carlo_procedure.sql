-- =============================================================================
-- Farther Prism — Monte Carlo Simulation Stored Procedure
-- =============================================================================
-- Runs a Monte Carlo simulation for a given financial plan using BigQuery's
-- analytical capabilities. Generates random return sequences, simulates
-- portfolio growth with contributions/withdrawals, and computes
-- probability of success with percentile confidence bands.
-- =============================================================================

CREATE OR REPLACE PROCEDURE `farther_plans.run_monte_carlo`(
  IN p_plan_id STRING,
  IN p_num_runs INT64,
  IN p_equity_mean FLOAT64,
  IN p_equity_std FLOAT64,
  IN p_bond_mean FLOAT64,
  IN p_bond_std FLOAT64,
  IN p_inflation_mean FLOAT64,
  IN p_alloc_equity FLOAT64,
  IN p_alloc_bond FLOAT64,
  IN p_alloc_cash FLOAT64,
  IN p_alloc_alt FLOAT64
)
BEGIN
  -- =========================================================================
  -- Step 1: Determine starting portfolio value and plan horizon
  -- =========================================================================
  DECLARE v_start_value FLOAT64;
  DECLARE v_num_years INT64;

  -- Get the initial portfolio value from the first projection year
  SET v_start_value = (
    SELECT COALESCE(
      (SELECT proj.total_investable
       FROM `farther_plans.plan_results` pr,
       UNNEST(pr.annual_projections) AS proj
       WHERE pr.plan_id = p_plan_id
       AND pr.calculated_at = (
         SELECT MAX(calculated_at) FROM `farther_plans.plan_results`
         WHERE plan_id = p_plan_id
       )
       ORDER BY proj.year ASC
       LIMIT 1),
      1000000.0  -- Default starting value if no plan found
    )
  );

  -- Get the number of projection years (plan horizon length)
  SET v_num_years = (
    SELECT COALESCE(
      (SELECT COUNT(DISTINCT proj.year)
       FROM `farther_plans.plan_results` pr,
       UNNEST(pr.annual_projections) AS proj
       WHERE pr.plan_id = p_plan_id
       AND pr.calculated_at = (
         SELECT MAX(calculated_at) FROM `farther_plans.plan_results`
         WHERE plan_id = p_plan_id
       )),
      30  -- Default 30-year horizon
    )
  );

  -- =========================================================================
  -- Step 2: Generate random returns for each run and year
  -- =========================================================================
  -- Uses Box-Muller transform to generate standard normal random variables,
  -- then applies mean and standard deviation for each asset class.

  CREATE TEMP TABLE mc_runs AS
  SELECT
    run_id,
    year_offset,
    -- Weighted portfolio return: sum of (allocation * asset class return)
    (p_alloc_equity * (p_equity_mean + p_equity_std * normal_rand_eq))
    + (p_alloc_bond * (p_bond_mean + p_bond_std * normal_rand_bd))
    + (p_alloc_cash * 0.02)  -- Cash earns a flat 2% (risk-free proxy)
    + (p_alloc_alt * (p_equity_mean * 0.7 + p_equity_std * 0.5 * normal_rand_alt))
    AS portfolio_return,
    (p_inflation_mean + 0.01 * normal_rand_inf) AS inflation_rate
  FROM (
    SELECT
      run_id,
      year_offset,
      -- Box-Muller transform for independent standard normal variates
      SQRT(-2 * LN(RAND())) * COS(2 * ACOS(-1) * RAND()) AS normal_rand_eq,
      SQRT(-2 * LN(RAND())) * COS(2 * ACOS(-1) * RAND()) AS normal_rand_bd,
      SQRT(-2 * LN(RAND())) * COS(2 * ACOS(-1) * RAND()) AS normal_rand_alt,
      SQRT(-2 * LN(RAND())) * COS(2 * ACOS(-1) * RAND()) AS normal_rand_inf
    FROM
      UNNEST(GENERATE_ARRAY(1, p_num_runs)) AS run_id,
      UNNEST(GENERATE_ARRAY(1, v_num_years)) AS year_offset
  );

  -- =========================================================================
  -- Step 3: Extract annual cash flows from the plan projections
  -- =========================================================================

  CREATE TEMP TABLE plan_cashflows AS
  SELECT
    proj.year,
    ROW_NUMBER() OVER (ORDER BY proj.year) AS year_offset,
    proj.portfolio_contributions,
    proj.portfolio_withdrawals,
    proj.roth_conversion
  FROM `farther_plans.plan_results` pr,
  UNNEST(pr.annual_projections) AS proj
  WHERE pr.plan_id = p_plan_id
  AND pr.calculated_at = (
    SELECT MAX(calculated_at) FROM `farther_plans.plan_results`
    WHERE plan_id = p_plan_id
  )
  ORDER BY proj.year;

  -- =========================================================================
  -- Step 4: Simulate portfolio values year-over-year
  -- =========================================================================
  -- Uses a recursive CTE to carry forward portfolio values, applying
  -- random returns and actual plan cash flows at each step.

  CREATE TEMP TABLE mc_results AS
  WITH RECURSIVE portfolio_sim AS (
    -- Base case: year 0 = starting portfolio value for all runs
    SELECT
      r.run_id,
      0 AS year_offset,
      v_start_value AS portfolio_value
    FROM (SELECT DISTINCT run_id FROM mc_runs) r

    UNION ALL

    -- Recursive step: grow portfolio by random return, add/subtract cash flows
    SELECT
      ps.run_id,
      ps.year_offset + 1,
      GREATEST(0,
        ps.portfolio_value * (1 + mr.portfolio_return)
        + COALESCE(cf.portfolio_contributions, 0)
        - COALESCE(cf.portfolio_withdrawals, 0)
      ) AS portfolio_value
    FROM portfolio_sim ps
    JOIN mc_runs mr
      ON ps.run_id = mr.run_id AND mr.year_offset = ps.year_offset + 1
    LEFT JOIN plan_cashflows cf
      ON cf.year_offset = ps.year_offset + 1
    WHERE ps.year_offset < v_num_years
  )
  SELECT * FROM portfolio_sim;

  -- =========================================================================
  -- Step 5: Compute terminal values and success flag
  -- =========================================================================
  -- A run is "successful" if the terminal portfolio value is > 0
  -- (i.e. the client did not run out of money).

  CREATE TEMP TABLE mc_terminal AS
  SELECT
    run_id,
    portfolio_value AS terminal_value,
    CASE WHEN portfolio_value > 0 THEN 1 ELSE 0 END AS is_success
  FROM mc_results
  WHERE year_offset = v_num_years;

  -- =========================================================================
  -- Step 6: Return summary statistics
  -- =========================================================================

  SELECT
    p_plan_id AS plan_id,
    AVG(is_success) AS probability_of_success,
    COUNT(*) AS runs_completed,
    APPROX_QUANTILES(terminal_value, 100)[OFFSET(50)] AS median_terminal_value,
    APPROX_QUANTILES(terminal_value, 100)[OFFSET(5)] AS p5,
    APPROX_QUANTILES(terminal_value, 100)[OFFSET(10)] AS p10,
    APPROX_QUANTILES(terminal_value, 100)[OFFSET(25)] AS p25,
    APPROX_QUANTILES(terminal_value, 100)[OFFSET(50)] AS p50,
    APPROX_QUANTILES(terminal_value, 100)[OFFSET(75)] AS p75,
    APPROX_QUANTILES(terminal_value, 100)[OFFSET(90)] AS p90,
    APPROX_QUANTILES(terminal_value, 100)[OFFSET(95)] AS p95
  FROM mc_terminal;

  -- =========================================================================
  -- Step 7: Return year-by-year confidence bands
  -- =========================================================================

  SELECT
    year_offset AS year,
    APPROX_QUANTILES(portfolio_value, 100)[OFFSET(5)] AS p5,
    APPROX_QUANTILES(portfolio_value, 100)[OFFSET(10)] AS p10,
    APPROX_QUANTILES(portfolio_value, 100)[OFFSET(25)] AS p25,
    APPROX_QUANTILES(portfolio_value, 100)[OFFSET(50)] AS p50,
    APPROX_QUANTILES(portfolio_value, 100)[OFFSET(75)] AS p75,
    APPROX_QUANTILES(portfolio_value, 100)[OFFSET(90)] AS p90,
    APPROX_QUANTILES(portfolio_value, 100)[OFFSET(95)] AS p95
  FROM mc_results
  GROUP BY year_offset
  ORDER BY year_offset;

  -- =========================================================================
  -- Cleanup temporary tables
  -- =========================================================================
  DROP TABLE IF EXISTS mc_runs;
  DROP TABLE IF EXISTS plan_cashflows;
  DROP TABLE IF EXISTS mc_results;
  DROP TABLE IF EXISTS mc_terminal;
END;
