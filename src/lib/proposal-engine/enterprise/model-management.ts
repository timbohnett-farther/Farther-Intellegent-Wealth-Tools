/**
 * CIO Model Management Dashboard Service
 * Version-controlled investment model editing and management
 */

import { randomUUID } from 'crypto';

export type ModelVersionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface ModelChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface ModelVersion {
  versionId: string;
  modelId: string;
  version: number;
  changes: ModelChange[];
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  status: ModelVersionStatus;
}

export interface ModelDiff {
  changes: Array<{
    field: string;
    versionA: unknown;
    versionB: unknown;
  }>;
  impactAnalysis: string;
}

// In-memory store for model versions
const versionStore = new Map<string, ModelVersion>();
const modelVersionIndex = new Map<string, string[]>(); // modelId -> versionIds[]
const versionCounters = new Map<string, number>(); // modelId -> latest version number

/**
 * Create a new model version (draft or pending approval)
 * @param modelId - ID of the model being versioned
 * @param changes - Array of field changes with reasons
 * @param createdBy - Email or ID of user creating version
 * @returns New model version in DRAFT status
 */
export function createModelVersion(
  modelId: string,
  changes: ModelChange[],
  createdBy: string
): ModelVersion {
  if (!modelId?.trim()) {
    throw new Error('modelId required');
  }
  if (!changes?.length) {
    throw new Error('At least one change required');
  }
  if (!createdBy?.trim()) {
    throw new Error('createdBy required');
  }

  // Validate changes have required fields
  for (const change of changes) {
    if (!change.field?.trim()) {
      throw new Error('Each change must specify a field');
    }
    if (!change.reason?.trim()) {
      throw new Error('Each change must include a reason');
    }
  }

  const versionId = randomUUID();
  const currentVersion = versionCounters.get(modelId) ?? 0;
  const version = currentVersion + 1;

  const modelVersion: ModelVersion = {
    versionId,
    modelId,
    version,
    changes,
    createdBy,
    createdAt: new Date().toISOString(),
    status: 'DRAFT',
  };

  versionStore.set(versionId, modelVersion);

  // Update index
  const existing = modelVersionIndex.get(modelId) ?? [];
  modelVersionIndex.set(modelId, [...existing, versionId]);

  versionCounters.set(modelId, version);

  return modelVersion;
}

/**
 * Approve a pending model version
 * @param versionId - Version to approve
 * @param approvedBy - Email or ID of approver
 * @returns Approved version or null if not found/already processed
 */
export function approveModelVersion(
  versionId: string,
  approvedBy: string
): ModelVersion | null {
  const version = versionStore.get(versionId);
  if (!version) return null;

  if (version.status !== 'DRAFT' && version.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot approve version in ${version.status} status`);
  }

  const updated: ModelVersion = {
    ...version,
    status: 'APPROVED',
    approvedBy,
    approvedAt: new Date().toISOString(),
  };

  versionStore.set(versionId, updated);
  return updated;
}

/**
 * Reject a pending model version
 * @param versionId - Version to reject
 * @param rejectedBy - Email or ID of rejector
 * @param reason - Rejection reason
 * @returns Rejected version or null if not found
 */
export function rejectModelVersion(
  versionId: string,
  rejectedBy: string,
  reason: string
): ModelVersion | null {
  const version = versionStore.get(versionId);
  if (!version) return null;

  if (version.status !== 'DRAFT' && version.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot reject version in ${version.status} status`);
  }

  const updated: ModelVersion = {
    ...version,
    status: 'REJECTED',
    rejectedBy,
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
  };

  versionStore.set(versionId, updated);
  return updated;
}

/**
 * Get full version history for a model
 * @param modelId - Model to retrieve history for
 * @returns Array of versions sorted by version number (newest first)
 */
export function getModelHistory(modelId: string): ModelVersion[] {
  const versionIds = modelVersionIndex.get(modelId) ?? [];
  const versions = versionIds
    .map(id => versionStore.get(id))
    .filter((v): v is ModelVersion => v !== undefined);

  return versions.sort((a, b) => b.version - a.version);
}

