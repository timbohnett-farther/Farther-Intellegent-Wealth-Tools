'use client';

import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-charcoal-500">Progress</span>
        <span className="text-xs font-semibold text-charcoal-900">{pct}%</span>
      </div>
      <div className="h-2 w-full bg-limestone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-700 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-charcoal-300 mt-1">
        {current} of {total} questions answered
      </p>
    </div>
  );
}
