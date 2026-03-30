/**
 * Tax Input Snapshot Builder
 *
 * Transforms Phase 2 ApprovedFact[] into computation-ready TaxInputSnapshot.
 * Applies versioned mapping configuration and field transformations.
 */

import type { TaxInputSnapshot, TaxInputValues, ValidationMessage, MissingInput } from '@/types';
import type { ApprovedFact } from '@/generated/prisma/client';
import { MAPPING_CONFIG_2025, type FieldMapping, type CompoundMapping } from './mapping-config-2025';
import * as transforms from '../transformers/field-transforms';

export interface SnapshotBuilderOptions {
  taxYear: number;
  mappingVersion?: string;
  includeWarnings?: boolean;
}

export interface SnapshotBuilderResult {
  snapshot: TaxInputSnapshot;
  missingInputs: MissingInput[];
  warnings: ValidationMessage[];
  appliedMappingVersion: string;
}

/**
 * Build TaxInputSnapshot from ApprovedFact array
 */
export async function buildSnapshot(
  householdId: string,
  approvedFacts: ApprovedFact[],
  options: SnapshotBuilderOptions
): Promise<SnapshotBuilderResult> {
  const { taxYear, includeWarnings = true } = options;

  // Select mapping configuration
  const mappingConfig = MAPPING_CONFIG_2025; // TODO: Version selector based on taxYear

  // Initialize result containers
  const inputs: Partial<TaxInputValues> = {};
  const warnings: ValidationMessage[] = [];
  const missingInputs: MissingInput[] = [];
  const sourceFactVersions: Record<string, number> = {};
  const sourceFactIds: string[] = [];

  // Index facts by canonical field name
  const factsByField = new Map<string, ApprovedFact>();
  for (const fact of approvedFacts) {
    if (fact.taxYear === taxYear && fact.approvalStatus === 'approved') {
      factsByField.set(fact.canonicalField, fact);
      sourceFactVersions[fact.id] = fact.version;
      sourceFactIds.push(fact.id);
    }
  }

  // Apply field mappings
  for (const mapping of mappingConfig.fieldMappings) {
    const fact = factsByField.get(mapping.approvedFactField);

    if (!fact) {
      // Check if this is a warning field
      if (includeWarnings && mappingConfig.warningIfMissingFields.includes(mapping.approvedFactField)) {
        warnings.push({
          code: 'MISSING_FIELD',
          severity: 'warning',
          field: mapping.approvedFactField,
          message: `Expected field "${mapping.approvedFactField}" not found in approved facts`,
          details: { taxInputField: mapping.taxInputField },
        });
      }

      // Check if required for baseline
      if (mapping.requiredFor.includes('baseline')) {
        missingInputs.push({
          field: mapping.approvedFactField,
          reasonCode: 'REQUIRED_FOR_BASELINE',
          message: `Field "${mapping.approvedFactField}" is required for baseline calculation`,
          blocking: true,
        });
      }

      continue;
    }

    // Apply transformation
    const transformResult = applyTransform(
      fact.value,
      mapping.transform,
      mapping.transformParams
    );

    // Store result
    (inputs as any)[mapping.taxInputField] = transformResult.value;

    // Collect warnings from transform
    if (transformResult.warnings.length > 0 && includeWarnings) {
      warnings.push({
        code: 'TRANSFORM_WARNING',
        severity: 'warning',
        field: mapping.taxInputField,
        message: `Transformation warnings for ${mapping.approvedFactField}`,
        details: {
          warnings: transformResult.warnings,
          originalValue: fact.value,
          transformedValue: transformResult.value,
        },
      });
    }
  }

  // Apply compound mappings
  for (const compoundMapping of mappingConfig.compoundMappings) {
    const sourceValues = compoundMapping.sourceFields.map((field) => {
      const fact = factsByField.get(field);
      return fact?.value;
    });

    const transformResult = applyCompoundTransform(
      sourceValues,
      compoundMapping.transform
    );

    (inputs as any)[compoundMapping.taxInputField] = transformResult.value;

    if (transformResult.warnings.length > 0 && includeWarnings) {
      warnings.push({
        code: 'COMPOUND_TRANSFORM_WARNING',
        severity: 'warning',
        field: compoundMapping.taxInputField,
        message: `Compound transformation warnings`,
        details: {
          warnings: transformResult.warnings,
          sourceFields: compoundMapping.sourceFields,
        },
      });
    }
  }

  // Detect filing status and taxpayers (these come from household profile, not approved facts)
  // For now, use placeholder values - these should be fetched from HouseholdProfile in production
  const filingStatus = detectFilingStatus(factsByField);
  const taxpayers = detectTaxpayers(factsByField);

  // Generate source fact version signature (for stale run detection)
  const sourceFactVersionSignature = generateVersionSignature(sourceFactVersions);

  // Create snapshot
  const snapshot: TaxInputSnapshot = {
    snapshotId: generateSnapshotId(),
    householdId,
    taxYear,
    filingStatus,
    taxpayers,
    inputs: inputs as TaxInputValues,
    sourceFactVersions,
    sourceFactIds,
    unresolvedFlags: [],
    missingInputs,
    warnings,
    createdAt: new Date().toISOString(),
    createdBy: 'system', // TODO: Pass actual user ID
    sourceFactVersionSignature,
  };

  return {
    snapshot,
    missingInputs,
    warnings,
    appliedMappingVersion: mappingConfig.mappingVersion,
  };
}

