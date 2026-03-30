'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Dot,
} from 'recharts';
import { Users, TrendingUp, Shield, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { calculateSSBenefit } from '@/lib/calc-engine/retirement/social-security-benefit';
import type { SSBenefitInput } from '@/lib/calc-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanResults {
  clientPIA?: number;
  clientFRA?: number;
  clientCurrentAge?: number;
  coClientPIA?: number;
  coClientFRA?: number;
  coClientCurrentAge?: number;
  coClientName?: string;
  clientName?: string;
  filingStatus?: string;
  otherMAGIIncome?: number;
  taxExemptInterest?: number;
  colaRate?: number;
}

interface ClaimScenario {
  claimAge: number;
  label: string;
  monthlyBenefit: number;
  annualBenefit: number;
  adjustmentFactor: number;
  adjustmentLabel: string;
  note: string;
  lifetimeToAge90: number;
  breakEvenVs62: number;
  breakEvenVsFRA: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return '$' + Math.round(value).toLocaleString('en-US');
}

function formatCurrencyShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return '$' + (value / 1_000).toFixed(0) + 'K';
  }
  return '$' + Math.round(value).toLocaleString('en-US');
}

function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(2) + 'M';
  }
  return '$' + Math.round(value).toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Provisional income thresholds for SS taxation
// ---------------------------------------------------------------------------

