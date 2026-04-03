'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaxComparisonChart } from '@/components/relocation/TaxComparisonChart';
import { AssumptionsDrawer } from '@/components/relocation/AssumptionsDrawer';
import { ExportResults } from '@/components/relocation/ExportResults';

// Leaving States (9 high-tax jurisdictions)
const LEAVING_STATES = [
  { value: 'CA', label: 'California' },
  { value: 'NY', label: 'New York' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'OR', label: 'Oregon' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'WA', label: 'Washington' },
];

// All 50 states + DC + Puerto Rico
const DESTINATION_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_joint', label: 'Married Filing Jointly' },
  { value: 'married_separate', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
];

export default function RelocationCalculatorPage() {
  const router = useRouter();

  // Form state
  const [leavingState, setLeavingState] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [filingStatus, setFilingStatus] = useState('married_joint');
  const [ordinaryIncome, setOrdinaryIncome] = useState('');
  const [capitalGains, setCapitalGains] = useState('');
  const [netWorth, setNetWorth] = useState('');

  // Puerto Rico specific
  const [showPuertoRicoOptions, setShowPuertoRicoOptions] = useState(false);
  const [bonaFideResidency, setBonaFideResidency] = useState(false);
  const [act60Scenario, setAct60Scenario] = useState<'standard' | 'act60'>('standard');

  // Results
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const handleDestinationChange = (value: string) => {
    setDestinationState(value);
    setShowPuertoRicoOptions(value === 'PR');
  };

  const handleCalculate = async () => {
    // Reset previous results
    setCalculationError(null);
    setCalculationResult(null);
    setShowResults(false);

    // Validation
    if (!leavingState || !destinationState) {
      setCalculationError('Please select both a leaving state and destination state.');
      return;
    }

    if (!ordinaryIncome || parseFloat(ordinaryIncome) < 0) {
      setCalculationError('Please enter a valid annual ordinary income.');
      return;
    }

    // Call API
    setIsCalculating(true);
    try {
      const response = await fetch('/api/relocation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leavingStateCode: leavingState,
          destinationStateCode: destinationState,
          filingStatus: filingStatus,
          annualOrdinaryIncome: parseFloat(ordinaryIncome),
          annualCapitalGains: parseFloat(capitalGains) || 0,
          netWorth: netWorth ? parseFloat(netWorth) : undefined,
          puertoRico:
            destinationState === 'PR'
              ? {
                  assumeBonaFideResidency: bonaFideResidency,
                  act60Enabled: act60Scenario === 'act60',
                  act60Cohort: act60Scenario === 'act60' ? 'post_2026' : 'not_applicable',
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Calculation failed');
      }

      const data = await response.json();
      setCalculationResult(data);
      setShowResults(true);
    } catch (error: any) {
      setCalculationError(error.message || 'An error occurred during calculation');
    } finally {
      setIsCalculating(false);
    }
  };

  const inputStyle = {
    background: 'var(--s-input-bg, #fff)',
    borderColor: 'var(--s-border-subtle)',
    color: 'var(--s-text)',
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Interstate Tax Migration Calculator</h1>
        <p className="mt-2 text-text-muted">
          Illustrate the estimated annual and multi-year tax impact of relocating from high-tax states to any U.S. jurisdiction or Puerto Rico.
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-warning-500/10 px-3 py-1.5 text-xs text-warning-700 dark:text-warning-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Educational illustration tool — Not personalized tax advice</span>
        </div>
      </div>

      {/* Input Form */}
      <div className="rounded-lg border p-6" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
        <h2 className="mb-4 text-lg font-semibold text-text">Your Information</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Leaving State */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Leaving State <span className="text-error">*</span>
            </label>
            <select
              value={leavingState}
              onChange={(e) => setLeavingState(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              style={inputStyle}
            >
              <option value="">Select leaving state...</option>
              {LEAVING_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          {/* Destination State */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Destination State <span className="text-error">*</span>
            </label>
            <select
              value={destinationState}
              onChange={(e) => handleDestinationChange(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              style={inputStyle}
            >
              <option value="">Select destination...</option>
              {DESTINATION_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filing Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Filing Status <span className="text-error">*</span>
            </label>
            <select
              value={filingStatus}
              onChange={(e) => setFilingStatus(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              style={inputStyle}
            >
              {FILING_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Annual Ordinary Income */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Annual Ordinary Income ($) <span className="text-error">*</span>
            </label>
            <input
              type="number"
              value={ordinaryIncome}
              onChange={(e) => setOrdinaryIncome(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              style={inputStyle}
              placeholder="500,000"
              min="0"
            />
          </div>

          {/* Annual Realized Capital Gains */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Annual Realized Capital Gains ($)
            </label>
            <input
              type="number"
              value={capitalGains}
              onChange={(e) => setCapitalGains(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              style={inputStyle}
              placeholder="100,000"
              min="0"
            />
          </div>

          {/* Net Worth / Estate Value */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Net Worth / Estate Value ($)
            </label>
            <input
              type="number"
              value={netWorth}
              onChange={(e) => setNetWorth(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              style={inputStyle}
              placeholder="5,000,000"
              min="0"
            />
          </div>
        </div>

        {/* Puerto Rico Options */}
        {showPuertoRicoOptions && (
          <div className="mt-6 rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-4">
            <h3 className="mb-3 text-sm font-semibold text-text">Puerto Rico Specific Options</h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={bonaFideResidency}
                  onChange={(e) => setBonaFideResidency(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-text">
                  Assume <strong>bona fide residency</strong> for Puerto Rico tax purposes
                  <span className="block text-xs text-text-faint">
                    (Physical presence test, closer connection, no tax home elsewhere)
                  </span>
                </span>
              </label>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">
                  Scenario Type
                </label>
                <select
                  value={act60Scenario}
                  onChange={(e) => setAct60Scenario(e.target.value as 'standard' | 'act60')}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  style={inputStyle}
                >
                  <option value="standard">Standard Puerto Rico Resident</option>
                  <option value="act60">Act 60 Planning Scenario (Decree Required)</option>
                </select>
              </div>

              {act60Scenario === 'act60' && (
                <div className="rounded-md bg-warning-500/10 p-3 text-xs text-warning-700 dark:text-warning-400">
                  <strong>Important:</strong> Act 60 benefits require a decree application, approval, and compliance with specific requirements. Eligibility and timing are highly fact-specific. This is an illustration only. Consult qualified Puerto Rico tax counsel.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calculate Button */}
        <div className="mt-6 flex flex-col gap-3">
          {calculationError && (
            <div className="rounded-md bg-error/10 px-4 py-3 text-sm text-error">
              {calculationError}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isCalculating}
              className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-text-onBrand transition-colors hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Tax Impact'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {showResults && calculationResult && (
        <div className="space-y-6">
          {/* Export Actions */}
          <div className="flex justify-end">
            <ExportResults
              calculationResult={calculationResult}
              userInputs={{
                leavingState,
                destinationState,
                filingStatus,
                ordinaryIncome,
                capitalGains,
                netWorth,
              }}
            />
          </div>

          {/* Main Results Card */}
          <div className="rounded-lg border p-6" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
            <h2 className="mb-6 text-lg font-semibold text-text">Estimated Tax Comparison</h2>

            {/* Jurisdiction Comparison */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted">Current State</p>
                <p className="text-lg font-semibold text-text">{calculationResult.originState.jurisdictionName}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Destination</p>
                <p className="text-lg font-semibold text-text">{calculationResult.destinationState.jurisdictionName}</p>
              </div>
            </div>

            {/* Tax Breakdown */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4" style={{ borderColor: 'var(--s-border-subtle)' }}>
                  <p className="mb-1 text-xs text-text-muted">Annual State Tax ({calculationResult.originState.jurisdictionCode})</p>
                  <p className="text-2xl font-bold text-text">
                    ${calculationResult.originState.totalIncomeTax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="mt-1 text-xs text-text-faint">
                    Effective Rate: {(calculationResult.originState.effectiveTaxRate * 100).toFixed(2)}%
                  </p>
                </div>

                <div className="rounded-lg border p-4" style={{ borderColor: 'var(--s-border-subtle)' }}>
                  <p className="mb-1 text-xs text-text-muted">Annual State Tax ({calculationResult.destinationState.jurisdictionCode})</p>
                  <p className="text-2xl font-bold text-text">
                    ${calculationResult.destinationState.totalIncomeTax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="mt-1 text-xs text-text-faint">
                    Effective Rate: {(calculationResult.destinationState.effectiveTaxRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Annual Savings/Cost */}
              <div className={`rounded-lg p-6 text-center ${calculationResult.annualTaxDifference < 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                <p className="mb-2 text-sm font-medium text-text-muted">
                  {calculationResult.annualTaxDifference < 0 ? 'Estimated Annual Tax Savings' : 'Estimated Annual Tax Increase'}
                </p>
                <p className={`text-4xl font-bold ${calculationResult.annualTaxDifference < 0 ? 'text-success' : 'text-error'}`}>
                  ${Math.abs(calculationResult.annualTaxDifference).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="mt-3 text-xs text-text-muted">
                  10-Year Illustration: ${Math.abs(calculationResult.tenYearIllustration).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>

              {/* Estate Tax Notes */}
              {(calculationResult.originState.estateOrInheritanceTaxApplies || calculationResult.destinationState.estateOrInheritanceTaxApplies) && (
                <div className="rounded-md bg-warning-500/10 p-4 text-sm">
                  <p className="font-semibold text-warning-700 dark:text-warning-400">Estate Tax Considerations</p>
                  <ul className="ml-4 mt-2 list-disc space-y-1 text-xs text-text-muted">
                    {calculationResult.originState.estateOrInheritanceTaxApplies && (
                      <li>{calculationResult.originState.jurisdictionName} imposes estate or inheritance tax</li>
                    )}
                    {calculationResult.destinationState.estateOrInheritanceTaxApplies && (
                      <li>{calculationResult.destinationState.jurisdictionName} imposes estate or inheritance tax</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Tax Comparison Chart */}
          <div className="rounded-lg border p-6" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
            <h3 className="mb-4 text-lg font-semibold text-text">Tax Burden Comparison</h3>
            <TaxComparisonChart
              originState={calculationResult.originState}
              destinationState={calculationResult.destinationState}
            />
          </div>

          {/* Assumptions & Caveats Drawer */}
          <AssumptionsDrawer
            assumptions={calculationResult.assumptions}
            caveats={calculationResult.caveats}
            jurisdictionNotes={calculationResult.jurisdictionSpecificNotes}
            calculationDate={calculationResult.calculationDate}
            rulesVersion={calculationResult.rulesVersionUsed}
          />
        </div>
      )}

      {/* CTA */}
      {showResults && (
        <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-6 text-center">
          <h3 className="text-lg font-semibold text-text">
            See How a Personalized Relocation Analysis Could Change the Outcome
          </h3>
          <p className="mt-2 text-sm text-text-muted">
            Every relocation has unique sourcing, residency, and timing considerations. Schedule a consultation to explore your specific situation.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-text-onBrand transition-colors hover:bg-accent-primary/90"
          >
            Schedule Consultation
          </button>
        </div>
      )}
    </div>
  );
}
