'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    title: 'Farther Prism — Financial Planning',
    description:
      'Comprehensive financial planning platform for advisors. Manage client profiles, build detailed financial plans with income, expenses, net worth, goals, tax planning, Social Security optimization, estate planning, and more. Full lifecycle planning from data entry through Monte Carlo analysis.',
    href: '/prism/dashboard',
    status: 'live',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5Z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    color: 'from-brand-500 to-brand-800',
    tags: ['Financial Planning', 'Tax', 'Retirement', 'Estate', 'Goals'],
  },
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
    color: 'from-brand-600 to-brand-800',
    tags: ['Options', 'Lending', 'Tax Planning', 'Risk Analysis'],
  },
  {
    title: 'TALS What-If Calculator',
    description:
      'Compare Tax-Aware Long-Short strategies from 8 providers across 13 tiers. Model tax alpha, diversification timelines, cost breakdowns, and after-tax wealth projections for concentrated stock positions.',
    href: '/tals-calculator',
    status: 'live',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 6v6l4 2" />
        <path d="M16 16l2 2" />
        <path d="M8 16l-2 2" />
      </svg>
    ),
    color: 'from-brand-500 to-brand-800',
    tags: ['TALS', 'Tax Alpha', 'Long/Short', 'Concentrated Stock'],
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
    color: 'from-success-500 to-success-700',
    tags: ['Risk Profile', 'Compliance', 'Questionnaire', 'Allocation'],
  },
  {
    title: 'What Your Money Becomes™',
    description:
      'Time value of money calculator showing how savings, market returns, and compound interest create wealth over time. Features milestone timeline showing value created by markets alone (excluding principal), market correction scenarios, and multiple investment profiles.',
    href: '/tools/wealth-calculator',
    status: 'live',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    color: 'from-success-500 to-success-800',
    tags: ['Wealth Planning', 'Compounding', 'Time Value', 'Projections'],
  },
  {
    title: '401(k) Rollover Analyzer',
    description:
      'Comprehensive 401(k) plan evaluation and rollover analysis. Score retirement plans across 27 criteria including fees, investment options, and features. Generate compliant documentation, benchmark against industry standards, and build data-driven rollover recommendations.',
    href: '/tax-planning/rollover',
    status: 'live',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
      </svg>
    ),
    color: 'from-brand-600 to-brand-800',
    tags: ['Retirement', '401(k)', 'Rollover', 'Plan Analysis', 'Documentation'],
  },
  {
    title: 'Debt IQ — Strategic Debt Analysis',
    description:
      'Comprehensive debt optimization platform analyzing mortgage, securities-backed lending, credit cards, auto loans, student debt, and business financing. Calculate after-tax cost of debt, model payoff strategies, identify refinancing opportunities, and quantify tax deductions across 6 debt categories.',
    href: '/tax-planning/debt-iq',
    status: 'live',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 17a5 5 0 0 0 10 0c0-2.76-2.24-5-5-5s-5 2.24-5 5Z" />
        <path d="M12 17a5 5 0 0 0 10 0c0-2.76-2.24-5-5-5s-5 2.24-5 5Z" />
        <path d="M7 7a5 5 0 0 0 10 0c0-2.76-2.24-5-5-5S7 4.24 7 7Z" />
      </svg>
    ),
    color: 'from-warning-500 to-warning-700',
    tags: ['Debt', 'Optimization', 'Tax Strategy', 'Refinancing'],
  },
  {
    title: 'Tax Intelligence Platform',
    description:
      'OCR-powered tax document extraction with deterministic tax calculation engine. Upload tax documents (1040, K-1, W-2, 1099s), extract line-by-line data with confidence scoring, run baseline and scenario calculations, detect optimization opportunities with AI explanations, and generate compliant deliverables.',
    href: '/tax-planning/intelligence',
    status: 'live',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    color: 'from-brand-500 to-brand-700',
    tags: ['OCR', 'Tax Documents', 'Calculation Engine', 'AI Analysis'],
  },
  {
    title: 'Securities-Based Lending Analyzer',
    description:
      'Evaluate securities-backed lines of credit (SBLOCs) with detailed LTV analysis, collateral eligibility screening, and rate comparisons across custodians.',
    href: '#',
    status: 'coming_soon',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    ),
    color: 'from-success-600 to-success-800',
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
    color: 'from-success-500 to-success-700',
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
    color: 'from-brand-500 to-brand-700',
    tags: ['Margin', 'Risk', 'Optimization'],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header
        className="backdrop-blur-xl"
        style={{
          background: 'var(--s-nav-bg)',
          borderBottom: '1px solid var(--s-border-subtle)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-brand-500 to-brand-800 flex items-center justify-center">
              <span className="text-text-onBrand font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text tracking-tight">Farther Intelligent Wealth Advisor Platform</h1>
              <p className="text-xs text-text-muted">Investment Lending Tools</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="bg-linear-to-br from-brand-900 via-brand-800 to-brand-700">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl text-text-onBrand">
            Intelligent tools for modern wealth management
          </h2>
          <p className="mt-4 text-lg max-w-xl leading-relaxed text-accent-secondary">
            Empower your client conversations with institutional-grade calculators, comparison engines, and risk analytics — built for advisors who serve UHNW and HNW families.
          </p>
          <div className="mt-6 flex items-center gap-4 text-sm text-accent-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success-500"></span>
              {TOOLS.filter(t => t.status === 'live').length} tool{TOOLS.filter(t => t.status === 'live').length !== 1 ? 's' : ''} live
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning-500"></span>
              {TOOLS.filter(t => t.status === 'coming_soon').length} coming soon
            </span>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">Available Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => {
            const isLive = tool.status === 'live';
            const className = `group card p-6 transition-all duration-200 ${
              isLive
                ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                : 'opacity-60 cursor-default'
            }`;

            const content = (
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-linear-to-br ${tool.color} flex items-center justify-center text-text-onBrand shadow-sm`}>
                    {tool.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-text group-hover:text-accent-primarySoft transition-colors">
                        {tool.title}
                      </h4>
                      {isLive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-100 text-success-500">
                          LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'var(--s-badge-neutral-bg)', color: 'var(--s-badge-neutral-text)' }}>
                          COMING SOON
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed">{tool.description}</p>

                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium"
                          style={{ background: 'var(--s-surface-subtle)', color: 'var(--s-text-muted)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    {isLive && (
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-accent-primarySoft group-hover:text-accent-secondary">
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
      <footer
        className="backdrop-blur-xl mt-8"
        style={{
          borderTop: '1px solid var(--s-border-subtle)',
          background: 'var(--s-card-bg)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-text-faint">
          <p>Farther Intelligent Wealth Advisor Platform. For authorized advisor use only.</p>
          <p>Tools are for educational and illustrative purposes and do not constitute investment advice.</p>
        </div>
      </footer>
    </div>
  );
}
