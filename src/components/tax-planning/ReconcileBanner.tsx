'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ReconcileBannerProps {
  /** Number of fields with low confidence that need review */
  lowConfidenceCount: number;
  /** Callback when the user clicks to reconcile */
  onReconcile: () => void;
}

export const ReconcileBanner: React.FC<ReconcileBannerProps> = ({
  lowConfidenceCount,
  onReconcile,
}) => {
  if (lowConfidenceCount <= 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-warning-300 bg-warning-100 px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning-700" />
        <p className="text-sm font-medium text-warning-700">
          {lowConfidenceCount} {lowConfidenceCount === 1 ? 'field needs' : 'fields need'}{' '}
          review
        </p>
      </div>

      <button
        type="button"
        onClick={onReconcile}
        className="inline-flex items-center h-8 px-4 rounded-md bg-warning-700 text-white text-sm font-medium hover:bg-warning-800 transition-colors shadow-sm flex-shrink-0"
      >
        Review & Confirm
      </button>
    </div>
  );
};

ReconcileBanner.displayName = 'ReconcileBanner';
