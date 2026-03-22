/**
 * Farther Prism — BigQuery ML Monte Carlo Interface
 *
 * Provides the SQL stored procedure definition, configuration types,
 * and helper functions for running Monte Carlo simulations in BigQuery.
 *
 * This module is self-contained and does not depend on React, Next.js, or Prisma.
 */

// ==================== CONFIGURATION ====================

/** Configuration parameters for the Monte Carlo simulation. */
export interface MonteCarloConfig {
  /** Number of simulation runs. */
  numRuns: number;
  /** Expected annual return for equities (e.g. 0.10 = 10%). */
  equityMean: number;
  /** Annual standard deviation for equities (e.g. 0.18 = 18%). */
  equityStd: number;
  /** Expected annual return for bonds. */
  bondMean: number;
  /** Annual standard deviation for bonds. */
  bondStd: number;
  /** Expected annual inflation rate. */
  inflationMean: number;
  /** Allocation to equities (0.0 - 1.0). */
  allocationEquity: number;
  /** Allocation to bonds (0.0 - 1.0). */
  allocationBond: number;
  /** Allocation to cash (0.0 - 1.0). */
  allocationCash: number;
  /** Allocation to alternatives (0.0 - 1.0). */
  allocationAlt: number;
}

/** Default Monte Carlo configuration based on historical market data. */
export const DEFAULT_MC_CONFIG: Readonly<MonteCarloConfig> = {
  numRuns: 10000,
  equityMean: 0.10,
  equityStd: 0.18,
  bondMean: 0.04,
  bondStd: 0.06,
  inflationMean: 0.025,
  allocationEquity: 0.60,
  allocationBond: 0.30,
  allocationCash: 0.05,
  allocationAlt: 0.05,
};

// ==================== RESULT TYPES ====================

/** Parsed output from the BigQuery Monte Carlo stored procedure. */
export interface MonteCarloOutput {
  /** Plan ID that was simulated. */
  planId: string;
  /** Overall probability of success (0.0 - 1.0). */
  probabilityOfSuccess: number;
  /** Number of simulation runs completed. */
  runsCompleted: number;
  /** Median terminal portfolio value. */
  medianTerminalValue: number;
  /** Percentile breakpoints for terminal value. */
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  /** Year-by-year confidence bands. */
  bands: Array<{
    year: number;
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  }>;
}

// ==================== SQL BUILDERS ====================

/**
 * Generates the SQL to call the Monte Carlo stored procedure in BigQuery.
 *
 * @param planId - The plan to simulate.
 * @param config - Monte Carlo configuration parameters.
 * @returns SQL string to execute the stored procedure call.
 */
export function buildMonteCarloSQL(
  planId: string,
  config: MonteCarloConfig = DEFAULT_MC_CONFIG,
): string {
  return `
CALL \`farther_plans.run_monte_carlo\`(
  '${planId}',           -- plan_id
  ${config.numRuns},     -- num_runs
  ${config.equityMean},  -- equity_mean
  ${config.equityStd},   -- equity_std
  ${config.bondMean},    -- bond_mean
  ${config.bondStd},     -- bond_std
  ${config.inflationMean}, -- inflation_mean
  ${config.allocationEquity}, -- allocation_equity
  ${config.allocationBond},   -- allocation_bond
  ${config.allocationCash},   -- allocation_cash
  ${config.allocationAlt}     -- allocation_alt
);
`.trim();
}

// ==================== RESULT PARSER ====================

/**
 * Parses the raw BigQuery result from the Monte Carlo stored procedure
 * into a typed `MonteCarloOutput` object.
 *
 * In production, `bqResult` would be the result object from the
 * `@google-cloud/bigquery` SDK's `query()` method.
 *
 * @param bqResult - Raw BigQuery query result (array of row arrays).
 * @returns Parsed and typed Monte Carlo output.
 */
export function parseMonteCarloResult(
  bqResult: Record<string, unknown>,
): MonteCarloOutput {
  // In production, the stored procedure writes results to a temp table
  // and returns them. The structure matches the MonteCarloOutput type.
  //
  // Demo implementation returns realistic placeholder data:

  const planId = (bqResult['plan_id'] as string) ?? 'unknown';
  const probSuccess = (bqResult['probability_of_success'] as number) ?? 0.87;
  const runs = (bqResult['runs_completed'] as number) ?? 10000;
  const medianTerminal = (bqResult['median_terminal_value'] as number) ?? 4_250_000;

  return {
    planId,
    probabilityOfSuccess: probSuccess,
    runsCompleted: runs,
    medianTerminalValue: medianTerminal,
    percentiles: {
      p5: medianTerminal * 0.28,
      p10: medianTerminal * 0.42,
      p25: medianTerminal * 0.68,
      p50: medianTerminal,
      p75: medianTerminal * 1.36,
      p90: medianTerminal * 1.76,
      p95: medianTerminal * 2.14,
    },
    bands: [],
  };
}

