'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

interface AgentStatus {
  name: string;
  phase: 1 | 2;
  status: 'complete' | 'running' | 'pending' | 'paused';
  findings: number;
}

interface Finding {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  agent: string;
  action_required: string;
  provisions_cited: string;
  legal_authority: string;
  recommended_action: string;
}

interface Report {
  executive_summary: string;
  estate_value: number;
  tax_exposure: number;
  findings_count: number;
  recommendations_count: number;
  sections: {
    title: string;
    content: string;
    findings: string[];
  }[];
}

interface Document {
  id: string;
  filename: string;
  type: string;
  classification: string;
  confidence: number;
  red_flags: string[];
  relationships: { target: string; relationship: string }[];
}

type Tab = 'progress' | 'findings' | 'report' | 'documents';

// ───────────────────────────────────────────────────────────────────────────
// Components
// ───────────────────────────────────────────────────────────────────────────

function TabButton({
  tab,
  currentTab,
  onClick,
  children,
}: {
  tab: Tab;
  currentTab: Tab;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const isActive = tab === currentTab;
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
        isActive
          ? 'border-accent-primary text-accent-primary'
          : 'border-transparent text-text-muted hover:text-text hover:border-border'
      }`}
    >
      {children}
    </button>
  );
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  const statusIcons = {
    complete: (
      <svg className="h-5 w-5 text-success-700" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    running: (
      <svg className="h-5 w-5 text-info-700 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
    pending: (
      <svg className="h-5 w-5 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    paused: (
      <svg className="h-5 w-5 text-warning-700" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-soft p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcons[agent.status]}
          <span className="text-sm font-medium text-text">{agent.name}</span>
        </div>
        <span className="text-xs font-medium text-text-muted">
          {agent.findings} {agent.findings === 1 ? 'finding' : 'findings'}
        </span>
      </div>
      <p className="text-xs text-text-muted">Phase {agent.phase}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Finding['severity'] }) {
  const variants = {
    CRITICAL: 'bg-critical-100 text-critical-700 border-critical-200',
    HIGH: 'bg-warning-100 text-warning-700 border-warning-200',
    MEDIUM: 'bg-info-100 text-info-700 border-info-200',
    LOW: 'bg-surface-subtle text-text-muted border-border',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variants[severity]}`}>
      {severity}
    </span>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Main Page
// ───────────────────────────────────────────────────────────────────────────

