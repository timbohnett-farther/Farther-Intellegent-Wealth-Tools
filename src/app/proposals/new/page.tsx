'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { WizardProgress } from '@/components/proposal-engine/WizardProgress';
import { ContextForm } from '@/components/proposal-engine/ContextForm';
import type { ContextFormData } from '@/components/proposal-engine/ContextForm';
import { StatementUploader } from '@/components/proposal-engine/StatementUploader';
import { RiskQuestionnaire } from '@/components/proposal-engine/RiskQuestionnaire';
import { ModelLibrary } from '@/components/proposal-engine/ModelLibrary';
import type {
  StatementScanResult,
  QuestionnaireResponse,
  InvestmentModel,
} from '@/lib/proposal-engine/types';
import { RISK_QUESTIONS } from '@/lib/proposal-engine/types';
import { getAllModels } from '@/lib/proposal-engine/model-library';

const WIZARD_STEPS = [
  { label: 'Context', description: 'Client & occasion' },
  { label: 'Portfolio', description: 'Statement scan' },
  { label: 'Risk Profile', description: 'Assessment' },
  { label: 'Model', description: 'Select portfolio' },
  { label: 'Analysis', description: 'Side-by-side' },
  { label: 'Output', description: 'Review & send' },
];

export default function NewProposalPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Step 1: Context
  const handleContextSubmit = async (data: ContextFormData) => {
    setCreating(true);
    try {
      const res = await fetch('/api/v1/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const proposal = await res.json();
        setProposalId(proposal.proposalId);
        setStep(2);
      }
    } catch (err) {
      console.error('Failed to create proposal:', err);
    } finally {
      setCreating(false);
    }
  };

  // Step 2: Statement scan complete
  const handleScanComplete = (results: StatementScanResult[]) => {
    setStep(3);
  };

  // Step 3: Risk questionnaire complete
  const handleRiskComplete = (responses: QuestionnaireResponse[]) => {
    setStep(4);
  };

  // Step 4: Model selected
  const handleModelSelect = (model: InvestmentModel) => {
    setStep(5);
  };

  return (
    <div className="min-h-screen bg-surface-base p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.push('/proposals')}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-subtle transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text">New Proposal</h1>
            <p className="text-sm text-text-muted">
              Step {step} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step - 1].label}
            </p>
          </div>
        </div>

        {/* Progress */}
        <WizardProgress
          currentStep={step}
          completedSteps={Array.from({ length: step - 1 }, (_, i) => i + 1)}
          onStepClick={(s) => { if (s < step) setStep(s); }}
        />

        {/* Step content */}
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
          {step === 1 && (
            <ContextForm
              onSubmit={handleContextSubmit}
            />
          )}

          {step === 2 && (
            <StatementUploader
              onScanComplete={handleScanComplete}
            />
          )}

          {step === 3 && (
            <RiskQuestionnaire
              questions={RISK_QUESTIONS}
              onComplete={handleRiskComplete}
            />
          )}

          {step === 4 && (
            <ModelLibrary
              models={getAllModels()}
              onSelect={(modelId) => setStep(5)}
            />
          )}

          {step === 5 && (
            <div className="space-y-4 text-center py-8">
              <h3 className="text-lg font-semibold text-text">Analysis Ready</h3>
              <p className="text-sm text-text-muted">
                Computing side-by-side comparison, fee analysis, and AI narrative...
              </p>
              <button
                onClick={() => setStep(6)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-400 transition-colors"
              >
                Generate Analysis
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 6 && proposalId && (
            <div className="space-y-4 text-center py-8">
              <Check className="mx-auto h-12 w-12 text-success-600" />
              <h3 className="text-lg font-semibold text-text">Proposal Ready</h3>
              <p className="text-sm text-text-muted">
                Your proposal has been generated and is ready for review.
              </p>
              <button
                onClick={() => router.push(`/proposals/${proposalId}`)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-400 transition-colors"
              >
                View Proposal
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
