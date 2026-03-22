'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WizardProgressProps {
  /** Current active step (1-6). */
  currentStep: number;
  /** Array of step numbers that have been completed. */
  completedSteps: number[];
  /** Callback when a step circle is clicked. */
  onStepClick: (step: number) => void;
}

// ---------------------------------------------------------------------------
// Step configuration
// ---------------------------------------------------------------------------

interface StepDef {
  number: number;
  label: string;
}

const STEPS: StepDef[] = [
  { number: 1, label: 'Client & Context' },
  { number: 2, label: 'Portfolio Capture' },
  { number: 3, label: 'Risk Assessment' },
  { number: 4, label: 'Proposed Portfolio' },
  { number: 5, label: 'Analysis' },
  { number: 6, label: 'Generate' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WizardProgress({
  currentStep,
  completedSteps,
  onStepClick,
}: WizardProgressProps) {
  return (
    <nav aria-label="Proposal wizard progress" className="w-full">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = step.number === currentStep;
          const isCompleted = completedSteps.includes(step.number);
          const isClickable = isCompleted || isActive;
          const isLast = idx === STEPS.length - 1;

          return (
            <li
              key={step.number}
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              {/* Step circle + label */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={cn(
                  'group flex flex-col items-center gap-1.5',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                )}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${step.number}: ${step.label}${isCompleted ? ' (completed)' : ''}${isActive ? ' (current)' : ''}`}
              >
                {/* Circle */}
                <div
                  className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-200',
                    isActive && 'border-teal-500 bg-teal-500 text-white shadow-md shadow-brand-700/20',
                    isCompleted && !isActive && 'border-success-500 bg-success-500 text-white',
                    !isActive && !isCompleted && 'border-white/[0.10] bg-white/[0.07] text-white/30',
                    isClickable && !isActive && 'group-hover:border-brand-400 group-hover:shadow-sm',
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <span className="text-sm font-semibold tabular-nums">
                      {step.number}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-[11px] font-medium leading-tight text-center max-w-[80px] transition-colors',
                    isActive && 'text-teal-300',
                    isCompleted && !isActive && 'text-white/60',
                    !isActive && !isCompleted && 'text-white/30',
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting line */}
              {!isLast && (
                <div className="mx-2 -mt-4.5 flex-1">
                  <div
                    className={cn(
                      'h-0.5 w-full rounded-full transition-colors duration-300',
                      isCompleted ? 'bg-success-500' : 'bg-white/[0.06]',
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

WizardProgress.displayName = 'WizardProgress';
