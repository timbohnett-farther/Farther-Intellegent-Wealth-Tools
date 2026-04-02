'use client';

import React from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#10b981' :
    score >= 61 ? '#34d399' :
    score >= 40 ? '#94a3b8' :
    score >= 21 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        {/* Background arc */}
        <path
          d={describeArc(size / 2, size * 0.6, radius, 180, 360)}
          fill="none"
          stroke="var(--s-border-subtle, #e2e8f0)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={describeArc(size / 2, size * 0.6, radius, 180, 180 + (score / 100) * 180)}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size * 0.55}
          textAnchor="middle"
          className="text-3xl font-bold"
          fill="var(--s-text, #1e293b)"
        >
          {score}
        </text>
        <text
          x={size / 2}
          y={size * 0.55 + 16}
          textAnchor="middle"
          className="text-xs"
          fill="var(--s-text-muted, #64748b)"
        >
          / 100
        </text>
      </svg>
    </div>
  );
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}