const SS_TAX_THRESHOLDS = {
  single: { lower: 25000, upper: 34000 },
  mfj: { lower: 32000, upper: 44000 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SocialSecurityPage() {
  const params = useParams();
  const planId = params.planId as string;

  // ---- State ----
  const [loading, setLoading] = useState(true);
  const [planResults, setPlanResults] = useState<PlanResults | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // Editable inputs
  const [pia, setPia] = useState(2800);
  const [fra, setFra] = useState(67);
  const [colaRate, setColaRate] = useState(0.023);
  const [otherIncome, setOtherIncome] = useState(60000);
  const [hasCoClient, setHasCoClient] = useState(false);
  const [coClientPIA, setCoClientPIA] = useState(1800);

  // ---- Fetch plan results ----
  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      try {
        const res = await fetch(`/api/prism/plans/${planId}/results`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setPlanResults(data);
            if (data.clientPIA) setPia(data.clientPIA);
            if (data.clientFRA) setFra(data.clientFRA);
            if (data.colaRate) setColaRate(data.colaRate);
            if (data.otherMAGIIncome) setOtherIncome(data.otherMAGIIncome);
            if (data.coClientPIA) {
              setCoClientPIA(data.coClientPIA);
              setHasCoClient(true);
            }
          }
        } else {
          // API returned non-OK (e.g. 501 stub) -- use defaults
          if (!cancelled) setFetchError(true);
        }
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchResults();
    return () => { cancelled = true; };
  }, [planId]);

  // ---- Calculate SS benefits for three claim ages ----
  const scenarios: ClaimScenario[] = useMemo(() => {
    const ages = [62, fra, 70] as const;
    const labels = ['Claim at 62', `Claim at FRA (${fra})`, 'Claim at 70'] as const;
    const adjustmentLabels = ['70% of PIA', '100% of PIA', '124% of PIA'];
    const notes = [
      'Earliest eligibility; permanently reduced benefit',
      'Full retirement age; receive your full PIA',
      'Maximum delayed credits; highest monthly amount',
    ];

    return ages.map((claimAge, i) => {
      const input: SSBenefitInput = {
        pia,
        fullRetirementAge: fra,
        claimAge,
        colaRate,
        ssHaircut: 0,
        wep: false,
        wepNoncoveredPension: 0,
        gpo: false,
        gpoNoncoveredPension: 0,
      };

      const result = calculateSSBenefit(input);

      // Lifetime total to age 90: annual benefit * (90 - claimAge) with COLA
      let lifetimeTotal = 0;
      let annualBenefit = result.annualBenefitAtClaimAge;
      for (let age = claimAge; age < 90; age++) {
        lifetimeTotal += annualBenefit;
        annualBenefit *= (1 + colaRate);
      }

      return {
        claimAge,
        label: labels[i],
        monthlyBenefit: result.monthlyBenefitAtClaimAge,
        annualBenefit: result.annualBenefitAtClaimAge,
        adjustmentFactor: result.adjustmentFactor,
        adjustmentLabel: adjustmentLabels[i],
        note: notes[i],
        lifetimeToAge90: lifetimeTotal,
        breakEvenVs62: result.breakEvenAgeVsAge62,
        breakEvenVsFRA: result.breakEvenAgeVsFRA,
      };
    });
  }, [pia, fra, colaRate]);

  // Determine optimal strategy (highest lifetime total to 90)
  const optimalIndex = useMemo(() => {
    let maxIdx = 0;
    let maxVal = 0;
    scenarios.forEach((s, i) => {
      if (s.lifetimeToAge90 > maxVal) {
        maxVal = s.lifetimeToAge90;
        maxIdx = i;
      }
    });
    return maxIdx;
  }, [scenarios]);

  // ---- Break-even chart data ----
  const breakEvenData = useMemo(() => {
    const data: Array<{ age: number; claim62: number; claim67: number; claim70: number }> = [];

    // Track cumulative for each scenario
    let cum62 = 0;
    let cum67 = 0;
    let cum70 = 0;
    let annual62 = scenarios[0].annualBenefit;
    let annual67 = scenarios[1].annualBenefit;
    let annual70 = scenarios[2].annualBenefit;

    for (let age = 62; age <= 95; age++) {
      // Add benefits for the current year
      if (age >= 62) {
        cum62 += annual62;
        annual62 *= (1 + colaRate);
      }
      if (age >= fra) {
        cum67 += annual67;
        annual67 *= (1 + colaRate);
      }
      if (age >= 70) {
        cum70 += annual70;
        annual70 *= (1 + colaRate);
      }

      data.push({
        age,
        claim62: Math.round(cum62),
        claim67: Math.round(cum67),
        claim70: Math.round(cum70),
      });
    }

    return data;
  }, [scenarios, fra, colaRate]);

  // ---- Find break-even ages from chart data ----
  const breakEvenAge67vs62 = useMemo(() => {
    for (const d of breakEvenData) {
      if (d.claim67 >= d.claim62 && d.age >= fra) return d.age;
    }
    return null;
  }, [breakEvenData, fra]);

  const breakEvenAge70vs62 = useMemo(() => {
    for (const d of breakEvenData) {
      if (d.claim70 >= d.claim62 && d.age >= 70) return d.age;
    }
    return null;
  }, [breakEvenData]);

  const breakEvenAge70vs67 = useMemo(() => {
    for (const d of breakEvenData) {
      if (d.claim70 >= d.claim67 && d.age >= 70) return d.age;
    }
    return null;
  }, [breakEvenData]);

  // ---- SS Taxation data ----
  const taxationData = useMemo(() => {
    const filingStatus = hasCoClient ? 'mfj' : 'single';
    const thresholds = SS_TAX_THRESHOLDS[filingStatus === 'mfj' ? 'mfj' : 'single'];

    // For each claim age, show the taxation impact by age
    const data: Array<{
      age: number;
      provisionalIncome62: number;
      provisionalIncome67: number;
      provisionalIncome70: number;
      zone0: number;
      zone50: number;
      zone85: number;
    }> = [];

    let annual62 = scenarios[0].annualBenefit;
    let annual67 = scenarios[1].annualBenefit;
    let annual70 = scenarios[2].annualBenefit;

    for (let age = 62; age <= 85; age++) {
      const ss62 = age >= 62 ? annual62 : 0;
      const ss67 = age >= fra ? annual67 : 0;
      const ss70 = age >= 70 ? annual70 : 0;

      const prov62 = otherIncome + ss62 * 0.5;
      const prov67 = otherIncome + ss67 * 0.5;
      const prov70 = otherIncome + ss70 * 0.5;

      data.push({
        age,
        provisionalIncome62: Math.round(prov62),
        provisionalIncome67: Math.round(prov67),
        provisionalIncome70: Math.round(prov70),
        zone0: thresholds.lower,
        zone50: thresholds.upper,
        zone85: thresholds.upper + 50000,
      });

      if (age >= 62) annual62 *= (1 + colaRate);
      if (age >= fra) annual67 *= (1 + colaRate);
      if (age >= 70) annual70 *= (1 + colaRate);
    }

    return data;
  }, [scenarios, fra, colaRate, otherIncome, hasCoClient]);

  // ---- COLA Sensitivity table ----
  const colaSensitivity = useMemo(() => {
    const rates = [0.015, 0.020, 0.025, 0.030, 0.035];
    const yearsForward = 10;

    return rates.map((rate) => {
      // Calculate base monthly benefit at each claim age
      const base62 = scenarios[0].monthlyBenefit;
      const baseFRA = scenarios[1].monthlyBenefit;
      const base70 = scenarios[2].monthlyBenefit;

      // Project forward 10 years from the claim age
      const projected62 = base62 * Math.pow(1 + rate, yearsForward);
      const projectedFRA = baseFRA * Math.pow(1 + rate, yearsForward);
      const projected70 = base70 * Math.pow(1 + rate, yearsForward);

      return {
        rate: (rate * 100).toFixed(1) + '%',
        at62: Math.round(projected62),
        atFRA: Math.round(projectedFRA),
        at70: Math.round(projected70),
      };
    });
  }, [scenarios]);

  // ---- Spousal calculations ----
  const spousalData = useMemo(() => {
    if (!hasCoClient) return null;

    const higherPIA = Math.max(pia, coClientPIA);
    const lowerPIA = Math.min(pia, coClientPIA);
    const higherEarnerLabel = pia >= coClientPIA ? 'Client' : 'Co-Client';
    const lowerEarnerLabel = pia >= coClientPIA ? 'Co-Client' : 'Client';

    // Individual benefits at FRA
    const clientBenefitFRA = pia;
    const coClientBenefitFRA = coClientPIA;

    // Spousal benefit = 50% of higher earner's PIA
    const spousalBenefit = Math.round(higherPIA * 0.5);

    // Survivor benefit = 100% of higher earner's PIA at FRA
    const survivorBenefit = higherPIA;

    // Determine if lower earner benefits from spousal
    const lowerOwnBenefit = lowerPIA;
    const spousalTopUp = Math.max(0, spousalBenefit - lowerOwnBenefit);

    let strategy: string;
    if (spousalTopUp > 0) {
      strategy = `${lowerEarnerLabel} should consider claiming spousal benefits ($${formatCurrency(spousalBenefit)}/mo) instead of their own ($${formatCurrency(lowerOwnBenefit)}/mo). ` +
        `${higherEarnerLabel} should consider delaying to age 70 to maximize the survivor benefit to $${formatCurrency(Math.round(higherPIA * 1.24))}/mo.`;
    } else {
      strategy = `Both spouses should claim on their own records. ${higherEarnerLabel} should consider delaying to age 70 to maximize the survivor benefit.`;
    }

    return {
      clientBenefitFRA,
      coClientBenefitFRA,
      spousalBenefit,
      survivorBenefit,
      spousalTopUp,
      higherEarnerLabel,
      lowerEarnerLabel,
      strategy,
    };
  }, [hasCoClient, pia, coClientPIA]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div>
        <PlanNav
          planId={planId}
          clientName="Sarah & Michael Chen"
          planName="Comprehensive Financial Plan"
        />
        <div className="max-w-content mx-auto px-6 py-6">
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-text-muted">Loading Social Security analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Tooltip formatters ----
  const currencyFormatter = (value: number) => formatCurrency(value);
  const compactFormatter = (value: number) => formatCurrencyShort(value);

  return (
    <div className="bg-transparent min-h-screen">
      <PlanNav
        planId={planId}
        clientName="Sarah & Michael Chen"
        planName="Comprehensive Financial Plan"
      />

      <div className="max-w-content mx-auto px-6 py-6 space-y-6">
        {/* Module header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-accent-primarySoft" />
              <h1 className="text-xl font-bold text-text">Social Security</h1>
            </div>
            <p className="text-sm text-text-muted">
              Optimize Social Security claiming strategies for maximum lifetime benefits.
            </p>
          </div>
        </div>

        {/* Input controls bar */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Primary Insurance Amount (PIA)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-text-faint">$</span>
                <input
                  type="number"
                  value={pia}
                  onChange={(e) => setPia(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 text-sm border border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-hidden"
                />
                <span className="text-xs text-text-faint">/mo</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Full Retirement Age
              </label>
              <input
                type="number"
                value={fra}
                onChange={(e) => setFra(Number(e.target.value) || 67)}
                min={65}
                max={67}
                step={1}
                className="w-16 px-2 py-1.5 text-sm border border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                COLA Assumption
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={(colaRate * 100).toFixed(1)}
                  onChange={(e) => setColaRate((Number(e.target.value) || 0) / 100)}
                  step={0.1}
                  min={0}
                  max={10}
                  className="w-16 px-2 py-1.5 text-sm border border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-hidden"
                />
                <span className="text-xs text-text-faint">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Other Income (MAGI)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-text-faint">$</span>
                <input
                  type="number"
                  value={otherIncome}
                  onChange={(e) => setOtherIncome(Number(e.target.value) || 0)}
                  className="w-28 px-2 py-1.5 text-sm border border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-hidden"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="block text-xs font-medium text-text-muted">Co-Client</label>
              <button
                onClick={() => setHasCoClient(!hasCoClient)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  hasCoClient ? 'bg-accent-primary' : 'bg-surface-subtle'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-text transition-transform ${
                    hasCoClient ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {hasCoClient && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Co-Client PIA
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-text-faint">$</span>
                  <input
                    type="number"
                    value={coClientPIA}
                    onChange={(e) => setCoClientPIA(Number(e.target.value) || 0)}
                    className="w-24 px-2 py-1.5 text-sm border border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-hidden"
                  />
                  <span className="text-xs text-text-faint">/mo</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================
            ROW 1: Claiming Strategy Comparison
            ================================================================ */}
        <div>
          <h2 className="text-sm font-semibold text-text-muted mb-3 flex items-center gap-2">
            <DollarSign size={16} className="text-accent-primarySoft" />
            Claiming Strategy Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((s, i) => {
              const isOptimal = i === optimalIndex;
              return (
                <div
                  key={s.claimAge}
                  className={`bg-surface-soft rounded-xl shadow-sm p-5 relative ${
                    isOptimal
                      ? 'border-2 border-accent-primarySoft ring-1 ring-accent-primarySoft/50'
                      : 'border border-border-subtle'
                  }`}
                >
                  {isOptimal && (
                    <span className="absolute -top-2.5 left-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent-primary/15 text-accent-primarySoft">
                      Recommended
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-text mb-3">{s.label}</h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-text-muted">Monthly Benefit</p>
                      <p className="text-2xl font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatCurrency(s.monthlyBenefit)}
                        <span className="text-sm font-normal text-text-faint">/mo</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-text-muted">Annual Benefit</p>
                        <p className="text-sm font-semibold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                          {formatCurrency(s.annualBenefit)}
                          <span className="text-xs font-normal text-text-faint">/yr</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-muted">Adjustment</p>
                        <p className="text-sm font-semibold text-text">
                          {s.adjustmentLabel}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-limestone-100">
                      <p className="text-xs text-text-muted">Lifetime Total (to age 90)</p>
                      <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatCurrencyCompact(s.lifetimeToAge90)}
                      </p>
                    </div>

                    <p className="text-[11px] text-text-faint leading-tight">
                      {s.note}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================================
            ROW 2: Break-Even Chart
            ================================================================ */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <TrendingUp size={16} className="text-accent-primarySoft" />
                Break-Even Analysis
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Cumulative lifetime Social Security income by claiming age
              </p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={breakEvenData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F1EC" />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 11, fill: '#A09888' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  label={{ value: 'Age', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#A09888' }}
                />
                <YAxis
                  tickFormatter={compactFormatter}
                  tick={{ fontSize: 11, fill: '#A09888' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  width={65}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="line"
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="claim62"
                  name="Claim at 62"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="claim67"
                  name={`Claim at ${fra}`}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="claim70"
                  name="Claim at 70"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {/* Break-even reference lines */}
                {breakEvenAge67vs62 && (
                  <ReferenceLine
                    x={breakEvenAge67vs62}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: `BE: ${breakEvenAge67vs62}`,
                      position: 'top',
                      fontSize: 10,
                      fill: '#f59e0b',
                    }}
                  />
                )}
                {breakEvenAge70vs62 && (
                  <ReferenceLine
                    x={breakEvenAge70vs62}
                    stroke="#22c55e"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: `BE: ${breakEvenAge70vs62}`,
                      position: 'top',
                      fontSize: 10,
                      fill: '#22c55e',
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Break-even annotation text */}
          <div className="mt-3 flex flex-wrap gap-4">
            {breakEvenAge67vs62 && (
              <p className="text-xs text-text-muted">
                <span className="inline-block w-3 h-0.5 bg-warning-500 mr-1 align-middle" />
                FRA surpasses 62 at age <span className="font-semibold text-text-muted">{breakEvenAge67vs62}</span>
              </p>
            )}
            {breakEvenAge70vs62 && (
              <p className="text-xs text-text-muted">
                <span className="inline-block w-3 h-0.5 bg-success-500 mr-1 align-middle" />
                Age 70 surpasses 62 at age <span className="font-semibold text-text-muted">{breakEvenAge70vs62}</span>
              </p>
            )}
            {breakEvenAge70vs67 && (
              <p className="text-xs text-text-muted">
                <span className="inline-block w-3 h-0.5 bg-emerald-600 mr-1 align-middle" />
                Age 70 surpasses FRA at age <span className="font-semibold text-text-muted">{breakEvenAge70vs67}</span>
              </p>
            )}
          </div>
          {breakEvenAge70vs62 && (
            <div className="mt-2 bg-accent-primary/10 border border-brand-100 rounded-lg px-3 py-2">
              <p className="text-xs text-accent-primarySoft">
                <AlertCircle size={12} className="inline mr-1 -mt-0.5" />
                If you live past age <span className="font-semibold">{breakEvenAge70vs62}</span>, waiting to 70 pays off compared to claiming at 62.
              </p>
            </div>
          )}
        </div>

        {/* ================================================================
            ROW 3: Spousal Strategy Panel
            ================================================================ */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
          <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
            <Users size={16} className="text-accent-primarySoft" />
            Spousal Strategy
          </h2>

          {hasCoClient && spousalData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-transparent rounded-lg p-4">
                  <p className="text-xs text-text-muted mb-1">Client Benefit at FRA</p>
                  <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(spousalData.clientBenefitFRA)}/mo
                  </p>
                </div>
                <div className="bg-transparent rounded-lg p-4">
                  <p className="text-xs text-text-muted mb-1">Co-Client Benefit at FRA</p>
                  <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(spousalData.coClientBenefitFRA)}/mo
                  </p>
                </div>
                <div className="bg-transparent rounded-lg p-4">
                  <p className="text-xs text-text-muted mb-1">Spousal Benefit (50% of higher)</p>
                  <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(spousalData.spousalBenefit)}/mo
                  </p>
                </div>
                <div className="bg-transparent rounded-lg p-4">
                  <p className="text-xs text-text-muted mb-1">Survivor Benefit (100% of higher)</p>
                  <p className="text-lg font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(spousalData.survivorBenefit)}/mo
                  </p>
                </div>
              </div>

              <div className="bg-accent-primary/10 border border-brand-100 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-accent-primary/80 mb-1">Recommended Coordinated Strategy</p>
                <p className="text-xs text-accent-primarySoft leading-relaxed">
                  {spousalData.strategy}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-8 justify-center">
              <AlertCircle size={18} className="text-text-faint" />
              <p className="text-sm text-text-muted">
                Spousal analysis requires co-client information. Enable the co-client toggle above to see coordinated strategies.
              </p>
            </div>
          )}
        </div>

        {/* ================================================================
            ROW 4: SS Taxation Impact
            ================================================================ */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <DollarSign size={16} className="text-accent-primarySoft" />
              Social Security Taxation Impact
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Provisional income by claim age relative to SS taxation thresholds
            </p>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={taxationData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="zone0Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="zone50Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F1EC" />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 11, fill: '#A09888' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  label={{ value: 'Age', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#A09888' }}
                />
                <YAxis
                  tickFormatter={compactFormatter}
                  tick={{ fontSize: 11, fill: '#A09888' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  width={65}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="line"
                  wrapperStyle={{ fontSize: 12 }}
                />

                {/* Threshold reference lines */}
                <ReferenceLine
                  y={SS_TAX_THRESHOLDS[hasCoClient ? 'mfj' : 'single'].lower}
                  stroke="#22c55e"
                  strokeDasharray="6 3"
                  strokeWidth={1}
                  label={{
                    value: '0% taxable threshold',
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#22c55e',
                  }}
                />
                <ReferenceLine
                  y={SS_TAX_THRESHOLDS[hasCoClient ? 'mfj' : 'single'].upper}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  strokeWidth={1}
                  label={{
                    value: '50% taxable threshold',
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#f59e0b',
                  }}
                />

                {/* Zone shading */}
                <Area
                  type="monotone"
                  dataKey="zone0"
                  name="0% Zone"
                  fill="url(#zone0Gradient)"
                  stroke="none"
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="zone50"
                  name="50% Zone"
                  fill="url(#zone50Gradient)"
                  stroke="none"
                  legendType="none"
                />

                {/* Provisional income lines */}
                <Line
                  type="monotone"
                  dataKey="provisionalIncome62"
                  name="Prov. Income (Claim 62)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="provisionalIncome67"
                  name={`Prov. Income (Claim ${fra})`}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="provisionalIncome70"
                  name="Prov. Income (Claim 70)"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div className="bg-success-50 rounded-lg px-3 py-2">
              <p className="font-semibold text-success-700">0% Taxable Zone</p>
              <p className="text-success-700">
                Provisional income below {formatCurrency(SS_TAX_THRESHOLDS[hasCoClient ? 'mfj' : 'single'].lower)}
              </p>
            </div>
            <div className="bg-warning-50 rounded-lg px-3 py-2">
              <p className="font-semibold text-warning-700">Up to 50% Taxable</p>
              <p className="text-warning-700">
                {formatCurrency(SS_TAX_THRESHOLDS[hasCoClient ? 'mfj' : 'single'].lower)} &ndash; {formatCurrency(SS_TAX_THRESHOLDS[hasCoClient ? 'mfj' : 'single'].upper)}
              </p>
            </div>
            <div className="bg-critical-50 rounded-lg px-3 py-2">
              <p className="font-semibold text-critical-700">Up to 85% Taxable</p>
              <p className="text-critical-700">
                Above {formatCurrency(SS_TAX_THRESHOLDS[hasCoClient ? 'mfj' : 'single'].upper)}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================
            ROW 5: COLA Sensitivity Analysis
            ================================================================ */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <Clock size={16} className="text-accent-primarySoft" />
              COLA Sensitivity Analysis
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Projected monthly benefit 10 years after claiming, under different COLA assumptions
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    COLA Rate
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    At 62
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    At FRA ({fra})
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    At 70
                  </th>
                </tr>
              </thead>
              <tbody>
                {colaSensitivity.map((row, i) => (
                  <tr
                    key={row.rate}
                    className={`border-b border-limestone-50 ${
                      i % 2 === 0 ? 'bg-transparent/50' : 'bg-surface-soft'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium text-text-muted" style={{ fontFeatureSettings: '"tnum"' }}>
                      {row.rate}
                    </td>
                    <td className="py-2.5 px-3 text-right text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                      {formatCurrency(row.at62)}/mo
                    </td>
                    <td className="py-2.5 px-3 text-right text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                      {formatCurrency(row.atFRA)}/mo
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
                      {formatCurrency(row.at70)}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-text-faint">
            Values represent the projected monthly benefit amount 10 years after the respective claim age,
            adjusted for the specified annual COLA rate. Based on a PIA of {formatCurrency(pia)}/mo.
          </p>
        </div>
      </div>
    </div>
  );
}
