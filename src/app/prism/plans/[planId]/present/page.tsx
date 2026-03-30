'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Play, Pause, Save, RotateCcw, Download, Settings,
  DollarSign, TrendingUp, Target, Shield, Heart,
  FileText, CheckCircle2, AlertTriangle, ArrowRight,
  PieChart, BarChart3, Briefcase,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, PieChart as RPieChart, Pie, Legend, ComposedChart,
} from 'recharts';

// ==================== TYPES ====================
interface SliderState {
  retirementAge: number;
  monthlySavings: number;
  annualSpending: number;
  ssClaimAge: number;
  marketReturn: number;
}

interface PresentationSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// ==================== CONSTANTS ====================
const SECTIONS: PresentationSection[] = [
  { id: 'net_worth', label: 'Net Worth Summary', icon: <DollarSign size={18} /> },
  { id: 'cash_flow', label: 'Cash Flow Analysis', icon: <BarChart3 size={18} /> },
  { id: 'retirement', label: 'Retirement Readiness', icon: <TrendingUp size={18} /> },
  { id: 'goals', label: 'Goal Progress', icon: <Target size={18} /> },
  { id: 'tax', label: 'Tax Strategy', icon: <Briefcase size={18} /> },
  { id: 'social_security', label: 'Social Security', icon: <Shield size={18} /> },
  { id: 'insurance', label: 'Insurance Review', icon: <Heart size={18} /> },
  { id: 'estate', label: 'Estate Plan Status', icon: <FileText size={18} /> },
  { id: 'actions', label: 'Action Items', icon: <CheckCircle2 size={18} /> },
];

// Demo data
const NET_WORTH_DATA = Array.from({ length: 30 }, (_, i) => ({
  year: 2026 + i,
  assets: 2800000 + i * 180000 + Math.random() * 50000,
  liabilities: Math.max(0, 450000 - i * 22000),
  netWorth: 2350000 + i * 200000 + Math.random() * 50000,
}));

const CASH_FLOW_DATA = Array.from({ length: 15 }, (_, i) => ({
  year: 2026 + i,
  income: 420000 - (i >= 10 ? 280000 : 0) + (i >= 10 ? 85000 : 0),
  expenses: 180000 + i * 3000,
  taxes: (i < 10 ? 95000 : 25000) - i * 1000,
  net: (i < 10 ? 145000 : -30000) + Math.random() * 10000,
}));

const ALLOCATION_DATA = [
  { name: 'US Equity', value: 45, color: '#4E7082' },
  { name: 'Int\'l Equity', value: 15, color: '#7B68EE' },
  { name: 'Fixed Income', value: 25, color: '#A8CED3' },
  { name: 'Alternatives', value: 10, color: '#22c55e' },
  { name: 'Cash', value: 5, color: '#f59e0b' },
];

const GOAL_DATA = [
  { name: 'Retirement at 62', funded: 87, status: 'on_track', amount: '$8.2M needed' },
  { name: 'College — Sarah', funded: 72, status: 'at_risk', amount: '$340K needed' },
  { name: 'Vacation Home', funded: 45, status: 'at_risk', amount: '$800K target' },
  { name: 'Legacy to Children', funded: 95, status: 'on_track', amount: '$2M target' },
];

const ACTION_ITEMS = [
  { priority: 'high', text: 'Max out Roth conversion to $50K this year — saves $18K in future taxes', impact: '+3% success' },
  { priority: 'high', text: 'Increase 401(k) contribution to max ($24,500)', impact: '+2% success' },
  { priority: 'medium', text: 'Review beneficiary designations on retirement accounts', impact: 'Estate protection' },
  { priority: 'medium', text: 'Consider umbrella policy increase to $3M', impact: 'Liability protection' },
  { priority: 'low', text: 'Evaluate Donor-Advised Fund for charitable giving', impact: '$4K tax savings' },
];

