// FP-Sentinel — Quality Assurance & Systems Validation Types

// ── Module identifiers ──
export type ModuleName =
  | 'planning-engine'
  | 'proposal-engine'
  | 'debt-engine'
  | 'tax-engine'
  | 'calc-engine'
  | 'analytics-engine'
  | 'design-system'
  | 'household'
  | 'integrations'
  | 'api';

export type TestSuiteType =
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'security'
  | 'design'
  | 'compliance'
  | 'calculation_accuracy'
  | 'data_pipeline';

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type ViolationType =
  | 'accessibility'
  | 'design'
  | 'ux'
  | 'security'
  | 'compliance'
  | 'data_consistency';

// ── Test result types ──
export interface TestSuiteResult {
  suiteName: string;
  suiteType: TestSuiteType;
  moduleName: ModuleName;
  total: number;
  passing: number;
  failing: number;
  skipped: number;
  duration: number; // ms
  coverage?: CoverageReport;
  timestamp: Date;
  failedTests?: FailedTest[];
}

export interface FailedTest {
  testName: string;
  errorMessage: string;
  stackTrace?: string;
  file?: string;
  line?: number;
}

export interface CoverageReport {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

// ── Design validation types ──
export interface DesignViolation {
  type: ViolationType;
  route: string;
  message: string;
  element?: string;
  severity: AlertSeverity;
}

export interface DesignValidationReport {
  totalChecks: number;
  violations: DesignViolation[];
  score: number; // 0-100
  checkedPages: number;
  timestamp: Date;
}

// ── Security types ──
export interface SecurityTest {
  id: string;
  name: string;
  category:
    | 'authentication'
    | 'authorization'
    | 'pii_protection'
    | 'injection'
    | 'rate_limiting'
    | 'financial_integrity';
  severity: AlertSeverity;
  passed: boolean;
  details?: string;
}

export interface SecurityScanResult {
  tests: SecurityTest[];
  totalTests: number;
  passing: number;
  failing: number;
  criticalFailures: number;
  score: number; // 0-100
  timestamp: Date;
}

// ── Compliance types ──
export interface ComplianceCheck {
  id: string;
  name: string;
  regulation:
    | 'reg_bi'
    | 'sox'
    | 'gdpr'
    | 'ccpa'
    | 'sec_17a4'
    | 'finra'
    | 'internal';
  passed: boolean;
  details?: string;
  lastVerified: Date;
}

export interface ComplianceScanResult {
  checks: ComplianceCheck[];
  totalChecks: number;
  passing: number;
  failing: number;
  score: number;
  timestamp: Date;
}

// ── Data consistency types ──
export interface ConsistencyViolation {
  householdId: string;
  field: string;
  source1: 'cloud_sql' | 'bigquery' | 'hubspot' | 'redis';
  source2: 'cloud_sql' | 'bigquery' | 'hubspot' | 'redis';
  value1: number | string;
  value2: number | string;
  severity: AlertSeverity;
}

export interface DataConsistencyReport {
  sampleSize: number;
  violationsFound: number;
  violations: ConsistencyViolation[];
  consistencyScore: number; // 0-100
  timestamp: Date;
}

// ── Module health ──
export interface ModuleHealth {
  name: ModuleName;
  status: HealthStatus;
  score: number; // 0-100

  unitTests: {
    total: number;
    passing: number;
    coverage: number;
    lastRun: Date;
  };

  integrationTests: {
    total: number;
    passing: number;
    lastRun: Date;
  };

  designCompliance: {
    violations: number;
    score: number;
    lastChecked: Date;
  };

  securityScore: number;
  lastDeployment: Date;
  uptime30d: number; // %
  avgResponseTimeMs: number;
  errorRate24h: number; // %

  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  module: ModuleName;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

// ── System health report ──
export interface SystemHealthReport {
  generatedAt: Date;
  overallScore: number; // 0-100
  overallStatus: HealthStatus;

  modules: Record<ModuleName, ModuleHealth>;

  summary: {
    totalTests: number;
    passing: number;
    failing: number;
    skipped: number;
    coveragePct: number;
    criticalIssues: Alert[];
    openAlerts: Alert[];
  };

  testSuites: TestSuiteResult[];
  designValidation: DesignValidationReport;
  securityScan: SecurityScanResult;
  complianceScan: ComplianceScanResult;
  dataConsistency?: DataConsistencyReport;
}

// ── Coverage thresholds ──
export interface CoverageThresholds {
  global: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
  calculationEngines: {
    functions: number;
    lines: number;
  };
}

export const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
  global: {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  calculationEngines: {
    functions: 100,
    lines: 100,
  },
};

// ── CI/CD pipeline types ──
export type PipelineStage =
  | 'code_quality'
  | 'unit_tests'
  | 'integration_tests'
  | 'visual_regression'
  | 'e2e_tests'
  | 'security_scan'
  | 'deployment_gate';

export type PipelineStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped';

export interface PipelineStageResult {
  stage: PipelineStage;
  status: PipelineStatus;
  duration: number; // ms
  details?: string;
  blocksDeployment: boolean;
}

export interface PipelineRunResult {
  runId: string;
  branch: string;
  commit: string;
  triggeredBy: string;
  startedAt: Date;
  completedAt?: Date;
  stages: PipelineStageResult[];
  overallStatus: PipelineStatus;
  qualityScore: number; // 0-100
  deploymentApproved: boolean;
}
