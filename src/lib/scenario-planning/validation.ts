/**
 * Validation Layer — Phase 5A
 *
 * Multi-stage validation system for scenario planning.
 * Implements 6 validation stages per Phase 5 spec.
 */

import { TaxInputSnapshot } from '@/types/tax-engine';
import { ScenarioOverride, MissingInfoItem } from '@/types/scenario-planning';
import { fieldMappingRegistry } from './field-mapping-registry';

// ==================== TYPES ====================

export type ValidationSeverity = 'pass' | 'warn' | 'soft_fail' | 'hard_fail';

export interface ValidationError {
  stage: string;
  field?: string;
  severity: ValidationSeverity;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field?: string;
  message: string;
  suggestion?: string;
}

export interface ScenarioValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  blockers: MissingInfoItem[];
  canProceed: boolean; // false only for hard_fail
}

// ==================== VALIDATION STAGES ====================

/**
 * Validate scenario for calculation readiness
 *
 * Implements 6-stage validation:
 * 1. Schema validation
 * 2. Override field validation
 * 3. Override type validation
 * 4. Cross-field consistency
 * 5. Supportability validation
 * 6. Blocker generation
 *
 * @param baseline - Baseline tax input snapshot
 * @param overrides - Scenario overrides to apply
 * @returns ScenarioValidationResult
 */
export function validateScenarioForCalculation(
  baseline: TaxInputSnapshot,
  overrides: ScenarioOverride[]
): ScenarioValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const blockers: MissingInfoItem[] = [];

  // Stage 1: Schema validation
  const schemaErrors = validateSchema(baseline);
  errors.push(...schemaErrors);

  // Stage 2: Override field validation
  const fieldErrors = validateOverrideFields(overrides);
  errors.push(...fieldErrors);

  // Stage 3: Override type validation (handled in fieldMappingRegistry)
  const typeErrors = validateOverrideTypes(overrides);
  errors.push(...typeErrors);

  // Stage 4: Cross-field consistency
  const consistencyResults = validateCrossFieldConsistency(baseline, overrides);
  errors.push(...consistencyResults.errors);
  warnings.push(...consistencyResults.warnings);

  // Stage 5: Supportability validation
  const supportabilityResults = validateSupportability(baseline, overrides);
  errors.push(...supportabilityResults.errors);
  warnings.push(...supportabilityResults.warnings);

  // Stage 6: Blocker generation
  const missingBlockers = generateBlockers(baseline);
  blockers.push(...missingBlockers);

  // Determine overall severity
  const severity = determineSeverity(errors);

  // Can proceed if no hard_fail
  const canProceed = !errors.some((e) => e.severity === 'hard_fail');

  return {
    valid: errors.length === 0,
    severity,
    errors,
    warnings,
    blockers,
    canProceed,
  };
}

// ==================== STAGE 1: SCHEMA VALIDATION ====================

function validateSchema(baseline: TaxInputSnapshot): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!baseline.snapshotId) {
    errors.push({
      stage: 'schema',
      severity: 'hard_fail',
      message: 'Baseline snapshot must have snapshotId',
      code: 'MISSING_SNAPSHOT_ID',
    });
  }

  if (!baseline.householdId) {
    errors.push({
      stage: 'schema',
      severity: 'hard_fail',
      message: 'Baseline snapshot must have householdId',
      code: 'MISSING_HOUSEHOLD_ID',
    });
  }

  if (!baseline.taxYear) {
    errors.push({
      stage: 'schema',
      severity: 'hard_fail',
      message: 'Baseline snapshot must have taxYear',
      code: 'MISSING_TAX_YEAR',
    });
  }

  if (!baseline.filingStatus) {
    errors.push({
      stage: 'schema',
      severity: 'hard_fail',
      message: 'Baseline snapshot must have filingStatus',
      code: 'MISSING_FILING_STATUS',
    });
  }

  if (!baseline.taxpayers || baseline.taxpayers.length === 0) {
    errors.push({
      stage: 'schema',
      severity: 'hard_fail',
      message: 'Baseline snapshot must have at least one taxpayer',
      code: 'MISSING_TAXPAYERS',
    });
  }

  return errors;
}

// ==================== STAGE 2: OVERRIDE FIELD VALIDATION ====================