// ==================== COMPONENT ====================
export default function PresentationPage() {
  const { planId } = useParams<{ planId: string }>();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [sliders, setSliders] = useState<SliderState>({
    retirementAge: 62,
    monthlySavings: 3500,
    annualSpending: 180000,
    ssClaimAge: 67,
    marketReturn: 7,
  });
  const [baselineSliders] = useState<SliderState>({ ...sliders });

  const successRate = useMemo(() => {
    let rate = 85;
    rate += (sliders.retirementAge - 62) * 3;
    rate += (sliders.monthlySavings - 3500) * 0.001;
    rate -= (sliders.annualSpending - 180000) * 0.00005;
    rate += (sliders.ssClaimAge - 67) * 2;
    rate += (sliders.marketReturn - 7) * 4;
    return Math.max(0, Math.min(99, Math.round(rate)));
  }, [sliders]);

  const baselineRate = 85;
  const delta = successRate - baselineRate;

  function handleSliderChange(key: keyof SliderState, value: number) {
    setSliders((prev) => ({ ...prev, [key]: value }));
  }

  function resetSliders() {
    setSliders({ ...baselineSliders });
  }

  function goNext() {
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection((p) => p + 1);
    }
  }

  function goPrev() {
    if (currentSection > 0) {
      setCurrentSection((p) => p - 1);
    }
  }

  function exitPresentation() {
    router.push(`/prism/plans/${planId}`);
  }

  const section = SECTIONS[currentSection];

  return (
    <div className={`bg-[#3D5A6A] text-text min-h-screen flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Top Bar */}
      <div className="bg-[#3D5A6A]/80 backdrop-blur-sm border-b border-border-subtle px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={exitPresentation} className="text-text-faint hover:text-text transition-colors">
            <X size={20} />
          </button>
          <div className="h-5 w-px bg-surface-subtle" />
          <span className="text-sm font-medium">Presentation Mode</span>
          <span className="text-xs text-text-muted">Smith Family Financial Plan</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-faint">
            {currentSection + 1} / {SECTIONS.length}
          </span>
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className="p-2 text-text-faint hover:text-text transition-colors"
            title={isAutoPlay ? 'Pause auto-advance' : 'Auto-advance slides'}
          >
            {isAutoPlay ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-text-faint hover:text-text transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Section Navigation Pills */}
      <div className="bg-[#3D5A6A]/50 px-6 py-2 flex items-center gap-1 overflow-x-auto">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentSection(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              i === currentSection
                ? 'bg-accent-primary text-text'
                : 'text-text-faint hover:text-text hover:bg-surface-subtle'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Net Worth */}
        {section.id === 'net_worth' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Net Worth Summary</h1>
            <p className="text-text-faint text-lg mb-8">Where you stand today</p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Total Assets', value: '$4,850,000', change: '+12.3%' },
                { label: 'Total Liabilities', value: '$450,000', change: '-8.2%' },
                { label: 'Net Worth', value: '$4,400,000', change: '+15.1%' },
              ].map((card) => (
                <div key={card.label} className="bg-surface-soft/5 rounded-2xl p-6 border border-border-subtle">
                  <p className="text-sm text-text-faint">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                  <p className="text-sm text-success-500 mt-1">{card.change} vs last year</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3 bg-surface-subtle rounded-2xl p-6 border border-border-subtle">
                <h3 className="text-sm font-semibold text-text-faint mb-4">Net Worth Projection</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={NET_WORTH_DATA}>
                    <defs>
                      <linearGradient id="colorNW" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4E7082" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4E7082" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#A09888' }}
                      formatter={(value: number) => [`$${(value / 1000000).toFixed(2)}M`]}
                    />
                    <Area type="monotone" dataKey="netWorth" stroke="#4E7082" fill="url(#colorNW)" strokeWidth={2} name="Net Worth" />
                    <Area type="monotone" dataKey="assets" stroke="#22c55e" fill="none" strokeWidth={1} strokeDasharray="5 5" name="Assets" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="col-span-2 bg-surface-subtle rounded-2xl p-6 border border-border-subtle">
                <h3 className="text-sm font-semibold text-text-faint mb-4">Asset Allocation</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RPieChart>
                    <Pie
                      data={ALLOCATION_DATA}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {ALLOCATION_DATA.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value) => <span style={{ color: '#A09888', fontSize: '12px' }}>{value}</span>}
                    />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Cash Flow */}
        {section.id === 'cash_flow' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Cash Flow Analysis</h1>
            <p className="text-text-faint text-lg mb-8">Income vs expenses over time</p>

            <div className="bg-surface-soft/5 rounded-2xl p-6 border border-border-subtle">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={CASH_FLOW_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 14 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${(value / 1000).toFixed(0)}K`]}
                  />
                  <Bar dataKey="income" fill="#4E7082" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="#E07B54" radius={[4, 4, 0, 0]} name="Expenses" />
                  <Bar dataKey="taxes" fill="#ef4444" radius={[4, 4, 0, 0]} name="Taxes" />
                  <Line type="monotone" dataKey="net" stroke="#22c55e" strokeWidth={2} dot={false} name="Net" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Retirement Readiness */}
        {section.id === 'retirement' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Retirement Readiness</h1>
            <p className="text-text-faint text-lg mb-8">Your probability of achieving retirement goals</p>

            {/* Success Rate Gauge */}
            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <div className="text-8xl font-bold bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  {successRate}%
                </div>
                <p className="text-xl text-text-faint mt-2">Probability of Success</p>
                {delta !== 0 && (
                  <p className={`text-sm mt-1 ${delta > 0 ? 'text-success-500' : 'text-critical-500'}`}>
                    {delta > 0 ? '+' : ''}{delta}% from baseline
                  </p>
                )}
              </div>
            </div>

            {/* Live Planning Sliders */}
            <div className="max-w-2xl mx-auto bg-surface-subtle rounded-2xl p-6 border border-border-subtle">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-faint">Interactive Planning Levers</h3>
                <button onClick={resetSliders} className="text-xs text-text-faint hover:text-text flex items-center gap-1">
                  <RotateCcw size={12} /> Reset
                </button>
              </div>

              {[
                { key: 'retirementAge' as const, label: 'Retirement Age', min: 55, max: 75, step: 1, format: (v: number) => `${v}` },
                { key: 'monthlySavings' as const, label: 'Monthly Savings', min: 0, max: 10000, step: 500, format: (v: number) => `$${v.toLocaleString()}` },
                { key: 'annualSpending' as const, label: 'Annual Spending', min: 100000, max: 300000, step: 5000, format: (v: number) => `$${v.toLocaleString()}` },
                { key: 'ssClaimAge' as const, label: 'SS Claim Age', min: 62, max: 70, step: 1, format: (v: number) => `${v}` },
                { key: 'marketReturn' as const, label: 'Market Return', min: 3, max: 12, step: 0.5, format: (v: number) => `${v}%` },
              ].map(({ key, label, min, max, step, format }) => (
                <div key={key} className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-text-faint">{label}</span>
                    <span className="font-medium text-text">{format(sliders[key])}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={sliders[key]}
                    onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full bg-[#456878] appearance-none cursor-pointer accent-brand-700"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                    <span>{format(min)}</span>
                    <span>{format(max)}</span>
                  </div>
                </div>
              ))}

              <button className="w-full mt-4 px-4 py-2 bg-accent-primary rounded-lg text-sm font-medium hover:bg-accent-primary transition-colors flex items-center justify-center gap-2">
                <Save size={14} /> Save as Scenario
              </button>
            </div>
          </div>
        )}

        {/* Goals */}
        {section.id === 'goals' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Goal Progress</h1>
            <p className="text-text-faint text-lg mb-8">Tracking your financial goals</p>

            <div className="grid grid-cols-2 gap-6">
              {GOAL_DATA.map((goal) => (
                <div key={goal.name} className="bg-surface-soft/5 rounded-2xl p-6 border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{goal.name}</h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        goal.status === 'on_track'
                          ? 'bg-success-500/20 text-success-500'
                          : 'bg-warning-500/20 text-warning-500'
                      }`}
                    >
                      {goal.status === 'on_track' ? 'On Track' : 'Attention Needed'}
                    </span>
                  </div>
                  <p className="text-sm text-text-faint mb-3">{goal.amount}</p>
                  <div className="relative h-4 bg-surface-subtle rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        goal.status === 'on_track' ? 'bg-success-500' : 'bg-warning-500'
                      }`}
                      style={{ width: `${goal.funded}%` }}
                    />
                  </div>
                  <p className="text-right text-sm font-medium mt-1">{goal.funded}% funded</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax Strategy */}
        {section.id === 'tax' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Tax Strategy</h1>
            <p className="text-text-faint text-lg mb-8">Current year and forward-looking tax planning</p>

            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Projected Tax', value: '$98,500', sub: '2026 estimate' },
                { label: 'Effective Rate', value: '23.5%', sub: 'Federal + State' },
                { label: 'Roth Conversion Opportunity', value: '$50,000', sub: 'Fill 24% bracket' },
                { label: 'Lifetime Tax Savings', value: '$142,000', sub: 'With Roth strategy' },
              ].map((card) => (
                <div key={card.label} className="bg-surface-soft/5 rounded-2xl p-5 border border-border-subtle">
                  <p className="text-xs text-text-faint">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-text-muted mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-surface-soft/5 rounded-2xl p-6 border border-border-subtle">
              <h3 className="text-sm font-semibold text-text-faint mb-3">Key Tax Recommendations</h3>
              <div className="space-y-3">
                {[
                  'Convert $50,000 from Traditional IRA to Roth IRA (fills 24% bracket without IRMAA impact)',
                  'Bunch charitable giving using DAF — fund with appreciated stock to avoid $12K capital gains tax',
                  'Harvest $15,000 in tax losses from international fund position',
                  'Contribute max $7,500 to HSA for triple tax benefit',
                ].map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-text-faint">
                    <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-accent-primarySoft">{i + 1}</span>
                    </div>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Social Security */}
        {section.id === 'social_security' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Social Security Strategy</h1>
            <p className="text-text-faint text-lg mb-8">Optimal claiming recommendation</p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              {[
                { age: 62, monthly: '$2,100', annual: '$25,200', label: 'Early Claiming', note: 'Reduced 30%' },
                { age: 67, monthly: '$3,000', annual: '$36,000', label: 'Full Retirement Age', note: 'Full benefit' },
                { age: 70, monthly: '$3,720', annual: '$44,640', label: 'Delayed Claiming', note: '+24% increase' },
              ].map((opt) => (
                <div
                  key={opt.age}
                  className={`bg-surface-subtle rounded-2xl p-6 border ${
                    opt.age === 70 ? 'border-success-500/50 ring-1 ring-success-500/20' : 'border-border-subtle'
                  }`}
                >
                  {opt.age === 70 && (
                    <span className="text-xs font-medium text-success-500 mb-2 block">Recommended</span>
                  )}
                  <p className="text-4xl font-bold">Age {opt.age}</p>
                  <p className="text-sm text-text-faint mt-1">{opt.label}</p>
                  <div className="mt-4 space-y-1">
                    <p className="text-lg font-semibold">{opt.monthly}/mo</p>
                    <p className="text-sm text-text-faint">{opt.annual}/year</p>
                    <p className="text-xs text-text-muted">{opt.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-surface-soft/5 rounded-2xl p-6 border border-border-subtle">
              <p className="text-sm text-text-faint">
                <strong>Recommendation:</strong> Delay Social Security to age 70 for maximum lifetime benefit.
                Break-even age vs claiming at 62 is age 80. With your family longevity (both parents lived to 90+),
                the delayed strategy provides an additional <strong>$288,000</strong> in cumulative benefits by age 90.
              </p>
            </div>
          </div>
        )}

        {/* Insurance */}
        {section.id === 'insurance' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Insurance Review</h1>
            <p className="text-text-faint text-lg mb-8">Coverage gaps and recommendations</p>

            <div className="space-y-4">
              {[
                { type: 'Life Insurance', current: '$1,000,000 term', need: '$2,500,000', status: 'gap', gap: '$1,500,000 shortfall' },
                { type: 'Disability', current: '60% of salary (employer)', need: '70% of income', status: 'gap', gap: 'No individual supplemental' },
                { type: 'Umbrella', current: '$1,000,000', need: '$3,000,000', status: 'gap', gap: 'Increase recommended' },
                { type: 'Long-Term Care', current: 'None', need: 'Evaluate by age 55', status: 'warning', gap: 'No coverage in place' },
              ].map((ins) => (
                <div key={ins.type} className="bg-surface-soft/5 rounded-2xl p-5 border border-border-subtle flex items-center gap-6">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{ins.type}</h3>
                    <p className="text-sm text-text-faint">Current: {ins.current}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-faint">Recommended: {ins.need}</p>
                    <p className="text-sm text-warning-500 flex items-center gap-1 justify-end">
                      <AlertTriangle size={14} /> {ins.gap}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estate */}
        {section.id === 'estate' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Estate Plan Status</h1>
            <p className="text-text-faint text-lg mb-8">Document checklist and planning status</p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { doc: 'Last Will & Testament', status: 'in_place', date: '2023' },
                { doc: 'Revocable Living Trust', status: 'in_place', date: '2023' },
                { doc: 'Durable Power of Attorney', status: 'needs_update', date: '2019' },
                { doc: 'Healthcare Proxy', status: 'needs_update', date: '2019' },
                { doc: 'HIPAA Authorization', status: 'not_in_place', date: null },
                { doc: 'Beneficiary Review', status: 'needs_update', date: '2021' },
              ].map((item) => (
                <div key={item.doc} className="bg-surface-soft/5 rounded-xl p-4 border border-border-subtle flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.status === 'in_place'
                        ? 'bg-success-500/20'
                        : item.status === 'needs_update'
                        ? 'bg-warning-500/20'
                        : 'bg-critical-500/20'
                    }`}
                  >
                    {item.status === 'in_place' ? (
                      <CheckCircle2 size={20} className="text-success-500" />
                    ) : item.status === 'needs_update' ? (
                      <AlertTriangle size={20} className="text-warning-500" />
                    ) : (
                      <X size={20} className="text-critical-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.doc}</p>
                    <p className="text-xs text-text-muted">
                      {item.status === 'in_place' ? `Updated ${item.date}` : item.status === 'needs_update' ? `Last updated ${item.date}` : 'Not in place'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {section.id === 'actions' && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Action Items</h1>
            <p className="text-text-faint text-lg mb-8">Prioritized next steps for your plan</p>

            <div className="space-y-4 max-w-3xl">
              {ACTION_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="bg-surface-soft/5 rounded-2xl p-5 border border-border-subtle flex items-start gap-4"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.priority === 'high'
                        ? 'bg-critical-500/20'
                        : item.priority === 'medium'
                        ? 'bg-warning-500/20'
                        : 'bg-accent-primary/20'
                    }`}
                  >
                    <span
                      className={`text-xs font-bold ${
                        item.priority === 'high'
                          ? 'text-critical-500'
                          : item.priority === 'medium'
                          ? 'text-warning-500'
                          : 'text-accent-primarySoft'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.priority === 'high'
                            ? 'bg-critical-500/20 text-critical-500'
                            : item.priority === 'medium'
                            ? 'bg-warning-500/20 text-warning-500'
                            : 'bg-accent-primary/20 text-accent-primarySoft'
                        }`}
                      >
                        {item.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-success-500">{item.impact}</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-text-muted mt-1" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-[#3D5A6A]/80 backdrop-blur-sm border-t border-border-subtle px-8 py-4 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentSection === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-faint hover:text-text hover:bg-surface-subtle"
        >
          <ChevronLeft size={18} />
          Previous
        </button>

        <div className="flex items-center gap-1">
          {SECTIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSection(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentSection ? 'bg-accent-primary' : 'bg-surface-subtle0 hover:bg-surface-subtle'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentSection === SECTIONS.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-accent-primary text-text hover:bg-accent-primary"
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
