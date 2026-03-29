'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Eye,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

interface ReviewItem {
  id: string;
  source: string;
  title: string;
  type: 'law_change' | 'pending_legislation' | 'new_provision';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  affectedClients: number;
  affectedTables: string[];
  summary: string;
  aiAnalysis: string;
  currentTable: string;
  proposedTable: string;
  estimatedImpact: string;
  status: 'pending' | 'approved' | 'rejected' | 'scenario_created';
  billNumber?: string;
  effectiveDate?: string;
}

const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 'REV-001',
    source: 'Congress.gov',
    title: 'SALT Cap Extension Act (S.1234)',
    type: 'pending_legislation',
    severity: 'medium',
    detectedAt: 'Feb 28, 2026',
    affectedClients: 847,
    affectedTables: ['standard_deductions', 'state_income_tax'],
    summary: 'Proposes raising SALT deduction cap from $10K to $30K for taxpayers with AGI under $400K. Bipartisan co-sponsors. Passed Senate Finance Committee markup on 2/25.',
    aiAnalysis: 'This bill would significantly benefit clients in high-tax states (CA, NY, NJ, CT, MA) with AGI under $400K. The $20K increase in SALT deduction would reduce federal tax liability by an estimated $4,400-$7,200 per year for affected clients. Bill has moderate probability of passage given bipartisan support. Impact primarily on mass affluent and lower HNW tiers. UHNW clients (AGI >$400K) are unaffected. Estimated effective date January 1, 2027 if signed.',
    currentTable: 'SALT Deduction Cap: $10,000 (all filing statuses)\nNo AGI phase-out — flat cap since TCJA 2018',
    proposedTable: 'SALT Deduction Cap:\n  AGI ≤ $400K: $30,000 (MFJ), $15,000 (single/MFS)\n  AGI > $400K: $10,000 (unchanged)',
    estimatedImpact: 'Average $5,800/yr savings per affected client. Total across firm: ~$4.9M in reduced client tax burden.',
    status: 'pending',
    billNumber: 'S.1234',
    effectiveDate: 'Jan 1, 2027 (if signed)',
  },
  {
    id: 'REV-002',
    source: 'Maine Revenue Services',
    title: 'Maine Estate Tax Exemption Increase',
    type: 'law_change',
    severity: 'low',
    detectedAt: 'Mar 1, 2026',
    affectedClients: 12,
    affectedTables: ['state_estate_tax'],
    summary: 'Maine estate tax exemption increased from $6.8M to $7.1M effective January 1, 2027 through annual inflation adjustment. Rate structure unchanged (8%-12% graduated).',
    aiAnalysis: 'Minor inflation adjustment to Maine estate tax exemption. Only 12 firm clients are Maine residents with estates near the exemption threshold. Impact is modest — clients with estates between $6.8M and $7.1M see their entire Maine estate tax liability eliminated (savings of approximately $24K-$36K). Straightforward numeric adjustment that aligns with typical annual inflation indexing.',
    currentTable: 'Maine Estate Tax:\n  Exemption: $6,800,000\n  Rates: 8% ($0-$3M over exemption)\n         10% ($3M-$5M over exemption)\n         12% ($5M+ over exemption)',
    proposedTable: 'Maine Estate Tax:\n  Exemption: $7,100,000  (+$300K)\n  Rates: 8% ($0-$3M over exemption)  (unchanged)\n         10% ($3M-$5M over exemption)  (unchanged)\n         12% ($5M+ over exemption)  (unchanged)',
    estimatedImpact: 'Up to $36K savings for clients with estates $6.8M-$7.1M. Minimal impact for most clients.',
    status: 'pending',
    effectiveDate: 'Jan 1, 2027',
  },
  {
    id: 'REV-003',
    source: 'Congress.gov',
    title: 'Capital Gains Rate Increase Proposal (H.R.5678)',
    type: 'pending_legislation',
    severity: 'high',
    detectedAt: 'Feb 15, 2026',
    affectedClients: 156,
    affectedTables: ['capital_gains_brackets'],
    summary: 'Proposes increasing top LTCG rate from 20% to 28% for taxpayers with income above $1M. Introduced in House Ways and Means Committee. No markup scheduled yet.',
    aiAnalysis: 'This is an early-stage bill with relatively low probability of passage in the current Congress. However, the 8pp rate increase would be significant for UHNW clients with large capital gains realizations. Recommend creating as a "What-If" scenario so advisors can model impact without updating baseline tables. Key planning opportunity: clients with appreciated positions may want to accelerate gain recognition if bill gains traction.',
    currentTable: 'LTCG Rates:\n  0%: $0 — $96,700 (MFJ)\n  15%: $96,701 — $600,050 (MFJ)\n  20%: $600,051+ (MFJ)\n  + 3.8% NIIT for AGI > $250K',
    proposedTable: 'LTCG Rates:\n  0%: $0 — $96,700 (MFJ)  (unchanged)\n  15%: $96,701 — $600,050 (MFJ)  (unchanged)\n  20%: $600,051 — $1,000,000 (MFJ)  (new)\n  28%: $1,000,001+ (MFJ)  (new tier)\n  + 3.8% NIIT  (unchanged)',
    estimatedImpact: 'Average $18,400 additional tax for affected clients. Total firm impact: ~$2.9M in additional client tax burden.',
    status: 'scenario_created',
    billNumber: 'H.R.5678',
    effectiveDate: 'Jan 1, 2027 (if signed)',
  },
  {
    id: 'REV-004',
    source: 'IRS Federal Register',
    title: 'SECURE 2.0 Final Regulations — Roth Catch-Up Contribution',
    type: 'new_provision',
    severity: 'medium',
    detectedAt: 'Jan 15, 2026',
    affectedClients: 89,
    affectedTables: ['contribution_limits_401k'],
    summary: 'Final regulations issued implementing SECURE 2.0 requirement that catch-up contributions for participants earning >$145K must be made on Roth (after-tax) basis. Effective January 1, 2026.',
    aiAnalysis: 'This regulation was anticipated from SECURE 2.0 legislation. It requires plan participants aged 50+ earning >$145K to make all catch-up contributions ($7,500 in 2026) as Roth contributions. This changes the tax treatment of catch-up contributions for 89 firm clients. While it increases current-year taxes, it provides long-term tax-free growth. Advisors should proactively discuss this with affected clients and adjust payroll withholding.',
    currentTable: 'Standard catch-up: $7,500 (pre-tax OR Roth — participant choice)',
    proposedTable: 'Earnings >$145K: $7,500 catch-up MUST be Roth (after-tax)\nEarnings ≤$145K: $7,500 (pre-tax OR Roth — participant choice)',
    estimatedImpact: 'Immediate tax increase of ~$2,550 per affected client (catch-up × marginal rate). Long-term benefit of tax-free growth.',
    status: 'approved',
    effectiveDate: 'Jan 1, 2026 (already effective)',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReviewQueuePage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'scenario_created'>('all');

  const filteredItems = filter === 'all' ? REVIEW_ITEMS : REVIEW_ITEMS.filter((item) => item.status === filter);

  const statusCounts = {
    all: REVIEW_ITEMS.length,
    pending: REVIEW_ITEMS.filter((i) => i.status === 'pending').length,
    approved: REVIEW_ITEMS.filter((i) => i.status === 'approved').length,
    rejected: REVIEW_ITEMS.filter((i) => i.status === 'rejected').length,
    scenario_created: REVIEW_ITEMS.filter((i) => i.status === 'scenario_created').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/update-engine" className="text-text-faint hover:text-text-muted">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-text">Human Review Queue</h2>
            <p className="text-sm text-text-muted">Review and approve tax table changes that require human verification</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">{statusCounts.pending} pending</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'scenario_created', label: 'Scenarios' },
          { key: 'rejected', label: 'Rejected' },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === f.key
                ? 'bg-accent-primary/10 text-accent-primarySoft'
                : 'text-text-muted hover:text-text-muted hover:bg-surface-subtle'
            }`}
          >
            {f.label} ({statusCounts[f.key]})
          </button>
        ))}
      </div>

      {/* Review items */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm overflow-hidden">
              {/* Header row */}
              <div
                className="px-5 py-4 cursor-pointer hover:bg-surface-subtle/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.severity === 'critical' ? 'bg-critical-500' :
                      item.severity === 'high' ? 'bg-orange-500' :
                      item.severity === 'medium' ? 'bg-warning-500' :
                      'bg-accent-primary'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text">{item.title}</span>
                        {item.billNumber && (
                          <span className="text-xs text-text-faint">{item.billNumber}</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{item.source} · Detected {item.detectedAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.type === 'law_change' ? 'bg-critical-50 text-critical-700' :
                      item.type === 'pending_legislation' ? 'bg-warning-50 text-warning-700' :
                      'bg-accent-primary/10 text-accent-primarySoft'
                    }`}>
                      {item.type === 'law_change' ? 'Law Change' :
                       item.type === 'pending_legislation' ? 'Pending Legislation' :
                       'New Provision'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'pending' ? 'bg-warning-50 text-warning-700' :
                      item.status === 'approved' ? 'bg-success-50 text-success-700' :
                      item.status === 'rejected' ? 'bg-critical-50 text-critical-700' :
                      'bg-accent-primary/10 text-accent-primarySoft'
                    }`}>
                      {item.status === 'pending' && <><Clock size={10} /> Pending</>}
                      {item.status === 'approved' && <><CheckCircle2 size={10} /> Approved</>}
                      {item.status === 'rejected' && <><XCircle size={10} /> Rejected</>}
                      {item.status === 'scenario_created' && <><Eye size={10} /> Scenario</>}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-text-faint" /> : <ChevronDown size={16} className="text-text-faint" />}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-limestone-100">
                  <div className="px-5 py-4 space-y-4">
                    {/* Impact strip */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-transparent">
                        <p className="text-xs text-text-muted mb-0.5">Affected Clients</p>
                        <p className="text-lg font-bold text-text">{item.affectedClients.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-transparent">
                        <p className="text-xs text-text-muted mb-0.5">Affected Tables</p>
                        <p className="text-sm font-medium text-text">{item.affectedTables.join(', ')}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-transparent">
                        <p className="text-xs text-text-muted mb-0.5">Effective Date</p>
                        <p className="text-sm font-medium text-text">{item.effectiveDate ?? 'TBD'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-transparent">
                        <p className="text-xs text-text-muted mb-0.5">Severity</p>
                        <p className={`text-sm font-bold ${
                          item.severity === 'critical' ? 'text-critical-500' :
                          item.severity === 'high' ? 'text-orange-600' :
                          item.severity === 'medium' ? 'text-warning-500' :
                          'text-accent-primarySoft'
                        }`}>{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}</p>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    <div className="p-4 rounded-lg bg-accent-primary/10/50 border border-brand-100">
                      <p className="text-xs font-semibold text-accent-primarySoft mb-1.5 flex items-center gap-1">
                        <Pause size={10} /> AI ANALYSIS
                      </p>
                      <p className="text-sm text-text-muted leading-relaxed">{item.aiAnalysis}</p>
                    </div>

                    {/* Table comparison */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-border-subtle">
                        <p className="text-xs font-semibold text-text-muted uppercase mb-2">Current Table</p>
                        <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed">{item.currentTable}</pre>
                      </div>
                      <div className="p-4 rounded-lg border border-success-100 bg-success-50/30">
                        <p className="text-xs font-semibold text-success-700 uppercase mb-2">Proposed Change</p>
                        <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed">{item.proposedTable}</pre>
                      </div>
                    </div>

                    {/* Estimated impact */}
                    <div className="p-3 rounded-lg bg-warning-50/50 border border-warning-100">
                      <p className="text-xs font-semibold text-warning-700 mb-1">ESTIMATED IMPACT</p>
                      <p className="text-sm text-text-muted">{item.estimatedImpact}</p>
                    </div>

                    {/* Action buttons */}
                    {item.status === 'pending' && (
                      <div className="flex items-center gap-3 pt-2 border-t border-limestone-100">
                        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-text bg-success-500 rounded-lg hover:bg-success-700 transition-colors">
                          <CheckCircle2 size={14} /> Approve &amp; Publish
                        </button>
                        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent-primarySoft bg-accent-primary/10 rounded-lg hover:bg-accent-primary/15 transition-colors">
                          <Eye size={14} /> Create Scenario Only
                        </button>
                        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-critical-700 bg-critical-50 rounded-lg hover:bg-critical-100 transition-colors">
                          <XCircle size={14} /> Reject
                        </button>
                        <div className="flex-1" />
                        <div className="text-right">
                          <label className="text-xs text-text-muted block mb-1">Reviewer Notes</label>
                          <input
                            type="text"
                            placeholder="Add notes..."
                            className="w-64 px-3 py-1.5 text-sm border border-border-subtle rounded-lg focus:outline-hidden focus:ring-2 focus:ring-accent-primary"
                          />
                        </div>
                      </div>
                    )}

                    {item.status !== 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-limestone-100">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg ${
                          item.status === 'approved' ? 'bg-success-50 text-success-700' :
                          item.status === 'rejected' ? 'bg-critical-50 text-critical-700' :
                          'bg-accent-primary/10 text-accent-primarySoft'
                        }`}>
                          {item.status === 'approved' && <><CheckCircle2 size={14} /> Published to production tables</>}
                          {item.status === 'rejected' && <><XCircle size={14} /> Rejected — monitoring continues</>}
                          {item.status === 'scenario_created' && <><Eye size={14} /> Available as &ldquo;What-If&rdquo; scenario for advisors</>}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-text-faint">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No items matching this filter</p>
        </div>
      )}
    </div>
  );
}
