'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  Dice5,
  SlidersHorizontal,
  CircleDot,
  LineChart,
} from 'lucide-react';
import type { QuestionnaireResponse, RISK_QUESTIONS } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiskQuestionnaireProps {
  /** The risk questions configuration array from RISK_QUESTIONS. */
  questions: typeof RISK_QUESTIONS;
  /** Callback when the questionnaire is completed with all responses. */
  onComplete: (responses: QuestionnaireResponse[]) => void;
  /** Pre-existing responses to restore progress. */
  existingResponses?: QuestionnaireResponse[];
}

type QuestionType = 'SLIDER' | 'SINGLE_CHOICE' | 'VISUAL_CHART' | 'INTERACTIVE_BAR' | 'GAMBLE';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeIcon(type: QuestionType) {
  switch (type) {
    case 'SLIDER':
      return SlidersHorizontal;
    case 'SINGLE_CHOICE':
      return CircleDot;
    case 'VISUAL_CHART':
      return LineChart;
    case 'INTERACTIVE_BAR':
      return BarChart3;
    case 'GAMBLE':
      return Dice5;
  }
}

/** Simulated bar chart heights for visual chart question type. */
const VISUAL_CHART_BARS: Record<string, number[]> = {
  A: [50, 52, 51, 53, 54, 55, 56, 57, 58, 60],
  B: [50, 48, 55, 52, 58, 56, 62, 60, 65, 68],
  C: [50, 42, 58, 48, 64, 55, 70, 62, 76, 82],
  D: [50, 35, 65, 40, 72, 50, 80, 55, 90, 100],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RiskQuestionnaire({
  questions,
  onComplete,
  existingResponses = [],
}: RiskQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<
    Map<string, { answer: string | number; score: number }>
  >(() => {
    const map = new Map<string, { answer: string | number; score: number }>();
    for (const r of existingResponses) {
      map.set(r.questionId, { answer: r.answer, score: r.score });
    }
    return map;
  });

  const totalQuestions = questions.length;
  const question = questions[currentStep];
  const currentResponse = responses.get(question.id);

  // ------- Score preview -------

  const currentTotalScore = useMemo(() => {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const q of questions) {
      const resp = responses.get(q.id);
      if (resp) {
        weightedSum += resp.score * q.weight;
        totalWeight += q.weight;
      }
    }
    if (totalWeight === 0) return 0;
    return Math.round(weightedSum / totalWeight);
  }, [questions, responses]);

  const answeredCount = responses.size;

  // ------- Handlers -------

  const handleAnswer = useCallback(
    (answer: string | number, score: number) => {
      setResponses((prev) => {
        const next = new Map(prev);
        next.set(question.id, { answer, score });
        return next;
      });
    },
    [question.id],
  );

  const handleSliderChange = useCallback(
    (value: number) => {
      handleAnswer(value, Math.round(value));
    },
    [handleAnswer],
  );

  const handleNext = useCallback(() => {
    if (currentStep < totalQuestions - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalQuestions]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    const finalResponses: QuestionnaireResponse[] = questions.map((q) => {
      const resp = responses.get(q.id);
      return {
        questionId: q.id,
        questionText: q.text,
        answer: resp?.answer ?? '',
        score: resp?.score ?? 0,
      };
    });
    onComplete(finalResponses);
  }, [questions, responses, onComplete]);

  const canProceed = currentResponse !== undefined;
  const isLast = currentStep === totalQuestions - 1;

  // ------- Render question types -------

  const renderChoiceOptions = () => {
    if (!question.options) return null;
    return (
      <div className="space-y-2">
        {question.options.map((opt) => {
          const isSelected = currentResponse?.answer === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => handleAnswer(opt.value, opt.score)}
              className={cn(
                'w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition-all',
                isSelected
                  ? 'border-accent-primary bg-accent-primary/5 text-text'
                  : 'border-border-subtle bg-surface-soft text-text-muted hover:border-accent-primarySoft hover:bg-surface-subtle',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    isSelected
                      ? 'border-accent-primary bg-accent-primary'
                      : 'border-border-subtle bg-text',
                  )}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-text" />
                  )}
                </div>
                <span className={cn(isSelected && 'font-medium')}>
                  {opt.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderVisualChart = () => {
    if (!question.options) return null;
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {question.options.map((opt) => {
          const isSelected = currentResponse?.answer === opt.value;
          const bars = VISUAL_CHART_BARS[String(opt.value)] ?? [];
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => handleAnswer(opt.value, opt.score)}
              className={cn(
                'flex flex-col items-center rounded-lg border-2 p-4 transition-all',
                isSelected
                  ? 'border-accent-primary bg-accent-primary/5 shadow-md'
                  : 'border-border-subtle bg-surface-soft hover:border-border-subtle',
              )}
            >
              <div className="flex items-end gap-0.5 h-20 mb-3">
                {bars.map((val, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 rounded-t-sm transition-all',
                      isSelected ? 'bg-brand-400' : 'bg-charcoal-200',
                    )}
                    style={{ height: `${val}%` }}
                  />
                ))}
              </div>
              <span
                className={cn(
                  'text-xs font-semibold text-center',
                  isSelected ? 'text-accent-primarySoft' : 'text-text-muted',
                )}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderInteractiveBar = () => {
    const currentValue = (currentResponse?.answer as number) ?? 50;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-medium text-text-muted">
          <span>Protect Wealth</span>
          <span>Grow Wealth</span>
        </div>
        <input
          type="range"
          min={question.minScore}
          max={question.maxScore}
          value={currentValue}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none bg-surface-subtle accent-brand-700 cursor-pointer"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-info-500" />
            <span className="text-xs text-text-muted">Stability</span>
          </div>
          <span className="text-lg font-bold tabular-nums text-accent-primarySoft">
            {currentValue}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-accent-primary" />
            <span className="text-xs text-text-muted">Growth</span>
          </div>
        </div>
      </div>
    );
  };

  const renderGamble = () => {
    if (!question.options) return null;
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((opt) => {
          const isSelected = currentResponse?.answer === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => handleAnswer(opt.value, opt.score)}
              className={cn(
                'flex flex-col items-center rounded-xl border-2 p-6 transition-all',
                isSelected
                  ? 'border-accent-primary bg-accent-primary/5 shadow-md'
                  : 'border-border-subtle bg-surface-soft hover:border-border-subtle',
              )}
            >
              <div
                className={cn(
                  'mb-3 flex h-14 w-14 items-center justify-center rounded-full',
                  isSelected ? 'bg-accent-primary/15' : 'bg-surface-subtle',
                )}
              >
                <Dice5
                  className={cn(
                    'h-6 w-6',
                    isSelected ? 'text-accent-primarySoft' : 'text-text-faint',
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-sm font-semibold text-center',
                  isSelected ? 'text-text' : 'text-text',
                )}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'SLIDER':
      case 'SINGLE_CHOICE':
        return renderChoiceOptions();
      case 'VISUAL_CHART':
        return renderVisualChart();
      case 'INTERACTIVE_BAR':
        return renderInteractiveBar();
      case 'GAMBLE':
        return renderGamble();
      default:
        return renderChoiceOptions();
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Question {currentStep + 1} of {totalQuestions}
          </span>
          <span>
            {answeredCount} of {totalQuestions} answered
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
          <div
            className="h-full rounded-full bg-accent-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}
          />
        </div>
        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                i === currentStep && 'bg-accent-primary',
                i !== currentStep && responses.has(q.id) && 'bg-accent-primary/40',
                i !== currentStep && !responses.has(q.id) && 'bg-surface-subtle',
              )}
              aria-label={`Go to question ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            {React.createElement(getTypeIcon(question.type), {
              className: 'h-4 w-4 text-accent-primarySoft',
            })}
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {question.type.replace(/_/g, ' ')}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-text leading-snug">
            {question.text}
          </h2>
        </div>

        {renderQuestionInput()}
      </div>

      {/* Score preview */}
      {answeredCount > 0 && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-border-subtle bg-transparent px-4 py-3">
          <BarChart3 className="h-4 w-4 text-text-faint" />
          <span className="text-xs text-text-muted">Preliminary Score:</span>
          <span className="text-lg font-bold tabular-nums text-accent-primarySoft">
            {currentTotalScore}
          </span>
          <span className="text-xs text-text-faint">/ 100</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
            currentStep === 0
              ? 'cursor-not-allowed text-text-faint'
              : 'text-text-muted hover:bg-surface-subtle',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={handleComplete}
            disabled={answeredCount < totalQuestions}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
              answeredCount >= totalQuestions
                ? 'bg-accent-primary text-text hover:bg-brand-400'
                : 'cursor-not-allowed bg-surface-subtle text-text-faint',
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Assessment
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
              canProceed
                ? 'bg-accent-primary text-text hover:bg-brand-400'
                : 'cursor-not-allowed bg-surface-subtle text-text-faint',
            )}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

RiskQuestionnaire.displayName = 'RiskQuestionnaire';
