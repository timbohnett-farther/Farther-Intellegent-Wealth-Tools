'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { FartherRiskProfile, RiskLabel, QuestionnaireResponse } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface RiskQuestion {
  id: string;
  text: string;
  options: Array<{ label: string; score: number }>;
}

interface PastAssessment {
  assessmentId: string;
  clientName: string;
  compositeScore: number;
  riskLabel: RiskLabel;
  createdAt: string;
}

const RISK_QUESTIONS: RiskQuestion[] = [
  { id: 'q1', text: 'If your portfolio dropped 20% in one month, what would you do?', options: [
    { label: 'Sell everything immediately', score: 10 }, { label: 'Sell some holdings to reduce risk', score: 30 },
    { label: 'Hold and wait for recovery', score: 60 }, { label: 'Buy more at lower prices', score: 90 },
  ]},
  { id: 'q2', text: 'What is your primary investment goal?', options: [
    { label: 'Preserve my capital above all else', score: 15 }, { label: 'Generate steady income with minimal risk', score: 35 },
    { label: 'Balance growth and income', score: 55 }, { label: 'Maximize long-term growth', score: 85 },
  ]},
  { id: 'q3', text: 'How long do you plan to hold these investments?', options: [
    { label: 'Less than 3 years', score: 15 }, { label: '3 to 5 years', score: 35 },
    { label: '5 to 10 years', score: 60 }, { label: 'More than 10 years', score: 85 },
  ]},
  { id: 'q4', text: 'How would you describe your investment experience?', options: [
    { label: 'Beginner -- limited experience', score: 20 }, { label: 'Intermediate -- some experience', score: 45 },
    { label: 'Advanced -- significant experience', score: 70 }, { label: 'Expert -- professional-level knowledge', score: 90 },
  ]},
  { id: 'q5', text: 'What percentage of your total net worth does this investment represent?', options: [
    { label: 'More than 75% of my net worth', score: 20 }, { label: '50% to 75% of my net worth', score: 40 },
    { label: '25% to 50% of my net worth', score: 65 }, { label: 'Less than 25% of my net worth', score: 85 },
  ]},
  { id: 'q6', text: 'How stable is your current income?', options: [
    { label: 'Very unstable or no income', score: 15 }, { label: 'Somewhat variable', score: 35 },
    { label: 'Mostly stable', score: 60 }, { label: 'Very stable with growth potential', score: 85 },
  ]},
  { id: 'q7', text: 'Which scenario would you prefer for a $100,000 investment over one year?', options: [
    { label: 'Guaranteed $2,000 gain', score: 15 }, { label: '50% chance of $8,000 gain or $3,000 loss', score: 40 },
    { label: '50% chance of $15,000 gain or $8,000 loss', score: 65 }, { label: '50% chance of $30,000 gain or $15,000 loss', score: 90 },
  ]},
  { id: 'q8', text: 'In a diversified portfolio, what is the maximum annual loss you could tolerate?', options: [
    { label: '0-5% loss', score: 15 }, { label: '5-15% loss', score: 35 },
    { label: '15-25% loss', score: 60 }, { label: '25%+ loss is acceptable', score: 85 },
  ]},
];

const RISK_LABEL_COLORS: Record<RiskLabel, string> = {
  CONSERVATIVE: 'bg-info-100 text-info-700',
  MODERATELY_CONSERVATIVE: 'bg-info-100 text-info-700',
  MODERATE: 'bg-warning-100 text-warning-700',
  MODERATELY_AGGRESSIVE: 'bg-warning-100 text-warning-700',
  AGGRESSIVE: 'bg-critical-100 text-critical-700',
};

function getRiskLabel(score: number): RiskLabel {
  if (score <= 20) return 'CONSERVATIVE';
  if (score <= 40) return 'MODERATELY_CONSERVATIVE';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'MODERATELY_AGGRESSIVE';
  return 'AGGRESSIVE';
}

