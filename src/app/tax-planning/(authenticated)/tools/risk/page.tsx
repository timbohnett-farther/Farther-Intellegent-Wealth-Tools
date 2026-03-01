'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { FartherRiskProfile, RiskLabel, QuestionnaireResponse } from '@/lib/proposal-engine/types';
import { RiskScoreGauge } from '@/components/proposal-engine/RiskScoreGauge';
import { AllocationBar } from '@/components/proposal-engine/AllocationBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RiskQuestion {
  id: string;
  text: string;
  options: { label: string; score: number }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: 'q1',
    text: 'If your portfolio dropped 20% in one month, what would you do?',
    options: [
      { label: 'Sell everything immediately', score: 10 },
      { label: 'Sell some holdings to reduce risk', score: 30 },
      { label: 'Hold and wait for recovery', score: 60 },
      { label: 'Buy more at lower prices', score: 90 },
    ],
  },
  {
    id: 'q2',
    text: 'What is your primary investment goal?',
    options: [
      { label: 'Preserve my capital above all else', score: 15 },
      { label: 'Generate steady income with minimal risk', score: 35 },
      { label: 'Balance growth and income', score: 55 },
      { label: 'Maximize long-term growth', score: 85 },
    ],
  },
  {
    id: 'q3',
    text: 'How long do you plan to hold these investments?',
    options: [
      { label: 'Less than 3 years', score: 15 },
      { label: '3 to 5 years', score: 35 },
      { label: '5 to 10 years', score: 60 },
      { label: 'More than 10 years', score: 85 },
    ],
  },
  {
    id: 'q4',
    text: 'How would you describe your investment experience?',
    options: [
      { label: 'Beginner -- limited experience', score: 20 },
      { label: 'Intermediate -- some experience', score: 45 },
      { label: 'Advanced -- significant experience', score: 70 },
      { label: 'Expert -- professional-level knowledge', score: 90 },
    ],
  },
  {
    id: 'q5',
    text: 'What percentage of your total net worth does this investment represent?',
    options: [
      { label: 'More than 75% of my net worth', score: 20 },
      { label: '50% to 75% of my net worth', score: 40 },
      { label: '25% to 50% of my net worth', score: 65 },
      { label: 'Less than 25% of my net worth', score: 85 },
    ],
  },
  {
    id: 'q6',
    text: 'How stable is your current income?',
    options: [
      { label: 'Very unstable or no income', score: 15 },
      { label: 'Somewhat variable', score: 35 },
      { label: 'Mostly stable', score: 60 },
      { label: 'Very stable with growth potential', score: 85 },
    ],
  },
  {
    id: 'q7',
    text: 'Which scenario would you prefer for a $100,000 investment over one year?',
    options: [
      { label: 'Guaranteed $2,000 gain', score: 15 },
      { label: '50% chance of $8,000 gain or $3,000 loss', score: 40 },
      { label: '50% chance of $15,000 gain or $8,000 loss', score: 65 },
      { label: '50% chance of $30,000 gain or $15,000 loss', score: 90 },
    ],
  },
];

const getRiskLabel = (score: number): RiskLabel => {
  if (score <= 20) return 'CONSERVATIVE';
  if (score <= 40) return 'MODERATELY_CONSERVATIVE';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'MODERATELY_AGGRESSIVE';
  return 'AGGRESSIVE';
};

const getRiskLabelDisplay = (label: RiskLabel): string => label.replace(/_/g, ' ');

