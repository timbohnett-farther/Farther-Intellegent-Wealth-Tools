'use client';

import React from 'react';
import { ExecutiveSummaryResult } from '@/lib/types';
import { formatCurrency, formatPercentValue } from '@/lib/format';

interface Props {
  data: ExecutiveSummaryResult;
}

export default function ExecutiveSummarySection({ data }: Props) {
  const levelColors = {
    strongly_favorable: 'bg-success-50 border-success-500 text-success-700',
    favorable: 'bg-teal-500/10 border-teal-500 text-teal-300',
    neutral: 'bg-warning-50 border-warning-500 text-warning-700',
    caution: 'bg-critical-50 border-critical-500 text-critical-700',
  };

  const scoreColor = data.overallScore >= 80
    ? 'text-success-500'
    : data.overallScore >= 60
    ? 'text-teal-300'
    : data.overallScore >= 40
    ? 'text-warning-500'
    : 'text-critical-500';

  const getAssessment = (metric: string, value: number) => {
    switch (metric) {
      case 'savings': return value > 0 ? 'Favorable' : 'Unfavorable';
      case 'margin': return value >= 50 ? 'Favorable' : value >= 30 ? 'Marginal' : 'Unfavorable';
      case 'mc': return value < 5 ? 'Favorable' : value < 15 ? 'Marginal' : 'Unfavorable';
      default: return value > 0 ? 'Favorable' : 'Neutral';
    }
  };

  const getIcon = (assessment: string) => {
    switch (assessment) {
      case 'Favorable': return <span className="text-success-500">&#x2705;</span>;
      case 'Marginal': return <span className="text-warning-500">&#x26A0;&#xFE0F;</span>;
      case 'Unfavorable': return <span className="text-critical-500">&#x1F534;</span>;
      default: return <span className="text-white/30">&#x2139;&#xFE0F;</span>;
    }
  };

  const metrics = [
    {
      factor: 'Annual Interest Savings',
      value: formatCurrency(data.annualInterestSavings) + ' vs. margin',
      assessment: getAssessment('savings', data.annualInterestSavings),
    },
    {
      factor: 'After-Tax Cost',
      value: formatPercentValue(data.afterTaxCost * 100) + ' effective',
      assessment: getAssessment('savings', 1),
    },
    {
      factor: 'Margin Safety',
      value: formatPercentValue(data.marginSafetyDecline) + ' decline to margin call',
      assessment: getAssessment('margin', data.marginSafetyDecline),
    },
    {
      factor: 'Historical Stress Test',
      value: `Survives ${data.historicalStressResult} crashes`,
      assessment: data.historicalStressResult.startsWith('5') ? 'Favorable' : data.historicalStressResult.startsWith('4') ? 'Marginal' : 'Unfavorable',
    },
    {
      factor: 'Monte Carlo MC Probability',
      value: formatPercentValue(data.mcProbability),
      assessment: getAssessment('mc', data.mcProbability),
    },
    {
      factor: 'Tax Deduction Value',
      value: formatCurrency(data.taxDeductionValue) + ' annually',
      assessment: getAssessment('savings', data.taxDeductionValue),
    },
    {
      factor: 'Opportunity Cost of Selling',
      value: formatCurrency(data.opportunityCostOfSelling) + ' over term',
      assessment: getAssessment('savings', data.opportunityCostOfSelling),
    },
    {
      factor: 'Monthly Cash Flow Freed',
      value: formatCurrency(data.monthlyCashFlowFreed) + '/month',
      assessment: getAssessment('savings', data.monthlyCashFlowFreed),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Recommendation Banner */}
      <div className={`p-4 rounded-xl border-2 ${levelColors[data.recommendationLevel]}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Recommendation</h3>
          <div className={`text-3xl font-bold ${scoreColor}`}>
            {Math.round(data.overallScore)}<span className="text-lg">/100</span>
          </div>
        </div>
        <p className="text-sm">{data.recommendation}</p>
      </div>

      {/* Key Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">Annual Savings</p>
          <p className="text-xl font-bold text-savings">{formatCurrency(data.annualInterestSavings)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">After-Tax Rate</p>
          <p className="text-xl font-bold text-box-spread">{formatPercentValue(data.afterTaxCost * 100)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">Margin Safety</p>
          <p className="text-xl font-bold text-safe">{formatPercentValue(data.marginSafetyDecline)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">MC Probability</p>
          <p className={`text-xl font-bold ${data.mcProbability < 5 ? 'text-safe' : data.mcProbability < 15 ? 'text-warning' : 'text-danger'}`}>
            {formatPercentValue(data.mcProbability)}
          </p>
        </div>
      </div>

      {/* Decision Matrix Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h3 className="font-semibold text-sm">Decision Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left px-4 py-2 font-medium text-white/50">Decision Factor</th>
                <th className="text-left px-4 py-2 font-medium text-white/50">Metric</th>
                <th className="text-center px-4 py-2 font-medium text-white/50">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={i} className="border-t border-limestone-100">
                  <td className="px-4 py-2 font-medium">{m.factor}</td>
                  <td className="px-4 py-2 text-white/50">{m.value}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="inline-flex items-center gap-1">
                      {getIcon(m.assessment)} {m.assessment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
