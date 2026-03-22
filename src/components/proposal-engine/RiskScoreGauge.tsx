'use client';

import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiskScoreGaugeProps {
  /** Risk score value (1-100). */
  score: number;
  /** Label displayed beneath the gauge. */
  label: string;
  /** Gauge size variant. */
  size?: 'sm' | 'md' | 'lg';
}

// ---------------------------------------------------------------------------
// Size configuration
// ---------------------------------------------------------------------------

interface SizeConfig {
  svgSize: number;
  radius: number;
  strokeWidth: number;
  scoreFontSize: string;
  labelFontSize: string;
}

const SIZE_CONFIG: Record<'sm' | 'md' | 'lg', SizeConfig> = {
  sm: {
    svgSize: 100,
    radius: 38,
    strokeWidth: 8,
    scoreFontSize: 'text-xl',
    labelFontSize: 'text-[10px]',
  },
  md: {
    svgSize: 140,
    radius: 54,
    strokeWidth: 10,
    scoreFontSize: 'text-2xl',
    labelFontSize: 'text-xs',
  },
  lg: {
    svgSize: 180,
    radius: 70,
    strokeWidth: 12,
    scoreFontSize: 'text-3xl',
    labelFontSize: 'text-sm',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a color for the given risk score (green -> yellow -> red). */
function getScoreColor(score: number): string {
  if (score <= 30) return '#16a34a'; // green / success
  if (score <= 50) return '#2563eb'; // blue / brand
  if (score <= 70) return '#eab308'; // yellow / warning
  return '#dc2626'; // red / critical
}

/** Returns the Tailwind text class for the score color. */
function getScoreTextClass(score: number): string {
  if (score <= 30) return 'text-success-700';
  if (score <= 50) return 'text-brand-700';
  if (score <= 70) return 'text-warning-700';
  return 'text-critical-700';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RiskScoreGauge({
  score,
  label,
  size = 'md',
}: RiskScoreGaugeProps) {
  const config = SIZE_CONFIG[size];
  const { svgSize, radius, strokeWidth } = config;

  // Semi-circle arc calculations
  const cx = svgSize / 2;
  const cy = svgSize / 2 + 8; // shift center down slightly so arc is top-heavy
  const circumference = Math.PI * radius; // half circle
  const normalizedScore = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (normalizedScore / 100) * circumference;

  // Arc start/end for a semi-circle (180 degrees, from left to right)
  const startX = cx - radius;
  const startY = cy;
  const endX = cx + radius;
  const endY = cy;

  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: svgSize, height: svgSize * 0.6 }}>
        <svg
          width={svgSize}
          height={svgSize * 0.65}
          viewBox={`0 0 ${svgSize} ${svgSize * 0.65}`}
          className="overflow-visible"
        >
          {/* Background track */}
          <path
            d={arcPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Colored progress arc */}
          <path
            d={arcPath}
            fill="none"
            stroke={getScoreColor(normalizedScore)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Score number centered in the arc */}
        <div
          className="absolute inset-0 flex items-end justify-center"
          style={{ paddingBottom: 4 }}
        >
          <span
            className={clsx(
              config.scoreFontSize,
              'font-bold tabular-nums',
              getScoreTextClass(normalizedScore),
            )}
          >
            {normalizedScore}
          </span>
        </div>
      </div>

      {/* Label */}
      <span
        className={clsx(
          config.labelFontSize,
          'mt-1 font-medium text-charcoal-500 text-center',
        )}
      >
        {label}
      </span>
    </div>
  );
}

RiskScoreGauge.displayName = 'RiskScoreGauge';
