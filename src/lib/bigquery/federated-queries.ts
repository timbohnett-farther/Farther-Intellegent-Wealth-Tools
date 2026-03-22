/**
 * Farther Prism — Federated Query Templates
 *
 * Pre-built BigQuery federated query templates that join BigQuery
 * analytical data with Cloud SQL operational data via EXTERNAL_QUERY.
 *
 * These templates are parameterized strings. Use `buildFederatedQuery`
 * to substitute runtime parameters before execution.
 *
 * This module is self-contained and does not depend on React, Next.js, or Prisma.
 */

// ==================== QUERY TEMPLATES ====================

/**
 * Joins Cloud SQL client records with BigQuery plan results
 * for a firm dashboard view.
 *
 * Parameters: @projectId, @datasetPlans, @cloudSqlConnection, @firmId
 */
export const FIRM_DASHBOARD_QUERY = `
SELECT
  cs.id AS client_id,
  cs.first_name,
  cs.last_name,
  cs.email,
  cs.advisor_id,
  adv.advisor_name,
  pr.plan_id,
  pr.scenario_id,
  pr.probability_of_success,
  pr.mc_median_terminal_value,
  pr.projected_estate_value,
  pr.total_taxes_lifetime,
  pr.avg_effective_tax_rate,
  pr.calculated_at,
  CASE
    WHEN pr.probability_of_success >= 0.80 THEN 'on_track'
    WHEN pr.probability_of_success >= 0.60 THEN 'at_risk'
    ELSE 'critical'
  END AS plan_status
FROM \`@projectId.@datasetPlans.plan_results\` pr
INNER JOIN EXTERNAL_QUERY("@cloudSqlConnection",
  "SELECT id, first_name, last_name, email, advisor_id FROM clients WHERE firm_id = '@firmId'"
) cs ON pr.client_id = cs.id
INNER JOIN EXTERNAL_QUERY("@cloudSqlConnection",
  "SELECT id, first_name || ' ' || last_name AS advisor_name FROM advisors WHERE firm_id = '@firmId'"
) adv ON pr.advisor_id = adv.id
WHERE pr.firm_id = '@firmId'
  AND pr.calculated_at = (
    SELECT MAX(sub.calculated_at)
    FROM \`@projectId.@datasetPlans.plan_results\` sub
    WHERE sub.plan_id = pr.plan_id
  )
ORDER BY pr.probability_of_success ASC
`;

/**
 * Finds plans below the Monte Carlo success threshold.
 *
 * Parameters: @projectId, @datasetPlans, @cloudSqlConnection, @firmId, @threshold
 */
export const AT_RISK_PLANS_QUERY = `
SELECT
  pr.plan_id,
  pr.client_id,
  cs.first_name,
  cs.last_name,
  cs.email,
  pr.advisor_id,
  adv.advisor_name,
  pr.probability_of_success,
  pr.mc_median_terminal_value,
  pr.projected_estate_value,
  pr.calculated_at,
  ROUND((0.80 - pr.probability_of_success) * 100, 1) AS shortfall_pct
FROM \`@projectId.@datasetPlans.plan_results\` pr
INNER JOIN EXTERNAL_QUERY("@cloudSqlConnection",
  "SELECT id, first_name, last_name, email, advisor_id FROM clients WHERE firm_id = '@firmId'"
) cs ON pr.client_id = cs.id
INNER JOIN EXTERNAL_QUERY("@cloudSqlConnection",
  "SELECT id, first_name || ' ' || last_name AS advisor_name FROM advisors WHERE firm_id = '@firmId'"
) adv ON pr.advisor_id = adv.id
WHERE pr.firm_id = '@firmId'
  AND pr.probability_of_success < @threshold
  AND pr.calculated_at = (
    SELECT MAX(sub.calculated_at)
    FROM \`@projectId.@datasetPlans.plan_results\` sub
    WHERE sub.plan_id = pr.plan_id
  )
ORDER BY pr.probability_of_success ASC
`;

/**
 * Compares current year tax tables with prior year tables
 * to identify bracket changes.
 *
 * Parameters: @projectId, @datasetTaxTables, @currentYear, @priorYear
 */
export const TAX_TABLE_COMPARISON_QUERY = `
SELECT
  cur.table_type,
  cur.filing_status,
  cur.tax_year AS current_year,
  prior.tax_year AS prior_year,
  cur.effective_date AS current_effective_date,
  prior.effective_date AS prior_effective_date,
  cur.source AS current_source,
  prior.source AS prior_source,
  cur.data AS current_data,
  prior.data AS prior_data,
  cur.created_at AS current_created_at,
  cur.validated_by AS current_validated_by
FROM \`@projectId.@datasetTaxTables.tax_table_versions\` cur
LEFT JOIN \`@projectId.@datasetTaxTables.tax_table_versions\` prior
  ON cur.table_type = prior.table_type
  AND cur.filing_status = prior.filing_status
  AND prior.tax_year = @priorYear
  AND prior.is_current = TRUE
WHERE cur.tax_year = @currentYear
  AND cur.is_current = TRUE
ORDER BY cur.table_type, cur.filing_status
`;

