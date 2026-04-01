// =============================================================================
// Governance, Compliance, & Admin Layer — Template Governance Service
// =============================================================================
//
// Controls template usage through office/team allowlists and approval requirements.
// Enforces published=immutable, deprecated=blocked rules.
// =============================================================================

import type { TemplateGovernanceRecord } from './types';
import { store } from '../store';

// =====================================================================
// Template Governance Service
// =====================================================================

/**
 * Evaluates whether a template can be used.
 * Returns:
 * - allowed: boolean
 * - requiresApproval: boolean
 * - reason?: string (if denied)
 */
export function evaluateTemplateAccess(
  templateId: string,
  version: string,
  officeId?: string,
  teamId?: string
): {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
} {
  const record = getTemplateGovernanceRecord(templateId, version);

  if (!record) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'No governance record found for template',
    };
  }

  // Deprecated templates are blocked for new use
  if (record.status === 'deprecated') {
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'Template is deprecated',
    };
  }

  // Draft templates require approval
  if (record.status === 'draft') {
    return {
      allowed: true,
      requiresApproval: true,
    };
  }

  // Check office allowlist
  if (record.allowedOfficeIds && officeId) {
    if (!record.allowedOfficeIds.includes(officeId)) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Office ${officeId} not authorized to use this template`,
      };
    }
  }

  // Check team allowlist
  if (record.allowedTeamIds && teamId) {
    if (!record.allowedTeamIds.includes(teamId)) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Team ${teamId} not authorized to use this template`,
      };
    }
  }

  // Published templates may require approval
  return {
    allowed: true,
    requiresApproval: record.approvalRequiredForUse,
  };
}

/**
 * Returns the governance record for a specific template + version.
 */
export function getTemplateGovernanceRecord(
  templateId: string,
  version: string
): TemplateGovernanceRecord | undefined {
  const records = store.listGovernanceObjects<TemplateGovernanceRecord>('template_governance_records');
  return records.find((r) => r.templateId === templateId && r.version === version);
}

/**
 * Lists all template governance records.
 */
export function listTemplateGovernanceRecords(filters?: {
  templateId?: string;
  status?: string;
}): TemplateGovernanceRecord[] {
  let records = store.listGovernanceObjects<TemplateGovernanceRecord>('template_governance_records');

  if (filters?.templateId) {
    records = records.filter((r) => r.templateId === filters.templateId);
  }

  if (filters?.status) {
    records = records.filter((r) => r.status === filters.status);
  }

  return records;
}
