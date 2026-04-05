'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Send,
  FileText,
  Shield,
  BarChart3,
  TrendingUp,
  Loader2,
  Layers,
  AlertTriangle,
  LineChart,
} from 'lucide-react';
import type { Proposal } from '@/lib/proposal-engine/types';
import { formatCurrency, formatCompact, formatPct } from '@/lib/proposal-engine/types';
import { ProposalStatusBadge } from '@/components/proposal-engine/ProposalStatusBadge';
import { HoldingsReviewTable } from '@/components/proposal-engine/HoldingsReviewTable';
import { SideBySideComparison } from '@/components/proposal-engine/SideBySideComparison';
import { RiskScoreGauge } from '@/components/proposal-engine/RiskScoreGauge';
import { FundXrayPanel } from '@/components/proposal-engine/FundXrayPanel';
import { StressTestPanel } from '@/components/proposal-engine/StressTestPanel';
import { MonteCarloFanChart } from '@/components/proposal-engine/MonteCarloFanChart';
import { DocumentsTab } from '@/components/proposal-engine/DocumentsTab';

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'comparison' | 'fund-xray' | 'stress-tests' | 'monte-carlo' | 'documents' | 'narrative'>('overview');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/proposals/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProposal(data);
        }
      } catch (err) {
        console.error('Failed to load proposal:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base">
        <FileText className="h-12 w-12 text-text-faint" />
        <h2 className="text-lg font-semibold text-text">Proposal not found</h2>
        <Link href="/proposals" className="text-sm text-accent-primarySoft hover:underline">
          Back to proposals
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { key: 'holdings' as const, label: 'Holdings', icon: FileText },
    { key: 'comparison' as const, label: 'Comparison', icon: TrendingUp },
    { key: 'fund-xray' as const, label: 'Fund X-Ray', icon: Layers },
    { key: 'stress-tests' as const, label: 'Stress Tests', icon: AlertTriangle },
    { key: 'monte-carlo' as const, label: 'Monte Carlo', icon: LineChart },
    { key: 'documents' as const, label: 'Documents', icon: Shield },
    { key: 'narrative' as const, label: 'Narrative', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-surface-base p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/proposals')}
              className="rounded-lg p-2 text-text-muted hover:bg-surface-subtle transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-text">{proposal.clientName}</h1>
                <ProposalStatusBadge status={proposal.status} />
              </div>
              <p className="text-sm text-text-muted">
                {proposal.proposalType.replace(/_/g, ' ')} -- {formatCompact(proposal.assetsInScope)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-soft px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-subtle transition-colors">
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            {proposal.status === 'DRAFT' && (
              <button className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 transition-colors">
                <Send className="h-4 w-4" />
                Send to Client
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-surface-subtle p-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-surface-soft text-accent-primarySoft shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Context card */}
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-text mb-3">Context</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Client</dt>
                  <dd className="font-medium text-text">{proposal.clientName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Type</dt>
                  <dd className="text-text">{proposal.proposalType.replace(/_/g, ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Occasion</dt>
                  <dd className="text-text">{proposal.occasion.replace(/_/g, ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Tier</dt>
                  <dd className="text-text">{proposal.relationshipTier.replace(/_/g, ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Assets</dt>
                  <dd className="font-medium tabular-nums text-text">{formatCurrency(proposal.assetsInScope)}</dd>
                </div>
              </dl>
              {proposal.notes && (
                <p className="mt-3 text-xs text-text-muted border-t border-border-subtle pt-3">{proposal.notes}</p>
              )}
            </div>

            {/* Risk card */}
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-text mb-3">Risk Profile</h3>
              {proposal.riskProfile ? (
                <div className="space-y-3">
                  <RiskScoreGauge score={proposal.riskProfile.compositeScore} label={proposal.riskProfile.compositeLabel} />
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-bold text-text">{proposal.riskProfile.behavioralScore}</div>
                      <div className="text-text-muted">Behavioral</div>
                    </div>
                    <div>
                      <div className="font-bold text-text">{proposal.riskProfile.capacityScore}</div>
                      <div className="text-text-muted">Capacity</div>
                    </div>
                    <div>
                      <div className="font-bold text-text">{proposal.riskProfile.requiredScore}</div>
                      <div className="text-text-muted">Required</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted">Risk profile not yet assessed</p>
              )}
            </div>

            {/* Wizard progress card */}
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-text mb-3">Wizard Progress</h3>
              <div className="space-y-2">
                {['Context', 'Portfolio', 'Risk Profile', 'Model', 'Analysis', 'Output'].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${i < proposal.wizardStep ? 'bg-success-500' : 'bg-surface-subtle'}`} />
                    <span className={`text-xs ${i < proposal.wizardStep ? 'text-text font-medium' : 'text-text-faint'}`}>{s}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Created {new Date(proposal.createdAt).toLocaleDateString()} -- Updated {new Date(proposal.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'holdings' && proposal.currentPortfolio && (
          <HoldingsReviewTable
            holdings={proposal.currentPortfolio.holdings}
            editable={proposal.status === 'DRAFT'}
          />
        )}

        {activeTab === 'holdings' && !proposal.currentPortfolio && (
          <div className="rounded-2xl border border-border-subtle bg-surface-soft p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-text-faint" />
            <h3 className="mt-3 text-sm font-semibold text-text">No portfolio data</h3>
            <p className="mt-1 text-xs text-text-muted">Upload a statement to capture current holdings</p>
          </div>
        )}

        {activeTab === 'comparison' && proposal.currentPortfolio && proposal.proposedModel && (
          <SideBySideComparison
            currentMetrics={proposal.currentPortfolio.metrics}
            proposedMetrics={proposal.currentPortfolio.metrics}
          />
        )}

        {activeTab === 'comparison' && (!proposal.currentPortfolio || !proposal.proposedModel) && (
          <div className="rounded-2xl border border-border-subtle bg-surface-soft p-12 text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-text-faint" />
            <h3 className="mt-3 text-sm font-semibold text-text">Comparison not available</h3>
            <p className="mt-1 text-xs text-text-muted">
              Complete the portfolio scan and model selection first
            </p>
          </div>
        )}

        {activeTab === 'fund-xray' && proposal.fundXray && (
          <FundXrayPanel result={proposal.fundXray} />
        )}

        {activeTab === 'fund-xray' && !proposal.fundXray && (
          <div className="rounded-2xl border border-border-subtle bg-surface-soft p-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-text-faint" />
            <h3 className="mt-3 text-sm font-semibold text-text">Fund X-Ray not available</h3>
            <p className="mt-1 text-xs text-text-muted">Run analytics to decompose fund holdings</p>
          </div>
        )}

        {activeTab === 'stress-tests' && (proposal.enhancedStressTests || proposal.stressTests.length > 0) && (
          <StressTestPanel
            results={proposal.stressTests}
            enhancedResult={proposal.enhancedStressTests}
          />
        )}

        {activeTab === 'stress-tests' && !proposal.enhancedStressTests && proposal.stressTests.length === 0 && (
          <div className="rounded-2xl border border-border-subtle bg-surface-soft p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-text-faint" />
            <h3 className="mt-3 text-sm font-semibold text-text">No stress test results</h3>
            <p className="mt-1 text-xs text-text-muted">Run analytics to generate stress test scenarios</p>
          </div>
        )}

        {activeTab === 'monte-carlo' && proposal.monteCarlo && (
          <MonteCarloFanChart result={proposal.monteCarlo} />
        )}

        {activeTab === 'monte-carlo' && !proposal.monteCarlo && (
          <div className="rounded-2xl border border-border-subtle bg-surface-soft p-12 text-center">
            <LineChart className="mx-auto h-12 w-12 text-text-faint" />
            <h3 className="mt-3 text-sm font-semibold text-text">Monte Carlo not available</h3>
            <p className="mt-1 text-xs text-text-muted">Run analytics with Monte Carlo enabled to generate projections</p>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsTab
            proposalId={proposal.proposalId}
            ips={proposal.ips}
            regBI={proposal.regBI}
            hasRiskProfile={!!proposal.riskProfile}
            hasProposedModel={!!proposal.proposedModel}
          />
        )}

        {activeTab === 'narrative' && (
          <div className="rounded-2xl border border-border-subtle bg-surface-soft p-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-text-faint" />
            <h3 className="mt-3 text-sm font-semibold text-text">AI Narrative</h3>
            <p className="mt-1 text-xs text-text-muted">
              Generate an AI-powered proposal narrative after completing the analysis step
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
