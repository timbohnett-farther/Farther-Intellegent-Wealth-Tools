'use client';

import React from 'react';
import type { AnalysisStatus, RecommendationTier } from '@/lib/rollover-engine/types';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Draft' },
  DATA_COLLECTION: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Collecting' },
  SCRAPING: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Scraping' },
  SCORING: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Scoring' },
  NARRATIVE_GENERATION: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', label: 'Generating' },
  REVIEW: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'In Review' },
  APPROVED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Approved' },
  DELIVERED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Delivered' },
  ARCHIVED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', label: 'Archived' },
};

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  STRONG_ROLLOVER: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Strong Rollover' },
  MODERATE_ROLLOVER: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Moderate Rollover' },
  NEUTRAL: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Neutral' },
  MODERATE_STAY: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Moderate Stay' },
  STRONG_STAY: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Strong Stay' },
};

interface StatusBadgeProps {
  status: AnalysisStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

interface TierBadgeProps {
  tier: RecommendationTier;
}

export function TierBadge({ tier }: TierBadgeProps) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.NEUTRAL;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
