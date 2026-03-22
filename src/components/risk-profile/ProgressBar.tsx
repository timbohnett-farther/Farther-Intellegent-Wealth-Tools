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
        <span className="text-xs font-medium text-white/50">Progress</span>
        <span className="text-xs font-semibold text-white">{pct}%</span>
      </div>
      <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-teal-500 to-brand-700 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-white/30 mt-1">
        {current} of {total} questions answered
      </p>
    </div>
  );
}
