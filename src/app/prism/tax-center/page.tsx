'use client';

import { Building2 } from 'lucide-react';

export default function TaxCenterPage() {
  return (
    <div className="max-w-content mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tax Center</h1>
      <p className="text-sm text-gray-500 mb-8">Centralized tax planning tools, bracket analysis, and Roth conversion modeling.</p>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Building2 size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">Tax Center</h3>
        <p className="text-sm text-gray-500">Tax center will be available in Stage 2.</p>
      </div>
    </div>
  );
}
