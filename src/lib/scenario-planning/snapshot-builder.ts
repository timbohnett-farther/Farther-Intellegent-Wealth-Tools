/**
 * Snapshot Builder — Phase 5A
 *
 * Clones baseline TaxInputSnapshot, applies scenario overrides,
 * generates deterministic signature for scenario snapshot.
 *
 * Pattern: Immutable data transformations (never mutate baseline)
 */

import { TaxInputSnapshot, TaxInputs } from '@/types/tax-engine';
import { ScenarioOverride } from '@/types/scenario-planning';
import { fieldMappingRegistry } from './field-mapping-registry';
import crypto from 'crypto';

// ==================== TYPES ====================

export interface ScenarioSnapshot extends TaxInputSnapshot {
  parentSnapshotId: string; // The baseline snapshot this was derived from
  overrideSignature: string; // SHA-256 hash of applied overrides
  appliedOverrides: ScenarioOverride[]; // Overrides that were applied
}

export interface BuildSnapshotResult {
  snapshot: ScenarioSnapshot | null;
  errors: string[];
  warnings: string[];
}

// ==================== SNAPSHOT BUILDER ====================

/**
 * Build scenario snapshot by cloning baseline and applying overrides
 *
 * @param baseline - Original tax input snapshot (immutable)
 * @param overrides - List of overrides to apply
 * @param scenarioId - Scenario ID for new snapshot
 * @returns BuildSnapshotResult with snapshot or errors
 */
export function buildScenarioSnapshot(
  baseline: TaxInputSnapshot,
  overrides: ScenarioOverride[],
  scenarioId: string
): BuildSnapshotResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Validate all overrides before applying
  for (const override of overrides) {
    // Check if field exists in registry
    if (!fieldMappingRegistry.fieldExists(override.field)) {
      errors.push(`Unknown field: ${override.field}`);
      continue;
    }

    // Check if operator is valid for this field
    if (!fieldMappingRegistry.isValidOperator(override.field, override.operator)) {
      errors.push(
        `Invalid operator "${override.operator}" for field "${override.field}"`
      );
      continue;
    }

    // Validate field value
    const valueValidation = fieldMappingRegistry.validateFieldValue(
      override.field,
      override.value
    );
    if (!valueValidation.valid) {
      errors.push(
        `Invalid value for ${override.field}: ${valueValidation.error}`
      );
    }
  }

  // If validation errors, return early
  if (errors.length > 0) {
    return { snapshot: null, errors, warnings };
  }

  // Step 2: Deep clone baseline snapshot (immutable pattern)
  const clonedSnapshot = deepCloneSnapshot(baseline);

  // Step 3: Apply overrides in order
  for (const override of overrides) {
    const path = fieldMappingRegistry.getSnapshotPath(override.field);
    if (!path) {
      warnings.push(`Could not resolve path for field: ${override.field}`);
      continue;
    }

    try {
      applyOverride(clonedSnapshot, path, override);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to apply override to ${override.field}: ${message}`);
    }
  }

  // If errors occurred during application, return early
  if (errors.length > 0) {
    return { snapshot: null, errors, warnings };
  }

  // Step 4: Generate deterministic override signature
  const overrideSignature = generateOverrideSignature(overrides);

  // Step 5: Create scenario snapshot with lineage tracking
  const scenarioSnapshot: ScenarioSnapshot = {
    ...clonedSnapshot,
    snapshotId: `snap_scenario_${scenarioId}_${Date.now()}`,
    parentSnapshotId: baseline.snapshotId,
    overrideSignature,
    appliedOverrides: overrides,
    createdAt: new Date(),
  };

  return {
    snapshot: scenarioSnapshot,
    errors: [],
    warnings,
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Deep clone a TaxInputSnapshot (immutable pattern)
 */
function deepCloneSnapshot(snapshot: TaxInputSnapshot): TaxInputSnapshot {
  return {
    ...snapshot,
    taxpayers: snapshot.taxpayers.map((t) => ({ ...t })),
    inputs: { ...snapshot.inputs },
    missingInputs: [...snapshot.missingInputs],
    warnings: [...snapshot.warnings],
    sourceFactVersions: { ...snapshot.sourceFactVersions },
  };
}

/**
 * Apply a single override to the cloned snapshot
 */
function applyOverride(
  snapshot: TaxInputSnapshot,
  path: string,
  override: ScenarioOverride
): void {
  // Parse path (e.g., "inputs.wages" -> ["inputs", "wages"])
  const pathParts = path.split('.');

  if (pathParts.length !== 2 || pathParts[0] !== 'inputs') {
    throw new Error(`Unsupported path format: ${path}`);
  }

  const fieldName = pathParts[1] as keyof TaxInputs;
  const currentValue = snapshot.inputs[fieldName];

  // Apply operator
  switch (override.operator) {
    case 'replace':
      (snapshot.inputs[fieldName] as any) = override.value;
      break;

    case 'add':
      if (typeof currentValue === 'number' && typeof override.value === 'number') {
        (snapshot.inputs[fieldName] as any) = currentValue + override.value;
      } else {
        throw new Error(`Cannot add non-numeric values for field: ${fieldName}`);
      }
      break;

    case 'subtract':
      if (typeof currentValue === 'number' && typeof override.value === 'number') {
        (snapshot.inputs[fieldName] as any) = currentValue - override.value;
      } else {
        throw new Error(`Cannot subtract non-numeric values for field: ${fieldName}`);
      }
      break;

    case 'toggle':
      if (typeof override.value === 'boolean') {
        (snapshot.inputs[fieldName] as any) = override.value;
      } else {
        throw new Error(`Toggle requires boolean value for field: ${fieldName}`);
      }
      break;

    default:
      throw new Error(`Unknown operator: ${override.operator}`);
  }
}

/**
 * Generate deterministic SHA-256 signature from overrides
 *
 * Signature is based on sorted overrides to ensure same overrides
 * in different order produce the same signature.
 */
function generateOverrideSignature(overrides: ScenarioOverride[]): string {
  // Sort overrides by field name for deterministic ordering
  const sortedOverrides = [...overrides].sort((a, b) =>
    a.field.localeCompare(b.field)
  );

  // Create canonical representation
  const canonical = sortedOverrides
    .map((o) => `${o.field}:${o.operator}:${String(o.value)}`)
    .join('|');

  // Generate SHA-256 hash
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// ==================== UTILITIES ====================

/**
 * Compare two snapshots and return list of changed fields
 */
export function getSnapshotDiff(
  baseline: TaxInputSnapshot,
  scenario: ScenarioSnapshot
): Array<{ field: string; baselineValue: any; scenarioValue: any }> {
  const diff: Array<{ field: string; baselineValue: any; scenarioValue: any }> = [];

  for (const key of Object.keys(baseline.inputs) as Array<keyof TaxInputs>) {
    const baselineValue = baseline.inputs[key];
    const scenarioValue = scenario.inputs[key];

    if (baselineValue !== scenarioValue) {
      diff.push({
        field: key,
        baselineValue,
        scenarioValue,
      });
    }
  }

  return diff;
}

/**
 * Verify override signature matches applied overrides
 */
export function verifyOverrideSignature(snapshot: ScenarioSnapshot): boolean {
  const expectedSignature = generateOverrideSignature(snapshot.appliedOverrides);
  return snapshot.overrideSignature === expectedSignature;
}
