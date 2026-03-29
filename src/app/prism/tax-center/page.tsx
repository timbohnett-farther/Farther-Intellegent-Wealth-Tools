'use client';

import { Building2 } from 'lucide-react';

export default function TaxCenterPage() {
  return (
    <div className="max-w-content mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-text mb-2">Tax Center</h1>
      <p className="text-sm text-text-muted mb-8">Centralized tax planning tools, bracket analysis, and Roth conversion modeling.</p>
      <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-12 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
          <Building2 size={24} className="text-text-faint" />
        </div>
        <h3 className="text-lg font-semibold text-text-muted mb-1">Tax Center</h3>
        <p className="text-sm text-text-muted">Tax center will be available in Stage 2.</p>
      </div>
    </div>
  );
}
