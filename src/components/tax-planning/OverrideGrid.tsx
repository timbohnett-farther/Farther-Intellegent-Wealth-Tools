'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { Plus, Trash2 } from 'lucide-react';
import type { ScenarioOverride, OverrideMode } from '@/lib/tax-planning/types';

export interface OverrideGridProps {
  /** List of current scenario overrides */
  overrides: ScenarioOverride[];
  /** Callback to add a new override */
  onAdd: () => void;
  /** Callback to remove an override by ID */
  onRemove: (overrideId: string) => void;
  /** Callback when an override field changes */
  onChange: (overrideId: string, updates: Partial<ScenarioOverride>) => void;
}

function formatCurrencyInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export const OverrideGrid: React.FC<OverrideGridProps> = ({
  overrides,
  onAdd,
  onRemove,
  onChange,
}) => {
  const handleAmountChange = useCallback(
    (overrideId: string, rawValue: string) => {
      const parsed = parseFloat(rawValue);
      if (isNaN(parsed)) return;
      const newCents = Math.round(parsed * 100);
      onChange(overrideId, { amount_cents: newCents as ScenarioOverride['amount_cents'] });
    },
    [onChange]
  );

  const handleModeToggle = useCallback(
    (overrideId: string, currentMode: OverrideMode) => {
      const newMode: OverrideMode = currentMode === 'ABSOLUTE' ? 'DELTA' : 'ABSOLUTE';
      onChange(overrideId, { mode: newMode });
    },
    [onChange]
  );

  const handleLineRefChange = useCallback(
    (overrideId: string, value: string) => {
      onChange(overrideId, {
        target_tax_line_ref: value as ScenarioOverride['target_tax_line_ref'],
      });
    },
    [onChange]
  );

  return (
    <div className="w-full space-y-3">
      {/* Override cards */}
      {overrides.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-4 py-8 text-center">
          <p className="text-sm text-white/50">
            No overrides configured. Add one to create a what-if scenario.
          </p>
        </div>
      ) : (
        overrides.map((override) => (
          <div
            key={override.override_id}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm"
          >
            <div className="flex items-start gap-4 flex-wrap">
              {/* Target line ref */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-white/50 mb-1">
                  Target Line Reference
                </label>
                <input
                  type="text"
                  value={override.target_tax_line_ref as string}
                  onChange={(e) =>
                    handleLineRefChange(override.override_id, e.target.value)
                  }
                  placeholder="e.g., f1040:l1z:wages"
                  className="h-9 w-full rounded-lg border-[1.5px] border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-3 text-sm font-mono text-white placeholder:text-white/30 focus:outline-hidden focus:border-teal-500 focus:shadow-focus transition-colors"
                />
              </div>

              {/* Mode toggle */}
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-white/50 mb-1">
                  Mode
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleModeToggle(override.override_id, override.mode)
                  }
                  className={cn(
                    'h-9 rounded-lg px-4 text-sm font-medium transition-colors border-[1.5px]',
                    override.mode === 'ABSOLUTE'
                      ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                      : 'border-info-500 bg-info-50 text-info-700'
                  )}
                >
                  {override.mode}
                </button>
              </div>

              {/* Amount */}
              <div className="flex-shrink-0 w-40">
                <label className="block text-xs font-medium text-white/50 mb-1">
                  Amount ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={formatCurrencyInput(override.amount_cents as number)}
                    onBlur={(e) =>
                      handleAmountChange(override.override_id, e.target.value)
                    }
                    className="h-9 w-full rounded-lg border-[1.5px] border-white/[0.06] bg-white pl-7 pr-3 text-sm text-right tabular-nums text-white focus:outline-hidden focus:border-teal-500 focus:shadow-focus transition-colors"
                  />
                </div>
              </div>

              {/* Remove button */}
              <div className="flex-shrink-0 pt-5">
                <button
                  type="button"
                  onClick={() => onRemove(override.override_id)}
                  className="rounded p-2 text-white/30 hover:bg-critical-100 hover:text-critical-600 transition-colors"
                  aria-label={`Remove override ${override.target_tax_line_ref}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Add Override button */}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-lg border-[1.5px] border-dashed border-white/[0.10] bg-white/[0.07] text-sm font-medium text-white/60 hover:border-brand-500 hover:text-teal-300 hover:bg-teal-500/10/30 transition-colors w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Add Override
      </button>
    </div>
  );
};

OverrideGrid.displayName = 'OverrideGrid';
