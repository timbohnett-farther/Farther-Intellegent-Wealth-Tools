// FP-Sentinel — Security & Compliance Scanner
// Defines security test rules, compliance checks, and validation functions
// that can be run against the codebase to detect security and compliance issues.

// ── Types ──

export interface SecurityRule {
  id: string;
  name: string;
  category:
    | 'authentication'
    | 'authorization'
    | 'pii_protection'
    | 'injection'
    | 'rate_limiting'
    | 'financial_integrity'
    | 'data_exposure';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  check: (source: string, fileName: string) => SecurityFinding[];
}

export interface SecurityFinding {
  ruleId: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  suggestedFix?: string;
}

export interface ComplianceRule {
  id: string;
  name: string;
  regulation: string;
  description: string;
  check: (source: string, fileName: string) => ComplianceFinding[];
}

export interface ComplianceFinding {
  ruleId: string;
  regulation: string;
  message: string;
  file?: string;
  line?: number;
}

export interface ScanResult {
  securityFindings: SecurityFinding[];
  complianceFindings: ComplianceFinding[];
  score: number; // 0-100
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  timestamp: Date;
}

// ── Helpers ──

/**
 * Find the 1-based line number of a regex match within source text.
 */
function findLineNumber(source: string, matchIndex: number): number {
  const upToMatch = source.slice(0, matchIndex);
  return upToMatch.split('\n').length;
}

/**
 * Check whether a file path corresponds to a test file.
 */
function isTestFile(fileName: string): boolean {
  return (
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(fileName) ||
    fileName.includes('__tests__') ||
    fileName.includes('__mocks__')
  );
}

// ── Security Rules ──

const SEC_001_NO_HARDCODED_SECRETS: SecurityRule = {
  id: 'SEC-001',
  name: 'No hardcoded secrets',
  category: 'data_exposure',
  severity: 'critical',
  description:
    'Scan for patterns like password/apiKey/secret assignments, AWS access keys (AKIA...), and JWT tokens (eyJ...).',
  check(source: string, fileName: string): SecurityFinding[] {
    if (isTestFile(fileName)) return [];

    const findings: SecurityFinding[] = [];

    // Pattern: password = '...' or password = "..."
    const secretAssignmentPatterns = [
      /(?:password|passwd|apiKey|api_key|apiSecret|api_secret|secret|token|accessToken|access_token)\s*[:=]\s*['"][^'"]{4,}['"]/gi,
    ];

    for (const pattern of secretAssignmentPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source)) !== null) {
        findings.push({
          ruleId: 'SEC-001',
          severity: 'critical',
          message: `Potential hardcoded secret detected: "${match[0].slice(0, 40)}..."`,
          file: fileName,
          line: findLineNumber(source, match.index),
          suggestedFix: 'Move secrets to environment variables and use process.env.',
        });
      }
    }

    // AWS access key pattern (AKIA followed by 16 alphanumeric characters)
    const awsKeyPattern = /AKIA[0-9A-Z]{16}/g;
    let awsMatch: RegExpExecArray | null;
    while ((awsMatch = awsKeyPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-001',
        severity: 'critical',
        message: `AWS access key detected: "${awsMatch[0].slice(0, 8)}..."`,
        file: fileName,
        line: findLineNumber(source, awsMatch.index),
        suggestedFix: 'Use AWS IAM roles or environment variables instead of hardcoded keys.',
      });
    }

    // JWT token pattern (eyJ... base64-encoded header)
    const jwtPattern = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
    let jwtMatch: RegExpExecArray | null;
    while ((jwtMatch = jwtPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-001',
        severity: 'critical',
        message: 'Hardcoded JWT token detected.',
        file: fileName,
        line: findLineNumber(source, jwtMatch.index),
        suggestedFix: 'Never commit JWT tokens. Use runtime token generation.',
      });
    }

    return findings;
  },
};

