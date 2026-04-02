'use client';

import React from 'react';
import type { FactorScore } from '@/lib/rollover-engine/types';
import { FactorCard } from './FactorCard';

interface FactorBreakdownGridProps {
  factorScores: FactorScore[];
}

export function FactorBreakdownGrid({ factorScores }: FactorBreakdownGridProps) {
  // Sort by weighted score descending
  const sorted = [...factorScores].sort(
    (a, b) => b.weighted_score - a.weighted_score,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.map((fs) => (
        <FactorCard key={fs.factor_score_id} factorScore={fs} />
      ))}
    </div>
  );
}
