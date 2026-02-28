'use client';

import React, { useState } from 'react';
import type {
  ModelPortfolio,
  BacktestResult,
  ModelAllocation,
  RiskBand,
} from '@/lib/risk-profile/types';
import { RISK_BAND_LABELS } from '@/lib/risk-profile/types';

interface BacktestComparisonProps {
  conservative: { portfolio: ModelPortfolio; backtest: BacktestResult };
  recommended: { portfolio: ModelPortfolio; backtest: BacktestResult };
  aggressive: { portfolio: ModelPortfolio; backtest: BacktestResult };
}

const ALLOC_COLORS: Record<keyof ModelAllocation, { color: string; label: string }> = {
  usEquity: { color: '#3B82F6', label: 'US Equity' },
  intlEquity: { color: '#6366F1', label: "Int'l Equity" },
  emEquity: { color: '#8B5CF6', label: 'EM Equity' },
  govBonds: { color: '#10B981', label: 'Gov Bonds' },
  corpBonds: { color: '#14B8A6', label: 'Corp Bonds' },
  highYield: { color: '#F59E0B', label: 'High Yield' },
  reits: { color: '#F97316', label: 'REITs' },
  commodities: { color: '#EF4444', label: 'Commodities' },
  alternatives: { color: '#EC4899', label: 'Alternatives' },
  crypto: { color: '#A855F7', label: 'Crypto' },
  cash: { color: '#6B7280', label: 'Cash' },
};

function AllocationBar({ allocation }: { allocation: ModelAllocation }) {
  const entries = (Object.entries(allocation) as [keyof ModelAllocation, number][])
    .filter(([, v]) => v > 0);

  return (
    <div>
      <div className="flex h-6 rounded-md overflow-hidden">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-center text-white text-[9px] font-semibold transition-all"
            style={{ width: `${value}%`, backgroundColor: ALLOC_COLORS[key].color, minWidth: value > 3 ? undefined : 0 }}
            title={`${ALLOC_COLORS[key].label}: ${value}%`}
          >
            {value >= 8 ? `${value}%` : ''}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ALLOC_COLORS[key].color }} />
            <span className="text-[10px] text-gray-500">{ALLOC_COLORS[key].label} {value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, suffix, highlight }: { label: string; value: string; suffix?: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>
        {value}{suffix}
      </p>
    </div>
  );
}

function ColumnCard({
  portfolio,
  backtest,
  label,
  isRecommended,
}: {
  portfolio: ModelPortfolio;
  backtest: BacktestResult;
  label: string;
  isRecommended: boolean;
}) {
  const m = backtest.metrics;

  return (
    <div className={`card p-5 ${isRecommended ? 'ring-2 ring-blue-400 border-blue-200' : ''}`}>
      {isRecommended && (
        <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-2">Recommended</div>
      )}
      <h5 className="text-sm font-semibold text-gray-900 mb-1">{label}</h5>
      <p className="text-xs text-gray-500 mb-4">
        Band {portfolio.band} — {RISK_BAND_LABELS[portfolio.band]}
      </p>

      {/* Allocation */}
      <AllocationBar allocation={portfolio.allocation} />

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        <MetricCard label="Expected Return" value={portfolio.expectedReturn.toFixed(1)} suffix="%" highlight />
        <MetricCard label="Volatility" value={portfolio.expectedVolatility.toFixed(1)} suffix="%" />
        <MetricCard label="Max Drawdown" value={portfolio.maxDrawdown.toFixed(0)} suffix="%" />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <MetricCard label="CAGR" value={m.cagr.toFixed(1)} suffix="%" />
        <MetricCard label="Worst Year" value={m.worstYear.toFixed(0)} suffix="%" />
        <MetricCard label="% Neg Years" value={m.percentNegativeYears.toFixed(0)} suffix="%" />
      </div>

      {/* Crash scenarios */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Crash Scenarios</p>
        <div className="space-y-1.5">
          {backtest.crashScenarios.map((crash, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{crash.name}</span>
              <span className="font-semibold text-red-600">{crash.loss.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReturnChart({ backtests }: { backtests: BacktestResult[] }) {
  if (backtests.length === 0 || backtests[0].annualReturns.length === 0) return null;

  const years = backtests[0].annualReturns.map(r => r.year);
  const allReturns = backtests.flatMap(b => b.annualReturns.map(r => r.return));
  const maxR = Math.max(...allReturns, 5);
  const minR = Math.min(...allReturns, -5);
  const range = maxR - minR;

  const colors = ['#10B981', '#3B82F6', '#F59E0B'];
  const labels = ['-1 Band', 'Recommended', '+1 Band'];

  const chartWidth = Math.max(years.length * 22, 600);

  return (
    <div className="card p-5">
      <h5 className="text-sm font-semibold text-gray-700 mb-1">Historical Annual Returns (1994–2025)</h5>
      <div className="flex items-center gap-4 mb-3">
        {backtests.map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-full" style={{ backgroundColor: colors[i] }} />
            <span className="text-[10px] text-gray-500">{labels[i]}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} 200`} className="w-full" style={{ minWidth: chartWidth }}>
          {/* Zero line */}
          <line
            x1="0"
            y1={((maxR) / range) * 180 + 10}
            x2={chartWidth}
            y2={((maxR) / range) * 180 + 10}
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {/* Lines for each band */}
          {backtests.map((bt, bi) => {
            const points = bt.annualReturns.map((r, i) => {
              const x = i * (chartWidth / (years.length - 1));
              const y = ((maxR - r.return) / range) * 180 + 10;
              return `${x},${y}`;
            }).join(' ');

            return (
              <polyline
                key={bi}
                points={points}
                fill="none"
                stroke={colors[bi]}
                strokeWidth={bi === 1 ? '2' : '1.2'}
                strokeOpacity={bi === 1 ? 1 : 0.6}
              />
            );
          })}

          {/* Year labels (every 5 years) */}
          {years.map((year, i) => {
            if (year % 5 !== 0) return null;
            const x = i * (chartWidth / (years.length - 1));
            return (
              <text key={year} x={x} y="198" textAnchor="middle" className="fill-gray-400" fontSize="9">
                {year}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function BacktestComparison({
  conservative,
  recommended,
  aggressive,
}: BacktestComparisonProps) {
  const [showChart, setShowChart] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Portfolio Comparison — Move Risk ±1 Band</h4>
        <button
          onClick={() => setShowChart(!showChart)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          {showChart ? 'Hide Chart' : 'Show Chart'}
        </button>
      </div>

      {/* Three-column comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ColumnCard
          portfolio={conservative.portfolio}
          backtest={conservative.backtest}
          label="Conservative (−1)"
          isRecommended={false}
        />
        <ColumnCard
          portfolio={recommended.portfolio}
          backtest={recommended.backtest}
          label="Recommended"
          isRecommended={true}
        />
        <ColumnCard
          portfolio={aggressive.portfolio}
          backtest={aggressive.backtest}
          label="Aggressive (+1)"
          isRecommended={false}
        />
      </div>

      {/* Historical chart */}
      {showChart && (
        <ReturnChart
          backtests={[conservative.backtest, recommended.backtest, aggressive.backtest]}
        />
      )}

      <p className="text-[10px] text-gray-400">
        Historical performance is based on index proxies and does not represent actual portfolio returns.
        Past performance does not guarantee future results.
      </p>
    </div>
  );
}
