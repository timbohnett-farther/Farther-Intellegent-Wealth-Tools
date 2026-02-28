'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProbabilityGaugeProps {
  /** Value between 0 and 100 */
  value: number;
  /** Optional label rendered below the value */
  label?: string;
  /** Visual size of the gauge */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE_CONFIG = {
  sm: { width: 80, strokeWidth: 6, fontSize: 14, labelSize: 9 },
  md: { width: 140, strokeWidth: 8, fontSize: 24, labelSize: 12 },
  lg: { width: 200, strokeWidth: 10, fontSize: 32, labelSize: 14 },
} as const;

/** Return a color based on the 0-100 value. */
function getColor(value: number): string {
  if (value >= 75) return '#10B981'; // green
  if (value >= 50) return '#F59E0B'; // yellow / amber
  return '#EF4444'; // red
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProbabilityGauge({
  value,
  label,
  size = 'md',
  className,
}: ProbabilityGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const cfg = SIZE_CONFIG[size];
  const radius = (cfg.width - cfg.strokeWidth) / 2;
  const cx = cfg.width / 2;
  const cy = cfg.width / 2;

  // Arc spans 180 degrees (half-circle from left to right, opening upwards)
  const startAngle = Math.PI; // left (180 deg)
  const endAngle = 0; // right (0 deg)
  const totalArc = Math.PI; // 180 degrees in radians
  const circumference = radius * totalArc;

  const valueAngle = startAngle - (clamped / 100) * totalArc;
  const color = getColor(clamped);

  // Arc path helper – draws from startAngle to the given angle
  const describeArc = (startA: number, endA: number): string => {
    const x1 = cx + radius * Math.cos(startA);
    const y1 = cy - radius * Math.sin(startA);
    const x2 = cx + radius * Math.cos(endA);
    const y2 = cy - radius * Math.sin(endA);
    const sweep = startA - endA > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${sweep} 1 ${x2} ${y2}`;
  };

  const bgPath = describeArc(startAngle, endAngle);
  const valuePath = clamped > 0 ? describeArc(startAngle, valueAngle) : '';

  return (
    <div className={clsx('inline-flex flex-col items-center', className)}>
      <svg
        width={cfg.width}
        height={cfg.width / 2 + cfg.strokeWidth}
        viewBox={`0 0 ${cfg.width} ${cfg.width / 2 + cfg.strokeWidth}`}
        aria-label={`${Math.round(clamped)}% probability`}
        role="img"
      >
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={cfg.strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc */}
        {clamped > 0 && (
          <path
            d={valuePath}
            fill="none"
            stroke={color}
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Value text */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="auto"
          fill={color}
          fontSize={cfg.fontSize}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
          className="tabular-nums"
        >
          {Math.round(clamped)}%
        </text>
      </svg>

      {label && (
        <span
          className="text-gray-500 font-medium -mt-1"
          style={{ fontSize: cfg.labelSize }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

ProbabilityGauge.displayName = 'ProbabilityGauge';