const SEC_002_NO_EXPOSED_SSN: SecurityRule = {
  id: 'SEC-002',
  name: 'No exposed SSN patterns',
  category: 'pii_protection',
  severity: 'critical',
  description:
    'Scan for SSN patterns (XXX-XX-XXXX) or 9 consecutive digits in variable names containing "ssn".',
  check(source: string, fileName: string): SecurityFinding[] {
    if (isTestFile(fileName)) return [];

    const findings: SecurityFinding[] = [];

    // SSN format: XXX-XX-XXXX (but not in comments describing the pattern)
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
    let ssnMatch: RegExpExecArray | null;
    while ((ssnMatch = ssnPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-002',
        severity: 'critical',
        message: `Possible SSN pattern detected: "${ssnMatch[0]}"`,
        file: fileName,
        line: findLineNumber(source, ssnMatch.index),
        suggestedFix: 'SSNs must be masked (e.g., ***-**-1234). Never store full SSNs in source code.',
      });
    }

    // Variables containing "ssn" with 9 consecutive digits assigned
    const ssnVarPattern = /(?:ssn|socialSecurity|social_security)\w*\s*[:=]\s*['"]?\d{9}['"]?/gi;
    let ssnVarMatch: RegExpExecArray | null;
    while ((ssnVarMatch = ssnVarPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-002',
        severity: 'critical',
        message: `SSN variable with unmasked value detected: "${ssnVarMatch[0].slice(0, 40)}"`,
        file: fileName,
        line: findLineNumber(source, ssnVarMatch.index),
        suggestedFix: 'Mask SSN values and use secure storage for PII.',
      });
    }

    return findings;
  },
};

const SEC_003_NO_EXPOSED_ACCOUNT_NUMBERS: SecurityRule = {
  id: 'SEC-003',
  name: 'No exposed account numbers',
  category: 'pii_protection',
  severity: 'critical',
  description:
    'Scan for full account number patterns or variables named accountNumberFull, fullAccountNumber, etc. without masking.',
  check(source: string, fileName: string): SecurityFinding[] {
    if (isTestFile(fileName)) return [];

    const findings: SecurityFinding[] = [];

    // Variables like accountNumberFull, fullAccountNumber, etc.
    const accountFullPattern =
      /(?:accountNumberFull|fullAccountNumber|full_account_number|account_number_full)\s*[:=]/gi;
    let accountMatch: RegExpExecArray | null;
    while ((accountMatch = accountFullPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-003',
        severity: 'critical',
        message: `Unmasked account number variable detected: "${accountMatch[0].trim()}"`,
        file: fileName,
        line: findLineNumber(source, accountMatch.index),
        suggestedFix:
          'Account numbers must be masked (e.g., ****1234). Use a masking utility before display.',
      });
    }

    // Returning full account numbers in response-like objects
    const accountResponsePattern =
      /(?:accountNumber|account_number)\s*:\s*(?!.*mask|.*truncat|.*last4|.*slice)/gi;
    let responseMatch: RegExpExecArray | null;
    while ((responseMatch = accountResponsePattern.exec(source)) !== null) {
      // Only flag if not in a type/interface definition
      const lineStart = source.lastIndexOf('\n', responseMatch.index) + 1;
      const lineContent = source.slice(lineStart, source.indexOf('\n', responseMatch.index));
      if (!lineContent.includes('type ') && !lineContent.includes('interface ') && !lineContent.includes('?:') && !lineContent.includes(': string')) {
        findings.push({
          ruleId: 'SEC-003',
          severity: 'warning',
          message: 'Account number field without apparent masking in assignment.',
          file: fileName,
          line: findLineNumber(source, responseMatch.index),
          suggestedFix:
            'Ensure account numbers are masked before inclusion in API responses.',
        });
      }
    }

    return findings;
  },
};

