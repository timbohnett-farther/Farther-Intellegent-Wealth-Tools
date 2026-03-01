'use client';

import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversionFunnelProps {
  /** Number of proposals created. */
  created: number;
  /** Number of proposals sent. */
  sent: number;
  /** Number of proposals viewed. */
  viewed: number;
  /** Number of proposals accepted. */
  accepted: number;
}

// ---------------------------------------------------------------------------
// Stage config
// ---------------------------------------------------------------------------

interface FunnelStage {
  key: string;
  label: string;
  color: string;
  bgClass: string;
}

const STAGES: FunnelStage[] = [
  { key: 'created', label: 'Created', color: 'bg-charcoal-200', bgClass: 'bg-charcoal-50' },
  { key: 'sent', label: 'Sent', color: 'bg-brand-400', bgClass: 'bg-brand-50' },
  { key: 'viewed', label: 'Viewed', color: 'bg-warning-400', bgClass: 'bg-warning-50' },
  { key: 'accepted', label: 'Accepted', color: 'bg-success-500', bgClass: 'bg-success-50' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConversionFunnel({
  created,
  sent,
  viewed,
  accepted,
}: ConversionFunnelProps) {
  const values = [created, sent, viewed, accepted];
  const maxValue = Math.max(created, 1); // avoid division by zero

  // Calculate conversion rates between stages
  const rates = [
    null, // no rate for the first stage
    created > 0 ? (sent / created) * 100 : 0,
    sent > 0 ? (viewed / sent) * 100 : 0,
    viewed > 0 ? (accepted / viewed) * 100 : 0,
  ];

  return (
    <div className="w-full" role="img" aria-label="Proposal conversion funnel">
      <div className="space-y-1">
        {STAGES.map((stage, idx) => {
          const value = values[idx];
          const widthPct = Math.max((value / maxValue) * 100, 8); // min 8% for visibility
          const rate = rates[idx];

          return (
            <div key={stage.key}>
              {/* Conversion rate arrow between stages */}
              {rate !== null && (
                <div className="flex items-center justify-center py-0.5">
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="h-3 w-3 text-charcoal-300"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 2v8M3 7l3 3 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[11px] font-semibold tabular-nums text-charcoal-500">
                      {rate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Bar */}
              <div className="flex items-center gap-3">
                {/* Label */}
                <span className="w-20 shrink-0 text-right text-xs font-medium text-charcoal-600">
                  {stage.label}
                </span>

                {/* Bar container */}
                <div className="relative flex-1">
                  <div
                    className={clsx(
                      'flex items-center justify-center rounded-md transition-all duration-500',
                      stage.color,
                    )}
                    style={{
                      width: `${widthPct}%`,
                      height: '32px',
                      marginLeft: `${(100 - widthPct) / 2}%`, // center the bar
                    }}
                  >
                    <span className="text-xs font-bold tabular-nums text-white drop-shadow-sm">
                      {value.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Count on the right */}
                <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-charcoal-700">
                  {value.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall conversion */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-limestone-200 bg-limestone-50 px-4 py-2">
        <span className="text-xs font-medium text-charcoal-500">
          Overall Conversion
        </span>
        <span className="text-sm font-bold tabular-nums text-brand-700">
          {created > 0 ? ((accepted / created) * 100).toFixed(1) : '0.0'}%
        </span>
        <span className="text-xs text-charcoal-400">
          ({accepted} of {created})
        </span>
      </div>
    </div>
  );
}

ConversionFunnel.displayName = 'ConversionFunnel';
