// FP-Sentinel — Quality Dashboard Engine
// Pure functions for computing system health scores and aggregating test results

import type {
  SystemHealthReport,
  ModuleHealth,
  ModuleName,
  HealthStatus,
  TestSuiteResult,
  DesignValidationReport,
  SecurityScanResult,
  ComplianceScanResult,
  DataConsistencyReport,
  Alert,
  AlertSeverity,
  CoverageThresholds,
  CoverageReport,
  PipelineRunResult,
  PipelineStageResult,
  DesignViolation,
  SecurityTest,
  ComplianceCheck,
} from './types';

import { DEFAULT_COVERAGE_THRESHOLDS } from './types';

// ── Health status thresholds ──
const HEALTHY_THRESHOLD = 90;
const DEGRADED_THRESHOLD = 70;

// ── Severity ordering for alert prioritization ──
const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// ── Scoring penalty constants ──
const DESIGN_VIOLATION_PENALTY = 5;
const SECURITY_CRITICAL_PENALTY = 25;
const SECURITY_WARNING_PENALTY = 10;

// ── Input types for builder functions ──
export interface ModuleMetrics {
  lastDeployment: Date;
  uptime30d: number;
  avgResponseTimeMs: number;
  errorRate24h: number;
  alerts: Alert[];
}

export interface ModuleTestData {
  unitTests: TestSuiteResult[];
  integrationTests: TestSuiteResult[];
}

export interface BuildReportInputs {
  modules: Record<ModuleName, ModuleHealth>;
  testSuites: TestSuiteResult[];
  designValidation: DesignValidationReport;
  securityScan: SecurityScanResult;
  complianceScan: ComplianceScanResult;
  dataConsistency?: DataConsistencyReport;
}

// ── 1. computeModuleHealth ──
/**
 * Computes the health status and score for a single module by aggregating
 * its test results, design compliance, security score, and operational metrics.
 */
export function computeModuleHealth(
  moduleName: ModuleName,
  testData: ModuleTestData,
  designReport: DesignValidationReport,
  securityScore: number,
  metrics: ModuleMetrics,
): ModuleHealth {
  // Aggregate unit test results
  const unitTotal = testData.unitTests.reduce((sum, s) => sum + s.total, 0);
  const unitPassing = testData.unitTests.reduce((sum, s) => sum + s.passing, 0);
  const unitCoverages = testData.unitTests
    .filter((s) => s.coverage != null)
    .map((s) => s.coverage!);
  const unitCoverage =
    unitCoverages.length > 0
      ? unitCoverages.reduce((sum, c) => sum + c.lines, 0) / unitCoverages.length
      : 0;
  const unitLastRun =
    testData.unitTests.length > 0
      ? new Date(Math.max(...testData.unitTests.map((s) => s.timestamp.getTime())))
      : new Date(0);

  // Aggregate integration test results
  const intTotal = testData.integrationTests.reduce((sum, s) => sum + s.total, 0);
  const intPassing = testData.integrationTests.reduce((sum, s) => sum + s.passing, 0);
  const intLastRun =
    testData.integrationTests.length > 0
      ? new Date(
          Math.max(...testData.integrationTests.map((s) => s.timestamp.getTime())),
        )
      : new Date(0);

  // Compute design compliance for this module's violations
  const moduleViolations = designReport.violations.filter(
    (v) => v.route.includes(moduleName) || true, // all violations count at module level
  );
  const designComplianceScore = designReport.score;
  const designViolationCount = designReport.violations.length;

  // Compute the composite score: weighted average of key factors
  const testPassRate =
    unitTotal + intTotal > 0
      ? ((unitPassing + intPassing) / (unitTotal + intTotal)) * 100
      : 0;

  const score = Math.round(
    clamp(
      testPassRate * 0.35 +
        unitCoverage * 0.20 +
        designComplianceScore * 0.15 +
        securityScore * 0.15 +
        metrics.uptime30d * 0.10 +
        (100 - Math.min(metrics.errorRate24h * 10, 100)) * 0.05,
      0,
      100,
    ),
  );

  const status = determineHealthStatus(score);

  return {
    name: moduleName,
    status,
    score,
    unitTests: {
      total: unitTotal,
      passing: unitPassing,
      coverage: unitCoverage,
      lastRun: unitLastRun,
    },
    integrationTests: {
      total: intTotal,
      passing: intPassing,
      lastRun: intLastRun,
    },
    designCompliance: {
      violations: designViolationCount,
      score: designComplianceScore,
      lastChecked: designReport.timestamp,
    },
    securityScore,
    lastDeployment: metrics.lastDeployment,
    uptime30d: metrics.uptime30d,
    avgResponseTimeMs: metrics.avgResponseTimeMs,
    errorRate24h: metrics.errorRate24h,
    alerts: metrics.alerts,
  };
}

// ── 2. computeOverallScore ──
/**
 * Computes the overall system score as the weighted average of all module scores,
 * and derives the system-level health status.
 */
