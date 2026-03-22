'use client';

import React, { useState, useCallback } from 'react';
import {
  ClientIntake,
  ClientGoal,
  ClientAlternatives,
  WealthTier,
  IncomeStability,
  FilingStatus,
  WEALTH_TIER_LABELS,
  WEALTH_TIER_DESCRIPTIONS,
} from '@/lib/risk-profile/types';

// ── Props ───────────────────────────────────────────────────────────────

interface IntakeFormProps {
  onComplete: (intake: ClientIntake) => void;
}

// ── Defaults ────────────────────────────────────────────────────────────

const DEFAULT_INTAKE: ClientIntake = {
  wealthTier: 'hnw',
  demographics: { age: 45, maritalStatus: 'married', dependents: 2, stateOfResidence: 'CA' },
  financials: {
    annualIncome: 500000,
    incomeStability: 'stable',
    totalNetWorth: 5000000,
    liquidNetWorth: 3000000,
    annualExpenses: 200000,
    debtObligations: 50000,
    emergencyReserveMonths: 12,
  },
  tax: { filingStatus: 'mfj', marginalBracket: 0.35, stateIncomeTaxRate: 0.093 },
  goals: [{ name: 'Retirement', targetAmount: 3000000, timeHorizonYears: 20, priority: 'essential' }],
  investmentExperienceYears: 15,
  alternatives: {
    privateEquity: false,
    privateCredit: false,
    hedgeFunds: false,
    realEstateDirect: false,
    crypto: false,
    collectibles: false,
    concentratedStock: false,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────

const WEALTH_TIERS: WealthTier[] = ['emerging', 'mass_affluent', 'hnw', 'uhnw'];

const INCOME_STABILITY_OPTIONS: { value: IncomeStability; label: string }[] = [
  { value: 'very_stable', label: 'Very Stable' },
  { value: 'stable', label: 'Stable' },
  { value: 'variable', label: 'Variable' },
  { value: 'highly_variable', label: 'Highly Variable' },
];

const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'mfj', label: 'MFJ' },
  { value: 'mfs', label: 'MFS' },
  { value: 'hoh', label: 'HOH' },
];

const TAX_BRACKETS = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];

const MARITAL_OPTIONS: { value: ClientIntake['demographics']['maritalStatus']; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'partnered', label: 'Partnered' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

const ALTERNATIVE_LABELS: { key: keyof ClientAlternatives; label: string }[] = [
  { key: 'privateEquity', label: 'Private Equity / Venture Capital' },
  { key: 'privateCredit', label: 'Private Credit' },
  { key: 'hedgeFunds', label: 'Hedge Funds' },
  { key: 'realEstateDirect', label: 'Direct Real Estate' },
  { key: 'crypto', label: 'Cryptocurrency / Digital Assets' },
  { key: 'collectibles', label: 'Collectibles (Art, Wine, Cars, etc.)' },
  { key: 'concentratedStock', label: 'Concentrated Stock Position' },
];

const PRIORITY_OPTIONS: { value: ClientGoal['priority']; label: string }[] = [
  { value: 'essential', label: 'Essential' },
  { value: 'important', label: 'Important' },
  { value: 'aspirational', label: 'Aspirational' },
];

/** Format a number as $1,234,567 */
function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US');
}

