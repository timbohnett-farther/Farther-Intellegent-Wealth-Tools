'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, Calendar, PieChart as PieChartIcon, Plus, Trash2,
  DollarSign, Shield, Target, ArrowUpRight, ArrowDownRight,
  ChevronRight, AlertTriangle, CheckCircle, Info, Briefcase,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RSUGrant {
  id: string;
  company: string;
  ticker: string;
  grantDate: string;
  sharesGranted: number;
  grantPrice: number;
  vestingSchedule: string;
  sharesVested: number;
  sharesHeld: number;
  currentFMV: number;
}

interface StockOption {
  id: string;
  type: 'NQSO' | 'ISO';
  company: string;
  ticker: string;
  grantDate: string;
  exercisePrice: number;
  currentFMV: number;
  shares: number;
  expiration: string;
  exercised: boolean;
}

interface ESPPPurchase {
  id: string;
  company: string;
  ticker: string;
  offeringPeriod: string;
  purchaseDate: string;
  shares: number;
  purchasePrice: number;
  fmvAtPurchase: number;
  currentFMV: number;
}

interface ConcentratedPosition {
  stock: string;
  ticker: string;
  sharesHeld: number;
  costBasis: number;
  currentPrice: number;
  holdingPeriod: string;
  portfolioValue: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt$(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

const TABS = [
  'Holdings Summary',
  'RSU / Restricted Stock',
  'Stock Options (NQSO / ISO)',
  'ESPP',
  'Vesting Calendar',
  'Concentrated Position Strategy',
  'Exercise / Sale Optimizer',
] as const;

type TabName = typeof TABS[number];

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_RSU_GRANTS: RSUGrant[] = [
  {
    id: '1', company: 'Alphabet Inc.', ticker: 'GOOGL', grantDate: '2023-03-15',
    sharesGranted: 200, grantPrice: 98.50, vestingSchedule: '4yr / quarterly',
    sharesVested: 100, sharesHeld: 80, currentFMV: 178.25,
  },
  {
    id: '2', company: 'Alphabet Inc.', ticker: 'GOOGL', grantDate: '2024-03-15',
    sharesGranted: 150, grantPrice: 141.00, vestingSchedule: '4yr / quarterly',
    sharesVested: 37, sharesHeld: 37, currentFMV: 178.25,
  },
];

const SAMPLE_OPTIONS: StockOption[] = [
  {
    id: '1', type: 'ISO', company: 'Alphabet Inc.', ticker: 'GOOGL',
    grantDate: '2022-01-15', exercisePrice: 68.50, currentFMV: 178.25,
    shares: 500, expiration: '2032-01-15', exercised: false,
  },
  {
    id: '2', type: 'NQSO', company: 'Alphabet Inc.', ticker: 'GOOGL',
    grantDate: '2023-06-01', exercisePrice: 120.00, currentFMV: 178.25,
    shares: 300, expiration: '2033-06-01', exercised: false,
  },
];

const SAMPLE_ESPP: ESPPPurchase[] = [
  {
    id: '1', company: 'Alphabet Inc.', ticker: 'GOOGL',
    offeringPeriod: 'Jan 2025 - Jun 2025', purchaseDate: '2025-06-30',
    shares: 50, purchasePrice: 127.50, fmvAtPurchase: 165.00, currentFMV: 178.25,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EquityCompPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [activeTab, setActiveTab] = useState<TabName>('Holdings Summary');

  // RSU state
  const [rsuGrants, setRsuGrants] = useState<RSUGrant[]>(SAMPLE_RSU_GRANTS);
  const [showAddRSU, setShowAddRSU] = useState(false);
  const [newRSU, setNewRSU] = useState<Partial<RSUGrant>>({});
  const [selectedRSU, setSelectedRSU] = useState<string | null>(null);

  // RSU tax calc state
  const [rsuVestShares, setRsuVestShares] = useState(25);
  const [rsuVestFMV, setRsuVestFMV] = useState(178.25);
  const [rsuFedRate, setRsuFedRate] = useState(24);
  const [rsuStateRate, setRsuStateRate] = useState(5);
  const [rsuTaxStrategy, setRsuTaxStrategy] = useState<'sell-to-cover' | 'sell-all' | 'hold'>('sell-to-cover');

  // Options state
  const [options, setOptions] = useState<StockOption[]>(SAMPLE_OPTIONS);
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOption, setNewOption] = useState<Partial<StockOption>>({ type: 'ISO' });
  const [optExerciseShares, setOptExerciseShares] = useState(100);
  const [optFedRate, setOptFedRate] = useState(24);
  const [optStateRate, setOptStateRate] = useState(5);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isoAMTExemption, setIsoAMTExemption] = useState(85700);

  // ESPP state
  const [esppPurchases, setEsppPurchases] = useState<ESPPPurchase[]>(SAMPLE_ESPP);
  const [showAddESPP, setShowAddESPP] = useState(false);
  const [newESPP, setNewESPP] = useState<Partial<ESPPPurchase>>({});
  const [esppSaleShares, setEsppSaleShares] = useState(50);
  const [esppSalePrice, setEsppSalePrice] = useState(178.25);
  const [esppQualifying, setEsppQualifying] = useState(true);

  // Concentrated position state
  const [concPos, setConcPos] = useState<ConcentratedPosition>({
    stock: 'Alphabet Inc.', ticker: 'GOOGL', sharesHeld: 617,
    costBasis: 62.00, currentPrice: 178.25, holdingPeriod: '>1 year',
    portfolioValue: 850000,
  });

  // Optimizer state
  const [optProjectedIncome, setOptProjectedIncome] = useState([
    { year: 2026, income: 350000 }, { year: 2027, income: 365000 },
    { year: 2028, income: 380000 }, { year: 2029, income: 400000 },
    { year: 2030, income: 420000 },
  ]);

  // ---------------------------------------------------------------------------
  // Derived calculations
  // ---------------------------------------------------------------------------

  const totalRSUValue = rsuGrants.reduce((sum, g) => sum + g.sharesHeld * g.currentFMV, 0);
  const totalOptionsIntrinsic = options.reduce((sum, o) =>
    sum + Math.max(0, o.currentFMV - o.exercisePrice) * o.shares, 0);
  const totalESPPValue = esppPurchases.reduce((sum, p) => sum + p.shares * p.currentFMV, 0);
  const totalEquityValue = totalRSUValue + totalOptionsIntrinsic + totalESPPValue;

  const totalCostBasis = rsuGrants.reduce((sum, g) => sum + g.sharesHeld * g.grantPrice, 0)
    + esppPurchases.reduce((sum, p) => sum + p.shares * p.purchasePrice, 0);
  const totalUnrealizedGain = totalRSUValue + totalESPPValue - totalCostBasis;

  const portfolioValue = 850000;
  const equityPctOfPortfolio = (totalEquityValue / portfolioValue) * 100;

  // Pie chart data
  const allocationData = [
    { name: 'RSUs', value: totalRSUValue },
    { name: 'Stock Options', value: totalOptionsIntrinsic },
    { name: 'ESPP', value: totalESPPValue },
  ].filter(d => d.value > 0);

  // RSU tax calculations
  const rsuOrdinaryIncome = rsuVestShares * rsuVestFMV;
  const rsuFederalTax = rsuOrdinaryIncome * (rsuFedRate / 100);
  const rsuFICA = rsuOrdinaryIncome * 0.0765;
  const rsuStateTax = rsuOrdinaryIncome * (rsuStateRate / 100);
  const rsuTotalTax = rsuFederalTax + rsuFICA + rsuStateTax;
  const rsuNetShares = rsuTaxStrategy === 'sell-all' ? 0 :
    rsuTaxStrategy === 'sell-to-cover' ? Math.floor(rsuVestShares - (rsuTotalTax / rsuVestFMV)) : rsuVestShares;
  const rsuNetCashValue = rsuTaxStrategy === 'sell-all' ? (rsuVestShares * rsuVestFMV) - rsuTotalTax :
    rsuTaxStrategy === 'sell-to-cover' ? 0 : -(rsuTotalTax);

  // Hold 1yr comparison
  const rsuLTCGRate = 15;
  const rsuHold1YrGain = rsuVestShares * rsuVestFMV * 0.10; // assume 10% appreciation
  const rsuHold1YrTax = rsuOrdinaryIncome * ((rsuFedRate + rsuStateRate) / 100 + 0.0765)
    + rsuHold1YrGain * (rsuLTCGRate / 100);
  const rsuHold1YrNet = (rsuVestShares * rsuVestFMV * 1.10) - rsuHold1YrTax;

  // Options calculations
  const selectedOpt = options.find(o => o.id === (selectedOption || options[0]?.id));
  const optSpread = selectedOpt ? Math.max(0, selectedOpt.currentFMV - selectedOpt.exercisePrice) : 0;
  const optGrossIncome = optSpread * optExerciseShares;
  const optFedTax = selectedOpt?.type === 'NQSO' ? optGrossIncome * (optFedRate / 100) : 0;
  const optFICATax = selectedOpt?.type === 'NQSO' ? optGrossIncome * 0.0765 : 0;
  const optStateTaxAmt = selectedOpt?.type === 'NQSO' ? optGrossIncome * (optStateRate / 100) : 0;
  const optNetAfterTax = optGrossIncome - optFedTax - optFICATax - optStateTaxAmt;

  // ISO AMT
  const isoAMTPreference = selectedOpt?.type === 'ISO' ? optSpread * optExerciseShares : 0;
  const isoAMTBase = isoAMTPreference - isoAMTExemption;
  const isoAMTImpact = Math.max(0, isoAMTBase * 0.26);
  const isoMaxBeforeAMT = isoAMTExemption > 0 && optSpread > 0
    ? Math.floor(isoAMTExemption / optSpread) : 0;

  // ESPP calculations
  const esppPurchase = esppPurchases[0];
  const esppDiscount = esppPurchase ? (esppPurchase.fmvAtPurchase - esppPurchase.purchasePrice) : 0;
  const esppDiscountPct = esppPurchase ? (esppDiscount / esppPurchase.fmvAtPurchase) * 100 : 0;
  const esppOrdinaryIncome = esppQualifying
    ? Math.min(esppDiscount, esppPurchase?.fmvAtPurchase * 0.15 || 0) * esppSaleShares
    : esppDiscount * esppSaleShares;
  const esppCapGain = (esppSalePrice - (esppQualifying
    ? esppPurchase?.purchasePrice + esppOrdinaryIncome / esppSaleShares
    : esppPurchase?.fmvAtPurchase || 0)) * esppSaleShares;

  // Concentrated position calculations
  const concValue = concPos.sharesHeld * concPos.currentPrice;
  const concGain = concPos.sharesHeld * (concPos.currentPrice - concPos.costBasis);
  const concPct = (concValue / concPos.portfolioValue) * 100;
  const concDrop50 = concPos.sharesHeld * concPos.currentPrice * 0.50;
  const concDrop75 = concPos.sharesHeld * concPos.currentPrice * 0.75;

  // Vesting calendar data
  const vestingEvents = [
    { year: 2026, quarter: 'Q1', month: 'Jan', grant: 'RSU #1', shares: 12, estValue: 12 * 178.25, estTax: 12 * 178.25 * 0.40 },
    { year: 2026, quarter: 'Q1', month: 'Mar', grant: 'RSU #2', shares: 9, estValue: 9 * 178.25, estTax: 9 * 178.25 * 0.40 },
    { year: 2026, quarter: 'Q2', month: 'Apr', grant: 'RSU #1', shares: 12, estValue: 12 * 178.25, estTax: 12 * 178.25 * 0.40 },
    { year: 2026, quarter: 'Q2', month: 'Jun', grant: 'RSU #2', shares: 9, estValue: 9 * 178.25, estTax: 9 * 178.25 * 0.40 },
    { year: 2026, quarter: 'Q3', month: 'Jul', grant: 'RSU #1', shares: 13, estValue: 13 * 178.25, estTax: 13 * 178.25 * 0.40 },
    { year: 2026, quarter: 'Q3', month: 'Sep', grant: 'RSU #2', shares: 10, estValue: 10 * 178.25, estTax: 10 * 178.25 * 0.40 },
    { year: 2026, quarter: 'Q4', month: 'Oct', grant: 'RSU #1', shares: 13, estValue: 13 * 178.25, estTax: 13 * 178.25 * 0.40 },
    { year: 2026, quarter: 'Q4', month: 'Dec', grant: 'RSU #2', shares: 10, estValue: 10 * 178.25, estTax: 10 * 178.25 * 0.40 },
    { year: 2027, quarter: 'Q1', month: 'Jan', grant: 'RSU #1', shares: 12, estValue: 12 * 185.00, estTax: 12 * 185.00 * 0.40 },
    { year: 2027, quarter: 'Q1', month: 'Mar', grant: 'RSU #2', shares: 9, estValue: 9 * 185.00, estTax: 9 * 185.00 * 0.40 },
    { year: 2027, quarter: 'Q2', month: 'Apr', grant: 'RSU #1', shares: 12, estValue: 12 * 185.00, estTax: 12 * 185.00 * 0.40 },
    { year: 2027, quarter: 'Q2', month: 'Jun', grant: 'RSU #2', shares: 10, estValue: 10 * 185.00, estTax: 10 * 185.00 * 0.40 },
  ];

  // Exercise optimizer data
  const optimizerPlan = optProjectedIncome.map((yr, i) => {
    const availableOptions = options.reduce((sum, o) => sum + o.shares, 0) - i * 100;
    const recommended = Math.min(100, availableOptions);
    const spread = 58.25;
    const taxCost = recommended * spread * 0.35;
    return {
      year: yr.year,
      projectedIncome: yr.income,
      availableOptions: Math.max(0, availableOptions),
      recommendedExercise: recommended,
      taxCost,
      cumulativeTax: taxCost * (i + 1),
    };
  });

  // ---------------------------------------------------------------------------
  // Add/Remove handlers
  // ---------------------------------------------------------------------------

  function addRSUGrant() {
    if (!newRSU.company || !newRSU.ticker) return;
    const grant: RSUGrant = {
      id: generateId(),
      company: newRSU.company || '',
      ticker: newRSU.ticker || '',
      grantDate: newRSU.grantDate || new Date().toISOString().split('T')[0],
      sharesGranted: newRSU.sharesGranted || 0,
      grantPrice: newRSU.grantPrice || 0,
      vestingSchedule: newRSU.vestingSchedule || '4yr / quarterly',
      sharesVested: 0,
      sharesHeld: 0,
      currentFMV: newRSU.currentFMV || 0,
    };
    setRsuGrants([...rsuGrants, grant]);
    setNewRSU({});
    setShowAddRSU(false);
  }

  function removeRSUGrant(id: string) {
    setRsuGrants(rsuGrants.filter(g => g.id !== id));
  }

  function addOptionGrant() {
    if (!newOption.company || !newOption.ticker) return;
    const opt: StockOption = {
      id: generateId(),
      type: newOption.type || 'ISO',
      company: newOption.company || '',
      ticker: newOption.ticker || '',
      grantDate: newOption.grantDate || new Date().toISOString().split('T')[0],
      exercisePrice: newOption.exercisePrice || 0,
      currentFMV: newOption.currentFMV || 0,
      shares: newOption.shares || 0,
      expiration: newOption.expiration || '',
      exercised: false,
    };
    setOptions([...options, opt]);
    setNewOption({ type: 'ISO' });
    setShowAddOption(false);
  }

  function removeOption(id: string) {
    setOptions(options.filter(o => o.id !== id));
  }

  function addESPPPurchase() {
    if (!newESPP.company || !newESPP.ticker) return;
    const purchase: ESPPPurchase = {
      id: generateId(),
      company: newESPP.company || '',
      ticker: newESPP.ticker || '',
      offeringPeriod: newESPP.offeringPeriod || '',
      purchaseDate: newESPP.purchaseDate || new Date().toISOString().split('T')[0],
      shares: newESPP.shares || 0,
      purchasePrice: newESPP.purchasePrice || 0,
      fmvAtPurchase: newESPP.fmvAtPurchase || 0,
      currentFMV: newESPP.currentFMV || 0,
    };
    setEsppPurchases([...esppPurchases, purchase]);
    setNewESPP({});
    setShowAddESPP(false);
  }

  function removeESPP(id: string) {
    setEsppPurchases(esppPurchases.filter(p => p.id !== id));
  }

  // ---------------------------------------------------------------------------
  // Custom tooltip
  // ---------------------------------------------------------------------------

  function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold text-white">{payload[0].name}</p>
        <p className="text-white/60">{fmt$(payload[0].value)}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      <PlanNav
        planId={planId}
        clientName="Sarah & Michael Chen"
        planName="Comprehensive Financial Plan"
      />

      <div className="max-w-content mx-auto px-6 py-6">
        {/* Module header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={20} className="text-teal-300" />
              <h1 className="text-xl font-bold text-white">Equity Compensation</h1>
            </div>
            <p className="text-sm text-white/50">
              Model stock options, RSUs, ESPP, and other equity compensation strategies.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-white/[0.06] mb-6">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-brand-500 text-teal-300'
                    : 'border-transparent text-white/50 hover:border-white/[0.10] hover:text-white/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* ================================================================ */}
        {/* TAB 1: Holdings Summary                                         */}
        {/* ================================================================ */}
        {activeTab === 'Holdings Summary' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={16} className="text-teal-300" />
                  <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Total Equity Value</span>
                </div>
                <p className="font-serif text-3xl text-white tracking-wide">{fmt$(totalEquityValue)}</p>
                <p className="text-xs text-success-500 mt-1 flex items-center gap-1">
                  <ArrowUpRight size={12} /> +12.4% YTD
                </p>
              </div>
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-success-500" />
                  <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Unrealized Gain</span>
                </div>
                <p className="text-2xl font-bold text-success-500">{fmt$(totalUnrealizedGain)}</p>
                <p className="text-xs text-white/50 mt-1">Cost basis: {fmt$(totalCostBasis)}</p>
              </div>
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                  <PieChartIcon size={16} className="text-indigo-500" />
                  <span className="text-xs font-medium text-white/50 uppercase tracking-wide">% of Portfolio</span>
                </div>
                <p className="font-serif text-3xl text-white tracking-wide">{fmtPct(equityPctOfPortfolio)}</p>
                <p className="text-xs text-white/50 mt-1">Portfolio: {fmt$(portfolioValue)}</p>
                {equityPctOfPortfolio > 20 && (
                  <p className="text-xs text-warning-500 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> High concentration
                  </p>
                )}
              </div>
            </div>

            {/* Summary Table + Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table */}
              <div className="lg:col-span-2 bg-white/[0.07] backdrop-blur-xl rounded-xl border border-white/[0.06] shadow-sm">
                <div className="px-5 py-4 border-b border-limestone-100">
                  <h3 className="text-sm font-semibold text-white">Holdings Detail</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-limestone-100 bg-transparent">
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Type</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Company</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Ticker</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Shares</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Price</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Value</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Gain</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-limestone-50">
                      {rsuGrants.map((g) => (
                        <tr key={`rsu-${g.id}`} className="hover:bg-white/[0.04]">
                          <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">RSU</span></td>
                          <td className="px-4 py-2.5 font-medium text-white">{g.company}</td>
                          <td className="px-4 py-2.5 text-white/60">{g.ticker}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-white">{g.sharesHeld}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-white">${g.currentFMV.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-white">{fmt$(g.sharesHeld * g.currentFMV)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-success-500">{fmt$(g.sharesHeld * (g.currentFMV - g.grantPrice))}</td>
                          <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">Vested</span></td>
                        </tr>
                      ))}
                      {options.map((o) => (
                        <tr key={`opt-${o.id}`} className="hover:bg-white/[0.04]">
                          <td className="px-4 py-2.5"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${o.type === 'ISO' ? 'bg-teal-500/10 text-teal-300' : 'bg-teal-500/10 text-teal-300'}`}>{o.type}</span></td>
                          <td className="px-4 py-2.5 font-medium text-white">{o.company}</td>
                          <td className="px-4 py-2.5 text-white/60">{o.ticker}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-white">{o.shares}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-white">${o.currentFMV.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-white">{fmt$(Math.max(0, o.currentFMV - o.exercisePrice) * o.shares)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-success-500">{fmt$(Math.max(0, o.currentFMV - o.exercisePrice) * o.shares)}</td>
                          <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-medium text-warning-700">Unexercised</span></td>
                        </tr>
                      ))}
                      {esppPurchases.map((p) => (
                        <tr key={`espp-${p.id}`} className="hover:bg-white/[0.04]">
                          <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">ESPP</span></td>
                          <td className="px-4 py-2.5 font-medium text-white">{p.company}</td>
                          <td className="px-4 py-2.5 text-white/60">{p.ticker}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-white">{p.shares}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-white">${p.currentFMV.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-white">{fmt$(p.shares * p.currentFMV)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-success-500">{fmt$(p.shares * (p.currentFMV - p.purchasePrice))}</td>
                          <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">Held</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Allocation by Type</h3>
                {allocationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {allocationData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-xs text-white/30">No holdings data</div>
                )}
                <div className="mt-3 space-y-2">
                  {allocationData.map((d, idx) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-white/60">{d.name}</span>
                      </div>
                      <span className="font-medium tabular-nums text-white">{fmt$(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: RSU / Restricted Stock                                    */}
        {/* ================================================================ */}
        {activeTab === 'RSU / Restricted Stock' && (
          <div className="space-y-6">
            {/* RSU Grants Table */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">RSU Grants</h3>
                <button
                  onClick={() => setShowAddRSU(!showAddRSU)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors"
                >
                  <Plus size={14} /> Add RSU Grant
                </button>
              </div>

              {/* Add RSU Form */}
              {showAddRSU && (
                <div className="px-5 py-4 border-b border-limestone-100 bg-transparent">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Company</label>
                      <input type="text" value={newRSU.company || ''} onChange={e => setNewRSU({ ...newRSU, company: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Alphabet Inc." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Ticker</label>
                      <input type="text" value={newRSU.ticker || ''} onChange={e => setNewRSU({ ...newRSU, ticker: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="GOOGL" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Grant Date</label>
                      <input type="date" value={newRSU.grantDate || ''} onChange={e => setNewRSU({ ...newRSU, grantDate: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Shares Granted</label>
                      <input type="number" value={newRSU.sharesGranted || ''} onChange={e => setNewRSU({ ...newRSU, sharesGranted: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="100" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Grant Price</label>
                      <input type="number" step="0.01" value={newRSU.grantPrice || ''} onChange={e => setNewRSU({ ...newRSU, grantPrice: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="150.00" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Vesting Schedule</label>
                      <input type="text" value={newRSU.vestingSchedule || ''} onChange={e => setNewRSU({ ...newRSU, vestingSchedule: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="4yr / quarterly" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Current FMV</label>
                      <input type="number" step="0.01" value={newRSU.currentFMV || ''} onChange={e => setNewRSU({ ...newRSU, currentFMV: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="178.25" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={addRSUGrant}
                        className="w-full rounded-md bg-teal-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-400 transition-colors">
                        Save Grant
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {rsuGrants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                    <Briefcase size={20} className="text-indigo-400" />
                  </div>
                  <p className="text-xs text-white/50">No RSU grants added yet. Click &quot;Add RSU Grant&quot; to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-limestone-100 bg-transparent">
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Company</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Ticker</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Grant Date</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Granted</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Grant Price</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Schedule</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Vested</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Held</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">FMV</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Value</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-limestone-50">
                      {rsuGrants.map((g) => (
                        <tr key={g.id} className={`hover:bg-white/[0.04] cursor-pointer ${selectedRSU === g.id ? 'bg-indigo-50' : ''}`}
                          onClick={() => setSelectedRSU(selectedRSU === g.id ? null : g.id)}>
                          <td className="px-4 py-2.5 font-medium text-white">{g.company}</td>
                          <td className="px-4 py-2.5 text-white/60">{g.ticker}</td>
                          <td className="px-4 py-2.5 text-white/60">{g.grantDate}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{g.sharesGranted}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">${g.grantPrice.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-white/60">{g.vestingSchedule}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{g.sharesVested}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{g.sharesHeld}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">${g.currentFMV.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt$(g.sharesHeld * g.currentFMV)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={(e) => { e.stopPropagation(); removeRSUGrant(g.id); }}
                              className="text-white/30 hover:text-critical-500 transition-colors"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Per-Vest Tax Calculator */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100">
                <h3 className="text-sm font-semibold text-white">Per-Vest Tax Calculator</h3>
                <p className="text-[10px] text-white/50 mt-0.5">RSUs are taxed as ordinary income (W-2) on the vesting date</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Shares Vesting</label>
                    <input type="number" value={rsuVestShares} onChange={e => setRsuVestShares(Number(e.target.value))}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">FMV / Share</label>
                    <input type="number" step="0.01" value={rsuVestFMV} onChange={e => setRsuVestFMV(Number(e.target.value))}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Federal Rate %</label>
                    <input type="number" value={rsuFedRate} onChange={e => setRsuFedRate(Number(e.target.value))}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">State Rate %</label>
                    <input type="number" value={rsuStateRate} onChange={e => setRsuStateRate(Number(e.target.value))}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                </div>

                {/* Tax Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs py-1.5 border-b border-limestone-100">
                      <span className="text-white/60">Ordinary Income (W-2)</span>
                      <span className="font-medium tabular-nums text-white">{fmt$(rsuOrdinaryIncome)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 border-b border-limestone-100">
                      <span className="text-white/60">Federal Withholding ({rsuFedRate}%)</span>
                      <span className="font-medium tabular-nums text-critical-500">-{fmt$(rsuFederalTax)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 border-b border-limestone-100">
                      <span className="text-white/60">FICA (7.65%)</span>
                      <span className="font-medium tabular-nums text-critical-500">-{fmt$(rsuFICA)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 border-b border-limestone-100">
                      <span className="text-white/60">State Withholding ({rsuStateRate}%)</span>
                      <span className="font-medium tabular-nums text-critical-500">-{fmt$(rsuStateTax)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-2 border-b-2 border-white/[0.06] font-semibold">
                      <span className="text-white">Total Tax</span>
                      <span className="tabular-nums text-critical-500">-{fmt$(rsuTotalTax)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-white/60">Net Shares Delivered</span>
                      <span className="font-medium tabular-nums text-white">{rsuNetShares}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-white/60">Net Cash Value</span>
                      <span className="font-medium tabular-nums text-white">{fmt$(rsuNetCashValue)}</span>
                    </div>
                  </div>

                  {/* Tax Planning Options */}
                  <div>
                    <h4 className="text-xs font-semibold text-white mb-3">Tax Planning Options</h4>
                    <div className="space-y-2">
                      {(['sell-to-cover', 'sell-all', 'hold'] as const).map((strategy) => (
                        <button key={strategy} onClick={() => setRsuTaxStrategy(strategy)}
                          className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${
                            rsuTaxStrategy === strategy
                              ? 'border-brand-500 bg-teal-500/10 text-teal-300'
                              : 'border-white/[0.06] bg-white/[0.07] text-white/60 hover:border-white/[0.10]'
                          }`}>
                          <div className="font-medium">
                            {strategy === 'sell-to-cover' && 'Sell to Cover'}
                            {strategy === 'sell-all' && 'Sell All'}
                            {strategy === 'hold' && 'Hold All Shares'}
                          </div>
                          <div className="text-[10px] text-white/50 mt-0.5">
                            {strategy === 'sell-to-cover' && `Sell ${rsuVestShares - rsuNetShares} shares to cover taxes, keep ${rsuNetShares} shares`}
                            {strategy === 'sell-all' && `Sell all ${rsuVestShares} shares, receive ${fmt$(rsuNetCashValue)} after tax`}
                            {strategy === 'hold' && `Keep all ${rsuVestShares} shares, pay ${fmt$(rsuTotalTax)} from cash`}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Hold 1 year comparison */}
                    <div className="mt-4 rounded-lg border border-warning-100 bg-warning-50 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Info size={14} className="text-warning-500" />
                        <h4 className="text-xs font-semibold text-warning-700">What if I hold 1 year?</h4>
                      </div>
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-warning-700">Today&apos;s tax (ordinary + FICA)</span>
                          <span className="font-medium tabular-nums text-warning-700">{fmt$(rsuTotalTax)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-warning-700">1yr hold: LTCG on appreciation ({rsuLTCGRate}%)</span>
                          <span className="font-medium tabular-nums text-warning-700">{fmt$(rsuHold1YrGain * (rsuLTCGRate / 100))}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-warning-100">
                          <span className="text-warning-700 font-medium">Est. net after 1yr (10% growth)</span>
                          <span className="font-medium tabular-nums text-warning-700">{fmt$(rsuHold1YrNet)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: Stock Options (NQSO / ISO)                               */}
        {/* ================================================================ */}
        {activeTab === 'Stock Options (NQSO / ISO)' && (
          <div className="space-y-6">
            {/* Options Table */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Stock Option Grants</h3>
                <button onClick={() => setShowAddOption(!showAddOption)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors">
                  <Plus size={14} /> Add Option Grant
                </button>
              </div>

              {/* Add Option Form */}
              {showAddOption && (
                <div className="px-5 py-4 border-b border-limestone-100 bg-transparent">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Type</label>
                      <select value={newOption.type || 'ISO'} onChange={e => setNewOption({ ...newOption, type: e.target.value as 'ISO' | 'NQSO' })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="ISO">ISO</option>
                        <option value="NQSO">NQSO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Company</label>
                      <input type="text" value={newOption.company || ''} onChange={e => setNewOption({ ...newOption, company: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Company" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Ticker</label>
                      <input type="text" value={newOption.ticker || ''} onChange={e => setNewOption({ ...newOption, ticker: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="GOOGL" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Grant Date</label>
                      <input type="date" value={newOption.grantDate || ''} onChange={e => setNewOption({ ...newOption, grantDate: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Exercise Price</label>
                      <input type="number" step="0.01" value={newOption.exercisePrice || ''} onChange={e => setNewOption({ ...newOption, exercisePrice: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="68.50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Current FMV</label>
                      <input type="number" step="0.01" value={newOption.currentFMV || ''} onChange={e => setNewOption({ ...newOption, currentFMV: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="178.25" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Shares</label>
                      <input type="number" value={newOption.shares || ''} onChange={e => setNewOption({ ...newOption, shares: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Expiration</label>
                      <input type="date" value={newOption.expiration || ''} onChange={e => setNewOption({ ...newOption, expiration: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button onClick={addOptionGrant}
                      className="rounded-md bg-teal-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-teal-400 transition-colors">
                      Save Option
                    </button>
                  </div>
                </div>
              )}

              {options.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center mb-3">
                    <Target size={20} className="text-teal-300" />
                  </div>
                  <p className="text-xs text-white/50">No stock options added yet. Click &quot;Add Option Grant&quot; to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-limestone-100 bg-transparent">
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Type</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Company</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Grant Date</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Exercise Price</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">FMV</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Spread</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Shares</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Intrinsic Value</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Expiration</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-limestone-50">
                      {options.map((o) => {
                        const spread = Math.max(0, o.currentFMV - o.exercisePrice);
                        return (
                          <tr key={o.id} className={`hover:bg-white/[0.04] cursor-pointer ${selectedOption === o.id ? 'bg-teal-500/10' : ''}`}
                            onClick={() => setSelectedOption(selectedOption === o.id ? null : o.id)}>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                o.type === 'ISO' ? 'bg-teal-500/10 text-teal-300' : 'bg-teal-500/10 text-teal-300'
                              }`}>{o.type}</span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-white">{o.company}</td>
                            <td className="px-4 py-2.5 text-white/60">{o.grantDate}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">${o.exercisePrice.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">${o.currentFMV.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-success-500">${spread.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{o.shares}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt$(spread * o.shares)}</td>
                            <td className="px-4 py-2.5 text-white/60">{o.expiration}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button onClick={(e) => { e.stopPropagation(); removeOption(o.id); }}
                                className="text-white/30 hover:text-critical-500 transition-colors"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Exercise Calculators - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* NQSO Exercise Calculator */}
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
                <div className="px-5 py-4 border-b border-limestone-100">
                  <h3 className="text-sm font-semibold text-white">NQSO Exercise Calculator</h3>
                  <p className="text-[10px] text-white/50 mt-0.5">Spread taxed as ordinary income at exercise</p>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Shares to Exercise</label>
                      <input type="number" value={optExerciseShares} onChange={e => setOptExerciseShares(Number(e.target.value))}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Federal Rate %</label>
                      <input type="number" value={optFedRate} onChange={e => setOptFedRate(Number(e.target.value))}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>
                  {selectedOpt && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">Exercise Price</span>
                        <span className="tabular-nums">${selectedOpt.exercisePrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">Current FMV</span>
                        <span className="tabular-nums">${selectedOpt.currentFMV.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">Spread / share</span>
                        <span className="tabular-nums text-success-500">${optSpread.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">Gross Ordinary Income</span>
                        <span className="tabular-nums font-medium">{fmt$(optGrossIncome)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">Federal Tax ({optFedRate}%)</span>
                        <span className="tabular-nums text-critical-500">-{fmt$(optFedTax)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">FICA (7.65%)</span>
                        <span className="tabular-nums text-critical-500">-{fmt$(optFICATax)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">State Tax ({optStateRate}%)</span>
                        <span className="tabular-nums text-critical-500">-{fmt$(optStateTaxAmt)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold pt-1">
                        <span className="text-white">Net After Tax</span>
                        <span className="tabular-nums text-success-500">{fmt$(optNetAfterTax)}</span>
                      </div>

                      {/* Exercise+Hold vs Exercise+Sell */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-success-100 bg-success-50 p-3">
                          <h5 className="text-[10px] font-semibold text-success-700 uppercase">Exercise + Hold</h5>
                          <p className="text-xs font-medium text-success-700 mt-1">{optExerciseShares} shares</p>
                          <p className="text-[10px] text-success-500 mt-0.5">Pay {fmt$(optExerciseShares * selectedOpt.exercisePrice)} to exercise</p>
                          <p className="text-[10px] text-success-500">Future LTCG on appreciation</p>
                        </div>
                        <div className="rounded-lg border border-brand-200 bg-teal-500/10 p-3">
                          <h5 className="text-[10px] font-semibold text-teal-400 uppercase">Exercise + Sell</h5>
                          <p className="text-xs font-medium text-teal-300 mt-1">{fmt$(optNetAfterTax)} net</p>
                          <p className="text-[10px] text-teal-300 mt-0.5">No capital at risk</p>
                          <p className="text-[10px] text-teal-300">All ordinary income</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ISO Exercise Calculator */}
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
                <div className="px-5 py-4 border-b border-limestone-100">
                  <h3 className="text-sm font-semibold text-white">ISO Exercise Calculator</h3>
                  <p className="text-[10px] text-white/50 mt-0.5">No ordinary income at exercise; AMT may apply</p>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">AMT Exemption</label>
                      <input type="number" value={isoAMTExemption} onChange={e => setIsoAMTExemption(Number(e.target.value))}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Shares to Exercise</label>
                      <input type="number" value={optExerciseShares} onChange={e => setOptExerciseShares(Number(e.target.value))}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>
                  {selectedOpt && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">Ordinary Income at Exercise</span>
                        <span className="tabular-nums font-medium text-success-500">$0 (ISO)</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">AMT Preference Item</span>
                        <span className="tabular-nums font-medium">{fmt$(isoAMTPreference)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                        <span className="text-white/60">AMT Impact (est. 26%)</span>
                        <span className="tabular-nums text-critical-500">{isoAMTImpact > 0 ? `-${fmt$(isoAMTImpact)}` : '$0'}</span>
                      </div>

                      {/* Qualifying vs Disqualifying */}
                      <div className="mt-4 space-y-3">
                        <div className="rounded-lg border border-success-100 bg-success-50 p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle size={14} className="text-success-500" />
                            <h5 className="text-xs font-semibold text-success-700">Qualifying Disposition</h5>
                          </div>
                          <p className="text-[10px] text-success-700">Hold 2+ years from grant AND 1+ year from exercise</p>
                          <p className="text-[10px] text-success-700 mt-1">Entire gain taxed at LTCG rate (15-20%)</p>
                          <p className="text-xs font-medium text-success-700 mt-1">
                            Est. tax: {fmt$(optSpread * optExerciseShares * 0.15)} (15% LTCG)
                          </p>
                        </div>
                        <div className="rounded-lg border border-critical-100 bg-critical-50 p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle size={14} className="text-critical-500" />
                            <h5 className="text-xs font-semibold text-critical-700">Disqualifying Disposition</h5>
                          </div>
                          <p className="text-[10px] text-critical-700">Sold before holding period met</p>
                          <p className="text-[10px] text-critical-700 mt-1">Spread = ordinary income; additional gain = LTCG</p>
                          <p className="text-xs font-medium text-critical-700 mt-1">
                            Est. tax: {fmt$(optSpread * optExerciseShares * 0.37)} (37% ordinary)
                          </p>
                        </div>
                      </div>

                      {/* AMT Optimizer */}
                      <div className="mt-4 rounded-lg border border-brand-200 bg-teal-500/10 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Shield size={14} className="text-teal-300" />
                          <h5 className="text-xs font-semibold text-teal-400">ISO AMT Optimizer</h5>
                        </div>
                        <p className="text-[10px] text-teal-300">
                          Maximum ISOs to exercise before triggering AMT:
                        </p>
                        <p className="text-lg font-bold text-white mt-1">{isoMaxBeforeAMT} shares</p>
                        <p className="text-[10px] text-teal-300 mt-1">
                          Based on ${optSpread.toFixed(2)} spread and {fmt$(isoAMTExemption)} AMT exemption
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: ESPP                                                     */}
        {/* ================================================================ */}
        {activeTab === 'ESPP' && (
          <div className="space-y-6">
            {/* ESPP Purchases Table */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">ESPP Purchases</h3>
                <button onClick={() => setShowAddESPP(!showAddESPP)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors">
                  <Plus size={14} /> Add ESPP Purchase
                </button>
              </div>

              {/* Add ESPP Form */}
              {showAddESPP && (
                <div className="px-5 py-4 border-b border-limestone-100 bg-transparent">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Company</label>
                      <input type="text" value={newESPP.company || ''} onChange={e => setNewESPP({ ...newESPP, company: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Alphabet Inc." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Ticker</label>
                      <input type="text" value={newESPP.ticker || ''} onChange={e => setNewESPP({ ...newESPP, ticker: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="GOOGL" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Offering Period</label>
                      <input type="text" value={newESPP.offeringPeriod || ''} onChange={e => setNewESPP({ ...newESPP, offeringPeriod: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Jan 2025 - Jun 2025" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Purchase Date</label>
                      <input type="date" value={newESPP.purchaseDate || ''} onChange={e => setNewESPP({ ...newESPP, purchaseDate: e.target.value })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Shares</label>
                      <input type="number" value={newESPP.shares || ''} onChange={e => setNewESPP({ ...newESPP, shares: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Purchase Price</label>
                      <input type="number" step="0.01" value={newESPP.purchasePrice || ''} onChange={e => setNewESPP({ ...newESPP, purchasePrice: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="127.50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">FMV at Purchase</label>
                      <input type="number" step="0.01" value={newESPP.fmvAtPurchase || ''} onChange={e => setNewESPP({ ...newESPP, fmvAtPurchase: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="165.00" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Current FMV</label>
                      <input type="number" step="0.01" value={newESPP.currentFMV || ''} onChange={e => setNewESPP({ ...newESPP, currentFMV: Number(e.target.value) })}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="178.25" />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button onClick={addESPPPurchase}
                      className="rounded-md bg-teal-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-teal-400 transition-colors">
                      Save Purchase
                    </button>
                  </div>
                </div>
              )}

              {esppPurchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center mb-3">
                    <DollarSign size={20} className="text-teal-300" />
                  </div>
                  <p className="text-xs text-white/50">No ESPP purchases added yet. Click &quot;Add ESPP Purchase&quot; to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-limestone-100 bg-transparent">
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Company</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Offering Period</th>
                        <th className="px-4 py-2.5 text-left font-medium text-white/50">Purchase Date</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Shares</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Purchase Price</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">FMV</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Discount</th>
                        <th className="px-4 py-2.5 text-right font-medium text-white/50">Current Value</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-limestone-50">
                      {esppPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.04]">
                          <td className="px-4 py-2.5 font-medium text-white">{p.company}</td>
                          <td className="px-4 py-2.5 text-white/60">{p.offeringPeriod}</td>
                          <td className="px-4 py-2.5 text-white/60">{p.purchaseDate}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{p.shares}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">${p.purchasePrice.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">${p.fmvAtPurchase.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-success-500">
                            {fmtPct(((p.fmvAtPurchase - p.purchasePrice) / p.fmvAtPurchase) * 100)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt$(p.shares * p.currentFMV)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={() => removeESPP(p.id)}
                              className="text-white/30 hover:text-critical-500 transition-colors"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Disposition Analysis & Tax Calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Qualifying vs Disqualifying */}
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
                <div className="px-5 py-4 border-b border-limestone-100">
                  <h3 className="text-sm font-semibold text-white">Disposition Analysis</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setEsppQualifying(true)}
                      className={`flex-1 rounded-lg border p-3 text-xs transition-colors ${
                        esppQualifying ? 'border-success-500 bg-success-50 text-success-700' : 'border-white/[0.06] text-white/60 hover:border-white/[0.10]'
                      }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle size={14} />
                        <span className="font-medium">Qualifying</span>
                      </div>
                      <p className="text-[10px]">2yr from offering + 1yr from purchase</p>
                    </button>
                    <button onClick={() => setEsppQualifying(false)}
                      className={`flex-1 rounded-lg border p-3 text-xs transition-colors ${
                        !esppQualifying ? 'border-critical-500 bg-critical-50 text-critical-700' : 'border-white/[0.06] text-white/60 hover:border-white/[0.10]'
                      }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={14} />
                        <span className="font-medium">Disqualifying</span>
                      </div>
                      <p className="text-[10px]">Sold before holding period met</p>
                    </button>
                  </div>

                  {esppQualifying ? (
                    <div className="rounded-lg bg-success-50 border border-success-100 p-3 space-y-2 text-xs">
                      <p className="text-success-700 font-medium">Qualifying Disposition Tax Treatment:</p>
                      <p className="text-success-700">Ordinary income = lesser of: (1) discount at grant, or (2) actual gain</p>
                      <p className="text-success-700">Remaining gain = long-term capital gain</p>
                      <div className="flex justify-between pt-2 border-t border-success-100">
                        <span className="text-success-700">Ordinary income portion</span>
                        <span className="font-medium text-success-700">Max 15% of offering price</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-critical-50 border border-critical-100 p-3 space-y-2 text-xs">
                      <p className="text-critical-700 font-medium">Disqualifying Disposition Tax Treatment:</p>
                      <p className="text-critical-700">Ordinary income = FMV at purchase minus purchase price (the bargain element)</p>
                      <p className="text-critical-700">Additional gain/loss from purchase FMV = capital gain/loss</p>
                      <div className="flex justify-between pt-2 border-t border-critical-100">
                        <span className="text-critical-700">Full discount = ordinary income</span>
                        <span className="font-medium text-critical-700">{fmtPct(esppDiscountPct)} discount</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ESPP Sale Tax Calculator */}
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
                <div className="px-5 py-4 border-b border-limestone-100">
                  <h3 className="text-sm font-semibold text-white">Sale Tax Calculator</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Shares to Sell</label>
                      <input type="number" value={esppSaleShares} onChange={e => setEsppSaleShares(Number(e.target.value))}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Sale Price / Share</label>
                      <input type="number" step="0.01" value={esppSalePrice} onChange={e => setEsppSalePrice(Number(e.target.value))}
                        className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                      <span className="text-white/60">Sale Proceeds</span>
                      <span className="tabular-nums font-medium">{fmt$(esppSaleShares * esppSalePrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                      <span className="text-white/60">Ordinary Income (W-2)</span>
                      <span className="tabular-nums text-critical-500">{fmt$(esppOrdinaryIncome)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                      <span className="text-white/60">{esppQualifying ? 'Long-Term' : 'Short-Term'} Capital Gain</span>
                      <span className="tabular-nums text-success-500">{fmt$(Math.max(0, esppCapGain))}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                      <span className="text-white/60">Est. Tax on Ordinary</span>
                      <span className="tabular-nums text-critical-500">-{fmt$(esppOrdinaryIncome * 0.32)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                      <span className="text-white/60">Est. Tax on Cap Gain</span>
                      <span className="tabular-nums text-critical-500">-{fmt$(Math.max(0, esppCapGain) * (esppQualifying ? 0.15 : 0.24))}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold pt-1">
                      <span className="text-white">Net After Tax</span>
                      <span className="tabular-nums text-success-500">
                        {fmt$(esppSaleShares * esppSalePrice - esppOrdinaryIncome * 0.32 - Math.max(0, esppCapGain) * (esppQualifying ? 0.15 : 0.24))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 5: Vesting Calendar                                         */}
        {/* ================================================================ */}
        {activeTab === 'Vesting Calendar' && (
          <div className="space-y-6">
            {/* Vesting Timeline Table */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100 flex items-center gap-2">
                <Calendar size={16} className="text-teal-300" />
                <h3 className="text-sm font-semibold text-white">Upcoming Vesting Events</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-limestone-100 bg-transparent">
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Year</th>
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Quarter</th>
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Month</th>
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Grant</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Shares Vesting</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Est. Value</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Est. Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-limestone-50">
                    {vestingEvents.map((ev, idx) => {
                      const isNewQuarter = idx === 0 || vestingEvents[idx - 1].quarter !== ev.quarter || vestingEvents[idx - 1].year !== ev.year;
                      return (
                        <tr key={idx} className={`${isNewQuarter ? 'border-t-2 border-white/[0.06]' : ''} hover:bg-white/[0.04]`}>
                          <td className="px-4 py-2.5 font-medium text-white">{isNewQuarter ? ev.year : ''}</td>
                          <td className="px-4 py-2.5">
                            {isNewQuarter && (
                              <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                                {ev.quarter}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-white/60">{ev.month}</td>
                          <td className="px-4 py-2.5 text-white/60">{ev.grant}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-white">{ev.shares}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-white">{fmt$(ev.estValue)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-critical-500">-{fmt$(ev.estTax)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Year Summary */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100">
                <h3 className="text-sm font-semibold text-white">Annual Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-limestone-100 bg-transparent">
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Year</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Total Shares Vesting</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Total Est. Value</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Total Est. Tax</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Net After Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-limestone-50">
                    {[2026, 2027].map((year) => {
                      const yearEvents = vestingEvents.filter(ev => ev.year === year);
                      const totalShares = yearEvents.reduce((s, e) => s + e.shares, 0);
                      const totalValue = yearEvents.reduce((s, e) => s + e.estValue, 0);
                      const totalTax = yearEvents.reduce((s, e) => s + e.estTax, 0);
                      return (
                        <tr key={year} className="hover:bg-white/[0.04] font-medium">
                          <td className="px-4 py-3 text-white">{year}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-white">{totalShares}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-white">{fmt$(totalValue)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-critical-500">-{fmt$(totalTax)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-success-500">{fmt$(totalValue - totalTax)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vesting Bar Chart */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Quarterly Vesting Value</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { quarter: '2026 Q1', value: vestingEvents.filter(e => e.year === 2026 && e.quarter === 'Q1').reduce((s, e) => s + e.estValue, 0) },
                  { quarter: '2026 Q2', value: vestingEvents.filter(e => e.year === 2026 && e.quarter === 'Q2').reduce((s, e) => s + e.estValue, 0) },
                  { quarter: '2026 Q3', value: vestingEvents.filter(e => e.year === 2026 && e.quarter === 'Q3').reduce((s, e) => s + e.estValue, 0) },
                  { quarter: '2026 Q4', value: vestingEvents.filter(e => e.year === 2026 && e.quarter === 'Q4').reduce((s, e) => s + e.estValue, 0) },
                  { quarter: '2027 Q1', value: vestingEvents.filter(e => e.year === 2027 && e.quarter === 'Q1').reduce((s, e) => s + e.estValue, 0) },
                  { quarter: '2027 Q2', value: vestingEvents.filter(e => e.year === 2027 && e.quarter === 'Q2').reduce((s, e) => s + e.estValue, 0) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value: number) => [fmt$(value), 'Value']} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 6: Concentrated Position Strategy                           */}
        {/* ================================================================ */}
        {activeTab === 'Concentrated Position Strategy' && (
          <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100">
                <h3 className="text-sm font-semibold text-white">Concentrated Position Details</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Stock / Asset</label>
                    <input type="text" value={concPos.stock} onChange={e => setConcPos({ ...concPos, stock: e.target.value })}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Ticker</label>
                    <input type="text" value={concPos.ticker} onChange={e => setConcPos({ ...concPos, ticker: e.target.value })}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Shares Held</label>
                    <input type="number" value={concPos.sharesHeld} onChange={e => setConcPos({ ...concPos, sharesHeld: Number(e.target.value) })}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Cost Basis / Share</label>
                    <input type="number" step="0.01" value={concPos.costBasis} onChange={e => setConcPos({ ...concPos, costBasis: Number(e.target.value) })}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Current Price</label>
                    <input type="number" step="0.01" value={concPos.currentPrice} onChange={e => setConcPos({ ...concPos, currentPrice: Number(e.target.value) })}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Holding Period</label>
                    <select value={concPos.holdingPeriod} onChange={e => setConcPos({ ...concPos, holdingPeriod: e.target.value })}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                      <option value="<1 year">Less than 1 year</option>
                      <option value=">1 year">More than 1 year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 uppercase mb-1">Total Portfolio Value</label>
                    <input type="number" value={concPos.portfolioValue} onChange={e => setConcPos({ ...concPos, portfolioValue: Number(e.target.value) })}
                      className="w-full rounded-md border border-white/[0.10] px-2.5 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <PieChartIcon size={16} className="text-warning-500" />
                  <span className="text-xs font-medium text-white/50 uppercase">Concentration</span>
                </div>
                <p className="text-2xl font-bold text-warning-500">{fmtPct(concPct)}</p>
                <p className="text-[10px] text-white/50 mt-1">{concPos.ticker} is {fmtPct(concPct)} of portfolio</p>
                {concPct > 10 && (
                  <div className="mt-2 rounded bg-warning-50 px-2 py-1 text-[10px] text-warning-700">
                    <AlertTriangle size={10} className="inline mr-1" /> Above 10% threshold
                  </div>
                )}
              </div>
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight size={16} className="text-critical-500" />
                  <span className="text-xs font-medium text-white/50 uppercase">50% Drop Impact</span>
                </div>
                <p className="text-2xl font-bold text-critical-500">-{fmt$(concDrop50)}</p>
                <p className="text-[10px] text-white/50 mt-1">Portfolio drops to {fmt$(concPos.portfolioValue - concDrop50)}</p>
              </div>
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight size={16} className="text-critical-700" />
                  <span className="text-xs font-medium text-white/50 uppercase">75% Drop Impact</span>
                </div>
                <p className="text-2xl font-bold text-critical-700">-{fmt$(concDrop75)}</p>
                <p className="text-[10px] text-white/50 mt-1">Portfolio drops to {fmt$(concPos.portfolioValue - concDrop75)}</p>
              </div>
            </div>

            {/* 5 Diversification Strategies */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100">
                <h3 className="text-sm font-semibold text-white">Diversification Strategies</h3>
              </div>
              <div className="p-5 space-y-4">
                {/* Strategy 1: Outright Sale */}
                <div className="rounded-lg border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">1</span>
                    <h4 className="text-xs font-semibold text-white">Outright Sale</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-white/50">CG Tax (20% LTCG + 3.8% NIIT)</span>
                      <p className="font-medium text-critical-500 mt-0.5">-{fmt$(concGain * 0.238)}</p>
                    </div>
                    <div>
                      <span className="text-white/50">Net Proceeds</span>
                      <p className="font-medium text-white mt-0.5">{fmt$(concValue - concGain * 0.238)}</p>
                    </div>
                    <div>
                      <span className="text-white/50">Opportunity Cost</span>
                      <p className="font-medium text-white mt-0.5">Immediate diversification</p>
                    </div>
                  </div>
                </div>

                {/* Strategy 2: Exchange Fund */}
                <div className="rounded-lg border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-success-100 text-success-700 flex items-center justify-center text-xs font-bold">2</span>
                    <h4 className="text-xs font-semibold text-white">Exchange Fund</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-white/50">Tax Deferral</span>
                      <p className="font-medium text-success-500 mt-0.5">100% deferred</p>
                    </div>
                    <div>
                      <span className="text-white/50">Lockup Period</span>
                      <p className="font-medium text-white mt-0.5">7 years</p>
                    </div>
                    <div>
                      <span className="text-white/50">Diversification</span>
                      <p className="font-medium text-white mt-0.5">Receive diversified basket</p>
                    </div>
                  </div>
                </div>

                {/* Strategy 3: Charitable Remainder Trust */}
                <div className="rounded-lg border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">3</span>
                    <h4 className="text-xs font-semibold text-white">Charitable Remainder Trust (CRT)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-white/50">Capital Gains Tax</span>
                      <p className="font-medium text-success-500 mt-0.5">$0 (CRT sells tax-free)</p>
                    </div>
                    <div>
                      <span className="text-white/50">Annual Payout (5%)</span>
                      <p className="font-medium text-white mt-0.5">{fmt$(concValue * 0.05)}/yr</p>
                    </div>
                    <div>
                      <span className="text-white/50">Charitable Deduction</span>
                      <p className="font-medium text-white mt-0.5">~{fmt$(concValue * 0.10)} est.</p>
                    </div>
                  </div>
                </div>

                {/* Strategy 4: Equity Collar + Margin */}
                <div className="rounded-lg border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-warning-100 text-warning-700 flex items-center justify-center text-xs font-bold">4</span>
                    <h4 className="text-xs font-semibold text-white">Equity Collar + Margin Loan</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-white/50">Hedge Downside</span>
                      <p className="font-medium text-white mt-0.5">Put at 90%, call at 120%</p>
                    </div>
                    <div>
                      <span className="text-white/50">Borrow Against</span>
                      <p className="font-medium text-white mt-0.5">Up to {fmt$(concValue * 0.70)} (70% LTV)</p>
                    </div>
                    <div>
                      <span className="text-white/50">Annual Cost</span>
                      <p className="font-medium text-critical-500 mt-0.5">~{fmtPct(2.5)} collar + interest</p>
                    </div>
                  </div>
                </div>

                {/* Strategy 5: Installment Sale to IDGT */}
                <div className="rounded-lg border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-critical-100 text-critical-700 flex items-center justify-center text-xs font-bold">5</span>
                    <h4 className="text-xs font-semibold text-white">Installment Sale to IDGT</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-white/50">Transfer to Grantor Trust</span>
                      <p className="font-medium text-white mt-0.5">{fmt$(concValue)} in stock</p>
                    </div>
                    <div>
                      <span className="text-white/50">Installment Note</span>
                      <p className="font-medium text-white mt-0.5">AFR ~5.0%, 9-year note</p>
                    </div>
                    <div>
                      <span className="text-white/50">Estate Impact</span>
                      <p className="font-medium text-success-500 mt-0.5">Future appreciation outside estate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Comparison Table */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100">
                <h3 className="text-sm font-semibold text-white">Strategy Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-limestone-100 bg-transparent">
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Strategy</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Tax Now</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Tax Deferred</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Annual Income</th>
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Estate Impact</th>
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Complexity</th>
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Recommended</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-limestone-50">
                    <tr className="hover:bg-white/[0.04]">
                      <td className="px-4 py-2.5 font-medium text-white">Outright Sale</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-critical-500">{fmt$(concGain * 0.238)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">$0</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">Varies</td>
                      <td className="px-4 py-2.5 text-white/60">Neutral</td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">Low</span></td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">
                          <CheckCircle size={10} className="mr-1" /> Good
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.04]">
                      <td className="px-4 py-2.5 font-medium text-white">Exchange Fund</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-success-500">$0</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">{fmt$(concGain * 0.238)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">$0</td>
                      <td className="px-4 py-2.5 text-white/60">Neutral</td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-medium text-warning-700">Medium</span></td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">
                          <CheckCircle size={10} className="mr-1" /> Best
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.04]">
                      <td className="px-4 py-2.5 font-medium text-white">CRT</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-success-500">$0</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">Partial</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">{fmt$(concValue * 0.05)}</td>
                      <td className="px-4 py-2.5 text-success-500">Reduces estate</td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-medium text-warning-700">Medium</span></td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                          <Info size={10} className="mr-1" /> Charitable
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.04]">
                      <td className="px-4 py-2.5 font-medium text-white">Collar + Margin</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-success-500">$0</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">{fmt$(concGain * 0.238)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-critical-500">-{fmt$(concValue * 0.025)}</td>
                      <td className="px-4 py-2.5 text-white/60">Neutral</td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-critical-50 px-2 py-0.5 text-[10px] font-medium text-critical-700">High</span></td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-medium text-warning-700">
                          <Info size={10} className="mr-1" /> Situational
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.04]">
                      <td className="px-4 py-2.5 font-medium text-white">IDGT Sale</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-success-500">$0</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">Deferred</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">{fmt$(concValue * 0.05)}</td>
                      <td className="px-4 py-2.5 text-success-500">Outside estate</td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full bg-critical-50 px-2 py-0.5 text-[10px] font-medium text-critical-700">High</span></td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                          <Info size={10} className="mr-1" /> Estate Plan
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 7: Exercise / Sale Optimizer                                */}
        {/* ================================================================ */}
        {activeTab === 'Exercise / Sale Optimizer' && (
          <div className="space-y-6">
            {/* Multi-Year Exercise Plan */}
            <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <div className="px-5 py-4 border-b border-limestone-100">
                <h3 className="text-sm font-semibold text-white">Multi-Year Exercise Plan Optimizer</h3>
                <p className="text-[10px] text-white/50 mt-0.5">Spreading exercises across years to minimize cumulative tax burden</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-limestone-100 bg-transparent">
                      <th className="px-4 py-2.5 text-left font-medium text-white/50">Year</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Projected Income</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Available Options</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Recommended Exercise</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Tax Cost</th>
                      <th className="px-4 py-2.5 text-right font-medium text-white/50">Cumulative Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-limestone-50">
                    {optimizerPlan.map((yr) => (
                      <tr key={yr.year} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-2.5 font-medium text-white">{yr.year}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-white">{fmt$(yr.projectedIncome)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-white">{yr.availableOptions}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-teal-300">{yr.recommendedExercise}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-critical-500">-{fmt$(yr.taxCost)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-critical-500">-{fmt$(yr.cumulativeTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/[0.06] bg-transparent font-semibold">
                      <td className="px-4 py-2.5 text-white">Total</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white">
                        {fmt$(optimizerPlan.reduce((s, y) => s + y.projectedIncome, 0))}
                      </td>
                      <td className="px-4 py-2.5"></td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-teal-300">
                        {optimizerPlan.reduce((s, y) => s + y.recommendedExercise, 0)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-critical-500">
                        -{fmt$(optimizerPlan.reduce((s, y) => s + y.taxCost, 0))}
                      </td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* AMT Breakeven Calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
                <div className="px-5 py-4 border-b border-limestone-100">
                  <h3 className="text-sm font-semibold text-white">AMT Breakeven Calculator (ISOs)</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                    <span className="text-white/60">ISO Spread / Share</span>
                    <span className="tabular-nums font-medium">${selectedOpt ? optSpread.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                    <span className="text-white/60">AMT Exemption (MFJ 2025)</span>
                    <span className="tabular-nums font-medium">{fmt$(isoAMTExemption)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                    <span className="text-white/60">Max ISOs Before AMT</span>
                    <span className="tabular-nums font-bold text-teal-300">{isoMaxBeforeAMT} shares</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-limestone-100 pb-1.5">
                    <span className="text-white/60">Max Spread Before AMT</span>
                    <span className="tabular-nums font-medium">{fmt$(isoMaxBeforeAMT * optSpread)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-white/60">AMT Rate</span>
                    <span className="tabular-nums font-medium">26%</span>
                  </div>

                  <div className="mt-4 rounded-lg bg-teal-500/10 border border-brand-200 p-3">
                    <p className="text-[10px] text-teal-400">
                      <Info size={12} className="inline mr-1" />
                      The AMT breakeven is the point where exercising additional ISOs would trigger AMT. 
                      Exercise up to {isoMaxBeforeAMT} shares in the current year to avoid AMT, 
                      then exercise the remainder in subsequent years.
                    </p>
                  </div>
                </div>
              </div>

              {/* Optimal Strategy Recommendation */}
              <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
                <div className="px-5 py-4 border-b border-limestone-100">
                  <h3 className="text-sm font-semibold text-white">Optimal Strategy Recommendation</h3>
                </div>
                <div className="p-5">
                  <div className="rounded-lg bg-teal-500/10 border border-brand-200 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={16} className="text-teal-300" />
                      <h4 className="text-xs font-semibold text-teal-400">Recommended Approach</h4>
                    </div>
                    <p className="text-xs text-teal-300 leading-relaxed">
                      Based on your projected income trajectory and available options, we recommend a 
                      <span className="font-semibold"> phased exercise strategy</span> over 3-5 years. This approach 
                      keeps annual income below higher tax brackets and avoids AMT triggers for ISO exercises.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <ChevronRight size={14} className="text-teal-300 mt-0.5 shrink-0" />
                      <p className="text-xs text-white/60">
                        <span className="font-medium">NQSOs:</span> Exercise 100 shares/year to stay within the 24% bracket.
                        Total tax savings of ~{fmt$(optimizerPlan.reduce((s, y) => s + y.taxCost, 0) * 0.15)} vs exercising all at once.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ChevronRight size={14} className="text-teal-300 mt-0.5 shrink-0" />
                      <p className="text-xs text-white/60">
                        <span className="font-medium">ISOs:</span> Exercise up to {isoMaxBeforeAMT} shares per year to avoid AMT. 
                        Hold for qualifying disposition (2yr from grant + 1yr from exercise) for LTCG treatment.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ChevronRight size={14} className="text-teal-300 mt-0.5 shrink-0" />
                      <p className="text-xs text-white/60">
                        <span className="font-medium">RSUs:</span> Consider sell-to-cover strategy at each vest to manage concentration risk.
                        Diversify proceeds into broad market index funds.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ChevronRight size={14} className="text-teal-300 mt-0.5 shrink-0" />
                      <p className="text-xs text-white/60">
                        <span className="font-medium">Concentration:</span> Target reducing {concPos.ticker} from {fmtPct(concPct)} to below 10% 
                        of portfolio over the next 2-3 years through planned sales and vesting diversification.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-warning-50 border border-warning-100 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={14} className="text-warning-500" />
                      <h5 className="text-xs font-semibold text-warning-700">Important Reminders</h5>
                    </div>
                    <ul className="text-[10px] text-warning-700 space-y-1 ml-5 list-disc">
                      <li>Monitor 10b5-1 trading window restrictions</li>
                      <li>Check company insider trading policy before executing</li>
                      <li>Coordinate with tax advisor on estimated payments</li>
                      <li>Review annually as income and stock price change</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
