'use client';

import React, { useState } from 'react';
import {
  Plug,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  TrendingUp,
  Globe,
  Mail,
  Calendar,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  name: string;
  category: 'crm' | 'custodian' | 'market_data' | 'email' | 'calendar' | 'aggregator';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  description: string;
  lastSync: string | null;
  accountsSynced: number | null;
  lastError: string | null;
  syncFrequency: string;
}

const INTEGRATIONS: Integration[] = [
  { id: '1', name: 'HubSpot CRM', category: 'crm', status: 'connected', description: 'Bi-directional sync of contacts, tasks, and deal stages', lastSync: '5 min ago', accountsSynced: null, lastError: null, syncFrequency: 'Real-time' },
  { id: '2', name: 'Schwab Advisor Services', category: 'custodian', status: 'connected', description: 'Account balances, positions, and transaction history', lastSync: '2:15 AM today', accountsSynced: 1842, lastError: null, syncFrequency: 'Nightly' },
  { id: '3', name: 'Fidelity WealthCentral', category: 'custodian', status: 'connected', description: 'Account data and portfolio positions', lastSync: '2:20 AM today', accountsSynced: 956, lastError: null, syncFrequency: 'Nightly' },
  { id: '4', name: 'Pershing NetExchange', category: 'custodian', status: 'error', description: 'Account data and custody services', lastSync: 'Failed 2:25 AM', accountsSynced: 312, lastError: 'API timeout after 30s — connection reset by peer', syncFrequency: 'Nightly' },
  { id: '5', name: 'Orion Portfolio Solutions', category: 'custodian', status: 'disconnected', description: 'Performance reporting and portfolio analytics', lastSync: null, accountsSynced: null, lastError: null, syncFrequency: 'Not configured' },
  { id: '6', name: 'Financial Modeling Prep (FMP)', category: 'market_data', status: 'connected', description: 'Real-time equity prices for RSU/option holdings', lastSync: '6:00 AM today', accountsSynced: null, lastError: null, syncFrequency: 'Every 5 min (market hours)' },
  { id: '7', name: 'FRED (Federal Reserve)', category: 'market_data', status: 'connected', description: 'Interest rates, CPI, and economic indicators', lastSync: '6:00 AM today', accountsSynced: null, lastError: null, syncFrequency: 'Daily' },
  { id: '8', name: 'Plaid', category: 'aggregator', status: 'connected', description: 'Held-away account aggregation (banking, checking, savings)', lastSync: '3:00 AM today', accountsSynced: 428, lastError: null, syncFrequency: 'Nightly' },
  { id: '9', name: 'Resend Email', category: 'email', status: 'connected', description: 'Transactional email delivery for reports and notifications', lastSync: null, accountsSynced: null, lastError: null, syncFrequency: 'On-demand' },
  { id: '10', name: 'Google Calendar', category: 'calendar', status: 'disconnected', description: 'Meeting scheduling integration', lastSync: null, accountsSynced: null, lastError: null, syncFrequency: 'Not configured' },
];

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM',
  custodian: 'Custodian',
  market_data: 'Market Data',
  email: 'Email',
  calendar: 'Calendar',
  aggregator: 'Aggregator',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  crm: <Database size={16} />,
  custodian: <Database size={16} />,
  market_data: <TrendingUp size={16} />,
  email: <Mail size={16} />,
  calendar: <Calendar size={16} />,
  aggregator: <Globe size={16} />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
  const [filter, setFilter] = useState<string>('all');
  const categories = ['all', ...new Set(INTEGRATIONS.map((i) => i.category))];

  const filtered = filter === 'all' ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);
  const connectedCount = INTEGRATIONS.filter((i) => i.status === 'connected').length;
  const errorCount = INTEGRATIONS.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Integrations', value: INTEGRATIONS.length, color: 'text-gray-900' },
          { label: 'Connected', value: connectedCount, color: 'text-green-600' },
          { label: 'Errors', value: errorCount, color: 'text-red-600' },
          { label: 'Disconnected', value: INTEGRATIONS.length - connectedCount - errorCount, color: 'text-gray-400' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === c ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {c === 'all' ? 'All' : CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((int) => (
          <div key={int.id} className={`bg-white rounded-xl border shadow-sm p-5 ${
            int.status === 'error' ? 'border-red-200' : int.status === 'connected' ? 'border-gray-200' : 'border-gray-100'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  int.status === 'connected' ? 'bg-green-50 text-green-600' :
                  int.status === 'error' ? 'bg-red-50 text-red-600' :
                  'bg-gray-50 text-gray-400'
                }`}>
                  {int.status === 'connected' ? <Wifi size={20} /> : int.status === 'error' ? <WifiOff size={20} /> : <Plug size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{int.name}</h3>
                  <span className="text-xs text-gray-500">{CATEGORY_LABELS[int.category]}</span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                int.status === 'connected' ? 'bg-green-50 text-green-700' :
                int.status === 'error' ? 'bg-red-50 text-red-700' :
                int.status === 'syncing' ? 'bg-blue-50 text-blue-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {int.status === 'connected' && <CheckCircle2 size={10} />}
                {int.status === 'error' && <AlertTriangle size={10} />}
                {int.status === 'syncing' && <RefreshCw size={10} className="animate-spin" />}
                {int.status.charAt(0).toUpperCase() + int.status.slice(1)}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-3">{int.description}</p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              {int.lastSync && (
                <span className="flex items-center gap-1"><Clock size={11} /> {int.lastSync}</span>
              )}
              {int.accountsSynced !== null && (
                <span>{int.accountsSynced.toLocaleString()} accounts</span>
              )}
              <span>Sync: {int.syncFrequency}</span>
            </div>

            {int.lastError && (
              <div className="mt-3 p-2 rounded bg-red-50 text-xs text-red-700">
                <span className="font-medium">Error:</span> {int.lastError}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              {int.status === 'connected' && (
                <button className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                  <RefreshCw size={11} /> Sync Now
                </button>
              )}
              {int.status === 'disconnected' && (
                <button className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                  <Plug size={11} /> Connect
                </button>
              )}
              {int.status === 'error' && (
                <button className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                  <RefreshCw size={11} /> Retry
                </button>
              )}
              <button className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 ml-auto">
                <Settings size={11} /> Configure
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
