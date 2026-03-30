'use client';

import { Settings, Building2, User, Database, Link2, Users } from 'lucide-react';

const SETTINGS_SECTIONS = [
  { title: 'Firm Settings', description: 'Manage firm details, branding, and subscription plan.', icon: <Building2 size={20} />, available: false },
  { title: 'Advisor Profile', description: 'Update your personal information and credentials.', icon: <User size={20} />, available: false },
  { title: 'Tax Table Management', description: 'View and update annual tax tables, brackets, and contribution limits.', icon: <Database size={20} />, available: false },
  { title: 'Integrations', description: 'Connect to HubSpot, custodians, and portfolio analytics tools.', icon: <Link2 size={20} />, available: false },
  { title: 'Team & Permissions', description: 'Manage team members and role-based access control.', icon: <Users size={20} />, available: false },
];

export default function SettingsPage() {
  return (
    <div className="max-w-content mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-text mb-2">Settings</h1>
      <p className="text-sm text-text-muted mb-8">Configure your Farther Prism platform settings.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title} className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5 opacity-60">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-surface-subtle flex items-center justify-center text-text-faint">
                {section.icon}
              </div>
              <div>
                <h3 className="font-semibold text-text">{section.title}</h3>
                <span className="text-[10px] text-text-faint font-medium">COMING SOON</span>
              </div>
            </div>
            <p className="text-sm text-text-muted">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
