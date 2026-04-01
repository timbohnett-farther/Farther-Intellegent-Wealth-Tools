// =============================================================================
// Governance, Compliance, & Admin Layer — Settings Service
// =============================================================================
//
// Resolves admin settings using hierarchy: team > office > firm.
// Most specific scope wins. Provides CRUD for settings.
// =============================================================================

import { randomUUID } from 'crypto';
import type { ResolveSettingCommand, SettingsResolutionResult, AdminSetting, SettingsCategory, SettingsScopeType } from './types';
import { store } from '../store';
import { auditService } from '../audit';

// =====================================================================
// Settings Service
// =====================================================================

/**
 * Resolves a setting value using hierarchical precedence:
 * team > office > firm (most specific wins).
 */
export function resolveSetting(command: ResolveSettingCommand): SettingsResolutionResult | null {
  const { settingCategory, key, teamId, officeId, firmId } = command;

  // Try team scope first
  if (teamId) {
    const teamSetting = findSetting(settingCategory, key, 'team', teamId);
    if (teamSetting) {
      return {
        settingCategory,
        key,
        resolvedValue: teamSetting.value,
        sourceScopeType: 'team',
        sourceScopeRefId: teamId,
      };
    }
  }

  // Try office scope
  if (officeId) {
    const officeSetting = findSetting(settingCategory, key, 'office', officeId);
    if (officeSetting) {
      return {
        settingCategory,
        key,
        resolvedValue: officeSetting.value,
        sourceScopeType: 'office',
        sourceScopeRefId: officeId,
      };
    }
  }

  // Fall back to firm scope
  const firmSetting = findSetting(settingCategory, key, 'firm', firmId);
  if (firmSetting) {
    return {
      settingCategory,
      key,
      resolvedValue: firmSetting.value,
      sourceScopeType: 'firm',
      sourceScopeRefId: firmId,
    };
  }

  // No setting found
  return null;
}

/**
 * Returns a specific setting by ID.
 */
export function getSetting(settingId: string): AdminSetting | undefined {
  return store.getGovernanceObject<AdminSetting>('admin_settings', settingId);
}

/**
 * Creates or updates a setting.
 */
export function upsertSetting(setting: Omit<AdminSetting, 'settingId' | 'createdAt' | 'updatedAt'>): AdminSetting {
  // Check if setting already exists
  const existing = findSetting(
    setting.settingCategory,
    setting.key,
    setting.scopeType,
    setting.scopeRefId
  );

  const now = new Date().toISOString();

  if (existing) {
    const updated: AdminSetting = {
      ...existing,
      ...setting,
      updatedAt: now,
    };

    store.upsertGovernanceObject('admin_settings', existing.settingId, updated);

    auditService.emit({
      firmId: 'firm-001',
      userId: 'system',
      eventKey: 'governance.setting.updated',
      payload: {
        settingId: existing.settingId,
        settingCategory: setting.settingCategory,
        key: setting.key,
        scopeType: setting.scopeType,
        scopeRefId: setting.scopeRefId,
      },
    });

    return updated;
  } else {
    const newSetting: AdminSetting = {
      settingId: randomUUID(),
      ...setting,
      createdAt: now,
      updatedAt: now,
    };

    store.upsertGovernanceObject('admin_settings', newSetting.settingId, newSetting);

    auditService.emit({
      firmId: 'firm-001',
      userId: 'system',
      eventKey: 'governance.setting.updated',
      payload: {
        settingId: newSetting.settingId,
        settingCategory: setting.settingCategory,
        key: setting.key,
        scopeType: setting.scopeType,
        scopeRefId: setting.scopeRefId,
      },
    });

    return newSetting;
  }
}

/**
 * Lists settings for a specific scope.
 */
export function listSettings(scopeType: SettingsScopeType, scopeRefId: string): AdminSetting[] {
  const allSettings = store.listGovernanceObjects<AdminSetting>('admin_settings');
  return allSettings.filter(
    (s) => s.scopeType === scopeType && s.scopeRefId === scopeRefId && s.status === 'active'
  );
}

// =====================================================================
// Helper: Find Setting
// =====================================================================

function findSetting(
  settingCategory: SettingsCategory,
  key: string,
  scopeType: SettingsScopeType,
  scopeRefId: string
): AdminSetting | undefined {
  const allSettings = store.listGovernanceObjects<AdminSetting>('admin_settings');
  return allSettings.find(
    (s) =>
      s.settingCategory === settingCategory &&
      s.key === key &&
      s.scopeType === scopeType &&
      s.scopeRefId === scopeRefId &&
      s.status === 'active'
  );
}
