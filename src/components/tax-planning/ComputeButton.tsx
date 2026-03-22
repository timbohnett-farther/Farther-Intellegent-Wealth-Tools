'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { Calculator } from 'lucide-react';
import { Spinner } from '@/components/prism/atoms/Spinner';

export interface ComputeButtonProps {
  /** ID of the scenario to compute */
  scenarioId: string;
  /** Async callback to trigger computation */
  onCompute: (scenarioId: string) => Promise<void>;
  /** Whether the button is disabled */
  disabled?: boolean;
}

export const ComputeButton: React.FC<ComputeButtonProps> = ({
  scenarioId,
  onCompute,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (loading || disabled) return;
    setLoading(true);
    setError(null);
    try {
      await onCompute(scenarioId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Computation failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [loading, disabled, onCompute, scenarioId]);

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium transition-colors shadow-sm',
          'focus-visible:outline-hidden focus-visible:shadow-focus',
          'disabled:pointer-events-none disabled:opacity-45',
          'bg-brand-700 text-white hover:bg-brand-600 active:bg-brand-800'
        )}
      >
        {loading ? (
          <Spinner size="sm" className="text-white" />
        ) : (
          <Calculator className="h-4 w-4" />
        )}
        {loading ? 'Computing...' : 'Compute Scenario'}
      </button>

      {error && (
        <p className="mt-2 text-xs text-critical-500">{error}</p>
      )}
    </div>
  );
};

ComputeButton.displayName = 'ComputeButton';
