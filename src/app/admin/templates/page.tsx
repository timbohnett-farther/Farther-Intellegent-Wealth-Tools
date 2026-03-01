'use client';

import React, { useState } from 'react';
import { Copy, Plus, Settings, FileText, Mail, Workflow, BarChart3, Edit3, Trash2, CheckCircle2 } from 'lucide-react';

const TEMPLATE_CATEGORIES = [
  { key: 'assumptions', label: 'Plan Assumptions', icon: Settings },
  { key: 'reports', label: 'Report Templates', icon: FileText },
  { key: 'emails', label: 'Email Templates', icon: Mail },
  { key: 'workflows', label: 'Workflow Templates', icon: Workflow },
] as const;

type CategoryKey = (typeof TEMPLATE_CATEGORIES)[number]['key'];

const ASSUMPTION_TEMPLATES = [
  { id: '1', name: 'Conservative', desc: 'Lower returns, higher inflation — for risk-averse clients', equity: '5.5%', bond: '3.0%', inflation: '3.0%', mc: '5,000 runs', isDefault: false },
  { id: '2', name: 'Moderate (Default)', desc: 'Balanced assumptions — standard for most plans', equity: '7.0%', bond: '4.0%', inflation: '2.8%', mc: '1,000 runs', isDefault: true },
  { id: '3', name: 'Aggressive', desc: 'Higher returns, lower inflation — for growth-oriented clients', equity: '9.0%', bond: '5.0%', inflation: '2.5%', mc: '1,000 runs', isDefault: false },
];

const REPORT_TEMPLATES = [
  { id: '1', name: 'Comprehensive Financial Plan', sections: 12, pages: '40-60', lastUsed: '2 days ago' },
  { id: '2', name: 'Annual Review Summary', sections: 6, pages: '15-20', lastUsed: '1 week ago' },
  { id: '3', name: 'Tax Strategy Report', sections: 4, pages: '8-12', lastUsed: '3 days ago' },
  { id: '4', name: 'Retirement Readiness', sections: 5, pages: '10-15', lastUsed: '1 week ago' },
  { id: '5', name: 'Estate Summary', sections: 4, pages: '8-12', lastUsed: '2 weeks ago' },
];

const EMAIL_TEMPLATES = [
  { id: '1', name: 'Welcome Email', subject: 'Welcome to Farther Financial Planning', usage: 284 },
  { id: '2', name: 'Annual Review Invitation', subject: 'It\'s time for your annual financial review', usage: 156 },
  { id: '3', name: 'Roth Conversion Opportunity', subject: 'Tax-saving opportunity: Roth conversion window open', usage: 42 },
  { id: '4', name: 'RMD Reminder', subject: 'Required Minimum Distribution reminder for [year]', usage: 28 },
  { id: '5', name: 'Market Update', subject: 'Market update and your financial plan', usage: 89 },
  { id: '6', name: 'Document Request', subject: 'Documents needed for your financial plan', usage: 201 },
];

