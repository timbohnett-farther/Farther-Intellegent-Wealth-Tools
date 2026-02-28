'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const SAMPLE_CLIENTS = [
  { id: 'cl1', name: 'Sarah Chen', household: 'Chen Family', tier: 'uhnw', aum: 12500000, planStatus: 'active', lastReview: '2026-01-15', successRate: 92, advisor: 'John Doe' },
  { id: 'cl2', name: 'James Wilson', household: 'Wilson Household', tier: 'hnw', aum: 4200000, planStatus: 'active', lastReview: '2026-02-01', successRate: 87, advisor: 'John Doe' },
  { id: 'cl3', name: 'Emily Thompson', household: 'Thompson Family', tier: 'hnw', aum: 6800000, planStatus: 'needs_review', lastReview: '2025-11-20', successRate: 78, advisor: 'John Doe' },
  { id: 'cl4', name: 'Robert Martinez', household: 'Martinez Household', tier: 'mass_affluent', aum: 1800000, planStatus: 'needs_review', lastReview: '2025-08-15', successRate: 65, advisor: 'John Doe' },
  { id: 'cl5', name: 'Lisa Anderson', household: 'Anderson Family', tier: 'hnw', aum: 3500000, planStatus: 'active', lastReview: '2026-01-28', successRate: 91, advisor: 'Jane Smith' },
  { id: 'cl6', name: 'Grace Liu', household: 'Liu Family', tier: 'uhnw', aum: 28000000, planStatus: 'draft', lastReview: '2025-06-20', successRate: null, advisor: 'John Doe' },
  { id: 'cl7', name: 'William Foster', household: 'Foster Family', tier: 'mass_affluent', aum: 950000, planStatus: 'active', lastReview: '2026-02-10', successRate: 84, advisor: 'Jane Smith' },
  { id: 'cl8', name: 'Jennifer Adams', household: 'Adams Household', tier: 'hnw', aum: 5100000, planStatus: 'needs_review', lastReview: '2025-09-10', successRate: 72, advisor: 'John Doe' },
  { id: 'cl9', name: 'Patricia Kim', household: 'Kim Family', tier: 'uhnw', aum: 15800000, planStatus: 'active', lastReview: '2026-02-20', successRate: 95, advisor: 'John Doe' },
  { id: 'cl10', name: 'David Brown', household: 'Brown Household', tier: 'emerging', aum: 380000, planStatus: 'draft', lastReview: null, successRate: null, advisor: 'Jane Smith' },
];

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

const tierColors: Record<string, string> = {
  emerging: 'bg-gray-100 text-gray-600',
  mass_affluent: 'bg-blue-100 text-blue-700',
  hnw: 'bg-purple-100 text-purple-700',
  uhnw: 'bg-amber-100 text-amber-700',
};
const tierLabels: Record<string, string> = {
  emerging: 'Emerging', mass_affluent: 'Mass Affluent', hnw: 'HNW', uhnw: 'UHNW',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  needs_review: 'bg-amber-100 text-amber-700',
  archived: 'bg-gray-100 text-gray-500',
};
const statusLabels: Record<string, string> = {
  active: 'Active', draft: 'Draft', needs_review: 'Needs Review', archived: 'Archived',
};

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = SAMPLE_CLIENTS.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.household.toLowerCase().includes(search.toLowerCase())) return false;
    if (tierFilter !== 'all' && c.tier !== tierFilter) return false;
    if (statusFilter !== 'all' && c.planStatus !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-content mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Link
          href="/prism/clients?new=true"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          New Client
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or household..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Tiers</option>
          <option value="emerging">Emerging</option>
          <option value="mass_affluent">Mass Affluent</option>
          <option value="hnw">HNW</option>
          <option value="uhnw">UHNW</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="needs_review">Needs Review</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Client Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Household</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">AUM</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Status</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Review</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Success Rate</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Advisor</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/prism/clients/${client.id}`} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-600 text-[10px] font-semibold">
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 hover:text-brand-600">{client.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{client.household}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tierColors[client.tier]}`}>
                      {tierLabels[client.tier]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900" style={{ fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(client.aum)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[client.planStatus]}`}>
                      {statusLabels[client.planStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500" style={{ fontFeatureSettings: '"tnum"' }}>
                    {client.lastReview || '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {client.successRate !== null ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${client.successRate >= 85 ? 'bg-green-500' : client.successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${client.successRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700" style={{ fontFeatureSettings: '"tnum"' }}>
                          {client.successRate}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{client.advisor}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/prism/clients/${client.id}`}
                      className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Showing {filtered.length} of {SAMPLE_CLIENTS.length} clients</span>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded hover:bg-gray-100" disabled><ChevronLeft size={16} /></button>
            <span className="px-2 py-1 bg-brand-500 text-white rounded text-xs font-medium">1</span>
            <button className="p-1 rounded hover:bg-gray-100" disabled><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
