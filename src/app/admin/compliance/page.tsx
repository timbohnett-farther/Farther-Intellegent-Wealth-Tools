'use client';

import React, { useState } from 'react';
import {
  Shield,
  Search,
  Download,
  Filter,
  Eye,
  FileText,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const AUDIT_LOG = [
  { id: '1', timestamp: '2026-03-01 09:12:34', actor: 'Sarah Chen', actorType: 'advisor', action: 'UPDATE', resource: 'Plan', resourceId: 'plan_284', detail: 'Updated income sources for Chen household' },
  { id: '2', timestamp: '2026-03-01 09:08:12', actor: 'System', actorType: 'system', action: 'CALCULATE', resource: 'Plan', resourceId: 'plan_284', detail: 'Plan recalculated — success rate: 82%' },
  { id: '3', timestamp: '2026-03-01 08:45:00', actor: 'System', actorType: 'system', action: 'CREATE', resource: 'Insight', resourceId: 'insight_1201', detail: 'Generated 12 insights from nightly plan monitor' },
  { id: '4', timestamp: '2026-03-01 08:30:00', actor: 'Emily Davis', actorType: 'advisor', action: 'VIEW', resource: 'Report', resourceId: 'report_156', detail: 'Viewed comprehensive plan report for Thompson' },
  { id: '5', timestamp: '2026-03-01 08:15:22', actor: 'Michael Torres', actorType: 'advisor', action: 'EXPORT', resource: 'Report', resourceId: 'report_155', detail: 'Exported tax strategy report as PDF' },
  { id: '6', timestamp: '2026-02-29 17:45:00', actor: 'Lisa Park', actorType: 'advisor', action: 'CREATE', resource: 'Client', resourceId: 'client_285', detail: 'Created new client: Anderson household' },
  { id: '7', timestamp: '2026-02-29 16:30:11', actor: 'James Wilson', actorType: 'advisor', action: 'DELETE', resource: 'IncomeSource', resourceId: 'inc_892', detail: 'Removed inactive pension income from Johnson plan' },
  { id: '8', timestamp: '2026-02-29 15:20:00', actor: 'Client Portal', actorType: 'client', action: 'VIEW', resource: 'Plan', resourceId: 'plan_201', detail: 'Client viewed plan summary via portal' },
  { id: '9', timestamp: '2026-02-29 14:10:33', actor: 'Sarah Chen', actorType: 'advisor', action: 'CREATE', resource: 'RegBI', resourceId: 'regbi_89', detail: 'Generated Reg BI documentation for Williams plan' },
  { id: '10', timestamp: '2026-02-29 13:00:00', actor: 'System', actorType: 'system', action: 'LOGIN', resource: 'Session', resourceId: 'sess_4521', detail: 'Emily Davis logged in from 192.168.1.45' },
];

const REG_BI_DOCS = [
  { id: '1', clientName: 'Patricia Williams', advisor: 'Sarah Chen', date: '2026-02-29', status: 'locked', recommendations: 4, acknowledged: true },
  { id: '2', clientName: 'Robert Johnson', advisor: 'James Wilson', date: '2026-02-28', status: 'locked', recommendations: 3, acknowledged: true },
  { id: '3', clientName: 'David & Maria Garcia', advisor: 'Michael Torres', date: '2026-02-25', status: 'locked', recommendations: 5, acknowledged: false },
  { id: '4', clientName: 'James & Lisa Park', advisor: 'Lisa Park', date: '2026-02-20', status: 'draft', recommendations: 2, acknowledged: false },
  { id: '5', clientName: 'Anderson Household', advisor: 'Lisa Park', date: '2026-02-29', status: 'draft', recommendations: 0, acknowledged: false },
];

const RETENTION_STATS = {
  planDataRetention: '7 years',
  auditLogRetention: '7 years',
  reportRetention: '7 years',
  deletedClientAnonymization: '90 days',
  totalAuditEntries: 284_521,
  oldestEntry: '2024-01-15',
  encryptionStatus: 'AES-256 at rest, TLS 1.3 in transit',
  lastSecurityScan: '2026-02-15',
  vulnerabilities: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompliancePage() {
  const [activeSection, setActiveSection] = useState<'audit' | 'regbi' | 'retention'>('audit');
  const [auditSearch, setAuditSearch] = useState('');

  const filteredAudit = AUDIT_LOG.filter((e) =>
    !auditSearch || e.actor.toLowerCase().includes(auditSearch.toLowerCase()) || e.detail.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex gap-2">
        {[
          { key: 'audit' as const, label: 'Audit Log', icon: Eye },
          { key: 'regbi' as const, label: 'Reg BI Documentation', icon: Shield },
          { key: 'retention' as const, label: 'Data Retention & Security', icon: Lock },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSection === s.key ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* Audit Log Section */}
      {activeSection === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit log..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-200 hover:bg-gray-50">
              <Download size={14} /> Export for FINRA
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actor</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Resource</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{e.timestamp}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        e.actorType === 'system' ? 'bg-purple-50 text-purple-700' :
                        e.actorType === 'client' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {e.actor}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${
                        e.action === 'DELETE' ? 'text-red-600' :
                        e.action === 'CREATE' ? 'text-green-600' :
                        e.action === 'UPDATE' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>{e.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{e.resource}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reg BI Section */}
      {activeSection === 'regbi' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Reg BI Documentation Tracker</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Advisor</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase text-right">Recommendations</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Client Ack</th>
              </tr>
            </thead>
            <tbody>
              {REG_BI_DOCS.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{doc.clientName}</td>
                  <td className="px-5 py-3 text-gray-600">{doc.advisor}</td>
                  <td className="px-5 py-3 text-gray-600">{doc.date}</td>
                  <td className="px-5 py-3 text-gray-600 text-right">{doc.recommendations}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      doc.status === 'locked' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {doc.status === 'locked' ? <Lock size={10} /> : <Clock size={10} />}
                      {doc.status === 'locked' ? 'Locked' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {doc.acknowledged ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data Retention Section */}
      {activeSection === 'retention' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Audit Entries', value: RETENTION_STATS.totalAuditEntries.toLocaleString(), sub: `Since ${RETENTION_STATS.oldestEntry}` },
              { label: 'Encryption', value: 'AES-256', sub: 'At rest & in transit (TLS 1.3)' },
              { label: 'Vulnerabilities', value: `${RETENTION_STATS.vulnerabilities}`, sub: `Last scan: ${RETENTION_STATS.lastSecurityScan}` },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{k.label}</p>
                <p className="text-lg font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Retention Policies</h3>
            <div className="space-y-2">
              {[
                { resource: 'Plan Data', retention: '7 years', action: 'Archive', status: 'Active' },
                { resource: 'Audit Logs', retention: '7 years (immutable)', action: 'Append-only', status: 'Active' },
                { resource: 'Generated Reports', retention: '7 years', action: 'Archive', status: 'Active' },
                { resource: 'Reg BI Documents', retention: '7 years (locked)', action: 'Read-only', status: 'Active' },
                { resource: 'Deleted Client Data', retention: '90 days', action: 'Anonymize', status: 'Active' },
                { resource: 'Session Logs', retention: '1 year', action: 'Delete', status: 'Active' },
              ].map((p) => (
                <div key={p.resource} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{p.resource}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">{p.retention}</span>
                    <span className="text-gray-500">{p.action}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                      <CheckCircle2 size={10} /> {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">SOC 2 Evidence Collection</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { control: 'Access Control', evidence: 'Role-based access, MFA enforcement', status: 'Collected' },
                { control: 'Change Management', evidence: 'Audit log of all data changes', status: 'Collected' },
                { control: 'Data Encryption', evidence: 'AES-256 at rest, TLS 1.3 in transit', status: 'Collected' },
                { control: 'Incident Response', evidence: 'IR runbook documented', status: 'Collected' },
                { control: 'Backup & Recovery', evidence: 'Daily backups, 7-day retention', status: 'Collected' },
                { control: 'Vulnerability Management', evidence: 'Dependency scanning, annual pentest', status: 'Collected' },
              ].map((c) => (
                <div key={c.control} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
                  <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.control}</p>
                    <p className="text-xs text-gray-500">{c.evidence}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
