'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Phone, Mail, MapPin, Calendar, Tag, FileText, Plus, TrendingUp,
  Shield, AlertCircle, Clock, ChevronRight,
} from 'lucide-react';

const TABS = ['Overview', 'Personal Details', 'Accounts & Net Worth', 'Documents', 'Notes & Activity', 'Risk Profile'];

// Placeholder client data
const SAMPLE_CLIENT = {
  id: 'cl1',
  firstName: 'Sarah',
  lastName: 'Chen',
  coClient: 'Michael Chen',
  age: 52,
  dob: '1974-03-15',
  tier: 'uhnw',
  advisor: 'John Doe',
  phone: '(555) 234-5678',
  email: 'sarah.chen@email.com',
  address: '456 Park Avenue, New York, NY 10022',
  clientSince: '2021-06-01',
  tags: ['UHNW', 'Business Owner', 'Estate Planning'],
  plans: [
    { id: 'pl1', name: 'Comprehensive Financial Plan', status: 'active', lastUpdated: '2026-02-15', successRate: 92 },
    { id: 'pl2', name: 'Retire at 58 Scenario', status: 'draft', lastUpdated: '2026-01-20', successRate: null },
  ],
  netWorth: 12500000,
  totalAssets: 14200000,
  totalLiabilities: 1700000,
  recentActivity: [
    { event: 'Plan updated — added rental income', time: '2 hours ago' },
    { event: 'Annual review completed', time: '1 week ago' },
    { event: 'Estate documents updated', time: '2 weeks ago' },
    { event: 'Risk profile reassessed — Band 5', time: '1 month ago' },
  ],
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

const tierLabels: Record<string, string> = {
  emerging: 'Emerging', mass_affluent: 'Mass Affluent', hnw: 'HNW', uhnw: 'UHNW',
};
const tierColors: Record<string, string> = {
  emerging: 'bg-limestone-100 text-charcoal-500', mass_affluent: 'bg-brand-100 text-brand-700',
  hnw: 'bg-brand-100 text-brand-700', uhnw: 'bg-warning-100 text-warning-700',
};

export default function ClientDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('Overview');
  const client = SAMPLE_CLIENT;

  return (
    <div className="max-w-content mx-auto flex">
      {/* Left panel — Client info card */}
      <div className="w-[260px] flex-shrink-0 p-6 border-r border-limestone-200 bg-white min-h-[calc(100vh-3.5rem)]">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center mb-2">
            <span className="text-white text-xl font-bold">SC</span>
          </div>
          <h2 className="text-lg font-bold text-charcoal-900">{client.firstName} {client.lastName}</h2>
          {client.coClient && (
            <p className="text-sm text-charcoal-500">& {client.coClient}</p>
          )}
          <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tierColors[client.tier]}`}>
            {tierLabels[client.tier]}
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Calendar size={14} className="text-charcoal-300 mt-0.5" />
            <div>
              <p className="text-charcoal-500 text-xs">Age / DOB</p>
              <p className="text-charcoal-900">{client.age} · {client.dob}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield size={14} className="text-charcoal-300 mt-0.5" />
            <div>
              <p className="text-charcoal-500 text-xs">Advisor</p>
              <p className="text-charcoal-900">{client.advisor}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone size={14} className="text-charcoal-300 mt-0.5" />
            <div>
              <p className="text-charcoal-500 text-xs">Phone</p>
              <p className="text-charcoal-900">{client.phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail size={14} className="text-charcoal-300 mt-0.5" />
            <div>
              <p className="text-charcoal-500 text-xs">Email</p>
              <p className="text-charcoal-900 text-xs break-all">{client.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-charcoal-300 mt-0.5" />
            <div>
              <p className="text-charcoal-500 text-xs">Address</p>
              <p className="text-charcoal-900 text-xs">{client.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={14} className="text-charcoal-300 mt-0.5" />
            <div>
              <p className="text-charcoal-500 text-xs">Client Since</p>
              <p className="text-charcoal-900">{client.clientSince}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag size={14} className="text-charcoal-300 mt-0.5" />
            <div>
              <p className="text-charcoal-500 text-xs mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {client.tags.map(tag => (
                  <span key={tag} className="inline-block px-2 py-0.5 rounded bg-limestone-100 text-[10px] font-medium text-charcoal-500">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 space-y-2">
          <Link
            href={`/prism/plans?client=${params.clientId}&new=true`}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} /> New Plan
          </Link>
        </div>
      </div>

      {/* Center panel — Tab content */}
      <div className="flex-1 min-w-0">
        {/* Tabs */}
        <div className="bg-white border-b border-limestone-200 px-6">
          <nav className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* Net Worth Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-5">
                  <p className="text-xs text-charcoal-500 mb-1">Total Assets</p>
                  <p className="text-xl font-bold text-success-500" style={{ fontFeatureSettings: '"tnum"' }}>{formatCurrency(client.totalAssets)}</p>
                </div>
                <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-5">
                  <p className="text-xs text-charcoal-500 mb-1">Total Liabilities</p>
                  <p className="text-xl font-bold text-critical-500" style={{ fontFeatureSettings: '"tnum"' }}>{formatCurrency(client.totalLiabilities)}</p>
                </div>
                <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-5">
                  <p className="text-xs text-charcoal-500 mb-1">Net Worth</p>
                  <p className="text-xl font-bold text-charcoal-900" style={{ fontFeatureSettings: '"tnum"' }}>{formatCurrency(client.netWorth)}</p>
                </div>
              </div>

              {/* Linked Plans */}
              <div className="bg-white rounded-xl border border-limestone-200 shadow-sm">
                <div className="px-5 py-4 border-b border-limestone-100 flex items-center justify-between">
                  <h3 className="font-semibold text-charcoal-900">Financial Plans</h3>
                  <Link href={`/prism/plans?client=${params.clientId}&new=true`} className="text-xs text-brand-500 font-medium hover:text-brand-600">
                    + New Plan
                  </Link>
                </div>
                <div className="divide-y divide-limestone-50">
                  {client.plans.map((plan) => (
                    <Link
                      key={plan.id}
                      href={`/prism/plans/${plan.id}`}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-limestone-50 transition-colors group"
                    >
                      <FileText size={18} className="text-charcoal-300" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-900 group-hover:text-brand-600">{plan.name}</p>
                        <p className="text-xs text-charcoal-500">Last updated: {plan.lastUpdated}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        plan.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-limestone-100 text-charcoal-500'
                      }`}>
                        {plan.status === 'active' ? 'Active' : 'Draft'}
                      </span>
                      {plan.successRate !== null && (
                        <span className="text-sm font-medium text-charcoal-700" style={{ fontFeatureSettings: '"tnum"' }}>
                          {plan.successRate}%
                        </span>
                      )}
                      <ChevronRight size={14} className="text-charcoal-300" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Personal Details' && (
            <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-6">
              <p className="text-sm text-charcoal-500">Personal details form will be displayed here. This form allows editing all client demographic, contact, employment, and planning preference fields.</p>
            </div>
          )}

          {activeTab === 'Accounts & Net Worth' && (
            <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-6">
              <p className="text-sm text-charcoal-500">Account list with balances, tax bucket breakdown, and net worth visualization will be displayed here.</p>
            </div>
          )}

          {activeTab === 'Documents' && (
            <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-6">
              <p className="text-sm text-charcoal-500">Document vault for uploaded files, estate documents, and policy documents will be displayed here.</p>
            </div>
          )}

          {activeTab === 'Notes & Activity' && (
            <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-6">
              <div className="space-y-3">
                {client.recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-limestone-50 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />
                    <p className="text-sm text-charcoal-700 flex-1">{item.event}</p>
                    <span className="text-xs text-charcoal-300">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Risk Profile' && (
            <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-6">
              <p className="text-sm text-charcoal-500">Risk profile assessment and results. Links to Farther Focus risk profiling tool for full assessment.</p>
              <Link
                href="/risk-profile"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
              >
                <TrendingUp size={16} />
                Run Risk Assessment
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Recent activity & alerts */}
      <div className="w-right-panel flex-shrink-0 p-6 border-l border-limestone-200 bg-white min-h-[calc(100vh-3.5rem)] hidden xl:block">
        <h3 className="font-semibold text-charcoal-900 mb-4">Activity & Alerts</h3>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-warning-50 border border-warning-100">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-warning-500" />
              <p className="text-xs font-semibold text-warning-700">Review Overdue</p>
            </div>
            <p className="text-xs text-warning-500">Annual review was due on Feb 15, 2026.</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-2">Recent Updates</h4>
            {client.recentActivity.slice(0, 3).map((item, i) => (
              <div key={i} className="py-2 border-b border-limestone-50 last:border-0">
                <p className="text-xs text-charcoal-700">{item.event}</p>
                <p className="text-[10px] text-charcoal-300 mt-0.5">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