export function computeOverallScore(
  modules: Record<ModuleName, ModuleHealth>,
): { score: number; status: HealthStatus } {
  const moduleList = Object.values(modules);
  if (moduleList.length === 0) {
    return { score: 0, status: 'unknown' };
  }

  const totalScore = moduleList.reduce((sum, m) => sum + m.score, 0);
  const score = Math.round(totalScore / moduleList.length);
  const status = determineHealthStatus(score);

  return { score, status };
}

// ── 3. aggregateTestSuites ──
/**
 * Aggregates counts across all test suites and computes the average coverage
 * percentage from suites that report coverage data.
 */
export function aggregateTestSuites(
  suites: TestSuiteResult[],
): {
  total: number;
  passing: number;
  failing: number;
  skipped: number;
  coveragePct: number;
} {
  const total = suites.reduce((sum, s) => sum + s.total, 0);
  const passing = suites.reduce((sum, s) => sum + s.passing, 0);
  const failing = suites.reduce((sum, s) => sum + s.failing, 0);
  const skipped = suites.reduce((sum, s) => sum + s.skipped, 0);

  const coverageSuites = suites.filter((s) => s.coverage != null);
  const coveragePct =
    coverageSuites.length > 0
      ? Math.round(
          (coverageSuites.reduce(
            (sum, s) =>
              sum +
              (s.coverage!.lines +
                s.coverage!.branches +
                s.coverage!.functions +
                s.coverage!.statements) /
                4,
            0,
          ) /
            coverageSuites.length) *
            100,
        ) / 100
      : 0;

  return { total, passing, failing, skipped, coveragePct };
}

// ── 4. computeDesignScore ──
/**
 * Computes a design compliance score starting at 100, deducting 5 points
 * per violation, floored at 0.
 */
export function computeDesignScore(violations: DesignViolation[]): number {
  const deduction = violations.length * DESIGN_VIOLATION_PENALTY;
  return Math.max(0, 100 - deduction);
}

// ── 5. computeSecurityScore ──
/**
 * Computes a security score starting at 100.
 * Each critical failure deducts 25 points; each warning deducts 10 points.
 * Floored at 0.
 */
export function computeSecurityScore(tests: SecurityTest[]): number {
  const failingTests = tests.filter((t) => !t.passed);

  const deduction = failingTests.reduce((sum, t) => {
    if (t.severity === 'critical') return sum + SECURITY_CRITICAL_PENALTY;
    if (t.severity === 'warning') return sum + SECURITY_WARNING_PENALTY;
    return sum;
  }, 0);

  return Math.max(0, 100 - deduction);
}

// ── 6. computeComplianceScore ──
/**
 * Computes a compliance score as the percentage of checks that passed,
 * expressed on a 0-100 scale.
 */
export function computeComplianceScore(checks: ComplianceCheck[]): number {
  if (checks.length === 0) return 100;
  const passing = checks.filter((c) => c.passed).length;
  return Math.round((passing / checks.length) * 100);
}

// ── 7. determineHealthStatus ──
/**
 * Maps a numeric score (0-100) to a HealthStatus.
 * >= 90 => healthy, >= 70 => degraded, < 70 => critical
 */
export function determineHealthStatus(score: number): HealthStatus {
  if (score >= HEALTHY_THRESHOLD) return 'healthy';
  if (score >= DEGRADED_THRESHOLD) return 'degraded';
  return 'critical';
}

// ── 8. checkCoverageThresholds ──
/**
 * Checks a coverage report against thresholds and returns whether the
 * coverage passes along with a list of human-readable violation messages.
 */
export function checkCoverageThresholds(
  coverage: CoverageReport,
  thresholds: CoverageThresholds = DEFAULT_COVERAGE_THRESHOLDS,
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (coverage.branches < thresholds.global.branches) {
    violations.push(
      `Branch coverage ${coverage.branches}% is below threshold of ${thresholds.global.branches}%`,
    );
  }
  if (coverage.functions < thresholds.global.functions) {
    violations.push(
      `Function coverage ${coverage.functions}% is below threshold of ${thresholds.global.functions}%`,
    );
  }
  if (coverage.lines < thresholds.global.lines) {
    violations.push(
      `Line coverage ${coverage.lines}% is below threshold of ${thresholds.global.lines}%`,
    );
  }
  if (coverage.statements < thresholds.global.statements) {
    violations.push(
      `Statement coverage ${coverage.statements}% is below threshold of ${thresholds.global.statements}%`,
    );
  }

  return { passed: violations.length === 0, violations };
}

// ── 9. buildSystemHealthReport ──
/**
 * Aggregates all inputs into a complete SystemHealthReport.
 */
