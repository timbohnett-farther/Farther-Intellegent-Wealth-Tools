'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlanSearchInput } from '@/components/rollover/PlanSearchInput';
import StatementUploader from '@/components/rollover/StatementUploader';
import type { PlanSearchResult, NarrativeTemplate } from '@/lib/rollover-engine/types';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const STEPS = ['Select Plan', 'Client Details', 'Account Info', 'Review & Create'];

export function NewAnalysisClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [selectedPlan, setSelectedPlan] = useState<PlanSearchResult | null>(null);
  const [clientName, setClientName] = useState('');
  const [householdId, setHouseholdId] = useState('hh-001');
  const [balanceDollars, setBalanceDollars] = useState('');
  const [age, setAge] = useState('');
  const [yearsOfService, setYearsOfService] = useState('');
  const [retirementAge, setRetirementAge] = useState('65');
  const [state, setState] = useState('');
  const [hasLoan, setHasLoan] = useState(false);
  const [loanDollars, setLoanDollars] = useState('');
  const [hasStock, setHasStock] = useState(false);
  const [stockBasisDollars, setStockBasisDollars] = useState('');
  const [template, setTemplate] = useState<NarrativeTemplate>('STANDARD');
  const [notes, setNotes] = useState('');
  const [showStatementUpload, setShowStatementUpload] = useState(false);

  // Pre-select plan from URL param
  useEffect(() => {
    const planId = searchParams.get('plan_id');
    if (planId) {
      fetch(`/api/v1/rollover/plans/search?q=${planId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.plans?.length > 0) {
            setSelectedPlan(data.plans[0]);
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function handleSubmit() {
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/rollover/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          household_id: householdId,
          client_name: clientName,
          plan_id: selectedPlan?.plan_id,
          plan_ein: selectedPlan?.ein,
          plan_name: selectedPlan?.plan_name,
          participant_balance_cents: Math.round(parseFloat(balanceDollars || '0') * 100),
          participant_age: parseInt(age || '0', 10),
          years_of_service: parseInt(yearsOfService || '0', 10),
          retirement_target_age: parseInt(retirementAge || '65', 10),
          state_of_residence: state,
          has_outstanding_loan: hasLoan,
          outstanding_loan_cents: hasLoan ? Math.round(parseFloat(loanDollars || '0') * 100) : 0,
          has_employer_stock: hasStock,
          employer_stock_cost_basis_cents: hasStock
            ? Math.round(parseFloat(stockBasisDollars || '0') * 100)
            : 0,
          narrative_template: template,
          notes,
        }),
      });

      if (res.ok) {
        const analysis = await res.json();
        setToast({ message: 'Rollover analysis created successfully.', type: 'success' });
        router.push(`/rollover/${analysis.analysis_id}`);
      } else {
        const err = await res.json();
        setToast({ message: err.error?.message ?? 'Failed to create analysis.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return selectedPlan != null;
      case 1:
        return clientName.length > 0 && state.length === 2;
      case 2:
        return (
          parseFloat(balanceDollars || '0') > 0 &&
          parseInt(age || '0', 10) >= 18 &&
          parseInt(yearsOfService || '0', 10) >= 0
        );
      case 3:
        return true;
      default:
        return false;
    }
  }

  const inputStyle = {
    background: 'var(--s-input-bg, #fff)',
    borderColor: 'var(--s-border-subtle)',
    color: 'var(--s-text)',
  };

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.push('/rollover')}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-text">New Rollover Analysis</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className="h-px flex-1" style={{ background: 'var(--s-border-subtle)' }} />}
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  i === step
                    ? 'bg-accent-primary text-text-onBrand'
                    : i < step
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-faint'
                }`}
                style={i > step ? { background: 'var(--s-border-subtle)' } : {}}
                disabled={i > step}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{
                  background: i <= step ? 'rgba(255,255,255,0.2)' : 'transparent',
                }}>
                  {i < step ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div
          className="rounded-lg border p-6"
          style={{
            background: 'var(--s-card-bg, #fff)',
            borderColor: 'var(--s-border-subtle)',
          }}
        >
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text">Select 401(k) Plan</h2>
              <p className="text-sm text-text-muted">
                Search for the employer plan by name, EIN, or sponsor.
              </p>
              <PlanSearchInput
                onSelect={setSelectedPlan}
              />
              {selectedPlan && (
                <div className="rounded-lg border p-4" style={{ borderColor: 'var(--s-border-subtle)', background: 'var(--s-input-bg)' }}>
                  <p className="font-medium text-text">{selectedPlan.plan_name}</p>
                  <p className="text-sm text-text-muted">{selectedPlan.sponsor_name}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-faint">
                    <span>EIN: {selectedPlan.ein}</span>
                    <span>Recordkeeper: {selectedPlan.recordkeeper}</span>
                    <span>{selectedPlan.participant_count.toLocaleString()} participants</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text">Client Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Client Name *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    style={inputStyle}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-muted">State of Residence *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    style={inputStyle}
                  >
                    <option value="">Select state...</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Household</label>
                  <select
                    value={householdId}
                    onChange={(e) => setHouseholdId(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    style={inputStyle}
                  >
                    <option value="hh-001">Smith Family</option>
                    <option value="hh-002">Johnson Household</option>
                    <option value="hh-003">Williams Trust</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Narrative Template</label>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as NarrativeTemplate)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    style={inputStyle}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="UHNW">UHNW</option>
                    <option value="NEAR_RETIREMENT">Near Retirement</option>
                    <option value="SMALL_BUSINESS">Small Business</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text">Account Information</h2>
                <button
                  type="button"
                  onClick={() => setShowStatementUpload(!showStatementUpload)}
                  className="text-sm text-accent-primary hover:underline"
                >
                  {showStatementUpload ? 'Enter Manually' : 'Upload Statement'}
                </button>
              </div>

              {/* Statement Upload Section */}
              {showStatementUpload && (
                <div className="pb-4 border-b" style={{ borderColor: 'var(--s-border-subtle)' }}>
                  <StatementUploader
                    onDataExtracted={(data) => {
                      // Auto-populate form fields from extracted data
                      setBalanceDollars(data.balance.toString());

                      // If custodian matches a known plan, try to select it
                      // (This would require a more sophisticated plan matching algorithm)

                      // Set default age if not already set
                      if (!age) {
                        setAge('55'); // Default assumption
                      }

                      // Hide upload section after successful extraction
                      setShowStatementUpload(false);

                      // Show success toast
                      setToast({
                        message: 'Statement data loaded successfully. Please review and complete remaining fields.',
                        type: 'success'
                      });
                    }}
                    onError={(error) => {
                      setToast({ message: error, type: 'error' });
                    }}
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Account Balance ($) *</label>
                  <input
                    type="number"
                    value={balanceDollars}
                    onChange={(e) => setBalanceDollars(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    style={inputStyle}
                    placeholder="250000"
                    min="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Participant Age *</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    style={inputStyle}
                    placeholder="55"
                    min="18"
                    max="120"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Years of Service *</label>
                  <input
                    type="number"
                    value={yearsOfService}
                    onChange={(e) => setYearsOfService(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    style={inputStyle}
                    placeholder="15"
                    min="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-muted">Retirement Target Age</label>
                  <input
                    type="number"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    style={inputStyle}
                    min="50"
                    max="120"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasLoan}
                    onChange={(e) => setHasLoan(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-text">Outstanding plan loan</span>
                </label>
                {hasLoan && (
                  <div className="ml-7">
                    <label className="mb-1 block text-xs text-text-muted">Loan Balance ($)</label>
                    <input
                      type="number"
                      value={loanDollars}
                      onChange={(e) => setLoanDollars(e.target.value)}
                      className="w-48 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                      style={inputStyle}
                      placeholder="25000"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasStock}
                    onChange={(e) => setHasStock(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-text">Employer stock / NUA opportunity</span>
                </label>
                {hasStock && (
                  <div className="ml-7">
                    <label className="mb-1 block text-xs text-text-muted">Cost Basis ($)</label>
                    <input
                      type="number"
                      value={stockBasisDollars}
                      onChange={(e) => setStockBasisDollars(e.target.value)}
                      className="w-48 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                      style={inputStyle}
                      placeholder="50000"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-muted">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  style={inputStyle}
                  rows={3}
                  placeholder="Any additional context for this analysis..."
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text">Review & Create</h2>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-text-faint">Plan</p>
                  <p className="font-medium text-text">{selectedPlan?.plan_name}</p>
                  <p className="text-xs text-text-muted">EIN: {selectedPlan?.ein}</p>
                </div>
                <div>
                  <p className="text-text-faint">Client</p>
                  <p className="font-medium text-text">{clientName}</p>
                  <p className="text-xs text-text-muted">{state}</p>
                </div>
                <div>
                  <p className="text-text-faint">Balance</p>
                  <p className="font-medium text-text">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(balanceDollars || '0'))}
                  </p>
                </div>
                <div>
                  <p className="text-text-faint">Age / Service</p>
                  <p className="font-medium text-text">{age} years old, {yearsOfService} years</p>
                </div>
                {hasLoan && (
                  <div>
                    <p className="text-text-faint">Outstanding Loan</p>
                    <p className="font-medium text-text">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(loanDollars || '0'))}
                    </p>
                  </div>
                )}
                {hasStock && (
                  <div>
                    <p className="text-text-faint">Employer Stock Basis</p>
                    <p className="font-medium text-text">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(stockBasisDollars || '0'))}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-text-faint">Template</p>
                  <p className="font-medium text-text">{template}</p>
                </div>
              </div>
              {notes && (
                <div>
                  <p className="text-sm text-text-faint">Notes</p>
                  <p className="text-sm text-text">{notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
            style={{ borderColor: 'var(--s-border-subtle)' }}
            disabled={step === 0}
          >
            Previous
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => prev + 1)}
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-onBrand transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              disabled={!canProceed()}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-accent-primary px-6 py-2 text-sm font-medium text-text-onBrand transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Analysis'}
            </button>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm" style={{
          background: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
        }}>
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