/**
 * Aggregates advisor-level metrics across all plans and clients.
 *
 * Parameters: @projectId, @datasetPlans, @cloudSqlConnection, @firmId
 */
export const ADVISOR_PERFORMANCE_QUERY = `
SELECT
  pr.advisor_id,
  adv.advisor_name,
  COUNT(DISTINCT pr.client_id) AS client_count,
  COUNT(DISTINCT pr.plan_id) AS plan_count,
  AVG(pr.probability_of_success) AS avg_success_rate,
  MIN(pr.probability_of_success) AS min_success_rate,
  MAX(pr.probability_of_success) AS max_success_rate,
  COUNTIF(pr.probability_of_success >= 0.80) AS plans_on_track,
  COUNTIF(pr.probability_of_success < 0.80 AND pr.probability_of_success >= 0.60) AS plans_at_risk,
  COUNTIF(pr.probability_of_success < 0.60) AS plans_critical,
  AVG(pr.mc_median_terminal_value) AS avg_terminal_value,
  AVG(pr.avg_effective_tax_rate) AS avg_tax_rate,
  SUM(pr.projected_estate_value) AS total_projected_estate
FROM \`@projectId.@datasetPlans.plan_results\` pr
INNER JOIN EXTERNAL_QUERY("@cloudSqlConnection",
  "SELECT id, first_name || ' ' || last_name AS advisor_name FROM advisors WHERE firm_id = '@firmId'"
) adv ON pr.advisor_id = adv.id
WHERE pr.firm_id = '@firmId'
  AND pr.calculated_at = (
    SELECT MAX(sub.calculated_at)
    FROM \`@projectId.@datasetPlans.plan_results\` sub
    WHERE sub.plan_id = pr.plan_id
  )
GROUP BY pr.advisor_id, adv.advisor_name
ORDER BY avg_success_rate DESC
`;

/**
 * Wealth tier distribution analytics for a firm.
 *
 * Parameters: @projectId, @datasetPlans, @firmId
 */
export const CLIENT_WEALTH_DISTRIBUTION_QUERY = `
WITH latest_plans AS (
  SELECT
    pr.*,
    ROW_NUMBER() OVER (PARTITION BY pr.plan_id ORDER BY pr.calculated_at DESC) AS rn
  FROM \`@projectId.@datasetPlans.plan_results\` pr
  WHERE pr.firm_id = '@firmId'
),
client_wealth AS (
  SELECT
    lp.client_id,
    lp.projected_estate_value,
    lp.probability_of_success,
    CASE
      WHEN lp.projected_estate_value >= 25000000 THEN 'uhnw'
      WHEN lp.projected_estate_value >= 5000000 THEN 'hnw'
      WHEN lp.projected_estate_value >= 1000000 THEN 'mass_affluent'
      ELSE 'emerging'
    END AS wealth_tier
  FROM latest_plans lp
  WHERE lp.rn = 1
)
SELECT
  wealth_tier,
  COUNT(*) AS client_count,
  AVG(projected_estate_value) AS avg_estate_value,
  SUM(projected_estate_value) AS total_estate_value,
  AVG(probability_of_success) AS avg_success_rate,
  MIN(probability_of_success) AS min_success_rate,
  MAX(probability_of_success) AS max_success_rate
FROM client_wealth
GROUP BY wealth_tier
ORDER BY
  CASE wealth_tier
    WHEN 'uhnw' THEN 1
    WHEN 'hnw' THEN 2
    WHEN 'mass_affluent' THEN 3
    WHEN 'emerging' THEN 4
  END
`;

// ==================== QUERY BUILDER ====================

/**
 * Substitutes parameter placeholders in a federated query template.
 *
 * Placeholders use the `@paramName` format. All values are inserted
 * as-is (string interpolation), so callers must sanitize inputs
 * to prevent SQL injection in production.
 *
 * @param template - The query template with `@param` placeholders.
 * @param params - Key-value pairs to substitute into the template.
 * @returns The query with all parameters substituted.
 *
 * @example
 * ```ts
 * const query = buildFederatedQuery(FIRM_DASHBOARD_QUERY, {
 *   projectId: 'farther-prism-prod',
 *   datasetPlans: 'farther_plans',
 *   cloudSqlConnection: 'farther-prism-prod:us-central1:prism-pg',
 *   firmId: 'firm_abc123',
 * });
 * ```
 */
export function buildFederatedQuery(
  template: string,
  params: Record<string, string | number>,
): string {
  let result = template;

  for (const [key, value] of Object.entries(params)) {
    const placeholder = `@${key}`;
    const replacement = String(value);
    // Replace all occurrences of the placeholder
    while (result.includes(placeholder)) {
      result = result.replace(placeholder, replacement);
    }
  }

  return result;
}
