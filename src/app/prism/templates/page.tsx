'use client';

import { Copy } from 'lucide-react';

export default function TemplatesPage() {
  return (
    <div className="max-w-content mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-charcoal-900 mb-2">Templates</h1>
      <p className="text-sm text-charcoal-500 mb-8">Pre-built plan templates for common client scenarios.</p>
      <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-12 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-limestone-100 flex items-center justify-center mb-4">
          <Copy size={24} className="text-charcoal-300" />
        </div>
        <h3 className="text-lg font-semibold text-charcoal-700 mb-1">Plan Templates</h3>
        <p className="text-sm text-charcoal-500">Plan templates will be available in Stage 3.</p>
      </div>
    </div>
  );
}