/** Parse a currency string like "1,234,567" into a number */
function parseCurrency(s: string): number {
  const cleaned = s.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/** Clamp a number to [min, max] */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Whether the tier shows the alternatives step */
function showAlternativesStep(tier: WealthTier): boolean {
  return tier === 'hnw' || tier === 'uhnw';
}

// ── Component ───────────────────────────────────────────────────────────

export default function IntakeForm({ onComplete }: IntakeFormProps) {
  const [intake, setIntake] = useState<ClientIntake>(DEFAULT_INTAKE);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const totalSteps = showAlternativesStep(intake.wealthTier) ? 4 : 3;

  // ── Updaters ────────────────────────────────────────────────────────

  const updateDemographics = useCallback(
    (patch: Partial<ClientIntake['demographics']>) =>
      setIntake((prev) => ({ ...prev, demographics: { ...prev.demographics, ...patch } })),
    [],
  );

  const updateFinancials = useCallback(
    (patch: Partial<ClientIntake['financials']>) =>
      setIntake((prev) => ({ ...prev, financials: { ...prev.financials, ...patch } })),
    [],
  );

  const updateTax = useCallback(
    (patch: Partial<ClientIntake['tax']>) =>
      setIntake((prev) => ({ ...prev, tax: { ...prev.tax, ...patch } })),
    [],
  );

  const updateAlternatives = useCallback(
    (patch: Partial<ClientIntake['alternatives']>) =>
      setIntake((prev) => ({ ...prev, alternatives: { ...prev.alternatives, ...patch } })),
    [],
  );

  const updateGoal = useCallback((index: number, patch: Partial<ClientGoal>) => {
    setIntake((prev) => {
      const goals = [...prev.goals];
      goals[index] = { ...goals[index], ...patch };
      return { ...prev, goals };
    });
  }, []);

  const addGoal = useCallback(() => {
    setIntake((prev) => {
      if (prev.goals.length >= 5) return prev;
      return {
        ...prev,
        goals: [...prev.goals, { name: '', targetAmount: 0, timeHorizonYears: 10, priority: 'important' }],
      };
    });
  }, []);

  const removeGoal = useCallback((index: number) => {
    setIntake((prev) => {
      if (prev.goals.length <= 1) return prev;
      return { ...prev, goals: prev.goals.filter((_, i) => i !== index) };
    });
  }, []);

  // ── Validation ──────────────────────────────────────────────────────

  const validateStep = useCallback(
    (s: number): string[] => {
      const errs: string[] = [];
      if (s === 0) {
        if (!intake.wealthTier) errs.push('Please select a wealth tier.');
        if (intake.demographics.age < 25 || intake.demographics.age > 100) errs.push('Age must be between 25 and 100.');
        if (!intake.demographics.stateOfResidence.trim()) errs.push('State of residence is required.');
      } else if (s === 1) {
        if (intake.financials.annualIncome <= 0) errs.push('Annual income is required.');
        if (intake.financials.totalNetWorth <= 0) errs.push('Total net worth is required.');
        if (intake.financials.liquidNetWorth <= 0) errs.push('Liquid net worth is required.');
        if (intake.financials.liquidNetWorth > intake.financials.totalNetWorth)
          errs.push('Liquid net worth cannot exceed total net worth.');
      } else if (s === 2) {
        intake.goals.forEach((g, i) => {
          if (!g.name.trim()) errs.push(`Goal ${i + 1}: Name is required.`);
          if (g.targetAmount <= 0) errs.push(`Goal ${i + 1}: Target amount must be greater than 0.`);
          if (g.timeHorizonYears <= 0) errs.push(`Goal ${i + 1}: Time horizon must be greater than 0.`);
        });
        if (intake.investmentExperienceYears < 0) errs.push('Investment experience cannot be negative.');
      }
      return errs;
    },
    [intake],
  );

  // ── Navigation ──────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    const errs = validateStep(step);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);

    const isLastStep = step + 1 >= totalSteps;
    if (isLastStep) {
      onComplete(intake);
    } else {
      setStep((s) => s + 1);
    }
  }, [step, totalSteps, validateStep, onComplete, intake]);

  const handleBack = useCallback(() => {
    setErrors([]);
    setStep((s) => Math.max(0, s - 1));
  }, []);

  // ── Step titles ─────────────────────────────────────────────────────

  const stepMeta = [
    { title: 'About You', description: 'Tell us about yourself so we can tailor your risk assessment.' },
    { title: 'Financial Picture', description: 'Give us a snapshot of your current financial situation.' },
    { title: 'Goals', description: 'What are you investing for? Define your financial goals.' },
    ...(showAlternativesStep(intake.wealthTier)
      ? [{ title: 'Investment Preferences', description: 'Select alternative asset classes you have experience with or interest in.' }]
      : []),
  ];

  const { title, description } = stepMeta[step] ?? stepMeta[0];

  // ── Currency input helper ───────────────────────────────────────────

  const CurrencyInput = ({
    value,
    onChange,
    id,
  }: {
    value: number;
    onChange: (v: number) => void;
    id: string;
  }) => {
    const [display, setDisplay] = useState(fmtCurrency(value));

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-300 text-sm">$</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className="input-field pl-7"
          value={display}
          onChange={(e) => {
            const raw = e.target.value;
            setDisplay(raw);
            onChange(parseCurrency(raw));
          }}
          onBlur={() => setDisplay(fmtCurrency(value))}
        />
      </div>
    );
  };

  // ── Render helpers ──────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              i === step
                ? 'bg-brand-700 text-white'
                : i < step
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-limestone-200 text-charcoal-300'
            }`}
          >
            {i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-400' : 'bg-limestone-200'}`} />
          )}
        </div>
      ))}
      <span className="ml-3 text-xs text-charcoal-300">
        Step {step + 1} of {totalSteps}
      </span>
    </div>
  );

  // ── Step 1: About You ───────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-6">
      {/* Wealth tier selector */}
      <div>
        <label className="label">Wealth Tier</label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {WEALTH_TIERS.map((tier) => {
            const isSelected = intake.wealthTier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setIntake((prev) => ({ ...prev, wealthTier: tier }))}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-brand-700 bg-brand-50 ring-1 shadow-focus'
                    : 'border-limestone-200 bg-white hover:border-limestone-300 hover:bg-limestone-50'
                }`}
              >
                <div className={`text-sm font-semibold ${isSelected ? 'text-brand-900' : 'text-charcoal-900'}`}>
                  {WEALTH_TIER_LABELS[tier]}
                </div>
                <div className={`text-xs mt-0.5 ${isSelected ? 'text-brand-700' : 'text-charcoal-500'}`}>
                  {WEALTH_TIER_DESCRIPTIONS[tier]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Age */}
      <div>
        <label htmlFor="age" className="label">Age</label>
        <input
          id="age"
          type="number"
          min={25}
          max={100}
          className="input-field"
          value={intake.demographics.age}
          onChange={(e) => updateDemographics({ age: clamp(parseInt(e.target.value) || 25, 25, 100) })}
        />
      </div>

      {/* Marital Status */}
      <div>
        <label htmlFor="maritalStatus" className="label">Marital Status</label>
        <select
          id="maritalStatus"
          className="input-field"
          value={intake.demographics.maritalStatus}
          onChange={(e) =>
            updateDemographics({
              maritalStatus: e.target.value as ClientIntake['demographics']['maritalStatus'],
            })
          }
        >
          {MARITAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dependents */}
      <div>
        <label htmlFor="dependents" className="label">Dependents</label>
        <input
          id="dependents"
          type="number"
          min={0}
          max={20}
          className="input-field"
          value={intake.demographics.dependents}
          onChange={(e) =>
            updateDemographics({ dependents: clamp(parseInt(e.target.value) || 0, 0, 20) })
          }
        />
      </div>

      {/* State */}
      <div>
        <label htmlFor="state" className="label">State of Residence</label>
        <input
          id="state"
          type="text"
          className="input-field"
          placeholder="e.g. CA"
          value={intake.demographics.stateOfResidence}
          onChange={(e) => updateDemographics({ stateOfResidence: e.target.value })}
        />
      </div>
    </div>
  );

  // ── Step 2: Financial Picture ───────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Annual Income */}
      <div>
        <label htmlFor="annualIncome" className="label">Annual Income</label>
        <CurrencyInput
          id="annualIncome"
          value={intake.financials.annualIncome}
          onChange={(v) => updateFinancials({ annualIncome: v })}
        />
      </div>

      {/* Income Stability */}
      <div>
        <label className="label">Income Stability</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {INCOME_STABILITY_OPTIONS.map((opt) => {
            const isSelected = intake.financials.incomeStability === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFinancials({ incomeStability: opt.value })}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-brand-700 bg-brand-50 text-brand-700'
                    : 'border-limestone-200 bg-white text-charcoal-500 hover:border-limestone-300'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Total Net Worth */}
      <div>
        <label htmlFor="totalNetWorth" className="label">Total Net Worth</label>
        <CurrencyInput
          id="totalNetWorth"
          value={intake.financials.totalNetWorth}
          onChange={(v) => updateFinancials({ totalNetWorth: v })}
        />
      </div>

      {/* Liquid Net Worth */}
      <div>
        <label htmlFor="liquidNetWorth" className="label">Liquid Net Worth</label>
        <CurrencyInput
          id="liquidNetWorth"
          value={intake.financials.liquidNetWorth}
          onChange={(v) => updateFinancials({ liquidNetWorth: v })}
        />
      </div>

      {/* Annual Expenses */}
      <div>
        <label htmlFor="annualExpenses" className="label">Annual Expenses</label>
        <CurrencyInput
          id="annualExpenses"
          value={intake.financials.annualExpenses}
          onChange={(v) => updateFinancials({ annualExpenses: v })}
        />
      </div>

      {/* Debt Obligations */}
      <div>
        <label htmlFor="debtObligations" className="label">Debt Obligations</label>
        <CurrencyInput
          id="debtObligations"
          value={intake.financials.debtObligations}
          onChange={(v) => updateFinancials({ debtObligations: v })}
        />
      </div>

      {/* Emergency Reserves */}
      <div>
        <label htmlFor="emergencyReserves" className="label">Emergency Reserves (months of expenses)</label>
        <input
          id="emergencyReserves"
          type="number"
          min={0}
          max={120}
          className="input-field"
          value={intake.financials.emergencyReserveMonths}
          onChange={(e) =>
            updateFinancials({ emergencyReserveMonths: clamp(parseInt(e.target.value) || 0, 0, 120) })
          }
        />
      </div>

      {/* Filing Status */}
      <div>
        <label htmlFor="filingStatus" className="label">Filing Status</label>
        <select
          id="filingStatus"
          className="input-field"
          value={intake.tax.filingStatus}
          onChange={(e) => updateTax({ filingStatus: e.target.value as FilingStatus })}
        >
          {FILING_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Marginal Tax Bracket */}
      <div>
        <label htmlFor="marginalBracket" className="label">Marginal Tax Bracket</label>
        <select
          id="marginalBracket"
          className="input-field"
          value={intake.tax.marginalBracket}
          onChange={(e) => updateTax({ marginalBracket: parseFloat(e.target.value) })}
        >
          {TAX_BRACKETS.map((b) => (
            <option key={b} value={b}>
              {Math.round(b * 100)}%
            </option>
          ))}
        </select>
      </div>

      {/* State Income Tax Rate */}
      <div>
        <label htmlFor="stateTaxRate" className="label">State Income Tax Rate (%)</label>
        <input
          id="stateTaxRate"
          type="number"
          step="0.1"
          min={0}
          max={15}
          className="input-field"
          value={parseFloat((intake.tax.stateIncomeTaxRate * 100).toFixed(2))}
          onChange={(e) =>
            updateTax({ stateIncomeTaxRate: clamp(parseFloat(e.target.value) || 0, 0, 15) / 100 })
          }
        />
      </div>
    </div>
  );

  // ── Step 3: Goals ───────────────────────────────────────────────────

  const renderStep2 = () => (
    <div className="space-y-6">
      {intake.goals.map((goal, index) => (
        <div key={index} className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-charcoal-700">Goal {index + 1}</h4>
            {intake.goals.length > 1 && (
              <button
                type="button"
                onClick={() => removeGoal(index)}
                className="text-xs text-critical-500 hover:text-critical-700 font-medium transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {/* Goal Name */}
          <div>
            <label htmlFor={`goalName-${index}`} className="label">Name</label>
            <input
              id={`goalName-${index}`}
              type="text"
              className="input-field"
              placeholder="e.g. Retirement, College Fund"
              value={goal.name}
              onChange={(e) => updateGoal(index, { name: e.target.value })}
            />
          </div>

          {/* Target Amount */}
          <div>
            <label htmlFor={`goalTarget-${index}`} className="label">Target Amount</label>
            <CurrencyInput
              id={`goalTarget-${index}`}
              value={goal.targetAmount}
              onChange={(v) => updateGoal(index, { targetAmount: v })}
            />
          </div>

          {/* Time Horizon */}
          <div>
            <label htmlFor={`goalHorizon-${index}`} className="label">Time Horizon (years)</label>
            <input
              id={`goalHorizon-${index}`}
              type="number"
              min={1}
              max={60}
              className="input-field"
              value={goal.timeHorizonYears}
              onChange={(e) =>
                updateGoal(index, { timeHorizonYears: clamp(parseInt(e.target.value) || 1, 1, 60) })
              }
            />
          </div>

          {/* Priority */}
          <div>
            <label className="label">Priority</label>
            <div className="flex gap-2 mt-1">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = goal.priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateGoal(index, { priority: opt.value })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-brand-700 bg-brand-50 text-brand-700'
                        : 'border-limestone-200 bg-white text-charcoal-500 hover:border-limestone-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {intake.goals.length < 5 && (
        <button
          type="button"
          onClick={addGoal}
          className="w-full px-4 py-2.5 border-2 border-dashed border-limestone-300 rounded-lg text-sm font-medium text-charcoal-500 hover:border-brand-400 hover:text-brand-700 transition-colors"
        >
          + Add Goal
        </button>
      )}

      {/* Investment Experience */}
      <div className="pt-2">
        <label htmlFor="investmentExperience" className="label">Investment Experience (years)</label>
        <input
          id="investmentExperience"
          type="number"
          min={0}
          max={60}
          className="input-field"
          value={intake.investmentExperienceYears}
          onChange={(e) =>
            setIntake((prev) => ({
              ...prev,
              investmentExperienceYears: clamp(parseInt(e.target.value) || 0, 0, 60),
            }))
          }
        />
      </div>
    </div>
  );

  // ── Step 4: Investment Preferences (Alternatives) ───────────────────

  const renderStep3 = () => (
    <div className="space-y-3">
      {ALTERNATIVE_LABELS.map(({ key, label }) => {
        const isChecked = intake.alternatives[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => updateAlternatives({ [key]: !isChecked })}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
              isChecked
                ? 'border-brand-700 bg-brand-50'
                : 'border-limestone-200 bg-white hover:border-limestone-300 hover:bg-limestone-50'
            }`}
          >
            <div
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isChecked ? 'border-brand-700 bg-brand-700' : 'border-limestone-300 bg-white'
              }`}
            >
              {isChecked && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${isChecked ? 'text-brand-900 font-medium' : 'text-charcoal-700'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────

  const stepRenderers = [renderStep0, renderStep1, renderStep2, ...(showAlternativesStep(intake.wealthTier) ? [renderStep3] : [])];

  const isLastStep = step + 1 >= totalSteps;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Card */}
      <div className="card p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-charcoal-900">{title}</h2>
          <p className="text-sm text-charcoal-500 mt-1">{description}</p>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 p-3 rounded-lg bg-critical-50 border border-critical-200">
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-xs text-critical-500 flex items-start gap-1.5">
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-critical-500 flex-shrink-0" />
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Step content */}
        {stepRenderers[step]?.()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-limestone-200">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 border border-limestone-300 text-charcoal-700 text-sm font-medium rounded-lg hover:bg-limestone-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            {isLastStep ? 'Continue to Assessment' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