// ==================== STORED PROCEDURE ====================

/**
 * Full CREATE PROCEDURE SQL for the BigQuery Monte Carlo simulation.
 *
 * This procedure:
 * 1. Reads the latest plan result and annual projections
 * 2. Generates `num_runs` random return sequences
 * 3. Simulates portfolio growth year-over-year with contributions/withdrawals
 * 4. Computes success probability and percentile bands
 * 5. Writes results to the mc_results temp table and returns them
 */
export const MONTE_CARLO_STORED_PROCEDURE_SQL = `
CREATE OR REPLACE PROCEDURE \`farther_plans.run_monte_carlo\`(
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
  -- Step 1: Get the latest plan result and projection years
  DECLARE v_start_value FLOAT64;
  DECLARE v_num_years INT64;

  SET v_start_value = (
    SELECT COALESCE(
      (SELECT proj.total_investable
       FROM \`farther_plans.plan_results\` pr,
       UNNEST(pr.annual_projections) AS proj
       WHERE pr.plan_id = p_plan_id
       ORDER BY pr.calculated_at DESC, proj.year ASC
       LIMIT 1),
      1000000.0
    )
  );

  SET v_num_years = (
    SELECT COALESCE(
      (SELECT COUNT(DISTINCT proj.year)
       FROM \`farther_plans.plan_results\` pr,
       UNNEST(pr.annual_projections) AS proj
       WHERE pr.plan_id = p_plan_id
       ORDER BY pr.calculated_at DESC
       LIMIT 1),
      30
    )
  );

  -- Step 2: Generate random returns for each run and year
  CREATE TEMP TABLE mc_runs AS
  SELECT
    run_id,
    year_offset,
    -- Weighted portfolio return = sum of (allocation * asset return)
    (p_alloc_equity * (p_equity_mean + p_equity_std * normal_rand_eq))
    + (p_alloc_bond * (p_bond_mean + p_bond_std * normal_rand_bd))
    + (p_alloc_cash * 0.02)
    + (p_alloc_alt * (p_equity_mean * 0.7 + p_equity_std * 0.5 * normal_rand_alt))
    AS portfolio_return,
    (p_inflation_mean + 0.01 * normal_rand_inf) AS inflation_rate
  FROM (
    SELECT
      run_id,
      year_offset,
      -- Box-Muller transform for standard normal random variables
      SQRT(-2 * LN(RAND())) * COS(2 * ACOS(-1) * RAND()) AS normal_rand_eq,
      SQRT(-2 * LN(RAND())) * COS(2 * ACOS(-1) * RAND()) AS normal_rand_bd,
      SQRT(-2 * LN(RAND())) * COS(2 * ACOS(-1) * RAND()) AS normal_rand_alt,
      SQRT(-2 * LN(RAND())) * COS(2 * ACOS(-1) * RAND()) AS normal_rand_inf
    FROM
      UNNEST(GENERATE_ARRAY(1, p_num_runs)) AS run_id,
      UNNEST(GENERATE_ARRAY(1, v_num_years)) AS year_offset
  );

  -- Step 3: Get annual cash flows from the plan projections
  CREATE TEMP TABLE plan_cashflows AS
  SELECT
    proj.year,
    ROW_NUMBER() OVER (ORDER BY proj.year) AS year_offset,
    proj.portfolio_contributions,
    proj.portfolio_withdrawals,
    proj.roth_conversion
  FROM \`farther_plans.plan_results\` pr,
  UNNEST(pr.annual_projections) AS proj
  WHERE pr.plan_id = p_plan_id
  AND pr.calculated_at = (
    SELECT MAX(calculated_at) FROM \`farther_plans.plan_results\`
    WHERE plan_id = p_plan_id
  )
  ORDER BY proj.year;

  -- Step 4: Simulate portfolio values using recursive CTE
  CREATE TEMP TABLE mc_results AS
  WITH RECURSIVE portfolio_sim AS (
    -- Base case: starting portfolio value
    SELECT
      r.run_id,
      0 AS year_offset,
      v_start_value AS portfolio_value
    FROM (SELECT DISTINCT run_id FROM mc_runs) r

    UNION ALL

    -- Recursive step: apply returns and cash flows
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

  -- Step 5: Compute terminal values and percentiles
  CREATE TEMP TABLE mc_terminal AS
  SELECT
    run_id,
    portfolio_value AS terminal_value,
    CASE WHEN portfolio_value > 0 THEN 1 ELSE 0 END AS is_success
  FROM mc_results
  WHERE year_offset = v_num_years;

  -- Step 6: Return summary statistics
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

  -- Step 7: Return year-by-year confidence bands
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

  -- Cleanup temp tables
  DROP TABLE IF EXISTS mc_runs;
  DROP TABLE IF EXISTS plan_cashflows;
  DROP TABLE IF EXISTS mc_results;
  DROP TABLE IF EXISTS mc_terminal;
END;
`.trim();