const WORKFLOW_TEMPLATES = [
  { id: '1', name: 'New Client Onboarding', steps: 7, trigger: 'Client created', isSystem: true, executions: 284 },
  { id: '2', name: 'Annual Review Workflow', steps: 5, trigger: 'Scheduled (Jan 1)', isSystem: true, executions: 2 },
  { id: '3', name: 'RMD Reminder', steps: 3, trigger: 'Scheduled (Oct 1)', isSystem: true, executions: 1 },
  { id: '4', name: 'Market Correction Response', steps: 3, trigger: 'Market drop > 10%', isSystem: true, executions: 0 },
  { id: '5', name: 'Life Event Response', steps: 3, trigger: 'Life event submitted', isSystem: true, executions: 12 },
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('assumptions');

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex gap-2">
        {TEMPLATE_CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeCategory === c.key ? 'bg-brand-500 text-white' : 'bg-white text-charcoal-500 border border-limestone-200 hover:bg-limestone-50'
              }`}
            >
              <Icon size={14} /> {c.label}
            </button>
          );
        })}
      </div>

      {/* Plan Assumptions */}
      {activeCategory === 'assumptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-charcoal-500">Pre-configured assumption sets for new plans</p>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100">
              <Plus size={14} /> New Template
            </button>
          </div>
          <div className="grid gap-4">
            {ASSUMPTION_TEMPLATES.map((t) => (
              <div key={t.id} className={`bg-white rounded-xl border shadow-sm p-5 ${t.isDefault ? 'border-brand-300' : 'border-limestone-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-charcoal-900">{t.name}</h3>
                      {t.isDefault && <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Default</span>}
                    </div>
                    <p className="text-xs text-charcoal-500 mt-0.5">{t.desc}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 text-charcoal-300 hover:text-charcoal-500 rounded"><Edit3 size={14} /></button>
                    <button className="p-1.5 text-charcoal-300 hover:text-critical-500 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t border-limestone-100">
                  <div><p className="text-xs text-charcoal-500">Equity Return</p><p className="text-sm font-medium text-charcoal-900">{t.equity}</p></div>
                  <div><p className="text-xs text-charcoal-500">Bond Return</p><p className="text-sm font-medium text-charcoal-900">{t.bond}</p></div>
                  <div><p className="text-xs text-charcoal-500">Inflation</p><p className="text-sm font-medium text-charcoal-900">{t.inflation}</p></div>
                  <div><p className="text-xs text-charcoal-500">Monte Carlo</p><p className="text-sm font-medium text-charcoal-900">{t.mc}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Templates */}
      {activeCategory === 'reports' && (
        <div className="bg-white rounded-xl border border-limestone-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-limestone-100">
            <h3 className="text-sm font-semibold text-charcoal-900">Report Templates</h3>
            <button className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"><Plus size={14} /> New Template</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Template</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase text-right">Sections</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase text-right">Est. Pages</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Last Used</th>
            </tr></thead>
            <tbody>
              {REPORT_TEMPLATES.map((t) => (
                <tr key={t.id} className="border-b border-limestone-50 hover:bg-limestone-50/50">
                  <td className="px-5 py-3 font-medium text-charcoal-900">{t.name}</td>
                  <td className="px-5 py-3 text-charcoal-500 text-right">{t.sections}</td>
                  <td className="px-5 py-3 text-charcoal-500 text-right">{t.pages}</td>
                  <td className="px-5 py-3 text-charcoal-500">{t.lastUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Email Templates */}
      {activeCategory === 'emails' && (
        <div className="bg-white rounded-xl border border-limestone-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-limestone-100">
            <h3 className="text-sm font-semibold text-charcoal-900">Email Templates</h3>
            <button className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"><Plus size={14} /> New Template</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Template</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Subject</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase text-right">Times Used</th>
            </tr></thead>
            <tbody>
              {EMAIL_TEMPLATES.map((t) => (
                <tr key={t.id} className="border-b border-limestone-50 hover:bg-limestone-50/50">
                  <td className="px-5 py-3 font-medium text-charcoal-900">{t.name}</td>
                  <td className="px-5 py-3 text-charcoal-500">{t.subject}</td>
                  <td className="px-5 py-3 text-charcoal-500 text-right">{t.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Workflow Templates */}
      {activeCategory === 'workflows' && (
        <div className="bg-white rounded-xl border border-limestone-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-limestone-100">
            <h3 className="text-sm font-semibold text-charcoal-900">Workflow Automation Templates</h3>
            <button className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"><Plus size={14} /> New Workflow</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Workflow</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase text-right">Steps</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Trigger</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase text-right">Executions</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Type</th>
            </tr></thead>
            <tbody>
              {WORKFLOW_TEMPLATES.map((t) => (
                <tr key={t.id} className="border-b border-limestone-50 hover:bg-limestone-50/50">
                  <td className="px-5 py-3 font-medium text-charcoal-900">{t.name}</td>
                  <td className="px-5 py-3 text-charcoal-500 text-right">{t.steps}</td>
                  <td className="px-5 py-3 text-charcoal-500">{t.trigger}</td>
                  <td className="px-5 py-3 text-charcoal-500 text-right">{t.executions}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.isSystem ? 'bg-brand-50 text-brand-700' : 'bg-limestone-100 text-charcoal-500'}`}>
                      {t.isSystem ? 'System' : 'Custom'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
