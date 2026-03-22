'use client';

import { FileBarChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="max-w-content mx-auto px-6 py-6">
      <h1 className="font-serif text-3xl text-white tracking-wide mb-2">Reports</h1>
      <p className="text-sm text-white/50 mb-8">Generate and export plan reports, tax summaries, and client-facing deliverables.</p>
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-12 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
          <FileBarChart size={24} className="text-white/30" />
        </div>
        <h3 className="font-serif text-lg text-white/60 mb-1">Report Generation</h3>
        <p className="text-sm text-white/50">Report generation will be available in Stage 4.</p>
      </div>
    </div>
  );
}
