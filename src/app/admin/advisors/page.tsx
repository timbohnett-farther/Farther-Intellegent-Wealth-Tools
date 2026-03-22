'use client';

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MoreVertical,
} from 'lucide-react';

const ADVISORS = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@farther.com', title: 'Senior Advisor, CFP', crd: '7891234', clients: 42, plans: 48, avgSuccess: 82, role: 'admin', mfaEnabled: true, isActive: true, lastLogin: '2h ago' },
  { id: '2', name: 'Michael Torres', email: 'michael.torres@farther.com', title: 'Senior Advisor, CFA', crd: '7891235', clients: 38, plans: 42, avgSuccess: 79, role: 'advisor', mfaEnabled: true, isActive: true, lastLogin: '1h ago' },
  { id: '3', name: 'Lisa Park', email: 'lisa.park@farther.com', title: 'Advisor, CFP', crd: '7891236', clients: 35, plans: 38, avgSuccess: 81, role: 'advisor', mfaEnabled: true, isActive: true, lastLogin: '4h ago' },
  { id: '4', name: 'James Wilson', email: 'james.wilson@farther.com', title: 'Advisor', crd: '7891237', clients: 32, plans: 36, avgSuccess: 76, role: 'advisor', mfaEnabled: false, isActive: true, lastLogin: '1d ago' },
  { id: '5', name: 'Emily Davis', email: 'emily.davis@farther.com', title: 'Associate Advisor', crd: '7891238', clients: 28, plans: 30, avgSuccess: 80, role: 'advisor', mfaEnabled: true, isActive: true, lastLogin: '30m ago' },
  { id: '6', name: 'Robert Kim', email: 'robert.kim@farther.com', title: 'Advisor', crd: '7891239', clients: 25, plans: 28, avgSuccess: 77, role: 'advisor', mfaEnabled: true, isActive: true, lastLogin: '3h ago' },
  { id: '7', name: 'Jennifer Lee', email: 'jennifer.lee@farther.com', title: 'Paraplanner', crd: null, clients: 0, plans: 15, avgSuccess: 0, role: 'associate', mfaEnabled: true, isActive: true, lastLogin: '2h ago' },
  { id: '8', name: 'David Brown', email: 'david.brown@farther.com', title: 'Junior Advisor', crd: '7891240', clients: 18, plans: 20, avgSuccess: 74, role: 'advisor', mfaEnabled: false, isActive: true, lastLogin: '5h ago' },
  { id: '9', name: 'Michelle Taylor', email: 'michelle.taylor@farther.com', title: 'Compliance Officer', crd: null, clients: 0, plans: 0, avgSuccess: 0, role: 'read_only', mfaEnabled: true, isActive: true, lastLogin: '1d ago' },
  { id: '10', name: 'Alex Johnson', email: 'alex.johnson@farther.com', title: 'Former Advisor', crd: '7891241', clients: 0, plans: 0, avgSuccess: 0, role: 'advisor', mfaEnabled: false, isActive: false, lastLogin: '45d ago' },
];

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', advisor: 'Advisor', associate: 'Associate', read_only: 'Read Only' };
const ROLE_COLORS: Record<string, string> = { admin: 'bg-brand-50 text-brand-700', advisor: 'bg-brand-50 text-brand-700', associate: 'bg-brand-50 text-brand-700', read_only: 'bg-limestone-100 text-charcoal-500' };

export default function AdvisorsPage() {
  const [search, setSearch] = useState('');
  const filtered = ADVISORS.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-300" />
          <input type="text" placeholder="Search advisors..." className="w-full pl-9 pr-3 py-2 text-sm border border-limestone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500/20" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
          <Plus size={14} /> Add Advisor
        </button>
      </div>

      <div className="bg-white rounded-xl border border-limestone-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Advisor</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Role</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase text-right">Clients</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase text-right">Plans</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase text-right">Avg Success</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">MFA</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Status</th>
              <th className="px-5 py-3 text-xs font-medium text-charcoal-500 uppercase">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className={`border-b border-limestone-50 hover:bg-limestone-50/50 ${!a.isActive ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3">
                  <div>
                    <p className="font-medium text-charcoal-900">{a.name}</p>
                    <p className="text-xs text-charcoal-500">{a.email} {a.crd ? `· CRD: ${a.crd}` : ''}</p>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[a.role]}`}>
                    {ROLE_LABELS[a.role]}
                  </span>
                </td>
                <td className="px-5 py-3 text-charcoal-500 text-right">{a.clients}</td>
                <td className="px-5 py-3 text-charcoal-500 text-right">{a.plans}</td>
                <td className="px-5 py-3 text-right">
                  {a.avgSuccess > 0 ? (
                    <span className={`font-medium ${a.avgSuccess >= 80 ? 'text-success-500' : a.avgSuccess >= 70 ? 'text-warning-500' : 'text-critical-500'}`}>{a.avgSuccess}%</span>
                  ) : <span className="text-charcoal-300">—</span>}
                </td>
                <td className="px-5 py-3">
                  {a.mfaEnabled ? <CheckCircle2 size={16} className="text-success-500" /> : <XCircle size={16} className="text-critical-500" />}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? 'bg-success-50 text-success-700' : 'bg-limestone-100 text-charcoal-500'}`}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-charcoal-500">{a.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MFA enforcement */}
      {ADVISORS.some((a) => a.isActive && !a.mfaEnabled) && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-50 border border-warning-100">
          <Shield size={20} className="text-warning-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning-700">MFA Not Enforced for All Advisors</p>
            <p className="text-sm text-warning-700 mt-1">
              {ADVISORS.filter((a) => a.isActive && !a.mfaEnabled).length} active advisor(s) do not have MFA enabled.
              Enable firm-wide MFA enforcement to meet compliance requirements.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