function validateOverrideFields(overrides: ScenarioOverride[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const override of overrides) {
    // Check if field exists in registry
    if (!fieldMappingRegistry.fieldExists(override.field)) {
      errors.push({
        stage: 'override_field',
        field: override.field,
        severity: 'hard_fail',
        message: `Unknown field: ${override.field}`,
        code: 'UNKNOWN_FIELD',
      });
    }
  }

  return errors;
}

// ==================== STAGE 3: OVERRIDE TYPE VALIDATION ====================

function validateOverrideTypes(overrides: ScenarioOverride[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const override of overrides) {
    // Check if operator is valid for field
    if (!fieldMappingRegistry.isValidOperator(override.field, override.operator)) {
      errors.push({
        stage: 'override_type',
        field: override.field,
        severity: 'hard_fail',
        message: `Invalid operator "${override.operator}" for field "${override.field}"`,
        code: 'INVALID_OPERATOR',
      });
    }

    // Validate field value
    const valueValidation = fieldMappingRegistry.validateFieldValue(
      override.field,
      override.value
    );
    if (!valueValidation.valid) {
      errors.push({
        stage: 'override_type',
        field: override.field,
        severity: 'hard_fail',
        message: valueValidation.error || 'Invalid value',
        code: 'INVALID_VALUE',
      });
    }
  }

  return errors;
}

// ==================== STAGE 4: CROSS-FIELD CONSISTENCY ====================

interface ConsistencyResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function validateCrossFieldConsistency(
  baseline: TaxInputSnapshot,
  overrides: ScenarioOverride[]
): ConsistencyResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Build a projected snapshot (baseline + overrides) for consistency checks
  const projected = projectSnapshot(baseline, overrides);

  // Check 1: IRA distribution taxable <= IRA distribution total
  if (projected.inputs.iraDistributionsTaxable > projected.inputs.iraDistributions) {
    errors.push({
      stage: 'consistency',
      field: 'iraDistributionsTaxable',
      severity: 'hard_fail',
      message: 'Taxable IRA distributions cannot exceed total IRA distributions',
      code: 'IRA_TAXABLE_EXCEEDS_TOTAL',
    });
  }

  // Check 2: Pension taxable <= Pension total
  if (projected.inputs.pensionsAnnuitiesTaxable > projected.inputs.pensionsAnnuities) {
    errors.push({
      stage: 'consistency',
      field: 'pensionsAnnuitiesTaxable',
      severity: 'hard_fail',
      message: 'Taxable pensions cannot exceed total pensions',
      code: 'PENSION_TAXABLE_EXCEEDS_TOTAL',
    });
  }

  // Check 3: Qualified dividends <= Ordinary dividends
  if (projected.inputs.qualifiedDividends > projected.inputs.ordinaryDividends) {
    errors.push({
      stage: 'consistency',
      field: 'qualifiedDividends',
      severity: 'hard_fail',
      message: 'Qualified dividends cannot exceed ordinary dividends',
      code: 'QUALIFIED_DIV_EXCEEDS_ORDINARY',
    });
  }

  // Check 4: SALT cap warning (if SALT > $10,000)
  const totalSalt =
    projected.inputs.stateLocalIncomeTaxes + projected.inputs.realEstateTaxes;
  if (totalSalt > 10000) {
    warnings.push({
      field: 'stateLocalIncomeTaxes',
      message: `SALT deduction will be capped at $10,000 (current: $${totalSalt.toLocaleString()})`,
      suggestion: 'Consider state tax planning strategies',
    });
  }

  // Check 5: Student loan interest cap ($2,500)
  if (projected.inputs.studentLoanInterest > 2500) {
    warnings.push({
      field: 'studentLoanInterest',
      message: `Student loan interest deduction capped at $2,500 (current: $${projected.inputs.studentLoanInterest.toLocaleString()})`,
    });
  }

  // Check 6: Large Roth conversion (>$50k) warning
  const iraDistributionIncrease = overrides.find(
    (o) => o.field === 'iraDistributionsTaxable'
  );
  if (iraDistributionIncrease && typeof iraDistributionIncrease.value === 'number') {
    if (iraDistributionIncrease.value > 50000) {
      warnings.push({
        field: 'iraDistributionsTaxable',
        message: 'Large Roth conversion may push into higher bracket',
        suggestion: 'Review marginal bracket impact before proceeding',
      });
    }
  }

  return { errors, warnings };
}

