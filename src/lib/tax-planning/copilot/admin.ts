// =============================================================================
// AI Copilot & Citation Layer — Admin Configuration
// =============================================================================
//
// Per-firm copilot configuration: enabled families, audiences, retention,
// and review requirements. Stored in-memory (Stage 1).
// =============================================================================

import type { PromptFamily, AudienceMode } from './types';

// =====================================================================
// Config Shape
// =====================================================================

export interface CopilotConfig {
  /** Enabled prompt families for this firm. */
  enabled_families: PromptFamily[];
  /** Enabled audience modes for this firm. */
  enabled_audiences: AudienceMode[];
  /** Number of days to retain copilot answers. */
  retention_days: number;
  /** Whether answers require review before they can be used/shared. */
  require_review_before_use: boolean;
}

// =====================================================================
// Default Config
// =====================================================================

const DEFAULT_CONFIG: CopilotConfig = {
  enabled_families: [
    'explain_line_item',
    'explain_opportunity',
    'compare_scenarios',
    'draft_client_email',
    'draft_cpa_note',
    'draft_meeting_prep',
    'missing_data_review',
  ],
  enabled_audiences: [
    'advisor_internal',
    'client_friendly',
    'cpa_technical',
    'compliance_formal',
    'executive_summary',
  ],
  retention_days: 365,
  require_review_before_use: false,
};

// =====================================================================
// In-Memory Store
// =====================================================================

/** Per-firm config store. Falls back to defaults for unconfigured firms. */
const firmConfigs: Map<string, CopilotConfig> = new Map();

// =====================================================================
// Config API
// =====================================================================

/**
 * Get the copilot configuration for a firm.
 * Returns the default config if no firm-specific config exists.
 *
 * @param firmId - The firm to get config for.
 * @returns The firm's copilot configuration.
 */
export function getCopilotConfig(firmId: string): CopilotConfig {
  const stored = firmConfigs.get(firmId);
  if (stored) return { ...stored };
  return { ...DEFAULT_CONFIG };
}

/**
 * Update the copilot configuration for a firm.
 * Only provided fields are updated; others retain their current values.
 *
 * @param firmId - The firm to update config for.
 * @param updates - Partial config to merge.
 * @returns The updated configuration.
 */
export function updateCopilotConfig(
  firmId: string,
  updates: Partial<CopilotConfig>,
): CopilotConfig {
  const current = getCopilotConfig(firmId);

  const updated: CopilotConfig = {
    enabled_families: updates.enabled_families ?? current.enabled_families,
    enabled_audiences: updates.enabled_audiences ?? current.enabled_audiences,
    retention_days: updates.retention_days ?? current.retention_days,
    require_review_before_use:
      updates.require_review_before_use ?? current.require_review_before_use,
  };

  firmConfigs.set(firmId, updated);
  return { ...updated };
}

/**
 * Reset a firm's config back to defaults.
 *
 * @param firmId - The firm to reset.
 */
export function resetCopilotConfig(firmId: string): void {
  firmConfigs.delete(firmId);
}

/**
 * Check if a prompt family is enabled for a firm.
 */
export function isFamilyEnabled(firmId: string, family: PromptFamily): boolean {
  const config = getCopilotConfig(firmId);
  return config.enabled_families.includes(family);
}

/**
 * Check if an audience mode is enabled for a firm.
 */
export function isAudienceEnabled(firmId: string, audience: AudienceMode): boolean {
  const config = getCopilotConfig(firmId);
  return config.enabled_audiences.includes(audience);
}