/**
 * Apply transformation to a single value
 */
function applyTransform(
  value: any,
  transformType: string,
  params?: any[]
): transforms.TransformResult {
  switch (transformType) {
    case 'identity':
      return transforms.identity(value);
    case 'currency_to_number':
      return transforms.currencyToNumber(value);
    case 'coalesce_zero':
      return transforms.coalesceZero(value);
    case 'safe_positive_currency':
      return transforms.safePositiveCurrency(value);
    case 'bool_presence':
      return transforms.boolPresence(value);
    case 'nullable_number':
      return transforms.nullableNumber(value);
    case 'to_integer':
      return transforms.toInteger(value);
    case 'percentage_to_decimal':
      return transforms.percentageToDecimal(value);
    case 'to_iso_date':
      return transforms.toISODate(value);
    case 'max_value':
      return params ? transforms.maxValue(value, params[0]) : transforms.identity(value);
    case 'min_value':
      return params ? transforms.minValue(value, params[0]) : transforms.identity(value);
    default:
      return {
        value: null,
        warnings: [`Unknown transform type: ${transformType}`],
      };
  }
}

/**
 * Apply compound transformation to multiple values
 */
function applyCompoundTransform(
  values: any[],
  transformType: string
): transforms.TransformResult {
  switch (transformType) {
    case 'sum_fields':
      return transforms.sumFields(...values);
    case 'subtract_fields':
      return values.length >= 2
        ? transforms.subtractFields(values[0], values[1])
        : { value: null, warnings: ['subtract_fields requires at least 2 values'] };
    case 'last_non_null':
      return transforms.lastNonNull(...values);
    default:
      return {
        value: null,
        warnings: [`Unknown compound transform type: ${transformType}`],
      };
  }
}

/**
 * Detect filing status from facts
 * TODO: Should come from HouseholdProfile in production
 */
function detectFilingStatus(factsByField: Map<string, ApprovedFact>): string {
  const filingStatusFact = factsByField.get('filing_status');

  if (filingStatusFact) {
    const normalized = String(filingStatusFact.value).toUpperCase().replace(/\s+/g, '_');

    // Map common variations
    if (normalized.includes('MARRIED') && normalized.includes('JOINT')) {
      return 'MFJ';
    }
    if (normalized.includes('MARRIED') && normalized.includes('SEPARATE')) {
      return 'MFS';
    }
    if (normalized.includes('SINGLE')) {
      return 'SINGLE';
    }
    if (normalized.includes('HEAD')) {
      return 'HOH';
    }
    if (normalized.includes('QUALIFYING') && normalized.includes('SURVIV')) {
      return 'QSS';
    }

    return 'MFJ'; // Default
  }

  // Default to MFJ if not specified
  return 'MFJ';
}

/**
 * Detect taxpayers from facts
 * TODO: Should come from HouseholdProfile in production
 */
function detectTaxpayers(factsByField: Map<string, ApprovedFact>): any[] {
  const primaryAgeFact = factsByField.get('primary_taxpayer_age');
  const spouseAgeFact = factsByField.get('spouse_age');

  const taxpayers: any[] = [
    {
      personId: 'primary',
      role: 'primary',
      age: primaryAgeFact ? parseInt(String(primaryAgeFact.value), 10) : null,
    },
  ];

  if (spouseAgeFact) {
    taxpayers.push({
      personId: 'spouse',
      role: 'spouse',
      age: parseInt(String(spouseAgeFact.value), 10),
    });
  }

  return taxpayers;
}

/**
 * Generate stable snapshot ID
 */
function generateSnapshotId(): string {
  return `tis_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate version signature for stale run detection
 * Creates a deterministic hash of all source fact versions
 */
function generateVersionSignature(sourceFactVersions: Record<string, number>): string {
  // Sort keys for deterministic output
  const sorted = Object.keys(sourceFactVersions)
    .sort()
    .map((key) => `${key}:${sourceFactVersions[key]}`)
    .join('|');

  // Simple hash (in production, use crypto.createHash)
  return Buffer.from(sorted).toString('base64').substring(0, 32);
}

/**
 * Check if two snapshots have the same source facts
 */
export function snapshotsHaveSameSource(
  snapshot1: TaxInputSnapshot,
  snapshot2: TaxInputSnapshot
): boolean {
  return snapshot1.sourceFactVersionSignature === snapshot2.sourceFactVersionSignature;
}

/**
 * Get fields that changed between two snapshots
 */
export function getChangedFields(
  oldSnapshot: TaxInputSnapshot,
  newSnapshot: TaxInputSnapshot
): string[] {
  const changed: string[] = [];

  const allFields = new Set([
    ...Object.keys(oldSnapshot.inputs),
    ...Object.keys(newSnapshot.inputs),
  ]);

  for (const field of allFields) {
    const oldValue = (oldSnapshot.inputs as any)[field];
    const newValue = (newSnapshot.inputs as any)[field];

    if (oldValue !== newValue) {
      changed.push(field);
    }
  }

  return changed;
}