const SEC_004_SQL_INJECTION: SecurityRule = {
  id: 'SEC-004',
  name: 'SQL injection vectors',
  category: 'injection',
  severity: 'critical',
  description:
    'Scan for string concatenation in SQL queries (template literals with SELECT/INSERT/UPDATE/DELETE containing ${} interpolation).',
  check(source: string, fileName: string): SecurityFinding[] {
    if (isTestFile(fileName)) return [];

    const findings: SecurityFinding[] = [];

    // Template literals containing SQL keywords with interpolation
    const sqlInjectionPattern =
      /`[^`]*\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b[^`]*\$\{[^}]+\}[^`]*`/gi;
    let match: RegExpExecArray | null;
    while ((match = sqlInjectionPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-004',
        severity: 'critical',
        message: 'Potential SQL injection: template literal with SQL keyword and string interpolation.',
        file: fileName,
        line: findLineNumber(source, match.index),
        suggestedFix:
          'Use parameterized queries (e.g., db.query("SELECT * FROM users WHERE id = $1", [userId])) instead of string interpolation.',
      });
    }

    // String concatenation with SQL keywords
    const sqlConcatPattern =
      /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*(?:\+\s*\w+|\+\s*['"])/gi;
    let concatMatch: RegExpExecArray | null;
    while ((concatMatch = sqlConcatPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-004',
        severity: 'critical',
        message: 'Potential SQL injection: string concatenation in SQL query.',
        file: fileName,
        line: findLineNumber(source, concatMatch.index),
        suggestedFix: 'Use parameterized queries instead of string concatenation.',
      });
    }

    return findings;
  },
};

const SEC_005_NO_EVAL: SecurityRule = {
  id: 'SEC-005',
  name: 'No eval or Function constructor',
  category: 'injection',
  severity: 'warning',
  description:
    'Scan for eval(), new Function(), and setTimeout() with string arguments.',
  check(source: string, fileName: string): SecurityFinding[] {
    if (isTestFile(fileName)) return [];

    const findings: SecurityFinding[] = [];

    // eval()
    const evalPattern = /\beval\s*\(/g;
    let evalMatch: RegExpExecArray | null;
    while ((evalMatch = evalPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-005',
        severity: 'warning',
        message: 'Use of eval() detected. This can execute arbitrary code.',
        file: fileName,
        line: findLineNumber(source, evalMatch.index),
        suggestedFix: 'Avoid eval(). Use JSON.parse() for data or safer alternatives.',
      });
    }

    // new Function()
    const functionConstructorPattern = /new\s+Function\s*\(/g;
    let fnMatch: RegExpExecArray | null;
    while ((fnMatch = functionConstructorPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-005',
        severity: 'warning',
        message: 'Use of Function constructor detected. This can execute arbitrary code.',
        file: fileName,
        line: findLineNumber(source, fnMatch.index),
        suggestedFix: 'Avoid the Function constructor. Use predefined functions instead.',
      });
    }

    // setTimeout/setInterval with string argument
    const setTimeoutStringPattern = /(?:setTimeout|setInterval)\s*\(\s*['"`]/g;
    let timeoutMatch: RegExpExecArray | null;
    while ((timeoutMatch = setTimeoutStringPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-005',
        severity: 'warning',
        message: 'setTimeout/setInterval with string argument acts like eval().',
        file: fileName,
        line: findLineNumber(source, timeoutMatch.index),
        suggestedFix: 'Pass a function reference instead of a string to setTimeout/setInterval.',
      });
    }

    return findings;
  },
};

const SEC_006_DANGEROUS_INNERHTML: SecurityRule = {
  id: 'SEC-006',
  name: 'No dangerouslySetInnerHTML without sanitization',
  category: 'injection',
  severity: 'warning',
  description:
    'Scan for dangerouslySetInnerHTML usage without nearby DOMPurify or sanitize calls.',
  check(source: string, fileName: string): SecurityFinding[] {
    if (isTestFile(fileName)) return [];

    const findings: SecurityFinding[] = [];

    const dangerousPattern = /dangerouslySetInnerHTML/g;
    let match: RegExpExecArray | null;
    while ((match = dangerousPattern.exec(source)) !== null) {
      // Check if DOMPurify or sanitize is referenced nearby (within the same file)
      const hasSanitizer =
        /DOMPurify|sanitize|sanitizeHtml|xss|purify/i.test(source);

      if (!hasSanitizer) {
        findings.push({
          ruleId: 'SEC-006',
          severity: 'warning',
          message: 'dangerouslySetInnerHTML used without apparent sanitization.',
          file: fileName,
          line: findLineNumber(source, match.index),
          suggestedFix:
            'Use DOMPurify.sanitize() or a similar library to sanitize HTML before rendering.',
        });
      }
    }

    return findings;
  },
};