/**
 * Project snapshot with overrides applied (for consistency checks)
 * This is a simplified projection - not the full snapshot builder
 */
function projectSnapshot(
  baseline: TaxInputSnapshot,
  overrides: ScenarioOverride[]
): TaxInputSnapshot {
  const projected = {
    ...baseline,
    inputs: { ...baseline.inputs },
  };

  for (const override of overrides) {
    const path = fieldMappingRegistry.getSnapshotPath(override.field);
    if (!path || !path.startsWith('inputs.')) continue;

    const fieldName = path.replace('inputs.', '') as keyof typeof projected.inputs;
    const currentValue = projected.inputs[fieldName];

    switch (override.operator) {
      case 'replace':
        (projected.inputs[fieldName] as any) = override.value;
        break;
      case 'add':
        if (typeof currentValue === 'number' && typeof override.value === 'number') {
          (projected.inputs[fieldName] as any) = currentValue + override.value;
        }
        break;
      case 'subtract':
        if (typeof currentValue === 'number' && typeof override.value === 'number') {
          (projected.inputs[fieldName] as any) = currentValue - override.value;
        }
        break;
    }
  }

  return projected;
}

// ==================== STAGE 5: SUPPORTABILITY VALIDATION ====================

function validateSupportability(
  baseline: TaxInputSnapshot,
  overrides: ScenarioOverride[]
): ConsistencyResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const projected = projectSnapshot(baseline, overrides);

  // Flag 1: K-1 passthrough income (unsupported complexity)
  if (
    projected.inputs.k1OrdinaryIncome ||
    projected.inputs.k1NetRentalRealEstateIncome ||
    projected.inputs.k1OtherNetRentalIncome
  ) {
    warnings.push({
      message: 'K-1 passthrough income detected - calculations may be approximate',
      suggestion: 'Review with tax professional for complex partnerships',
    });
  }

  // Flag 2: AMT risk (high income + high deductions)
  const agi =
    projected.inputs.wages +
    projected.inputs.salaries +
    projected.inputs.taxableInterest +
    projected.inputs.ordinaryDividends +
    projected.inputs.businessIncomeLoss +
    projected.inputs.iraDistributionsTaxable +
    projected.inputs.pensionsAnnuitiesTaxable;

  if (agi > 500000) {
    warnings.push({
      message: 'High AGI may trigger Alternative Minimum Tax (AMT)',
      suggestion: 'Consider AMT impact on scenario',
    });
  }

  // Flag 3: Foreign tax credit (complexity)
  if (projected.inputs.foreignTaxCredit > 0) {
    warnings.push({
      message: 'Foreign tax credit scenarios require additional validation',
      suggestion: 'Verify foreign income reporting',
    });
  }

  return { errors, warnings };
}

// ==================== STAGE 6: BLOCKER GENERATION ====================

function generateBlockers(baseline: TaxInputSnapshot): MissingInfoItem[] {
  const blockers: MissingInfoItem[] = [];

  // Check baseline missingInputs
  for (const missing of baseline.missingInputs) {
    blockers.push({
      field: missing,
      label: missing,
      description: `Missing required input: ${missing}`,
      severity: 'blocking',
      suggestedSource: 'baseline_tax_input',
    });
  }

  // Check for critical missing data
  if (baseline.taxpayers.length === 0) {
    blockers.push({
      field: 'taxpayers',
      label: 'Taxpayers',
      description: 'At least one taxpayer is required for tax calculation',
      severity: 'blocking',
      suggestedSource: 'household_members',
    });
  }

  if (!baseline.filingStatus) {
    blockers.push({
      field: 'filingStatus',
      label: 'Filing Status',
      description: 'Filing status is required for tax calculation',
      severity: 'blocking',
      suggestedSource: 'household_tax_profile',
    });
  }

  return blockers;
}

// ==================== SEVERITY DETERMINATION ====================

function determineSeverity(errors: ValidationError[]): ValidationSeverity {
  if (errors.some((e) => e.severity === 'hard_fail')) {
    return 'hard_fail';
  }
  if (errors.some((e) => e.severity === 'soft_fail')) {
    return 'soft_fail';
  }
  if (errors.some((e) => e.severity === 'warn')) {
    return 'warn';
  }
  return 'pass';
}