export function buildSystemHealthReport(
  inputs: BuildReportInputs,
): SystemHealthReport {
  const { modules, testSuites, designValidation, securityScan, complianceScan, dataConsistency } =
    inputs;

  const { score: overallScore, status: overallStatus } = computeOverallScore(modules);
  const aggregated = aggregateTestSuites(testSuites);

  // Collect all alerts from all modules
  const allAlerts = Object.values(modules).flatMap((m) => m.alerts);
  const criticalIssues = allAlerts.filter(
    (a) => a.severity === 'critical' && !a.acknowledged,
  );
  const openAlerts = allAlerts.filter(
    (a) => a.resolvedAt == null && !a.acknowledged,
  );

  return {
    generatedAt: new Date(),
    overallScore,
    overallStatus,
    modules,
    summary: {
      totalTests: aggregated.total,
      passing: aggregated.passing,
      failing: aggregated.failing,
      skipped: aggregated.skipped,
      coveragePct: aggregated.coveragePct,
      criticalIssues: prioritizeAlerts(criticalIssues),
      openAlerts: prioritizeAlerts(openAlerts),
    },
    testSuites,
    designValidation,
    securityScan,
    complianceScan,
    dataConsistency,
  };
}

// ── 10. evaluatePipelineGate ──
/**
 * Evaluates whether a pipeline run meets the minimum quality gate.
 * Checks both the quality score threshold and whether any deployment-blocking
 * stages have failed.
 */
export function evaluatePipelineGate(
  pipelineResult: PipelineRunResult,
  minScore: number = 80,
): { approved: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (pipelineResult.qualityScore < minScore) {
    reasons.push(
      `Quality score ${pipelineResult.qualityScore} is below minimum threshold of ${minScore}`,
    );
  }

  const failedBlockingStages = pipelineResult.stages.filter(
    (s) => s.blocksDeployment && s.status === 'failed',
  );

  for (const stage of failedBlockingStages) {
    reasons.push(
      `Deployment-blocking stage "${stage.stage}" failed${stage.details ? `: ${stage.details}` : ''}`,
    );
  }

  if (pipelineResult.overallStatus === 'failed') {
    reasons.push('Pipeline overall status is failed');
  }

  return {
    approved: reasons.length === 0,
    reasons,
  };
}

// ── 11. formatHealthSummary ──
/**
 * Produces a plain-text summary of a SystemHealthReport suitable for
 * Slack notifications or log output.
 */
export function formatHealthSummary(report: SystemHealthReport): string {
  const lines: string[] = [];

  lines.push('=== FP-Sentinel Health Report ===');
  lines.push(`Generated: ${report.generatedAt.toISOString()}`);
  lines.push(`Overall Status: ${report.overallStatus.toUpperCase()} (score: ${report.overallScore}/100)`);
  lines.push('');

  // Test summary
  lines.push('--- Test Summary ---');
  lines.push(
    `Total: ${report.summary.totalTests} | Passing: ${report.summary.passing} | Failing: ${report.summary.failing} | Skipped: ${report.summary.skipped}`,
  );
  lines.push(`Coverage: ${report.summary.coveragePct}%`);
  lines.push('');

  // Module scores
  lines.push('--- Module Scores ---');
  const moduleEntries = Object.entries(report.modules) as [ModuleName, ModuleHealth][];
  for (const [name, mod] of moduleEntries) {
    lines.push(`  ${name}: ${mod.score}/100 [${mod.status}]`);
  }
  lines.push('');

  // Design validation
  lines.push('--- Design Validation ---');
  lines.push(
    `Score: ${report.designValidation.score}/100 | Violations: ${report.designValidation.violations.length} | Pages Checked: ${report.designValidation.checkedPages}`,
  );
  lines.push('');

  // Security scan
  lines.push('--- Security Scan ---');
  lines.push(
    `Score: ${report.securityScan.score}/100 | Passing: ${report.securityScan.passing}/${report.securityScan.totalTests} | Critical Failures: ${report.securityScan.criticalFailures}`,
  );
  lines.push('');

  // Compliance scan
  lines.push('--- Compliance Scan ---');
  lines.push(
    `Score: ${report.complianceScan.score}/100 | Passing: ${report.complianceScan.passing}/${report.complianceScan.totalChecks}`,
  );
  lines.push('');

  // Critical issues
  if (report.summary.criticalIssues.length > 0) {
    lines.push('--- Critical Issues ---');
    for (const alert of report.summary.criticalIssues) {
      lines.push(`  [${alert.module}] ${alert.message}`);
    }
    lines.push('');
  }

  // Open alerts
  if (report.summary.openAlerts.length > 0) {
    lines.push(`--- Open Alerts (${report.summary.openAlerts.length}) ---`);
    for (const alert of report.summary.openAlerts) {
      lines.push(`  [${alert.severity.toUpperCase()}] [${alert.module}] ${alert.message}`);
    }
    lines.push('');
  }

  // Data consistency (optional)
  if (report.dataConsistency) {
    lines.push('--- Data Consistency ---');
    lines.push(
      `Score: ${report.dataConsistency.consistencyScore}/100 | Sample Size: ${report.dataConsistency.sampleSize} | Violations: ${report.dataConsistency.violationsFound}`,
    );
    lines.push('');
  }

  return lines.join('\n');
}

// ── 12. prioritizeAlerts ──
/**
 * Sorts alerts by severity (critical first), then by timestamp (newest first).
 * Returns a new array; does not mutate the input.
 */
export function prioritizeAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    // Newest first within the same severity
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}

// ── Helper ──
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