/**
 * Compare two model versions and generate diff
 * @param versionAId - First version ID
 * @param versionBId - Second version ID
 * @returns Diff showing changes between versions with impact analysis
 */
export function compareVersions(
  versionAId: string,
  versionBId: string
): ModelDiff {
  const versionA = versionStore.get(versionAId);
  const versionB = versionStore.get(versionBId);

  if (!versionA || !versionB) {
    throw new Error('Both versions must exist');
  }

  if (versionA.modelId !== versionB.modelId) {
    throw new Error('Cannot compare versions from different models');
  }

  // Build field map from changes
  const fieldsA = new Map<string, unknown>();
  const fieldsB = new Map<string, unknown>();

  for (const change of versionA.changes) {
    fieldsA.set(change.field, change.newValue);
  }

  for (const change of versionB.changes) {
    fieldsB.set(change.field, change.newValue);
  }

  const allFields = new Set([...fieldsA.keys(), ...fieldsB.keys()]);
  const changes: ModelDiff['changes'] = [];

  for (const field of allFields) {
    const valueA = fieldsA.get(field);
    const valueB = fieldsB.get(field);

    if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
      changes.push({ field, versionA: valueA, versionB: valueB });
    }
  }

  // Generate impact analysis
  let impactAnalysis = `${changes.length} field(s) differ between version ${versionA.version} and ${versionB.version}.`;

  if (changes.length === 0) {
    impactAnalysis = 'No differences detected between versions.';
  } else {
    const criticalFields = ['targetReturn', 'riskScore', 'assetAllocation', 'rebalanceThreshold'];
    const criticalChanges = changes.filter(c => criticalFields.includes(c.field));

    if (criticalChanges.length > 0) {
      impactAnalysis += ` CRITICAL: ${criticalChanges.length} high-impact field(s) changed (${criticalChanges.map(c => c.field).join(', ')}).`;
    }
  }

  return { changes, impactAnalysis };
}

/**
 * Rollback model to a previous version
 * @param modelId - Model to rollback
 * @param toVersion - Version number to rollback to
 * @returns New version representing the rollback
 */
export function rollbackModel(
  modelId: string,
  toVersion: number
): ModelVersion | null {
  const history = getModelHistory(modelId);
  const targetVersion = history.find(v => v.version === toVersion);

  if (!targetVersion) {
    return null;
  }

  if (targetVersion.status !== 'APPROVED') {
    throw new Error('Can only rollback to approved versions');
  }

  // Create new version with changes from target version
  const rollbackChanges: ModelChange[] = targetVersion.changes.map(c => ({
    ...c,
    reason: `Rollback to version ${toVersion}: ${c.reason}`,
  }));

  return createModelVersion(
    modelId,
    rollbackChanges,
    `SYSTEM_ROLLBACK_TO_V${toVersion}`
  );
}

/**
 * Submit a draft version for approval
 * @param versionId - Version to submit
 * @returns Updated version or null if not found
 */
export function submitForApproval(versionId: string): ModelVersion | null {
  const version = versionStore.get(versionId);
  if (!version) return null;

  if (version.status !== 'DRAFT') {
    throw new Error('Only DRAFT versions can be submitted for approval');
  }

  const updated: ModelVersion = {
    ...version,
    status: 'PENDING_APPROVAL',
  };

  versionStore.set(versionId, updated);
  return updated;
}

/**
 * Archive a model version (soft delete)
 * @param versionId - Version to archive
 * @returns Archived version or null if not found
 */
export function archiveVersion(versionId: string): ModelVersion | null {
  const version = versionStore.get(versionId);
  if (!version) return null;

  const updated: ModelVersion = {
    ...version,
    status: 'ARCHIVED',
  };

  versionStore.set(versionId, updated);
  return updated;
}

/**
 * Get latest approved version for a model
 * @param modelId - Model to retrieve latest version for
 * @returns Latest approved version or null if none approved
 */
export function getLatestApprovedVersion(modelId: string): ModelVersion | null {
  const history = getModelHistory(modelId);
  return history.find(v => v.status === 'APPROVED') ?? null;
}
