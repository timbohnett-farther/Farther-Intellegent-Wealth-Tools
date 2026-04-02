'use client';

import React, { useState } from 'react';
import type { FactorScore } from '@/lib/rollover-engine/types';

interface FactorCardProps {
  factorScore: FactorScore;
}

export function FactorCard({ factorScore }: FactorCardProps) {
  const [expanded, setExpanded] = useState(false);

  const directionColor =
    factorScore.direction === 'FAVOR_ROLLOVER' ? '#10b981' :
    factorScore.direction === 'FAVOR_STAY' ? '#f59e0b' :
    '#94a3b8';

  const directionLabel =
    factorScore.direction === 'FAVOR_ROLLOVER' ? 'Favors Rollover' :
    factorScore.direction === 'FAVOR_STAY' ? 'Favors Stay' :
    'Neutral';

  const label = factorScore.factor_name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className="rounded-lg border p-4 transition-shadow hover:shadow-sm"
      style={{
        background: 'var(--s-card-bg, #fff)',
        borderColor: 'var(--s-border-subtle)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-text">{label}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: directionColor }}
            />
            <span className="text-xs text-text-muted">{directionLabel}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: directionColor }}>
            {factorScore.score}
          </p>
          <p className="text-[10px] text-text-faint">
            weight: {Math.round(factorScore.weight * 100)}%
          </p>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--s-border-subtle)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${factorScore.score}%`,
            backgroundColor: directionColor,
          }}
        />
      </div>

      {/* Expandable rationale */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex w-full items-center gap-1 text-xs text-text-muted hover:text-text"
      >
        <svg
          className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {expanded ? 'Hide' : 'Show'} rationale
      </button>

      {expanded && (
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          {factorScore.rationale}
        </p>
      )}
    </div>
  );
}
