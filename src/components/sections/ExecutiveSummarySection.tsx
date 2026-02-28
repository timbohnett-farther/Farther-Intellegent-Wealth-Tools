'use client';

import React from 'react';
import { ExecutiveSummaryResult } from '@/lib/types';
import { formatCurrency, formatPercentValue } from '@/lib/format';

interface Props {
  data: ExecutiveSummaryResult;
}

export default function ExecutiveSummarySection({ data }: Props) {
  const levelColors = {
    strongly_favorable: 'bg-green-50 border-green-500 text-green-800',
    favorable: 'bg-blue-50 border-blue-500 text-blue-800',
    neutral: 'bg-amber-50 border-amber-500 text-amber-800',
    caution: 'bg-red-50 border-red-500 text-red-800',
  };

  const scoreColor = data.overallScore >= 80
    ? 'text-green-600'
    : data.overallScore >= 60
    ? 'text-blue-600'
    : data.overallScore >= 40
    ? 'text-amber-600'
    : 'text-red-600';

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
      case 'Favorable': return <span className="text-green-500">&#x2705;</span>;
      case 'Marginal': return <span className="text-amber-500">&#x26A0;&#xFE0F;</span>;
      case 'Unfavorable': return <span className="text-red-500">&#x1F534;</span>;
      default: return <span className="text-gray-400">&#x2139;&#xFE0F;</span>;
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
          <p className="text-xs text-gray-500">Annual Savings</p>
          <p className="text-xl font-bold text-savings">{formatCurrency(data.annualInterestSavings)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">After-Tax Rate</p>
          <p className="text-xl font-bold text-box-spread">{formatPercentValue(data.afterTaxCost * 100)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">Margin Safety</p>
          <p className="text-xl font-bold text-safe">{formatPercentValue(data.marginSafetyDecline)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">MC Probability</p>
          <p className={`text-xl font-bold ${data.mcProbability < 5 ? 'text-safe' : data.mcProbability < 15 ? 'text-warning' : 'text-danger'}`}>
            {formatPercentValue(data.mcProbability)}
          </p>
        </div>
      </div>

      {/* Decision Matrix Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-sm">Decision Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Decision Factor</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Metric</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{m.factor}</td>
                  <td className="px-4 py-2 text-gray-600">{m.value}</td>
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
