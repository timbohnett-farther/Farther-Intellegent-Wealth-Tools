'use client';

import React from 'react';
import Link from 'next/link';

interface ToolCard {
  title: string;
  description: string;
  href: string;
  status: 'live' | 'coming_soon';
  icon: React.ReactNode;
  color: string;
  tags: string[];
}

const TOOLS: ToolCard[] = [
  {
    title: 'Box Spread Lending Calculator',
    description:
      'Comprehensive analysis tool for portfolio-based liquidity via box spreads. Compare borrowing costs, model tax efficiency under Section 1256, stress test margin safety, and run Monte Carlo simulations — all in one interactive dashboard.',
    href: '/box-spread-calculator',
    status: 'live',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 3v18" />
      </svg>
    ),
    color: 'from-blue-500 to-indigo-600',
    tags: ['Options', 'Lending', 'Tax Planning', 'Risk Analysis'],
  },
  {
    title: 'Farther Focus — Risk Profile',
    description:
      'FINRA and CFP Board compliant risk assessment across 7 dimensions. Weighted scoring with contradiction detection, confidence metrics, and automated asset allocation recommendations from a 395-question bank.',
    href: '/risk-profile',
    status: 'live',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 12 12 2" />
        <path d="M12 12l7.07-7.07" />
      </svg>
    ),
    color: 'from-teal-500 to-emerald-600',
    tags: ['Risk Profile', 'Compliance', 'Questionnaire', 'Allocation'],
  },
  {
    title: 'Securities-Based Lending Analyzer',
    description:
      'Evaluate securities-backed lines of credit (SBLOCs) with detailed LTV analysis, collateral eligibility screening, and rate comparisons across custodians.',
    href: '#',
    status: 'coming_soon',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 17a5 5 0 0 0 10 0c0-2.76-2.24-5-5-5s-5 2.24-5 5Z" />
        <path d="M12 17a5 5 0 0 0 10 0c0-2.76-2.24-5-5-5s-5 2.24-5 5Z" />
        <path d="M7 7a5 5 0 0 0 10 0c0-2.76-2.24-5-5-5S7 4.24 7 7Z" />
      </svg>
    ),
    color: 'from-orange-500 to-amber-600',
    tags: ['SBLOC', 'Collateral', 'Lending'],
  },
  {
    title: 'Tax-Loss Harvesting Engine',
    description:
      'Identify tax-loss harvesting opportunities across client portfolios. Model wash sale implications, track carryforward balances, and quantify after-tax alpha.',
    href: '#',
    status: 'coming_soon',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    ),
    color: 'from-green-500 to-emerald-600',
    tags: ['Tax', 'Harvesting', 'Portfolio'],
  },
  {
    title: 'Margin Optimization Tool',
    description:
      'Analyze margin requirements across Reg T and Portfolio Margin regimes. Optimize collateral allocation to maximize borrowing capacity while minimizing margin call risk.',
    href: '#',
    status: 'coming_soon',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    color: 'from-purple-500 to-violet-600',
    tags: ['Margin', 'Risk', 'Optimization'],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Farther Intelligent Wealth Advisor Platform</h1>
              <p className="text-xs text-gray-500">Investment Lending Tools</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl">
            Intelligent tools for modern wealth management
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-xl leading-relaxed">
            Empower your client conversations with institutional-grade calculators, comparison engines, and risk analytics — built for advisors who serve UHNW and HNW families.
          </p>
          <div className="mt-6 flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              {TOOLS.filter(t => t.status === 'live').length} tool{TOOLS.filter(t => t.status === 'live').length !== 1 ? 's' : ''} live
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {TOOLS.filter(t => t.status === 'coming_soon').length} coming soon
            </span>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">Available Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => {
            const isLive = tool.status === 'live';
            const className = `group card p-6 transition-all duration-200 ${
              isLive
                ? 'hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 cursor-pointer'
                : 'opacity-60 cursor-default'
            }`;

            const content = (
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-sm`}>
                    {tool.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {tool.title}
                      </h4>
                      {isLive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                          LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                          COMING SOON
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{tool.description}</p>

                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    {isLive && (
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                        Open tool
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </div>
                    )}
                  </div>
                </div>
            );

            return isLive ? (
              <Link key={tool.title} href={tool.href} className={className}>
                {content}
              </Link>
            ) : (
              <div key={tool.title} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
          <p>Farther Intelligent Wealth Advisor Platform. For authorized advisor use only.</p>
          <p>Tools are for educational and illustrative purposes and do not constitute investment advice.</p>
        </div>
      </footer>
    </div>
  );
}