const SEC_007_CONSOLE_LOG: SecurityRule = {
  id: 'SEC-007',
  name: 'Console.log in production code',
  category: 'data_exposure',
  severity: 'info',
  description:
    'Scan for console.log, console.debug, console.warn in non-test files.',
  check(source: string, fileName: string): SecurityFinding[] {
    if (isTestFile(fileName)) return [];
    // Also skip known CLI/script files where console output is intentional
    if (fileName.includes('run-') || fileName.includes('/scripts/')) return [];

    const findings: SecurityFinding[] = [];

    const consolePattern = /\bconsole\.(log|debug|warn)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = consolePattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-007',
        severity: 'info',
        message: `console.${match[1]}() found in production code.`,
        file: fileName,
        line: findLineNumber(source, match.index),
        suggestedFix:
          'Use a structured logger (e.g., pino, winston) instead of console methods in production.',
      });
    }

    return findings;
  },
};

const SEC_008_UNVALIDATED_REDIRECTS: SecurityRule = {
  id: 'SEC-008',
  name: 'Unvalidated redirects',
  category: 'authorization',
  severity: 'warning',
  description:
    'Scan for window.location assignments or redirect() calls with potentially user-controlled input.',
  check(source: string, fileName: string): SecurityFinding[] {
    if (isTestFile(fileName)) return [];

    const findings: SecurityFinding[] = [];

    // window.location = variable (not a string literal)
    const locationAssignPattern =
      /window\.location(?:\.href)?\s*=\s*(?!['"`]https?:\/\/|['"`]\/)/g;
    let locMatch: RegExpExecArray | null;
    while ((locMatch = locationAssignPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-008',
        severity: 'warning',
        message: 'Potentially unvalidated redirect via window.location assignment.',
        file: fileName,
        line: findLineNumber(source, locMatch.index),
        suggestedFix:
          'Validate redirect URLs against an allowlist before assigning to window.location.',
      });
    }

    // redirect() with variable argument
    const redirectPattern = /\bredirect\s*\(\s*(?!['"`]\/|['"`]https?:\/\/)/g;
    let redirectMatch: RegExpExecArray | null;
    while ((redirectMatch = redirectPattern.exec(source)) !== null) {
      findings.push({
        ruleId: 'SEC-008',
        severity: 'warning',
        message: 'Potentially unvalidated redirect via redirect() call.',
        file: fileName,
        line: findLineNumber(source, redirectMatch.index),
        suggestedFix:
          'Validate redirect URLs against an allowlist before passing to redirect().',
      });
    }

    return findings;
  },
};

// ── Compliance Rules ──

const COMP_001_AUDIT_LOGGING: ComplianceRule = {
  id: 'COMP-001',
  name: 'Audit logging required for writes',
  regulation: 'SOX / SEC 17a-4',
  description:
    'Check that mutation functions and API routes performing writes have audit log calls nearby.',
  check(source: string, fileName: string): ComplianceFinding[] {
    // Only check API routes and mutation-related files
    if (
      !fileName.includes('/api/') &&
      !fileName.includes('mutation') &&
      !fileName.includes('action')
    ) {
      return [];
    }
    if (isTestFile(fileName)) return [];

    const findings: ComplianceFinding[] = [];

    // Look for write operations (POST/PUT/DELETE handlers, mutations)
    const writePatterns = [
      /export\s+(?:async\s+)?function\s+(?:POST|PUT|DELETE|PATCH)\b/g,
      /\.(?:create|update|delete|destroy|insert|upsert)\s*\(/g,
      /(?:mutation|mutate|useMutation)\s*\(/g,
    ];

    const hasAuditLog =
      /audit(?:Log|Trail|Event|Record)|logAudit|createAuditEntry|writeAuditLog/i.test(source);

    for (const pattern of writePatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source)) !== null) {
        if (!hasAuditLog) {
          findings.push({
            ruleId: 'COMP-001',
            regulation: 'SOX / SEC 17a-4',
            message: `Write operation found without audit logging: "${match[0].slice(0, 50)}"`,
            file: fileName,
            line: findLineNumber(source, match.index),
          });
        }
      }
    }

    return findings;
  },
};

const COMP_002_PII_MASKING: ComplianceRule = {
  id: 'COMP-002',
  name: 'PII fields must be masked',
  regulation: 'GDPR / CCPA',
  description:
    'Scan for PII field names (ssn, taxId, accountNumber) being returned in API responses without masking.',
  check(source: string, fileName: string): ComplianceFinding[] {
    if (isTestFile(fileName)) return [];
    // Focus on API routes and response builders
    if (!fileName.includes('/api/') && !fileName.includes('response') && !fileName.includes('handler')) {
      return [];
    }

    const findings: ComplianceFinding[] = [];

    const piiFields = ['ssn', 'taxId', 'tax_id', 'socialSecurity', 'social_security_number'];

    for (const field of piiFields) {
      const pattern = new RegExp(`\\b${field}\\b(?!.*(?:mask|redact|truncat|hidden|last4|slice))`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source)) !== null) {
        // Check the surrounding context — skip type definitions
        const lineStart = source.lastIndexOf('\n', match.index) + 1;
        const lineContent = source.slice(lineStart, source.indexOf('\n', match.index));
        if (lineContent.includes('interface ') || lineContent.includes('type ') || lineContent.includes('?:')) {
          continue;
        }

        findings.push({
          ruleId: 'COMP-002',
          regulation: 'GDPR / CCPA',
          message: `PII field "${field}" may be returned without masking.`,
          file: fileName,
          line: findLineNumber(source, match.index),
        });
      }
    }

    return findings;
  },
};

const COMP_003_DATA_RETENTION: ComplianceRule = {
  id: 'COMP-003',
  name: 'Data retention annotations',
  regulation: 'SEC 17a-4 / FINRA',
  description:
    'Check that data models and types include retention period documentation (comment or annotation).',
  check(source: string, fileName: string): ComplianceFinding[] {
    if (isTestFile(fileName)) return [];
    // Only check model/type definition files
    if (
      !fileName.includes('model') &&
      !fileName.includes('schema') &&
      !fileName.includes('types') &&
      !fileName.includes('entity')
    ) {
      return [];
    }

    const findings: ComplianceFinding[] = [];

    // Look for interface or type declarations
    const typePattern = /(?:interface|type)\s+(\w+(?:Model|Entity|Record|Schema|Data))\b/g;
    let match: RegExpExecArray | null;
    while ((match = typePattern.exec(source)) !== null) {
      // Check the 5 lines preceding the type for retention documentation
      const precedingText = source.slice(Math.max(0, match.index - 300), match.index);
      const hasRetentionDoc =
        /retention|retentionPeriod|retention_period|data.?retention|@retention/i.test(precedingText);

      if (!hasRetentionDoc) {
        findings.push({
          ruleId: 'COMP-003',
          regulation: 'SEC 17a-4 / FINRA',
          message: `Data model "${match[1]}" lacks retention period documentation.`,
          file: fileName,
          line: findLineNumber(source, match.index),
        });
      }
    }

    return findings;
  },
};

const COMP_004_FINANCIAL_CALC_DOCS: ComplianceRule = {
  id: 'COMP-004',
  name: 'Financial calculation documentation',
  regulation: 'Reg BI / Internal',
  description:
    'Check that calculation functions have JSDoc with formula documentation.',
  check(source: string, fileName: string): ComplianceFinding[] {
    if (isTestFile(fileName)) return [];
    // Only check calculation-related files
    if (
      !fileName.includes('calc') &&
      !fileName.includes('engine') &&
      !fileName.includes('compute') &&
      !fileName.includes('formula')
    ) {
      return [];
    }

    const findings: ComplianceFinding[] = [];

    // Look for exported functions that appear to be calculations
    const calcFunctionPattern =
      /export\s+(?:async\s+)?function\s+(calculate\w*|compute\w*|estimate\w*|project\w*)/g;
    let match: RegExpExecArray | null;
    while ((match = calcFunctionPattern.exec(source)) !== null) {
      // Check for JSDoc within the preceding 500 characters
      const precedingText = source.slice(Math.max(0, match.index - 500), match.index);
      const hasJSDoc = /\/\*\*[\s\S]*?\*\//.test(precedingText);
      const hasFormula = /formula|equation|algorithm|calculation|@formula|@see/i.test(precedingText);

      if (!hasJSDoc || !hasFormula) {
        findings.push({
          ruleId: 'COMP-004',
          regulation: 'Reg BI / Internal',
          message: `Calculation function "${match[1]}" lacks JSDoc with formula documentation.`,
          file: fileName,
          line: findLineNumber(source, match.index),
        });
      }
    }

    return findings;
  },
};

// ── Exported Rule Collections ──

export const SECURITY_RULES: SecurityRule[] = [
  SEC_001_NO_HARDCODED_SECRETS,
  SEC_002_NO_EXPOSED_SSN,
  SEC_003_NO_EXPOSED_ACCOUNT_NUMBERS,
  SEC_004_SQL_INJECTION,
  SEC_005_NO_EVAL,
  SEC_006_DANGEROUS_INNERHTML,
  SEC_007_CONSOLE_LOG,
  SEC_008_UNVALIDATED_REDIRECTS,
];

export const COMPLIANCE_RULES: ComplianceRule[] = [
  COMP_001_AUDIT_LOGGING,
  COMP_002_PII_MASKING,
  COMP_003_DATA_RETENTION,
  COMP_004_FINANCIAL_CALC_DOCS,
];

// ── Scoring Functions ──

/**
 * Computes a security score from findings.
 * Starts at 100, deducts 25 per critical, 10 per warning, 2 per info.
 * Floored at 0.
 */
export function getSecurityScore(findings: SecurityFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'critical') score -= 25;
    else if (f.severity === 'warning') score -= 10;
    else score -= 2;
  }
  return Math.max(0, score);
}

