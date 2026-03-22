'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  Holding,
  AssetClass,
  BroadAssetClass,
  RiskLabel,
  FartherRiskProfile,
  InvestmentModel,
  StressScenario,
  FeeAnalysis,
  TaxTransitionAnalysis,
  PortfolioAnalytics,
  QualityFlag,
  StressTestResult,
  QuestionnaireResponse,
} from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
type CaptureTab = 'ocr' | 'custodian' | 'manual';
type TemplateStyle = 'standard' | 'premium' | 'minimalist';

interface ProposalContext {
  proposalType: string;
  occasion: string;
  clientName: string;
  householdId: string;
  estimatedAssets: string;
  notes: string;
}

interface ProposalSection {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

interface RiskQuestion {
  id: string;
  text: string;
  options: Array<{ label: string; score: number }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIZARD_STEPS = [
  { num: 1, label: 'Context' },
  { num: 2, label: 'Portfolio' },
  { num: 3, label: 'Risk' },
  { num: 4, label: 'Model' },
  { num: 5, label: 'Analysis' },
  { num: 6, label: 'Generate' },
];

const PROPOSAL_TYPES = [
  { value: 'new_client', label: 'New Client', desc: 'First-time portfolio proposal' },
  { value: 'rebalance', label: 'Rebalance', desc: 'Rebalance existing portfolio' },
  { value: 'rollover', label: 'Rollover', desc: '401k/IRA rollover proposal' },
  { value: 'transfer', label: 'Transfer', desc: 'Account transfer proposal' },
];

const RISK_QUESTIONS: RiskQuestion[] = [
  { id: 'q1', text: 'How would you react if your portfolio dropped 20% in one month?', options: [
    { label: 'Sell everything immediately', score: 10 }, { label: 'Sell some holdings', score: 30 },
    { label: 'Hold steady and wait', score: 60 }, { label: 'Buy more at lower prices', score: 90 },
  ]},
  { id: 'q2', text: 'What is your primary investment goal?', options: [
    { label: 'Preserve capital', score: 15 }, { label: 'Generate income', score: 35 },
    { label: 'Balanced growth and income', score: 55 }, { label: 'Maximize long-term growth', score: 85 },
  ]},
  { id: 'q3', text: 'How long until you need to access these funds?', options: [
    { label: 'Less than 2 years', score: 10 }, { label: '2-5 years', score: 30 },
    { label: '5-10 years', score: 60 }, { label: '10+ years', score: 90 },
  ]},
  { id: 'q4', text: 'What percentage of your total net worth does this portfolio represent?', options: [
    { label: 'More than 75%', score: 15 }, { label: '50-75%', score: 35 },
    { label: '25-50%', score: 60 }, { label: 'Less than 25%', score: 85 },
  ]},
  { id: 'q5', text: 'How stable is your current income?', options: [
    { label: 'Very unstable / retired', score: 15 }, { label: 'Somewhat variable', score: 35 },
    { label: 'Stable with some variability', score: 60 }, { label: 'Very stable with growth potential', score: 85 },
  ]},
  { id: 'q6', text: 'How much investment experience do you have?', options: [
    { label: 'None', score: 10 }, { label: 'Some - basic accounts', score: 30 },
    { label: 'Moderate - diversified portfolio', score: 60 }, { label: 'Extensive - active investor', score: 85 },
  ]},
  { id: 'q7', text: 'Which best describes your feelings about investment risk?', options: [
    { label: 'I avoid risk entirely', score: 10 }, { label: 'I prefer minimal risk', score: 30 },
    { label: 'I accept moderate risk for better returns', score: 60 }, { label: 'I embrace risk for maximum returns', score: 90 },
  ]},
  { id: 'q8', text: 'In a diversified portfolio, what is the maximum annual loss you could tolerate?', options: [
    { label: '0-5% loss', score: 15 }, { label: '5-15% loss', score: 35 },
    { label: '15-25% loss', score: 60 }, { label: '25%+ loss is acceptable', score: 85 },
  ]},
];

const DEFAULT_SECTIONS: ProposalSection[] = [
  { id: 'cover', label: 'Cover Page', enabled: true, order: 0 },
  { id: 'executive', label: 'Executive Summary', enabled: true, order: 1 },
  { id: 'current', label: 'Current Portfolio Analysis', enabled: true, order: 2 },
  { id: 'risk', label: 'Risk Profile', enabled: true, order: 3 },
  { id: 'proposed', label: 'Proposed Portfolio', enabled: true, order: 4 },
  { id: 'comparison', label: 'Side-by-Side Comparison', enabled: true, order: 5 },
  { id: 'fees', label: 'Fee Analysis', enabled: true, order: 6 },
  { id: 'tax', label: 'Tax Transition Plan', enabled: true, order: 7 },
  { id: 'stress', label: 'Stress Testing', enabled: true, order: 8 },
  { id: 'ips', label: 'Investment Policy Statement', enabled: false, order: 9 },
  { id: 'disclosures', label: 'Disclosures', enabled: true, order: 10 },
];

const STRESS_SCENARIOS: Array<{ id: StressScenario; name: string }> = [
  { id: '2008_FINANCIAL_CRISIS', name: '2008 Financial Crisis' },
  { id: 'COVID_2020', name: 'COVID-19 Crash' },
  { id: '2022_RATE_SHOCK', name: '2022 Rate Shock' },
  { id: '2000_DOTCOM', name: 'Dot-Com Bust' },
  { id: 'RECESSION_MILD', name: 'Mild Recession' },
  { id: 'EQUITY_BEAR_50', name: '50% Equity Bear' },
];

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = (n: number) => (n * 100).toFixed(1) + '%';

function riskLabelFromScore(score: number): RiskLabel {
  if (score <= 20) return 'CONSERVATIVE';
  if (score <= 40) return 'MODERATELY_CONSERVATIVE';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'MODERATELY_AGGRESSIVE';
  return 'AGGRESSIVE';
}

// ---------------------------------------------------------------------------
// WizardProgress Component
// ---------------------------------------------------------------------------

function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, idx) => (
          <React.Fragment key={step.num}>
            {idx > 0 && (
              <div className={`flex-1 h-0.5 mx-2 ${step.num <= currentStep ? 'bg-teal-500' : 'bg-white/[0.06]'}`} />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step.num < currentStep ? 'bg-teal-500 text-white' :
                step.num === currentStep ? 'bg-teal-500 text-white ring-4 ring-teal-100' :
                'bg-white/[0.06] text-white/50'
              }`}>
                {step.num < currentStep ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : step.num}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step.num <= currentStep ? 'text-teal-300' : 'text-white/50'}`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Wizard Component
// ---------------------------------------------------------------------------

export default function CreateProposalWizardPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Wizard navigation --
  const [step, setStep] = useState<WizardStep>(1);

  // -- Step 1: Context --
  const [ctx, setCtx] = useState<ProposalContext>({
    proposalType: '', occasion: '', clientName: '',
    householdId: '', estimatedAssets: '', notes: '',
  });

  // -- Step 2: Portfolio capture --
  const [captureTab, setCaptureTab] = useState<CaptureTab>('ocr');
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [manualTicker, setManualTicker] = useState('');
  const [manualShares, setManualShares] = useState('');

  // -- Step 3: Risk --
  const [riskAnswers, setRiskAnswers] = useState<Record<string, number>>({});
  const [riskProfile, setRiskProfile] = useState<FartherRiskProfile | null>(null);

  // -- Step 4: Model selection --
  const [models, setModels] = useState<InvestmentModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<InvestmentModel | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  // -- Step 5: Analysis --
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [stressResults, setStressResults] = useState<StressTestResult[]>([]);
  const [feeAnalysis, setFeeAnalysis] = useState<FeeAnalysis | null>(null);
  const [taxTransition, setTaxTransition] = useState<TaxTransitionAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // -- Step 6: Generate --
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('standard');
  const [sections, setSections] = useState<ProposalSection[]>(DEFAULT_SECTIONS);
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalValue = holdings.reduce((s, h) => s + (h.marketValue as number), 0);
  const riskScore = Object.keys(riskAnswers).length > 0
    ? Math.round(Object.values(riskAnswers).reduce((s, v) => s + v, 0) / Object.values(riskAnswers).length)
    : 0;

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const authHeader = token ? 'Bearer ' + token : '';

  const handleScan = useCallback(async () => {
    if (!scanFile || !token) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', scanFile);
      const res = await fetch('/api/v1/scanner/scan', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: formData,
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      const scanned: Holding[] = data.holdings || [];
      setHoldings((prev) => [...prev, ...scanned]);
      addToast('Extracted ' + scanned.length + ' holdings', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Scan failed', 'error');
    } finally {
      setScanning(false);
    }
  }, [scanFile, token, addToast]);

  const addManualHolding = useCallback(() => {
    if (!manualTicker || !manualShares) {
      addToast('Enter ticker and shares', 'warning');
      return;
    }
    const newHolding: Holding = {
      ticker: manualTicker.toUpperCase(),
      cusip: null,
      description: manualTicker.toUpperCase(),
      assetClass: 'OTHER',
      quantity: parseFloat(manualShares),
      shares: parseFloat(manualShares),
      price: 0 as unknown as Holding['price'],
      marketValue: 0 as unknown as Holding['marketValue'],
      costBasis: null,
      unrealizedGain: null,
      gainPct: null,
      holdingPeriod: null,
      expenseRatio: null,
      dividendYield: null,
      accountType: 'TAXABLE',
      accountName: 'Manual Entry',
    };
    setHoldings((prev) => [...prev, newHolding]);
    setManualTicker('');
    setManualShares('');
    addToast('Added ' + newHolding.ticker, 'success');
  }, [manualTicker, manualShares, addToast]);

  const removeHolding = useCallback((idx: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const fetchModels = useCallback(async () => {
    if (!token) return;
    setLoadingModels(true);
    try {
      const res = await fetch('/api/v1/models', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await res.json();
      setModels(Array.isArray(data) ? data : []);
    } catch {
      addToast('Failed to load investment models', 'error');
    } finally {
      setLoadingModels(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    if (step === 4 && models.length === 0) fetchModels();
  }, [step, models.length, fetchModels]);

  const runAnalysis = useCallback(async () => {
    if (!token || !selectedModel) return;
    setLoadingAnalysis(true);
    try {
      const body = {
        currentHoldings: holdings,
        proposedModelId: selectedModel.modelId,
        riskScore,
      };
      const hdrs = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
      const [analyticsRes, stressRes, feeRes, taxRes] = await Promise.all([
        fetch('/api/v1/proposals/analytics', { method: 'POST', headers: hdrs, body: JSON.stringify(body) }),
        fetch('/api/v1/proposals/stress-test', { method: 'POST', headers: hdrs, body: JSON.stringify(body) }),
        fetch('/api/v1/proposals/fee-analysis', { method: 'POST', headers: hdrs, body: JSON.stringify(body) }),
        fetch('/api/v1/proposals/tax-transition', { method: 'POST', headers: hdrs, body: JSON.stringify(body) }),
      ]);
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (stressRes.ok) setStressResults(await stressRes.json());
      if (feeRes.ok) setFeeAnalysis(await feeRes.json());
      if (taxRes.ok) setTaxTransition(await taxRes.json());
      addToast('Analysis complete', 'success');
    } catch {
      addToast('Analysis failed', 'error');
    } finally {
      setLoadingAnalysis(false);
    }
  }, [token, selectedModel, holdings, riskScore, addToast]);

  useEffect(() => {
    if (step === 5 && !analytics && selectedModel) runAnalysis();
  }, [step, analytics, selectedModel, runAnalysis]);

  const handleGenerate = useCallback(async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const body = {
        clientName: ctx.clientName,
        householdId: ctx.householdId,
        proposalType: ctx.proposalType,
        occasion: ctx.occasion,
        notes: ctx.notes,
        currentHoldings: holdings,
        riskProfile,
        proposedModelId: selectedModel?.modelId,
        templateStyle,
        sections: sections.filter((s) => s.enabled).map((s) => s.id),
      };
      const res = await fetch('/api/v1/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setGeneratedUrl(data.pdfUrl || null);
      addToast('Proposal generated successfully!', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  }, [token, ctx, holdings, riskProfile, selectedModel, templateStyle, sections, addToast]);

  const handleSaveAsDraft = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        clientName: ctx.clientName,
        householdId: ctx.householdId,
        proposalType: ctx.proposalType,
        status: 'DRAFT',
        currentHoldings: holdings,
        riskProfile,
        proposedModelId: selectedModel?.modelId,
      };
      const res = await fetch('/api/v1/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save draft');
      const data = await res.json();
      addToast('Draft saved', 'success');
      router.push('/tax-planning/proposals/' + data.proposalId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }, [token, ctx, holdings, riskProfile, selectedModel, addToast, router]);

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!ctx.clientName && !!ctx.proposalType;
      case 2: return holdings.length > 0;
      case 3: return Object.keys(riskAnswers).length >= RISK_QUESTIONS.length;
      case 4: return !!selectedModel;
      case 5: return !!analytics;
      case 6: return true;
      default: return false;
    }
  };

  const goNext = () => { if (step < 6 && canProceed()) setStep((s) => (s + 1) as WizardStep); };
  const goBack = () => { if (step > 1) setStep((s) => (s - 1) as WizardStep); };

  const toggleSection = (id: string) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const filteredModels = models.filter((m) => {
    if (!modelSearch) return true;
    const q = modelSearch.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
  });

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Create Proposal</h1>
          <p className="mt-1 text-sm text-white/50">Build a comprehensive investment proposal in 6 steps.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAsDraft}
            disabled={saving || !ctx.clientName}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.10] px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.04] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/tax-planning/proposals')}
            className="text-sm font-medium text-white/50 hover:text-white/60"
          >
            Cancel
          </button>
        </div>
      </div>

      <WizardProgress currentStep={step} />

      {/* ================================================================= */}
      {/* Step 1: Context                                                    */}
      {/* ================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Proposal Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROPOSAL_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setCtx((c) => ({ ...c, proposalType: pt.value }))}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    ctx.proposalType === pt.value
                      ? 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-200'
                      : 'border-white/[0.06] hover:border-teal-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{pt.label}</p>
                  <p className="text-xs text-white/50 mt-0.5">{pt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Client Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={ctx.clientName}
                  onChange={(e) => setCtx((c) => ({ ...c, clientName: e.target.value }))}
                  placeholder="John & Jane Smith"
                  className="w-full rounded-sm border border-white/[0.10] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Household ID</label>
                <input
                  type="text"
                  value={ctx.householdId}
                  onChange={(e) => setCtx((c) => ({ ...c, householdId: e.target.value }))}
                  placeholder="HH-12345"
                  className="w-full rounded-sm border border-white/[0.10] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Estimated Assets</label>
                <input
                  type="text"
                  value={ctx.estimatedAssets}
                  onChange={(e) => setCtx((c) => ({ ...c, estimatedAssets: e.target.value }))}
                  placeholder="$1,500,000"
                  className="w-full rounded-sm border border-white/[0.10] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Occasion</label>
                <select
                  value={ctx.occasion}
                  onChange={(e) => setCtx((c) => ({ ...c, occasion: e.target.value }))}
                  className="w-full rounded-sm border border-white/[0.10] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Select occasion...</option>
                  <option value="INITIAL_MEETING">Initial Meeting</option>
                  <option value="ANNUAL_REVIEW">Annual Review</option>
                  <option value="LIFE_EVENT">Life Event</option>
                  <option value="CLIENT_REQUEST">Client Request</option>
                  <option value="PROACTIVE_OUTREACH">Proactive Outreach</option>
                  <option value="MARKET_CONDITIONS">Market Conditions</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-white/60 mb-1">Notes</label>
              <textarea
                value={ctx.notes}
                onChange={(e) => setCtx((c) => ({ ...c, notes: e.target.value }))}
                rows={3}
                placeholder="Additional context about this proposal..."
                className="w-full rounded-sm border border-white/[0.10] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 2: Portfolio Capture                                          */}
      {/* ================================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm">
            <div className="flex border-b border-white/[0.06]">
              {([['ocr', 'Scan Statement'], ['custodian', 'Custodian Feed'], ['manual', 'Manual Entry']] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCaptureTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    captureTab === tab
                      ? 'border-teal-500 text-teal-300'
                      : 'border-transparent text-white/50 hover:text-white/60'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* OCR Tab */}
              {captureTab === 'ocr' && (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) setScanFile(file);
                    }}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/[0.10] bg-transparent p-10 cursor-pointer hover:border-brand-400 hover:bg-teal-500/10/20 transition-colors"
                  >
                    <svg className="h-10 w-10 text-white/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm font-medium text-white/60">
                      {scanFile ? scanFile.name : 'Drop a brokerage statement here or click to browse'}
                    </p>
                    <p className="text-xs text-white/50 mt-1">PDF, PNG, or JPG up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setScanFile(file);
                      }}
                    />
                  </div>
                  {scanFile && (
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleScan}
                        disabled={scanning}
                        className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50"
                      >
                        {scanning ? (
                          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Scanning...</>
                        ) : 'Scan Statement'}
                      </button>
                      <button type="button" onClick={() => setScanFile(null)} className="text-sm text-white/50 hover:text-white/60">Clear</button>
                    </div>
                  )}
                </div>
              )}

              {/* Custodian Tab */}
              {captureTab === 'custodian' && (
                <div className="text-center py-10">
                  <svg className="mx-auto h-12 w-12 text-white/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-6.364-6.364L4.5 8.87" />
                  </svg>
                  <p className="text-sm font-medium text-white/60">Custodian integration coming soon</p>
                  <p className="text-xs text-white/50 mt-1">Schwab, Fidelity, and Pershing feeds will be available.</p>
                </div>
              )}

              {/* Manual Tab */}
              {captureTab === 'manual' && (
                <div>
                  <div className="flex items-end gap-3 mb-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-white/60 mb-1">Ticker</label>
                      <input
                        type="text"
                        value={manualTicker}
                        onChange={(e) => setManualTicker(e.target.value)}
                        placeholder="VTI"
                        className="w-full rounded-sm border border-white/[0.10] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-white/60 mb-1">Shares</label>
                      <input
                        type="number"
                        value={manualShares}
                        onChange={(e) => setManualShares(e.target.value)}
                        placeholder="100"
                        className="w-full rounded-sm border border-white/[0.10] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addManualHolding}
                      className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-400"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Holdings table */}
          {holdings.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">
                  Current Holdings ({holdings.length})
                </h3>
                <span className="text-sm font-medium text-white/60 tabular-nums">{fmt.format(totalValue / 100)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-limestone-200">
                  <thead className="bg-transparent">
                    <tr>
                      {['Ticker', 'Description', 'Asset Class', 'Qty', 'Market Value', ''].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase text-white/50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-limestone-100">
                    {holdings.map((h, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-2 text-sm font-medium text-white">{h.ticker || '--'}</td>
                        <td className="px-4 py-2 text-sm text-white/60 max-w-[180px] truncate">{h.description}</td>
                        <td className="px-4 py-2 text-xs text-white/50">{h.assetClass.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2 text-sm text-white/60 tabular-nums">{h.quantity.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-white/60 tabular-nums">{fmt.format((h.marketValue as number) / 100)}</td>
                        <td className="px-4 py-2">
                          <button type="button" onClick={() => removeHolding(idx)} className="text-xs text-critical-600 hover:text-critical-700">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 3: Risk Assessment                                            */}
      {/* ================================================================= */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Risk Assessment Questionnaire</h2>
              <div className="text-right">
                <p className="text-xs text-white/50">Progress</p>
                <p className="text-sm font-bold text-white">
                  {Object.keys(riskAnswers).length} / {RISK_QUESTIONS.length}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {RISK_QUESTIONS.map((q, qIdx) => (
                <div key={q.id} className="border-b border-limestone-100 pb-5 last:border-0">
                  <p className="text-sm font-medium text-white mb-3">
                    <span className="text-teal-300 mr-2">{qIdx + 1}.</span>
                    {q.text}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setRiskAnswers((prev) => ({ ...prev, [q.id]: opt.score }))}
                        className={`rounded-md border p-3 text-left text-sm transition-all ${
                          riskAnswers[q.id] === opt.score
                            ? 'border-teal-500 bg-teal-500/10 text-teal-300 font-medium'
                            : 'border-white/[0.06] text-white/60 hover:border-teal-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Score Summary */}
          {Object.keys(riskAnswers).length >= RISK_QUESTIONS.length && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white mb-4">Risk Profile Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/10">
                    <span className="text-2xl font-bold text-teal-300">{riskScore}</span>
                  </div>
                  <p className="text-xs text-white/50 mt-2">Behavioral Score</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white mt-4">
                    {riskLabelFromScore(riskScore).replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-white/50 mt-1">Risk Label</p>
                </div>
                <div className="text-center">
                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-white/[0.06]">
                      <div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: riskScore + '%' }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/30 mt-1">
                      <span>Conservative</span>
                      <span>Aggressive</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 4: Model Selection                                            */}
      {/* ================================================================= */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Select Investment Model</h2>
              <div className="relative w-64">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search models..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-full border border-white/[0.10] rounded-sm pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>

            {loadingModels ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] p-5 animate-pulse">
                    <div className="h-5 w-36 rounded bg-white/[0.06] mb-2" />
                    <div className="h-3 w-24 rounded bg-white/[0.06] mb-3" />
                    <div className="h-12 rounded bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="rounded-lg border border-white/[0.06] bg-transparent p-8 text-center">
                <p className="text-sm text-white/50">No models found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredModels.map((model) => (
                  <button
                    key={model.modelId}
                    type="button"
                    onClick={() => setSelectedModel(model)}
                    className={`rounded-lg border p-5 text-left transition-all ${
                      selectedModel?.modelId === model.modelId
                        ? 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-200'
                        : 'border-white/[0.06] hover:border-teal-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white">{model.name}</p>
                      {model.riskLabel && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-info-100 text-info-700">
                          {model.riskLabel.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 line-clamp-2 mb-3">{model.description}</p>
                    {model.targetAllocation && (
                      <div className="flex h-2 w-full overflow-hidden rounded-full mb-2">
                        <div className="bg-teal-500" style={{ width: model.targetAllocation.equity + '%' }} />
                        <div className="bg-info-500" style={{ width: model.targetAllocation.fixedIncome + '%' }} />
                        <div className="bg-warning-500" style={{ width: model.targetAllocation.alternatives + '%' }} />
                        <div className="bg-white/[0.10]" style={{ width: model.targetAllocation.cash + '%' }} />
                      </div>
                    )}
                    <div className="flex gap-4 text-xs text-white/50">
                      <span>Risk: {model.riskScore}</span>
                      {model.weightedExpenseRatio != null && <span>ER: {fmtPct(model.weightedExpenseRatio)}</span>}
                      {model.targetReturn != null && <span>Ret: {fmtPct(model.targetReturn)}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected model detail */}
          {selectedModel && (
            <div className="rounded-lg border border-brand-200 bg-teal-500/10 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white mb-2">Selected: {selectedModel.name}</h3>
              <p className="text-xs text-white/50 mb-4">{selectedModel.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-white/50">Risk Score</p>
                  <p className="text-sm font-bold text-white">{selectedModel.riskScore}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Expense Ratio</p>
                  <p className="text-sm font-bold text-white">{selectedModel.weightedExpenseRatio != null ? fmtPct(selectedModel.weightedExpenseRatio) : '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Category</p>
                  <p className="text-sm font-bold text-white">{selectedModel.category}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Tax Efficiency</p>
                  <p className="text-sm font-bold text-white">{selectedModel.taxEfficiency || '--'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 5: Analysis & Review                                          */}
      {/* ================================================================= */}
      {step === 5 && (
        <div className="space-y-6">
          {loadingAnalysis ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent mb-4" />
              <p className="text-sm font-medium text-white/60">Running portfolio analysis...</p>
              <p className="text-xs text-white/50 mt-1">Analyzing risk, fees, tax impact, and stress scenarios</p>
            </div>
          ) : (
            <>
              {/* Portfolio Analytics */}
              {analytics && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-white mb-4">Portfolio Comparison</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-white/50">Current Value</p>
                      <p className="text-sm font-bold text-white tabular-nums">{fmt.format(totalValue / 100)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Holdings Count</p>
                      <p className="text-sm font-bold text-white tabular-nums">{holdings.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Risk Score Match</p>
                      <p className="text-sm font-bold text-white tabular-nums">{riskScore} / {selectedModel?.riskScore || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Sharpe Ratio</p>
                      <p className="text-sm font-bold text-white tabular-nums">{analytics.sharpeRatio?.toFixed(2) ?? '--'}</p>
                    </div>
                  </div>
                  {analytics.maxDrawdown != null && (
                    <div className="mt-4 border-t border-white/[0.06] pt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Risk Metrics</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-white/50">Max Drawdown</p>
                          <p className="text-sm font-bold text-critical-700">{fmtPct(analytics.maxDrawdown)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50">Std. Deviation</p>
                          <p className="text-sm font-bold text-white">{fmtPct(analytics.standardDeviation)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50">Sortino Ratio</p>
                          <p className="text-sm font-bold text-white">{analytics.sortinoRatio?.toFixed(2) ?? '--'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50">VaR (95%)</p>
                          <p className="text-sm font-bold text-critical-700">{fmtPct(analytics.valueAtRisk95)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stress Test Results */}
              {stressResults.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-white mb-4">Stress Test Results</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-limestone-200">
                      <thead className="bg-transparent">
                        <tr>
                          {['Scenario', 'Portfolio Return', 'Benchmark Return', 'Max Drawdown'].map((h) => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase text-white/50">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-limestone-100">
                        {stressResults.map((sr) => (
                          <tr key={sr.scenario} className="hover:bg-white/[0.04]">
                            <td className="px-4 py-2 text-sm font-medium text-white">
                              {sr.scenarioLabel || STRESS_SCENARIOS.find((s) => s.id === sr.scenario)?.name || sr.scenario}
                            </td>
                            <td className="px-4 py-2 text-sm text-critical-700 tabular-nums">{fmtPct(sr.portfolioReturn)}</td>
                            <td className="px-4 py-2 text-sm text-white/60 tabular-nums">{fmtPct(sr.benchmarkReturn)}</td>
                            <td className="px-4 py-2">
                              <span className="text-xs font-medium text-critical-700">
                                {fmtPct(sr.maxDrawdown)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fee Analysis */}
              {feeAnalysis && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-white mb-4">Fee Comparison</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-transparent p-4 text-center">
                      <p className="text-xs text-white/50">Current Fees</p>
                      <p className="text-lg font-bold text-white tabular-nums">{fmt.format((feeAnalysis.current.totalDollars as number) / 100)}</p>
                      <p className="text-xs text-white/50">/year</p>
                    </div>
                    <div className="rounded-lg bg-teal-500/10 p-4 text-center">
                      <p className="text-xs text-white/50">Proposed Fees</p>
                      <p className="text-lg font-bold text-teal-300 tabular-nums">{fmt.format((feeAnalysis.proposed.totalDollars as number) / 100)}</p>
                      <p className="text-xs text-white/50">/year</p>
                    </div>
                    <div className="rounded-lg bg-success-50 p-4 text-center">
                      <p className="text-xs text-white/50">Annual Savings</p>
                      <p className="text-lg font-bold text-success-700 tabular-nums">{fmt.format((feeAnalysis.annualSavings as number) / 100)}</p>
                      <p className="text-xs text-white/50">/year</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tax Transition */}
              {taxTransition && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-white mb-4">Tax Transition Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-white/50">Unrealized Gains</p>
                      <p className="text-sm font-bold text-white tabular-nums">{taxTransition.totalUnrealizedGain != null ? fmt.format((taxTransition.totalUnrealizedGain as number) / 100) : '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Unrealized Losses</p>
                      <p className="text-sm font-bold text-success-700 tabular-nums">{taxTransition.totalUnrealizedLoss != null ? fmt.format((taxTransition.totalUnrealizedLoss as number) / 100) : '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Strategies Evaluated</p>
                      <p className="text-sm font-bold text-white tabular-nums">{taxTransition.strategies?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Recommended</p>
                      <p className="text-sm font-bold text-white">{taxTransition.recommendedStrategy || '--'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Re-run button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => { setAnalytics(null); setStressResults([]); setFeeAnalysis(null); setTaxTransition(null); runAnalysis(); }}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.10] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Re-run Analysis
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 6: Generate & Deliver                                         */}
      {/* ================================================================= */}
      {step === 6 && (
        <div className="space-y-6">
          {/* Template Style */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Proposal Template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { id: 'standard' as const, label: 'Standard', desc: 'Clean and professional layout' },
                { id: 'premium' as const, label: 'Premium', desc: 'Enhanced visuals and charts' },
                { id: 'minimalist' as const, label: 'Minimalist', desc: 'Focused, data-driven design' },
              ]).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateStyle(t.id)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    templateStyle === t.id
                      ? 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-200'
                      : 'border-white/[0.06] hover:border-teal-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{t.label}</p>
                  <p className="text-xs text-white/50 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Section Builder */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Proposal Sections</h2>
            <div className="space-y-2">
              {sections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <div
                    key={section.id}
                    className={`flex items-center justify-between rounded-md border p-3 transition-colors ${
                      section.enabled ? 'border-brand-200 bg-teal-500/10/30' : 'border-white/[0.06] bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-white/30 w-5 text-right">{section.order + 1}</span>
                      <span className={`text-sm font-medium ${section.enabled ? 'text-white' : 'text-white/30'}`}>
                        {section.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        section.enabled ? 'bg-teal-500' : 'bg-white/[0.10]'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        section.enabled ? 'translate-x-4' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Proposal Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-white/50">Client</p>
                <p className="text-sm font-bold text-white">{ctx.clientName || '--'}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Type</p>
                <p className="text-sm font-bold text-white">{PROPOSAL_TYPES.find((p) => p.value === ctx.proposalType)?.label || '--'}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Holdings</p>
                <p className="text-sm font-bold text-white tabular-nums">{holdings.length}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Model</p>
                <p className="text-sm font-bold text-white">{selectedModel?.name || '--'}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50"
              >
                {generating ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating...</>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Generate Proposal PDF
                  </>
                )}
              </button>
              {generatedUrl && (
                <>
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.10] px-4 py-3 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => addToast('Sending proposal to client...', 'info')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-success-700 px-4 py-3 text-sm font-medium text-white hover:bg-success-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Send to Client
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Bottom Navigation                                                  */}
      {/* ================================================================= */}
      <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.10] px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.04] disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <div className="text-xs text-white/50">
          Step {step} of {WIZARD_STEPS.length}
        </div>
        {step < 6 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50"
          >
            Next
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveAsDraft}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Finish & Save'}
          </button>
        )}
      </div>
    </div>
  );
}
