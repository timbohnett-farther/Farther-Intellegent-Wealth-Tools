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
          <span className="text-sm font-medium text-gray-700">Tax Year:</span>
          {TAX_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedYear === y ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-200 hover:bg-gray-50">
            <Upload size={14} /> Import CSV
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
            <RefreshCw size={14} /> Update for {selectedYear + 1}
          </button>
        </div>
      </div>

      {/* Validation banner */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
        <CheckCircle2 size={16} /> All {selectedYear} tax tables validated and published. {TAX_TABLES.length} tables loaded.
      </div>

      {/* Tax tables list */}
      <div className="space-y-3">
        {TAX_TABLES.map((table) => {
          const isExpanded = expandedTable === table.type;
          return (
            <div key={table.type} className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setExpandedTable(isExpanded ? null : table.type)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{table.label}</p>
                    <p className="text-xs text-gray-500">
                      Filing statuses: {table.filingStatuses.join(', ')} &middot; Updated: {table.lastUpdated}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    <CheckCircle2 size={10} /> {table.status}
                  </span>
                  {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && table.type === 'ordinary_income' && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Bracket</th>
                        <th className="pb-2 text-xs font-medium text-gray-500 uppercase">MFJ</th>
                        <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Single</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_BRACKETS.map((b) => (
                        <tr key={b.bracket} className="border-b border-gray-50">
                          <td className="py-2 font-medium text-gray-900">{b.bracket}</td>
                          <td className="py-2 text-gray-600">{b.mfj}</td>
                          <td className="py-2 text-gray-600">{b.single}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isExpanded && table.type !== 'ordinary_income' && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-500">Detailed bracket data for {table.label} ({selectedYear}). Click edit to modify values.</p>
                  <button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                    Edit Table Values
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Update workflow */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Annual Tax Table Update Workflow</h3>
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
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
              ) : (
                <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 flex-shrink-0" />
              )}
              <span className={`text-sm ${s.status === 'complete' ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                Step {s.step}: {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
