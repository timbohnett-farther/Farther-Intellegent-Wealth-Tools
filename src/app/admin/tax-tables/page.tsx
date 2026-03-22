'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Calendar,
} from 'lucide-react';

const TAX_YEARS = [2026, 2025, 2024];

const TAX_TABLES = [
  { type: 'ordinary_income', label: 'Ordinary Income Brackets', filingStatuses: ['MFJ', 'Single', 'HoH', 'MFS', 'Trust'], lastUpdated: '2025-11-15', status: 'current' },
  { type: 'capital_gains', label: 'Capital Gains Brackets', filingStatuses: ['MFJ', 'Single', 'HoH', 'MFS'], lastUpdated: '2025-11-15', status: 'current' },
  { type: 'standard_deduction', label: 'Standard Deductions', filingStatuses: ['MFJ', 'Single', 'HoH', 'MFS'], lastUpdated: '2025-11-15', status: 'current' },
  { type: 'niit', label: 'NIIT Thresholds', filingStatuses: ['MFJ', 'Single', 'MFS'], lastUpdated: '2025-11-15', status: 'current' },
  { type: 'irmaa', label: 'IRMAA Brackets', filingStatuses: ['MFJ', 'Single'], lastUpdated: '2025-10-01', status: 'current' },
  { type: 'rmd', label: 'RMD Uniform Life Table', filingStatuses: ['N/A'], lastUpdated: '2024-01-01', status: 'current' },
  { type: 'ss_wage_base', label: 'SS Wage Base & Tax Rates', filingStatuses: ['N/A'], lastUpdated: '2025-10-15', status: 'current' },
  { type: 'contribution_limits', label: 'Contribution Limits (401k, IRA, HSA)', filingStatuses: ['N/A'], lastUpdated: '2025-11-01', status: 'current' },
  { type: 'estate_exemption', label: 'Estate & Gift Exemptions', filingStatuses: ['N/A'], lastUpdated: '2025-11-15', status: 'current' },
  { type: 'afr_rates', label: 'Applicable Federal Rates (AFR)', filingStatuses: ['N/A'], lastUpdated: '2026-02-15', status: 'current' },
  { type: 'sec_7520', label: 'Section 7520 Rates', filingStatuses: ['N/A'], lastUpdated: '2026-02-15', status: 'current' },
];

const SAMPLE_BRACKETS = [
  { bracket: '10%', mfj: '$0 – $23,850', single: '$0 – $11,925' },
  { bracket: '12%', mfj: '$23,851 – $96,950', single: '$11,926 – $48,475' },
  { bracket: '22%', mfj: '$96,951 – $206,700', single: '$48,476 – $103,350' },
  { bracket: '24%', mfj: '$206,701 – $394,600', single: '$103,351 – $197,300' },
  { bracket: '32%', mfj: '$394,601 – $501,050', single: '$197,301 – $250,525' },
  { bracket: '35%', mfj: '$501,051 – $751,600', single: '$250,526 – $626,350' },
  { bracket: '37%', mfj: 'Over $751,600', single: 'Over $626,350' },
];

export default function TaxTablesPage() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [expandedTable, setExpandedTable] = useState<string | null>('ordinary_income');

  return (
    <div className="space-y-6">
      {/* Year selector + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/60">Tax Year:</span>
          {TAX_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedYear === y ? 'bg-teal-500 text-white' : 'bg-white text-white/50 border border-white/[0.06] hover:bg-white/[0.04]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white/60 bg-white/[0.07] backdrop-blur-xl rounded-lg border border-white/[0.06] hover:bg-white/[0.04]">
            <Upload size={14} /> Import CSV
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-400">
            <RefreshCw size={14} /> Update for {selectedYear + 1}
          </button>
        </div>
      </div>

      {/* Validation banner */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-100 text-sm text-success-700">
        <CheckCircle2 size={16} /> All {selectedYear} tax tables validated and published. {TAX_TABLES.length} tables loaded.
      </div>

      {/* Tax tables list */}
      <div className="space-y-3">
        {TAX_TABLES.map((table) => {
          const isExpanded = expandedTable === table.type;
          return (
            <div key={table.type} className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
              <button
                onClick={() => setExpandedTable(isExpanded ? null : table.type)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={16} className="text-white/30" />
                  <div>
                    <p className="text-sm font-semibold text-white">{table.label}</p>
                    <p className="text-xs text-white/50">
                      Filing statuses: {table.filingStatuses.join(', ')} &middot; Updated: {table.lastUpdated}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-700">
                    <CheckCircle2 size={10} /> {table.status}
                  </span>
                  {isExpanded ? <ChevronDown size={16} className="text-white/30" /> : <ChevronRight size={16} className="text-white/30" />}
                </div>
              </button>

              {isExpanded && table.type === 'ordinary_income' && (
                <div className="px-5 pb-4 border-t border-limestone-100 pt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-limestone-100 text-left">
                        <th className="pb-2 text-xs font-medium text-white/50 uppercase">Bracket</th>
                        <th className="pb-2 text-xs font-medium text-white/50 uppercase">MFJ</th>
                        <th className="pb-2 text-xs font-medium text-white/50 uppercase">Single</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_BRACKETS.map((b) => (
                        <tr key={b.bracket} className="border-b border-limestone-50">
                          <td className="py-2 font-medium text-white">{b.bracket}</td>
                          <td className="py-2 text-white/50">{b.mfj}</td>
                          <td className="py-2 text-white/50">{b.single}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isExpanded && table.type !== 'ordinary_income' && (
                <div className="px-5 pb-4 border-t border-limestone-100 pt-3">
                  <p className="text-sm text-white/50">Detailed bracket data for {table.label} ({selectedYear}). Click edit to modify values.</p>
                  <button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-teal-300">
                    Edit Table Values
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Update workflow */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Annual Tax Table Update Workflow</h3>
        <div className="space-y-2">
          {[
            { step: '1', label: 'Import new IRS brackets (CSV or manual entry)', status: 'complete' },
            { step: '2', label: 'Validate brackets (sum to expected ranges)', status: 'complete' },
            { step: '3', label: 'Publish — all new calculations use updated tables', status: 'complete' },
            { step: '4', label: 'Re-run all active plans with new tables', status: 'pending' },
            { step: '5', label: 'Alert advisors whose clients are affected by bracket changes', status: 'pending' },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-3 py-2">
              {s.status === 'complete' ? (
                <CheckCircle2 size={18} className="text-success-500 flex-shrink-0" />
              ) : (
                <div className="w-4.5 h-4.5 rounded-full border-2 border-white/[0.10] flex-shrink-0" />
              )}
              <span className={`text-sm ${s.status === 'complete' ? 'text-white/50' : 'text-white font-medium'}`}>
                Step {s.step}: {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
