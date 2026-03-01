'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  Proposal,
  CreateProposalRequest,
  StatementScanResult,
  Holding,
  FartherRiskProfile,
  InvestmentModel,
  ProposalSection,
  StressTestResult,
  FeeAnalysis,
  TaxTransitionAnalysis,
  PortfolioAnalytics,
  CurrentPortfolio,
  QuestionnaireResponse,
} from '@/lib/proposal-engine/types';
import { WizardProgress } from '@/components/proposal-engine/WizardProgress';
import { ContextForm } from '@/components/proposal-engine/ContextForm';
import { StatementUploader } from '@/components/proposal-engine/StatementUploader';
import { HoldingsReviewTable } from '@/components/proposal-engine/HoldingsReviewTable';
import { RiskScoreGauge } from '@/components/proposal-engine/RiskScoreGauge';
import { AllocationBar } from '@/components/proposal-engine/AllocationBar';
import { PortfolioSummary } from '@/components/proposal-engine/PortfolioSummary';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardState {
  step: number;
  completedSteps: number[];
  proposalId: string | null;
  context: Omit<CreateProposalRequest, 'clientId'> | null;
  scanResults: StatementScanResult[];
  holdings: Holding[];
  currentPortfolio: CurrentPortfolio | null;
  riskProfile: FartherRiskProfile | null;
  selectedModel: InvestmentModel | null;
  analytics: { current: PortfolioAnalytics | null; proposed: PortfolioAnalytics | null };
  taxTransition: TaxTransitionAnalysis | null;
  feeAnalysis: FeeAnalysis | null;
  stressTests: StressTestResult[];
  sections: ProposalSection[];
  complianceChecks: { ips: boolean; regBI: boolean };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_LABELS = [
  'Client & Context',
  'Portfolio Capture',
  'Risk Assessment',
  'Proposed Portfolio',
  'Analysis',
  'Generate',
];

const DEFAULT_SECTIONS: ProposalSection[] = [
  { key: 'cover', label: 'Cover Page', included: true, required: true, order: 1 },
  { key: 'executive_summary', label: 'Executive Summary', included: true, required: true, order: 2 },
  { key: 'client_profile', label: 'Client Profile', included: true, required: false, order: 3 },
  { key: 'current_portfolio', label: 'Current Portfolio', included: true, required: true, order: 4 },
  { key: 'risk_assessment', label: 'Risk Assessment', included: true, required: true, order: 5 },
  { key: 'proposed_portfolio', label: 'Proposed Portfolio', included: true, required: true, order: 6 },
  { key: 'comparison', label: 'Side-by-Side Comparison', included: true, required: false, order: 7 },
  { key: 'stress_tests', label: 'Stress Tests', included: true, required: false, order: 8 },
  { key: 'fee_analysis', label: 'Fee Analysis', included: true, required: false, order: 9 },
  { key: 'tax_transition', label: 'Tax Transition Plan', included: true, required: false, order: 10 },
  { key: 'ips', label: 'Investment Policy Statement', included: true, required: false, order: 11 },
  { key: 'reg_bi', label: 'Reg BI Disclosure', included: true, required: false, order: 12 },
  { key: 'appendix', label: 'Appendix', included: false, required: false, order: 13 },
];

const RISK_QUESTIONS = [
  {
    id: 'q1',
    text: 'If your portfolio dropped 20% in one month, what would you do?',
    options: [
      { label: 'Sell everything', score: 10 },
      { label: 'Sell some holdings', score: 30 },
      { label: 'Hold and wait', score: 60 },
      { label: 'Buy more', score: 90 },
    ],
  },
  {
    id: 'q2',
    text: 'What is your primary investment goal?',
    options: [
      { label: 'Preserve capital', score: 15 },
      { label: 'Generate income', score: 35 },
      { label: 'Balanced growth and income', score: 55 },
      { label: 'Aggressive growth', score: 85 },
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
    text: 'How would you describe your investment knowledge?',
    options: [
      { label: 'Beginner', score: 20 },
      { label: 'Intermediate', score: 45 },
      { label: 'Advanced', score: 70 },
      { label: 'Expert', score: 90 },
    ],
  },
  {
    id: 'q5',
    text: 'What percentage of your total net worth will this portfolio represent?',
    options: [
      { label: 'More than 75%', score: 20 },
      { label: '50% to 75%', score: 40 },
      { label: '25% to 50%', score: 65 },
      { label: 'Less than 25%', score: 85 },
    ],
  },
];

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function StepSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-48 rounded bg-limestone-200" />
      <div className="h-4 w-96 rounded bg-limestone-200" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-limestone-100" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Model Library
// ---------------------------------------------------------------------------

interface ModelCardProps {
  model: InvestmentModel;
  isSelected: boolean;
  onSelect: () => void;
}

function ModelCard({ model, isSelected, onSelect }: ModelCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border-2 p-5 text-left transition-all ${
        isSelected
          ? 'border-brand-700 bg-brand-50 shadow-sm shadow-brand-700/10'
          : 'border-limestone-200 bg-white hover:border-limestone-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className={`text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-charcoal-900'}`}>
            {model.name}
          </h4>
          <p className="mt-0.5 text-xs text-charcoal-500">{model.category} -- {model.vehicleType ?? 'Mixed'}</p>
        </div>
        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          isSelected ? 'border-brand-700 bg-brand-700' : 'border-limestone-300'
        }`}>
          {isSelected && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">Risk Score</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-charcoal-900">{model.riskScore}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">Target Return</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-charcoal-900">{fmtPct(model.targetReturn ?? 0)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">Expense Ratio</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-charcoal-900">{fmtPct(model.expenseRatio ?? 0)}</p>
        </div>
      </div>
      <div className="mt-3">
        <AllocationBar
          equity={(model.allocation ?? []).filter(a => a.assetClass.startsWith('EQUITY')).reduce((s, a) => s + (a.targetPct ?? 0), 0)}
          fixedIncome={(model.allocation ?? []).filter(a => a.assetClass.startsWith('FIXED_INCOME')).reduce((s, a) => s + (a.targetPct ?? 0), 0)}
          alternatives={(model.allocation ?? []).filter(a => ['REAL_ESTATE', 'COMMODITIES', 'GOLD', 'ALTERNATIVE_PE', 'ALTERNATIVE_HEDGE', 'ALTERNATIVE_PRIVATE_CREDIT'].includes(a.assetClass)).reduce((s, a) => s + (a.targetPct ?? 0), 0)}
          cash={(model.allocation ?? []).filter(a => a.assetClass === 'CASH_EQUIVALENT').reduce((s, a) => s + (a.targetPct ?? 0), 0)}
          height={20}
        />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Wizard Page
// ---------------------------------------------------------------------------

export default function NewProposalWizardPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<InvestmentModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const [wizard, setWizard] = useState<WizardState>({
    step: 1,
    completedSteps: [],
    proposalId: null,
    context: null,
    scanResults: [],
    holdings: [],
    currentPortfolio: null,
    riskProfile: null,
    selectedModel: null,
    analytics: { current: null, proposed: null },
    taxTransition: null,
    feeAnalysis: null,
    stressTests: [],
    sections: DEFAULT_SECTIONS,
    complianceChecks: { ips: false, regBI: false },
  });

  // Risk questionnaire state
  const [riskAnswers, setRiskAnswers] = useState<Record<string, { answer: string; score: number }>>({});

  // -- Template loading --
  useEffect(() => {
    if (!templateId || !token) return;
    setLoading(true);
    fetch(`/api/v1/proposals/templates/${templateId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load template');
        return res.json();
      })
      .then((template) => {
        setWizard((prev) => ({
          ...prev,
          sections: template.sections ?? prev.sections,
        }));
      })
      .catch(() => addToast('Could not load template', 'error'))
      .finally(() => setLoading(false));
  }, [templateId, token, addToast]);

  // -- Models loading --
  useEffect(() => {
    if (wizard.step !== 4 || models.length > 0 || !token) return;
    setModelsLoading(true);
    fetch('/api/v1/models', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch models');
        return res.json();
      })
      .then((data: InvestmentModel[]) => setModels(data))
      .catch(() => addToast('Could not load model library', 'error'))
      .finally(() => setModelsLoading(false));
  }, [wizard.step, models.length, token, addToast]);

  // -- Navigation --

  const goToStep = useCallback((step: number) => {
    setWizard((prev) => ({ ...prev, step }));
    setError(null);
  }, []);

  const completeStep = useCallback((step: number) => {
    setWizard((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step],
      step: Math.min(step + 1, 6),
    }));
    setError(null);
  }, []);

  const goBack = useCallback(() => {
    setWizard((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
    setError(null);
  }, []);

  // -- Step 1: Context --

  const handleContextSubmit = useCallback(
    async (data: Omit<CreateProposalRequest, 'clientId'>) => {
      if (!token) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/proposals', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create proposal');
        const proposal: Proposal = await res.json();
        setWizard((prev) => ({
          ...prev,
          proposalId: proposal.proposalId,
          context: data,
        }));
        completeStep(1);
        addToast('Proposal created', 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save context';
        setError(msg);
        addToast(msg, 'error');
      } finally {
        setSaving(false);
      }
    },
    [token, addToast, completeStep],
  );

  // -- Step 2: Portfolio Capture --

  const handleScanComplete = useCallback(
    async (results: StatementScanResult[]) => {
      const allHoldings = results.flatMap((r) => r.holdings);
      setWizard((prev) => ({
        ...prev,
        scanResults: results,
        holdings: allHoldings,
      }));
    },
    [],
  );

  const handleHoldingEdit = useCallback((index: number, updates: Partial<Holding>) => {
    setWizard((prev) => {
      const newHoldings = [...prev.holdings];
      newHoldings[index] = { ...newHoldings[index], ...updates };
      return { ...prev, holdings: newHoldings };
    });
  }, []);

  const handleHoldingRemove = useCallback((index: number) => {
    setWizard((prev) => ({
      ...prev,
      holdings: prev.holdings.filter((_, i) => i !== index),
    }));
  }, []);

  const handleHoldingAdd = useCallback(() => {
    setWizard((prev) => ({
      ...prev,
      holdings: [
        ...prev.holdings,
        {
          ticker: '',
          cusip: null,
          description: '',
          assetClass: 'OTHER',
          quantity: 0,
          price: 0 as any,
          marketValue: 0 as any,
          costBasis: null,
          unrealizedGain: null,
          gainPct: null,
          holdingPeriod: null,
          expenseRatio: null,
          dividendYield: null,
          accountType: 'TAXABLE',
          accountName: 'New Account',
        },
      ],
    }));
  }, []);

  const handlePortfolioConfirm = useCallback(async () => {
    if (!token || !wizard.proposalId) return;
    if (wizard.holdings.length === 0) {
      setError('Add at least one holding to continue');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/proposals/${wizard.proposalId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ wizardStep: 2, holdings: wizard.holdings }),
      });
      if (!res.ok) throw new Error('Failed to save portfolio');
      completeStep(2);
      addToast('Portfolio saved', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save portfolio';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [token, wizard.proposalId, wizard.holdings, addToast, completeStep]);

  // -- Step 3: Risk Assessment --

  const handleRiskAnswer = useCallback((questionId: string, answer: string, score: number) => {
    setRiskAnswers((prev) => ({ ...prev, [questionId]: { answer, score } }));
  }, []);

  const handleRiskSubmit = useCallback(async () => {
    if (!token || !wizard.proposalId) return;
    const answeredCount = Object.keys(riskAnswers).length;
    if (answeredCount < RISK_QUESTIONS.length) {
      setError(`Please answer all ${RISK_QUESTIONS.length} questions (${answeredCount} answered)`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const responses: QuestionnaireResponse[] = RISK_QUESTIONS.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: riskAnswers[q.id].answer,
        score: riskAnswers[q.id].score,
      }));
      const res = await fetch(`/api/v1/proposals/${wizard.proposalId}/risk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: wizard.proposalId, responses }),
      });
      if (!res.ok) throw new Error('Failed to save risk profile');
      const profile: FartherRiskProfile = await res.json();
      setWizard((prev) => ({ ...prev, riskProfile: profile }));
      completeStep(3);
      addToast('Risk profile saved', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit risk assessment';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [token, wizard.proposalId, riskAnswers, addToast, completeStep]);

  // -- Step 4: Model Selection --

  const handleModelSelect = useCallback((model: InvestmentModel) => {
    setWizard((prev) => ({ ...prev, selectedModel: model }));
  }, []);

  const handleModelConfirm = useCallback(async () => {
    if (!token || !wizard.proposalId || !wizard.selectedModel) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/proposals/${wizard.proposalId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ wizardStep: 4, proposedModelId: wizard.selectedModel.modelId }),
      });
      if (!res.ok) throw new Error('Failed to save model selection');
      completeStep(4);
      addToast('Model selected', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save model';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [token, wizard.proposalId, wizard.selectedModel, addToast, completeStep]);

  // -- Step 5: Analysis --

  const handleRunAnalysis = useCallback(async () => {
    if (!token || !wizard.proposalId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/proposals/${wizard.proposalId}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to run analysis');
      const data = await res.json();
      setWizard((prev) => ({
        ...prev,
        analytics: data.analytics ?? prev.analytics,
        taxTransition: data.taxTransition ?? prev.taxTransition,
        feeAnalysis: data.feeAnalysis ?? prev.feeAnalysis,
        stressTests: data.stressTests ?? prev.stressTests,
      }));
      completeStep(5);
      addToast('Analysis complete', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to run analysis';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [token, wizard.proposalId, addToast, completeStep]);

  // -- Step 6: Output --

  const handleSectionToggle = useCallback((key: string) => {
    setWizard((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.key === key && !s.required ? { ...s, included: !s.included } : s,
      ),
    }));
  }, []);

  const handleGenerateCompliance = useCallback(async (type: 'ips' | 'regBI') => {
    if (!token || !wizard.proposalId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/proposals/${wizard.proposalId}/compliance/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to generate ${type.toUpperCase()}`);
      setWizard((prev) => ({
        ...prev,
        complianceChecks: { ...prev.complianceChecks, [type]: true },
      }));
      addToast(`${type === 'ips' ? 'IPS' : 'Reg BI'} generated`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Compliance generation failed';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [token, wizard.proposalId, addToast]);

  const handleSendProposal = useCallback(async () => {
    if (!token || !wizard.proposalId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/proposals/${wizard.proposalId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: wizard.sections }),
      });
      if (!res.ok) throw new Error('Failed to send proposal');
      addToast('Proposal sent successfully', 'success');
      router.push(`/tax-planning/proposals/${wizard.proposalId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send proposal';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [token, wizard.proposalId, wizard.sections, addToast, router]);

  const handleDownloadProposal = useCallback(async () => {
    if (!token || !wizard.proposalId) return;
    try {
      const res = await fetch(`/api/v1/proposals/${wizard.proposalId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${wizard.proposalId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Proposal downloaded', 'success');
    } catch (err) {
      addToast('Failed to download proposal', 'error');
    }
  }, [token, wizard.proposalId, addToast]);

  // -- Computed risk score --
  const computedRiskScore = Object.values(riskAnswers).length > 0
    ? Math.round(Object.values(riskAnswers).reduce((sum, a) => sum + a.score, 0) / Object.values(riskAnswers).length)
    : 0;

  const getRiskLabel = (score: number): string => {
    if (score <= 20) return 'Conservative';
    if (score <= 40) return 'Moderately Conservative';
    if (score <= 60) return 'Moderate';
    if (score <= 80) return 'Moderately Aggressive';
    return 'Aggressive';
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="h-8 w-64 rounded bg-limestone-200 animate-pulse" />
        <StepSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">New Proposal</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Step {wizard.step} of 6 -- {STEP_LABELS[wizard.step - 1]}
          </p>
        </div>
        <Link
          href="/tax-planning/proposals"
          className="text-sm font-medium text-charcoal-500 hover:text-charcoal-700 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* Wizard Progress */}
      <div className="rounded-lg border border-limestone-200 bg-white px-6 py-4 shadow-sm">
        <WizardProgress
          currentStep={wizard.step}
          completedSteps={wizard.completedSteps}
          onStepClick={goToStep}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-critical-200 bg-critical-50 px-4 py-3">
          <p className="text-sm font-medium text-critical-700">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
        {/* ---- Step 1: Context ---- */}
        {wizard.step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-6">Client & Context</h2>
            <ContextForm
              initialData={wizard.context ? {
                clientName: wizard.context.clientName,
                proposalType: wizard.context.proposalType,
                occasion: wizard.context.occasion,
                assetsInScope: wizard.context.assetsInScope,
                relationshipTier: wizard.context.relationshipTier,
                notes: wizard.context.notes,
              } : undefined}
              onSubmit={handleContextSubmit}
            />
            {saving && (
              <div className="mt-4 flex items-center gap-2 text-sm text-charcoal-500">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating proposal...
              </div>
            )}
          </div>
        )}

        {/* ---- Step 2: Portfolio Capture ---- */}
        {wizard.step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-charcoal-900 mb-2">Portfolio Capture</h2>
              <p className="text-sm text-charcoal-500">Upload brokerage statements or enter holdings manually.</p>
            </div>

            <StatementUploader
              onScanComplete={handleScanComplete}
              existingScans={wizard.scanResults}
            />

            {wizard.holdings.length > 0 && (
              <HoldingsReviewTable
                holdings={wizard.holdings}
                onEdit={handleHoldingEdit}
                onRemove={handleHoldingRemove}
                onAdd={handleHoldingAdd}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-limestone-100">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-charcoal-600 hover:bg-limestone-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={handlePortfolioConfirm}
                disabled={saving || wizard.holdings.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Next'}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 3: Risk Assessment ---- */}
        {wizard.step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-charcoal-900 mb-2">Risk Assessment</h2>
              <p className="text-sm text-charcoal-500">Complete the questionnaire to determine the client's risk profile.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Questionnaire */}
              <div className="lg:col-span-2 space-y-6">
                {RISK_QUESTIONS.map((q, qi) => (
                  <div key={q.id} className="rounded-lg border border-limestone-200 bg-white p-5">
                    <p className="text-sm font-medium text-charcoal-900 mb-3">
                      {qi + 1}. {q.text}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const isSelected = riskAnswers[q.id]?.answer === opt.label;
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
                              onChange={() => handleRiskAnswer(q.id, opt.label, opt.score)}
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
              </div>

              {/* Risk Profile Preview */}
              <div className="space-y-4">
                <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm sticky top-4">
                  <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Risk Profile Preview</h3>
                  <div className="flex justify-center mb-4">
                    <RiskScoreGauge
                      score={computedRiskScore}
                      label={getRiskLabel(computedRiskScore)}
                      size="lg"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-charcoal-500">Questions Answered</span>
                      <span className="font-medium text-charcoal-900 tabular-nums">
                        {Object.keys(riskAnswers).length}/{RISK_QUESTIONS.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal-500">Behavioral Score</span>
                      <span className="font-medium text-charcoal-900 tabular-nums">{computedRiskScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-limestone-100">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-charcoal-600 hover:bg-limestone-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={handleRiskSubmit}
                disabled={saving || Object.keys(riskAnswers).length < RISK_QUESTIONS.length}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Next'}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 4: Proposed Portfolio ---- */}
        {wizard.step === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-charcoal-900 mb-2">Proposed Portfolio</h2>
              <p className="text-sm text-charcoal-500">Select a model portfolio for the client.</p>
            </div>

            {modelsLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-lg border border-limestone-200 bg-limestone-50 animate-pulse" />
                ))}
              </div>
            ) : models.length === 0 ? (
              <div className="rounded-lg border border-limestone-200 bg-white p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-charcoal-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm font-medium text-charcoal-700">No models available.</p>
                <p className="mt-1 text-sm text-charcoal-500">Contact your investment team to add model portfolios.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {models.map((model) => (
                  <ModelCard
                    key={model.modelId}
                    model={model}
                    isSelected={wizard.selectedModel?.modelId === model.modelId}
                    onSelect={() => handleModelSelect(model)}
                  />
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-limestone-100">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-charcoal-600 hover:bg-limestone-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={handleModelConfirm}
                disabled={saving || !wizard.selectedModel}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Next'}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 5: Analysis ---- */}
        {wizard.step === 5 && (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-charcoal-900 mb-2">Analysis</h2>
                <p className="text-sm text-charcoal-500">
                  Run the analytics engine to generate comparisons, stress tests, fee analysis, and tax transition plans.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Run Analysis
                  </>
                )}
              </button>
            </div>

            {/* Analysis Results Panels */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Side-by-Side Comparison */}
              <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Portfolio Comparison</h3>
                {wizard.analytics.current && wizard.analytics.proposed ? (
                  <div className="space-y-3">
                    {[
                      { label: 'Sharpe Ratio', current: wizard.analytics.current.sharpeRatio.toFixed(2), proposed: wizard.analytics.proposed.sharpeRatio.toFixed(2) },
                      { label: 'Max Drawdown', current: fmtPct(wizard.analytics.current.maxDrawdown), proposed: fmtPct(wizard.analytics.proposed.maxDrawdown) },
                      { label: 'Std Deviation', current: fmtPct(wizard.analytics.current.standardDeviation), proposed: fmtPct(wizard.analytics.proposed.standardDeviation) },
                      { label: 'Dividend Yield', current: fmtPct(wizard.analytics.current.dividendYield), proposed: fmtPct(wizard.analytics.proposed.dividendYield) },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-2 border-b border-limestone-100 last:border-0">
                        <span className="text-xs text-charcoal-500">{row.label}</span>
                        <div className="flex items-center gap-6">
                          <span className="text-xs font-medium text-charcoal-600 tabular-nums">{row.current}</span>
                          <span className="text-xs text-charcoal-300">vs</span>
                          <span className="text-xs font-semibold text-brand-700 tabular-nums">{row.proposed}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-charcoal-400">Run analysis to see comparison</p>
                  </div>
                )}
              </div>

              {/* Stress Tests */}
              <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Stress Tests</h3>
                {wizard.stressTests.length > 0 ? (
                  <div className="space-y-2">
                    {wizard.stressTests.map((test) => (
                      <div key={test.scenario} className="flex items-center justify-between py-2 border-b border-limestone-100 last:border-0">
                        <span className="text-xs text-charcoal-700">{test.scenarioLabel}</span>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs font-medium tabular-nums ${test.portfolioReturn < 0 ? 'text-critical-700' : 'text-success-700'}`}>
                            {fmtPct(test.portfolioReturn)}
                          </span>
                          <span className="text-[10px] text-charcoal-400">
                            {test.recoveryMonths}mo recovery
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-charcoal-400">Run analysis to see stress tests</p>
                  </div>
                )}
              </div>

              {/* Fee Analysis */}
              <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Fee Comparison</h3>
                {wizard.feeAnalysis ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-limestone-50 p-3 text-center">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">Current</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-charcoal-700">{fmtPct(wizard.feeAnalysis.current.totalRate)}</p>
                      </div>
                      <div className="rounded-lg bg-brand-50 p-3 text-center">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-brand-600">Proposed</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-brand-700">{fmtPct(wizard.feeAnalysis.proposed.totalRate)}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-center">
                      <p className="text-xs text-success-600">Estimated Annual Savings</p>
                      <p className="text-lg font-bold text-success-700 tabular-nums">{fmt.format((wizard.feeAnalysis.annualSavings as number) / 100)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-charcoal-400">Run analysis to see fee comparison</p>
                  </div>
                )}
              </div>

              {/* Tax Transition */}
              <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Tax Transition</h3>
                {wizard.taxTransition ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-limestone-50 p-3">
                      <p className="text-xs text-charcoal-500">Recommended Strategy</p>
                      <p className="mt-0.5 text-sm font-semibold text-charcoal-900">
                        {wizard.taxTransition.recommendedStrategy.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-1 text-xs text-charcoal-500">{wizard.taxTransition.recommendationRationale}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-[10px] font-medium uppercase text-charcoal-400">Unrealized Gains</p>
                        <p className="mt-0.5 text-sm font-bold text-success-700 tabular-nums">
                          {fmt.format((wizard.taxTransition.totalUnrealizedGain as number) / 100)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase text-charcoal-400">Unrealized Losses</p>
                        <p className="mt-0.5 text-sm font-bold text-critical-700 tabular-nums">
                          {fmt.format((wizard.taxTransition.totalUnrealizedLoss as number) / 100)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-charcoal-400">Run analysis to see tax transition</p>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-limestone-100">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-charcoal-600 hover:bg-limestone-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={() => completeStep(5)}
                disabled={!wizard.completedSteps.includes(5)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 6: Output ---- */}
        {wizard.step === 6 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-charcoal-900 mb-2">Generate & Send</h2>
              <p className="text-sm text-charcoal-500">
                Configure sections, run compliance checks, and deliver the proposal.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Sections Builder */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-semibold text-charcoal-900">Proposal Sections</h3>
                <div className="space-y-2">
                  {wizard.sections.map((section) => (
                    <div
                      key={section.key}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        section.included
                          ? 'border-limestone-200 bg-white'
                          : 'border-limestone-100 bg-limestone-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSectionToggle(section.key)}
                          disabled={section.required}
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                            section.included
                              ? 'border-brand-700 bg-brand-700'
                              : 'border-limestone-300 bg-white'
                          } ${section.required ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {section.included && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-sm ${section.included ? 'text-charcoal-900 font-medium' : 'text-charcoal-400'}`}>
                          {section.label}
                        </span>
                        {section.required && (
                          <span className="rounded bg-limestone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-charcoal-400">
                            Required
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-charcoal-300 tabular-nums">#{section.order}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance & Actions */}
              <div className="space-y-4">
                {/* Compliance Checks */}
                <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Compliance</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-charcoal-700">IPS Document</span>
                      {wizard.complianceChecks.ips ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Generated
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGenerateCompliance('ips')}
                          disabled={saving}
                          className="text-xs font-medium text-brand-700 hover:text-brand-600"
                        >
                          Generate
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-charcoal-700">Reg BI Disclosure</span>
                      {wizard.complianceChecks.regBI ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Generated
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGenerateCompliance('regBI')}
                          disabled={saving}
                          className="text-xs font-medium text-brand-700 hover:text-brand-600"
                        >
                          Generate
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Deliver</h3>
                  <button
                    type="button"
                    onClick={handleDownloadProposal}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-limestone-300 bg-white px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-limestone-50 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleSendProposal}
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    {saving ? 'Sending...' : 'Send to Client'}
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-limestone-100">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-charcoal-600 hover:bg-limestone-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
