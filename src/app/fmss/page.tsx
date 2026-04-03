/**
 * FMSS Dashboard — Landing Page
 *
 * Unified advisor intelligence platform for scoring SMAs, alternatives,
 * equities, and ETFs from a single interface.
 */

import Link from 'next/link';

export default function FMSSDashboardPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text">
                Farther Market Scoring System
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                AI-powered intelligence for SMAs, alternatives, equities, and ETFs
              </p>
            </div>
            <Link
              href="/"
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              ← All Tools
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="SMA Strategies"
            value="0"
            description="Separately managed accounts"
            href="/fmss/sma"
          />
          <StatCard
            title="Alternative Funds"
            value="0"
            description="Hedge funds, PE, VC"
            href="/fmss/alternatives"
          />
          <StatCard
            title="Equities"
            value="0"
            description="Individual stocks tracked"
            href="/fmss/equities"
          />
          <StatCard
            title="ETFs"
            value="0"
            description="Exchange-traded funds"
            href="/fmss/etfs"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Asset Categories */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text mb-4">
              Browse by Asset Class
            </h2>
            <div className="space-y-3">
              <ActionLink
                href="/fmss/sma"
                title="SMA Strategies"
                description="Investment strategies from top asset managers"
                icon="📊"
              />
              <ActionLink
                href="/fmss/alternatives"
                title="Alternative Funds"
                description="Hedge funds, private equity, and venture capital"
                icon="🏦"
              />
              <ActionLink
                href="/fmss/equities"
                title="Equities"
                description="Individual stocks with comprehensive scoring"
                icon="📈"
              />
              <ActionLink
                href="/fmss/etfs"
                title="ETFs"
                description="Exchange-traded funds analysis"
                icon="💼"
              />
            </div>
          </div>

          {/* Tools */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text mb-4">
              Analysis Tools
            </h2>
            <div className="space-y-3">
              <ActionLink
                href="/fmss/compare"
                title="Comparison Tool"
                description="Compare multiple assets side-by-side"
                icon="⚖️"
              />
              <ActionLink
                href="/fmss/signals"
                title="Market Signals"
                description="Real-time alerts and sentiment analysis"
                icon="📡"
              />
              <ActionLink
                href="/fmss/economic"
                title="Economic Indicators"
                description="Macro data from FRED and global sources"
                icon="🌍"
              />
              <ActionLink
                href="/fmss/admin"
                title="Admin Dashboard"
                description="Manage data sources and scoring configs"
                icon="⚙️"
              />
            </div>
          </div>
        </div>

        {/* 8-Dimension Scoring Info */}
        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-4">
            8-Dimension Scoring System
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreDimension
              name="Risk-Adjusted Performance"
              weight="25%"
              description="Sharpe ratio, Sortino ratio, max drawdown"
            />
            <ScoreDimension
              name="Manager Pedigree"
              weight="15%"
              description="Track record, AUM, tenure, compliance"
            />
            <ScoreDimension
              name="Fee Efficiency"
              weight="10%"
              description="Management fees vs. category median"
            />
            <ScoreDimension
              name="Insider Conviction"
              weight="15%"
              description="Insider buying, Form 4 filings"
            />
            <ScoreDimension
              name="Regulatory Signal"
              weight="10%"
              description="SEC filings, Form ADV changes"
            />
            <ScoreDimension
              name="Concentration"
              weight="10%"
              description="Position concentration, diversification"
            />
            <ScoreDimension
              name="Benchmark Consistency"
              weight="10%"
              description="Tracking error, active share"
            />
            <ScoreDimension
              name="ESG Alignment"
              weight="5%"
              description="ESG scores, sustainability initiatives"
            />
          </div>
        </div>

        {/* Status Banner */}
        <div className="mt-8 rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/10">
              <span className="text-lg">🚀</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text">
                FMSS Phase 1 Complete — Database Ready
              </p>
              <p className="text-xs text-text-muted">
                14 tables created • 6 API integrations configured • Phase 2 in development
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Component: Stat Card
function StatCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface p-6 transition-colors hover:bg-surface-muted"
    >
      <div className="text-3xl font-bold text-text">{value}</div>
      <div className="mt-1 text-sm font-medium text-text">{title}</div>
      <div className="mt-1 text-xs text-text-muted">{description}</div>
    </Link>
  );
}

// Component: Action Link
function ActionLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle p-3 transition-colors hover:bg-surface-muted"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-xl">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text">{title}</div>
        <div className="mt-0.5 text-xs text-text-muted">{description}</div>
      </div>
      <svg
        className="h-5 w-5 shrink-0 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// Component: Score Dimension
function ScoreDimension({
  name,
  weight,
  description,
}: {
  name: string;
  weight: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-medium text-text">{name}</div>
        <div className="text-xs font-semibold text-accent-primary">{weight}</div>
      </div>
      <div className="text-xs text-text-muted">{description}</div>
    </div>
  );
}