export default function AnalysisDetailPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params?.id as string;

  const [tab, setTab] = useState<Tab>('progress');
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'severity' | 'category'>('severity');

  useEffect(() => {
    if (!analysisId) return;

    async function fetchData() {
      try {
        // In production, these would be real API calls
        // For now, simulating with mock data

        // Simulate agent progress polling (would poll every 3 seconds in production)
        const mockAgents: AgentStatus[] = [
          { name: 'Trust Validator', phase: 1, status: 'complete', findings: 3 },
          { name: 'Tax Analyzer', phase: 1, status: 'complete', findings: 5 },
          { name: 'Asset Cross-Checker', phase: 1, status: 'running', findings: 2 },
          { name: 'Beneficiary Validator', phase: 2, status: 'pending', findings: 0 },
          { name: 'Estate Plan Synthesizer', phase: 2, status: 'pending', findings: 0 },
        ];

        const mockFindings: Finding[] = [
          {
            id: 'f1',
            severity: 'CRITICAL',
            category: 'Tax Planning',
            title: 'Generation-skipping transfer tax exposure detected',
            agent: 'Tax Analyzer',
            action_required: 'Review trust provisions',
            provisions_cited: 'Article III, Section 2.4',
            legal_authority: '26 USC § 2601',
            recommended_action: 'Amend trust to include GST exemption allocation clause',
          },
          {
            id: 'f2',
            severity: 'HIGH',
            category: 'Trust Structure',
            title: 'Missing trustee succession provisions',
            agent: 'Trust Validator',
            action_required: 'Add successor trustee',
            provisions_cited: 'Article II',
            legal_authority: 'State trust code § 7-201',
            recommended_action: 'Draft amendment naming successor trustees',
          },
          {
            id: 'f3',
            severity: 'MEDIUM',
            category: 'Asset Alignment',
            title: 'LLC operating agreement conflicts with trust provisions',
            agent: 'Asset Cross-Checker',
            action_required: 'Reconcile documents',
            provisions_cited: 'Trust Article IV; LLC Section 5.2',
            legal_authority: 'N/A',
            recommended_action: 'Align distribution provisions across entities',
          },
        ];

        const mockReport: Report = {
          executive_summary: 'Analysis complete. Identified 3 critical issues requiring immediate attention and 5 medium-priority recommendations for estate plan optimization.',
          estate_value: 15400000,
          tax_exposure: 2100000,
          findings_count: 8,
          recommendations_count: 12,
          sections: [
            {
              title: 'Trust Structure Analysis',
              content: 'The revocable trust demonstrates standard provisions but lacks critical successor trustee language.',
              findings: ['f1', 'f2'],
            },
            {
              title: 'Tax Optimization',
              content: 'Current structure exposes estate to unnecessary generation-skipping transfer tax.',
              findings: ['f1'],
            },
          ],
        };

        const mockDocuments: Document[] = [
          {
            id: 'd1',
            filename: 'Anderson_Revocable_Trust.pdf',
            type: 'PDF',
            classification: 'Revocable Trust',
            confidence: 0.94,
            red_flags: ['Missing successor trustee'],
            relationships: [{ target: 'Anderson_LLC_Operating_Agreement.pdf', relationship: 'references' }],
          },
          {
            id: 'd2',
            filename: 'Anderson_LLC_Operating_Agreement.pdf',
            type: 'PDF',
            classification: 'LLC Operating Agreement',
            confidence: 0.89,
            red_flags: [],
            relationships: [{ target: 'Anderson_Revocable_Trust.pdf', relationship: 'referenced by' }],
          },
        ];

        setAgents(mockAgents);
        setFindings(mockFindings);
        setReport(mockReport);
        setDocuments(mockDocuments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [analysisId]);

  const filteredFindings = findings
    .filter(f => !filterSeverity || f.severity === filterSeverity)
    .filter(f => !filterCategory || f.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'severity') {
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return order[a.severity] - order[b.severity];
      }
      return a.category.localeCompare(b.category);
    });

  const phase1Agents = agents.filter(a => a.phase === 1);
  const phase2Agents = agents.filter(a => a.phase === 2);
  const progressPct = (agents.filter(a => a.status === 'complete').length / agents.length) * 100;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="h-8 w-64 rounded bg-surface-subtle animate-pulse mb-8" />
        <div className="h-96 rounded-2xl bg-surface-subtle animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/estate-intelligence')}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text mb-4 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Analyses
        </button>
        <h1 className="text-2xl font-bold text-text">Analysis: Anderson Family Trust</h1>
        <p className="mt-1 text-sm text-text-muted">Created March 26, 2024</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle">
        <nav className="flex gap-6">
          <TabButton tab="progress" currentTab={tab} onClick={() => setTab('progress')}>
            Progress
          </TabButton>
          <TabButton tab="findings" currentTab={tab} onClick={() => setTab('findings')}>
            Findings ({findings.length})
          </TabButton>
          <TabButton tab="report" currentTab={tab} onClick={() => setTab('report')}>
            Report
          </TabButton>
          <TabButton tab="documents" currentTab={tab} onClick={() => setTab('documents')}>
            Documents ({documents.length})
          </TabButton>
        </nav>
      </div>

      {/* Progress Tab */}
      {tab === 'progress' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text">Analysis Progress</h2>
              <span className="text-sm text-text-muted">{Math.round(progressPct)}% complete</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden mb-6">
              <div
                className="h-full bg-accent-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-sm text-text-muted">
              Estimated time remaining: {progressPct < 100 ? '12 minutes' : 'Complete'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-text mb-4">Phase 1: Document Analysis</h3>
              <div className="space-y-3">
                {phase1Agents.map(agent => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-text mb-4">Phase 2: Cross-Analysis</h3>
              <div className="space-y-3">
                {phase2Agents.map(agent => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Findings Tab */}
      {tab === 'findings' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="">All Categories</option>
              <option value="Tax Planning">Tax Planning</option>
              <option value="Trust Structure">Trust Structure</option>
              <option value="Asset Alignment">Asset Alignment</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'severity' | 'category')}
              className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="severity">Sort by Severity</option>
              <option value="category">Sort by Category</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredFindings.map(finding => (
              <div
                key={finding.id}
                className="rounded-lg border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 shadow-sm"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <SeverityBadge severity={finding.severity} />
                      <span className="text-xs text-text-muted">{finding.category}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-text">{finding.title}</h3>
                    <p className="text-xs text-text-muted mt-1">Agent: {finding.agent}</p>
                  </div>
                  <svg
                    className={`h-5 w-5 text-text-muted transition-transform ${expandedFinding === finding.id ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {expandedFinding === finding.id && (
                  <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
                    <div>
                      <p className="text-xs font-medium text-text-muted mb-1">Provisions Cited</p>
                      <p className="text-sm text-text">{finding.provisions_cited}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-muted mb-1">Legal Authority</p>
                      <p className="text-sm text-text">{finding.legal_authority}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-muted mb-1">Recommended Action</p>
                      <p className="text-sm text-text">{finding.recommended_action}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Tab */}
      {tab === 'report' && report && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text mb-4">Executive Summary</h2>
            <p className="text-sm text-text leading-relaxed">{report.executive_summary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border-subtle bg-surface-soft p-4">
              <p className="text-xs text-text-muted mb-1">Estate Value</p>
              <p className="text-xl font-bold text-text tabular-nums">
                ${(report.estate_value / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-soft p-4">
              <p className="text-xs text-text-muted mb-1">Tax Exposure</p>
              <p className="text-xl font-bold text-critical-700 tabular-nums">
                ${(report.tax_exposure / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-soft p-4">
              <p className="text-xs text-text-muted mb-1">Findings</p>
              <p className="text-xl font-bold text-text tabular-nums">{report.findings_count}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-soft p-4">
              <p className="text-xs text-text-muted mb-1">Recommendations</p>
              <p className="text-xl font-bold text-text tabular-nums">{report.recommendations_count}</p>
            </div>
          </div>

          <div className="space-y-4">
            {report.sections.map((section, i) => (
              <details key={i} className="group rounded-lg border border-border-subtle bg-surface-soft">
                <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-text hover:bg-surface-subtle transition-colors">
                  <span className="text-sm font-semibold">{section.title}</span>
                  <svg
                    className="h-5 w-5 text-text-muted transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-text leading-relaxed">
                  <p className="mb-3">{section.content}</p>
                  <div className="flex gap-2 flex-wrap">
                    {section.findings.map(fid => (
                      <span key={fid} className="text-xs text-accent-primarySoft">#{fid}</span>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-subtle">
              Export as PDF
            </button>
            <button className="rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-subtle">
              Export as Word
            </button>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        <div className="space-y-4">
          {documents.map(doc => (
            <div key={doc.id} className="rounded-lg border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-info-100">
                    <svg className="h-5 w-5 text-info-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{doc.filename}</p>
                    <p className="text-xs text-text-muted mt-0.5">{doc.type}</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-info-100 px-2 py-0.5 text-xs font-medium text-info-700">
                  {doc.classification} ({Math.round(doc.confidence * 100)}% confidence)
                </span>
              </div>

              {doc.red_flags.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-critical-700 mb-1">Red Flags:</p>
                  <ul className="space-y-1">
                    {doc.red_flags.map((flag, i) => (
                      <li key={i} className="text-xs text-critical-600">• {flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {doc.relationships.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Relationships:</p>
                  <div className="flex gap-2 flex-wrap">
                    {doc.relationships.map((rel, i) => (
                      <span key={i} className="text-xs text-text-muted">
                        {rel.relationship} <span className="text-accent-primarySoft">{rel.target}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