const getRecommendedAllocation = (score: number) => {
  if (score <= 20) return { equity: 20, fixedIncome: 60, alternatives: 5, cash: 15 };
  if (score <= 40) return { equity: 40, fixedIncome: 45, alternatives: 5, cash: 10 };
  if (score <= 60) return { equity: 60, fixedIncome: 30, alternatives: 5, cash: 5 };
  if (score <= 80) return { equity: 75, fixedIncome: 15, alternatives: 7, cash: 3 };
  return { equity: 90, fixedIncome: 5, alternatives: 3, cash: 2 };
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function RiskAssessmentToolPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<string, { answer: string; score: number }>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAnswer = useCallback((questionId: string, answer: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { answer, score } }));
  }, []);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = RISK_QUESTIONS.length;
  const allAnswered = answeredCount === totalQuestions;

  const computedScore = answeredCount > 0
    ? Math.round(Object.values(answers).reduce((sum, a) => sum + a.score, 0) / answeredCount)
    : 0;

  const riskLabel = getRiskLabel(computedScore);
  const allocation = getRecommendedAllocation(computedScore);

  const handleComplete = useCallback(async () => {
    if (!allAnswered) {
      addToast(`Please answer all ${totalQuestions} questions`, 'error');
      return;
    }
    setIsComplete(true);
    addToast('Risk assessment complete', 'success');
  }, [allAnswered, totalQuestions, addToast]);

  const handleReset = useCallback(() => {
    setAnswers({});
    setIsComplete(false);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const responses: QuestionnaireResponse[] = RISK_QUESTIONS.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: answers[q.id]?.answer ?? '',
        score: answers[q.id]?.score ?? 0,
      }));
      const res = await fetch('/api/v1/risk-profiles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });
      if (!res.ok) throw new Error('Failed to save risk profile');
      addToast('Risk profile saved', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [token, answers, addToast]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Risk Assessment</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Complete the questionnaire to determine a client's risk profile and recommended allocation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isComplete && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-limestone-300 bg-white px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-limestone-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Start Over
            </button>
          )}
          <Link
            href="/tax-planning/proposals"
            className="text-sm font-medium text-charcoal-500 hover:text-charcoal-700 transition-colors"
          >
            Back to Proposals
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-charcoal-700">Progress</span>
          <span className="text-sm font-semibold text-charcoal-900 tabular-nums">
            {answeredCount}/{totalQuestions} questions
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-limestone-100">
          <div
            className="h-2 rounded-full bg-brand-700 transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Questionnaire */}
        <div className="lg:col-span-2 space-y-4">
          {!isComplete ? (
            <>
              {RISK_QUESTIONS.map((q, qi) => (
                <div key={q.id} className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-charcoal-900 mb-3">
                    {qi + 1}. {q.text}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id]?.answer === opt.label;
                      return (
                        <label
                          key={opt.label}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-brand-700 bg-brand-50'
                              : 'border-limestone-200 hover:border-limestone-300 hover:bg-limestone-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={isSelected}
                            onChange={() => handleAnswer(q.id, opt.label, opt.score)}
                            className="sr-only"
                          />
                          <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                            isSelected ? 'border-brand-700 bg-brand-700' : 'border-limestone-300'
                          }`}>
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <span className={`text-sm ${isSelected ? 'text-brand-700 font-medium' : 'text-charcoal-700'}`}>
                            {opt.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={!allAnswered}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Complete Assessment
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            /* Results */
            <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-semibold text-charcoal-900">Assessment Results</h2>

              {/* Recommended Allocation */}
              <div>
                <h3 className="text-sm font-semibold text-charcoal-700 mb-3">Recommended Allocation</h3>
                <AllocationBar
                  equity={allocation.equity}
                  fixedIncome={allocation.fixedIncome}
                  alternatives={allocation.alternatives}
                  cash={allocation.cash}
                  showLabels
                  height={36}
                />
              </div>

              {/* Question Summary */}
              <div>
                <h3 className="text-sm font-semibold text-charcoal-700 mb-3">Response Summary</h3>
                <div className="space-y-2">
                  {RISK_QUESTIONS.map((q, qi) => {
                    const answer = answers[q.id];
                    return (
                      <div key={q.id} className="flex items-start justify-between rounded-lg border border-limestone-100 bg-limestone-50 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-charcoal-500">{qi + 1}. {q.text}</p>
                          <p className="mt-0.5 text-sm font-medium text-charcoal-900">{answer?.answer}</p>
                        </div>
                        <span className="ml-3 rounded bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 tabular-nums">
                          {answer?.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-limestone-100">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Risk Profile'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-lg border border-limestone-300 bg-white px-5 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-limestone-50 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Live Risk Profile */}
        <div className="space-y-4">
          <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm sticky top-4">
            <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Risk Profile</h3>
            <div className="flex justify-center mb-4">
              <RiskScoreGauge
                score={computedScore}
                label={getRiskLabelDisplay(riskLabel)}
                size="lg"
              />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-limestone-100 pb-2">
                <span className="text-charcoal-500">Risk Label</span>
                <span className="font-medium text-charcoal-900">{getRiskLabelDisplay(riskLabel)}</span>
              </div>
              <div className="flex justify-between border-b border-limestone-100 pb-2">
                <span className="text-charcoal-500">Composite Score</span>
                <span className="font-bold text-charcoal-900 tabular-nums">{computedScore}</span>
              </div>
              <div className="flex justify-between border-b border-limestone-100 pb-2">
                <span className="text-charcoal-500">Questions Answered</span>
                <span className="font-medium text-charcoal-900 tabular-nums">{answeredCount}/{totalQuestions}</span>
              </div>
            </div>

            {/* Quick allocation preview */}
            <div className="mt-4 pt-4 border-t border-limestone-100">
              <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400 mb-2">
                Suggested Allocation
              </p>
              <AllocationBar
                equity={allocation.equity}
                fixedIncome={allocation.fixedIncome}
                alternatives={allocation.alternatives}
                cash={allocation.cash}
                height={20}
              />
              <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Equity</span>
                  <span className="font-semibold text-charcoal-700 tabular-nums">{allocation.equity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Fixed Inc</span>
                  <span className="font-semibold text-charcoal-700 tabular-nums">{allocation.fixedIncome}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Alts</span>
                  <span className="font-semibold text-charcoal-700 tabular-nums">{allocation.alternatives}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Cash</span>
                  <span className="font-semibold text-charcoal-700 tabular-nums">{allocation.cash}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
