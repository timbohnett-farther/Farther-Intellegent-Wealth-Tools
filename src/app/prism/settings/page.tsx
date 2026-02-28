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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Configure your Farther Prism platform settings.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 opacity-60">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                {section.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
                <span className="text-[10px] text-gray-400 font-medium">COMING SOON</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
