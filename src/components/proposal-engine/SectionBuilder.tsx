'use client';

import React, { useCallback } from 'react';
import clsx from 'clsx';
import {
  ChevronUp,
  ChevronDown,
  Lock,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { ProposalSection } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionBuilderProps {
  /** Current ordered list of proposal sections. */
  sections: ProposalSection[];
  /** Callback when sections are reordered or toggled. */
  onChange: (sections: ProposalSection[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectionBuilder({ sections, onChange }: SectionBuilderProps) {
  // Sort by order for display
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  const handleToggle = useCallback(
    (key: string) => {
      const updated = sections.map((s) => {
        if (s.key === key && !s.required) {
          return { ...s, included: !s.included };
        }
        return s;
      });
      onChange(updated);
    },
    [sections, onChange],
  );

  const handleMoveUp = useCallback(
    (key: string) => {
      const idx = sorted.findIndex((s) => s.key === key);
      if (idx <= 0) return;

      // Swap order values with the section above
      const above = sorted[idx - 1];
      const current = sorted[idx];

      const updated = sections.map((s) => {
        if (s.key === current.key) return { ...s, order: above.order };
        if (s.key === above.key) return { ...s, order: current.order };
        return s;
      });
      onChange(updated);
    },
    [sections, sorted, onChange],
  );

  const handleMoveDown = useCallback(
    (key: string) => {
      const idx = sorted.findIndex((s) => s.key === key);
      if (idx < 0 || idx >= sorted.length - 1) return;

      // Swap order values with the section below
      const below = sorted[idx + 1];
      const current = sorted[idx];

      const updated = sections.map((s) => {
        if (s.key === current.key) return { ...s, order: below.order };
        if (s.key === below.key) return { ...s, order: current.order };
        return s;
      });
      onChange(updated);
    },
    [sections, sorted, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal-900">
          Proposal Sections
        </h3>
        <span className="text-xs text-charcoal-500">
          {sorted.filter((s) => s.included).length} of {sorted.length} included
        </span>
      </div>

      <ul className="space-y-1.5" role="list">
        {sorted.map((section, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === sorted.length - 1;

          return (
            <li
              key={section.key}
              className={clsx(
                'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                section.included
                  ? 'border-limestone-200 bg-white'
                  : 'border-limestone-100 bg-limestone-50 opacity-60',
                section.required && 'border-brand-100',
              )}
            >
              {/* Drag handle / order indicator */}
              <div className="shrink-0 text-charcoal-300">
                {section.required ? (
                  <Lock className="h-4 w-4 text-brand-400" />
                ) : (
                  <GripVertical className="h-4 w-4" />
                )}
              </div>

              {/* Section label */}
              <div className="flex-1 min-w-0">
                <span
                  className={clsx(
                    'text-sm',
                    section.included
                      ? 'font-medium text-charcoal-900'
                      : 'text-charcoal-500',
                  )}
                >
                  {section.label}
                </span>
                {section.required && (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                    Required
                  </span>
                )}
              </div>

              {/* Toggle switch */}
              {!section.required && (
                <button
                  type="button"
                  onClick={() => handleToggle(section.key)}
                  className={clsx(
                    'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                    section.included ? 'bg-brand-700' : 'bg-limestone-300',
                  )}
                  role="switch"
                  aria-checked={section.included}
                  aria-label={`${section.included ? 'Exclude' : 'Include'} ${section.label}`}
                >
                  <span
                    className={clsx(
                      'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                      section.included ? 'translate-x-[18px]' : 'translate-x-1',
                    )}
                  />
                </button>
              )}

              {/* Reorder buttons */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMoveUp(section.key)}
                  disabled={isFirst}
                  className={clsx(
                    'rounded p-1 transition-colors',
                    isFirst
                      ? 'text-charcoal-200 cursor-not-allowed'
                      : 'text-charcoal-400 hover:bg-limestone-100 hover:text-charcoal-700',
                  )}
                  aria-label={`Move ${section.label} up`}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(section.key)}
                  disabled={isLast}
                  className={clsx(
                    'rounded p-1 transition-colors',
                    isLast
                      ? 'text-charcoal-200 cursor-not-allowed'
                      : 'text-charcoal-400 hover:bg-limestone-100 hover:text-charcoal-700',
                  )}
                  aria-label={`Move ${section.label} down`}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

SectionBuilder.displayName = 'SectionBuilder';