/**
 * Computes a compliance score from findings.
 * Starts at 100, deducts 20 per finding. Floored at 0.
 */
export function getComplianceScore(findings: ComplianceFinding[]): number {
  return Math.max(0, 100 - findings.length * 20);
}

// ── Main Scan Function ──

/**
 * Runs all security and compliance rules against the provided source files.
 * Returns an aggregated ScanResult with findings, counts, and computed score.
 */
export function runSecurityScan(
  sources: Array<{ content: string; fileName: string }>,
): ScanResult {
  const securityFindings: SecurityFinding[] = [];
  const complianceFindings: ComplianceFinding[] = [];

  for (const { content, fileName } of sources) {
    // Run all security rules
    for (const rule of SECURITY_RULES) {
      const findings = rule.check(content, fileName);
      securityFindings.push(...findings);
    }

    // Run all compliance rules
    for (const rule of COMPLIANCE_RULES) {
      const findings = rule.check(content, fileName);
      complianceFindings.push(...findings);
    }
  }

  const criticalCount = securityFindings.filter((f) => f.severity === 'critical').length;
  const warningCount = securityFindings.filter((f) => f.severity === 'warning').length;
  const infoCount = securityFindings.filter((f) => f.severity === 'info').length;

  const secScore = getSecurityScore(securityFindings);
  const compScore = getComplianceScore(complianceFindings);

  // Combined score: 70% security, 30% compliance
  const score = Math.round(secScore * 0.7 + compScore * 0.3);

  return {
    securityFindings,
    complianceFindings,
    score,
    criticalCount,
    warningCount,
    infoCount,
    timestamp: new Date(),
  };
}