function getRecommendedAllocation(score: number) {
  if (score <= 20) return { equity: 20, fixedIncome: 60, alternatives: 5, cash: 15 };
  if (score <= 40) return { equity: 40, fixedIncome: 45, alternatives: 5, cash: 10 };
  if (score <= 60) return { equity: 60, fixedIncome: 30, alternatives: 5, cash: 5 };
  if (score <= 80) return { equity: 75, fixedIncome: 15, alternatives: 7, cash: 3 };
  return { equity: 90, fixedIncome: 5, alternatives: 3, cash: 2 };
}

// ---------------------------------------------------------------------------
// Risk Assessment Tool Page
// ---------------------------------------------------------------------------

export default function RiskAssessmentToolPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [clientSelector, setClientSelector] = useState('');
  const [answers, setAnswers] = useState<Record<string, { answer: string; score: number }>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pastAssessments, setPastAssessments] = useState<PastAssessment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch history
  useEffect(() => {
    if (!token) return;
    setLoadingHistory(true);
    fetch('/api/v1/risk-profiles', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPastAssessments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [token]);

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

  const handleComplete = useCallback(() => {
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
        body: JSON.stringify({ clientName: clientSelector, responses }),
      });
      if (!res.ok) throw new Error('Failed to save risk profile');
      addToast('Risk profile saved', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [token, answers, clientSelector, addToast]);

  const handleUseInProposal = useCallback(() => {
    router.push(`/tax-planning/proposals/new?riskScore=${computedScore}`);
  }, [router, computedScore]);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Risk Assessment</h1>
          <p className="mt-1 text-sm text-text-muted">Complete the questionnaire to determine a client&apos;s risk profile and recommended allocation.</p>
        </div>
        <div className="flex items-center gap-3">
          {isComplete && (
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-subtle">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Start Over
            </button>
          )}
          <Link href="/tax-planning/proposals" className="text-sm font-medium text-text-muted hover:text-text-muted">Back to Proposals</Link>
        </div>
      </div>

      {/* Client selector */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-text-muted mb-1">Client</label>
        <input
          type="text"
          value={clientSelector}
          onChange={(e) => setClientSelector(e.target.value)}
          placeholder="Enter client name or ID..."
          className="w-full max-w-md border border-border-subtle rounded-sm px-3 py-2 text-sm focus:ring-2 focus:ring-accent-primary/80"
        />
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-muted">Progress</span>
          <span className="text-sm font-semibold text-text tabular-nums">{answeredCount}/{totalQuestions} questions</span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-subtle">
          <div className="h-2 rounded-full bg-accent-primary transition-all" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Questionnaire */}
        <div className="lg:col-span-2 space-y-4">
          {!isComplete ? (
            <>
              {RISK_QUESTIONS.map((q, qi) => (
                <div key={q.id} className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
                  <p className="text-sm font-medium text-text mb-3">{qi + 1}. {q.text}</p>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id]?.answer === opt.label;
                      return (
                        <label
                          key={opt.label}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all ${
                            isSelected ? 'border-accent-primary bg-accent-primary/10' : 'border-border-subtle hover:border-border-subtle hover:bg-surface-subtle'
                          }`}
                        >
                          <input type="radio" name={q.id} checked={isSelected} onChange={() => handleAnswer(q.id, opt.label, opt.score)} className="sr-only" />
                          <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${isSelected ? 'border-accent-primary bg-accent-primary' : 'border-border-subtle'}`}>
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-text" />}
                          </div>
                          <span className={`text-sm ${isSelected ? 'text-accent-primarySoft font-medium' : 'text-text-muted'}`}>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={!allAnswered}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-text hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Assessment
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-semibold text-text">Assessment Results</h2>

              {/* 3D Risk Profile Display */}
              <div className="text-center">
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent-primary/10 mb-3">
                  <span className="text-3xl font-bold text-accent-primarySoft">{computedScore}</span>
                </div>
                <p className="text-lg font-semibold text-text">{riskLabel.replace(/_/g, ' ')}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-transparent p-4 text-center">
                  <p className="text-xs text-text-muted">Behavioral</p>
                  <p className="text-xl font-bold text-text">{computedScore}</p>
                </div>
                <div className="rounded-lg bg-transparent p-4 text-center">
                  <p className="text-xs text-text-muted">Capacity</p>
                  <p className="text-xl font-bold text-text">{Math.round(computedScore * 0.9)}</p>
                </div>
                <div className="rounded-lg bg-transparent p-4 text-center">
                  <p className="text-xs text-text-muted">Required Return</p>
                  <p className="text-xl font-bold text-text">{(4 + (computedScore / 100) * 6).toFixed(1)}%</p>
                </div>
              </div>

              {/* Allocation */}
              <div>
                <h3 className="text-sm font-semibold text-text-muted mb-3">Recommended Allocation</h3>
                <div className="flex h-6 w-full overflow-hidden rounded-full">
                  <div className="bg-accent-primary" style={{ width: `${allocation.equity}%` }} />
                  <div className="bg-info-500" style={{ width: `${allocation.fixedIncome}%` }} />
                  <div className="bg-warning-500" style={{ width: `${allocation.alternatives}%` }} />
                  <div className="bg-surface-strong" style={{ width: `${allocation.cash}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent-primary" />Equity {allocation.equity}%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-info-500" />Fixed Income {allocation.fixedIncome}%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning-500" />Alts {allocation.alternatives}%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-surface-strong" />Cash {allocation.cash}%</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-limestone-100">
                <button
                  type="button"
                  onClick={handleUseInProposal}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-medium text-text hover:bg-accent-primary/80"
                >
                  Use in Proposal
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-5 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-subtle disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button type="button" onClick={handleReset} className="text-sm font-medium text-text-muted hover:text-text-muted">Start Over</button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Live score */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm sticky top-4">
            <h3 className="text-sm font-semibold text-text mb-4">Risk Profile</h3>
            <div className="text-center mb-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent-primary/10">
                <span className="text-2xl font-bold text-accent-primarySoft">{computedScore}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${RISK_LABEL_COLORS[riskLabel]}`}>
                  {riskLabel.replace(/_/g, ' ')}
                </span>
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Questions Answered</span><span className="font-medium text-text tabular-nums">{answeredCount}/{totalQuestions}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-limestone-100">
              <p className="text-[10px] font-medium uppercase text-text-faint mb-2">Suggested Allocation</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                <div className="bg-accent-primary" style={{ width: `${allocation.equity}%` }} />
                <div className="bg-info-500" style={{ width: `${allocation.fixedIncome}%` }} />
                <div className="bg-warning-500" style={{ width: `${allocation.alternatives}%` }} />
                <div className="bg-surface-strong" style={{ width: `${allocation.cash}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                <div className="flex justify-between"><span className="text-text-faint">Equity</span><span className="font-semibold text-text-muted">{allocation.equity}%</span></div>
                <div className="flex justify-between"><span className="text-text-faint">Fixed Inc</span><span className="font-semibold text-text-muted">{allocation.fixedIncome}%</span></div>
                <div className="flex justify-between"><span className="text-text-faint">Alts</span><span className="font-semibold text-text-muted">{allocation.alternatives}%</span></div>
                <div className="flex justify-between"><span className="text-text-faint">Cash</span><span className="font-semibold text-text-muted">{allocation.cash}%</span></div>
              </div>
            </div>
          </div>

          {/* Past assessments */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-text mb-3">Past Assessments</h3>
            {loadingHistory ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-surface-subtle" />)}
              </div>
            ) : pastAssessments.length === 0 ? (
              <p className="text-xs text-text-muted">No past assessments found.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pastAssessments.map((a) => (
                  <div key={a.assessmentId} className="flex items-center justify-between rounded-md bg-transparent px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-text">{a.clientName}</p>
                      <p className="text-[10px] text-text-muted">{formatDate(a.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-text">{a.compositeScore}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${RISK_LABEL_COLORS[a.riskLabel]}`}>
                        {a.riskLabel.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
