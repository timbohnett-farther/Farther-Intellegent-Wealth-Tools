/**
 * Document Type Selector Component — Phase 2 Sprint 1
 *
 * Dropdown for selecting tax document type during upload.
 * Organized by priority tier per PRD.
 */

'use client';

import React from 'react';

export type DocumentType =
  // Priority Tier 1
  | '1040'
  | 'Schedule_1'
  | 'Schedule_2'
  | 'Schedule_3'
  | 'Schedule_A'
  | 'Schedule_B'
  | 'Schedule_C'
  | 'Schedule_D'
  | 'Form_8606'
  | 'Form_8889'
  | 'Form_8949'
  | 'Form_8960'
  | 'SSA-1099'
  | 'W-2'
  | '1099-INT'
  | '1099-DIV'
  | '1099-B'
  | '1099-R'
  | '1099-NEC'
  | '1099-MISC'
  // Priority Tier 2
  | 'K-1'
  | 'brokerage_statement'
  | 'IRA_statement'
  | 'custodian_statement'
  | 'pay_stub'
  | 'property_tax_statement'
  | 'charitable_summary'
  | 'estimated_tax_voucher'
  // Priority Tier 3
  | 'prior_year_return'
  | 'spouse_document'
  | 'CPA_projection'
  | 'meeting_notes'
  | 'client_questionnaire'
  | 'unknown';

interface DocumentTypeOption {
  value: DocumentType;
  label: string;
  tier: 1 | 2 | 3;
}

const documentTypes: DocumentTypeOption[] = [
  // Priority Tier 1 - Core Tax Forms
  { value: '1040', label: 'Form 1040 (U.S. Individual Income Tax Return)', tier: 1 },
  { value: 'Schedule_1', label: 'Schedule 1 (Additional Income and Adjustments)', tier: 1 },
  { value: 'Schedule_2', label: 'Schedule 2 (Additional Taxes)', tier: 1 },
  { value: 'Schedule_3', label: 'Schedule 3 (Additional Credits and Payments)', tier: 1 },
  { value: 'Schedule_A', label: 'Schedule A (Itemized Deductions)', tier: 1 },
  { value: 'Schedule_B', label: 'Schedule B (Interest and Dividends)', tier: 1 },
  { value: 'Schedule_C', label: 'Schedule C (Business Income)', tier: 1 },
  { value: 'Schedule_D', label: 'Schedule D (Capital Gains and Losses)', tier: 1 },
  { value: 'Form_8606', label: 'Form 8606 (Nondeductible IRAs)', tier: 1 },
  { value: 'Form_8889', label: 'Form 8889 (Health Savings Accounts)', tier: 1 },
  { value: 'Form_8949', label: 'Form 8949 (Sales of Capital Assets)', tier: 1 },
  { value: 'Form_8960', label: 'Form 8960 (Net Investment Income Tax)', tier: 1 },
  { value: 'SSA-1099', label: 'SSA-1099 (Social Security Benefits)', tier: 1 },
  { value: 'W-2', label: 'W-2 (Wage and Tax Statement)', tier: 1 },
  { value: '1099-INT', label: '1099-INT (Interest Income)', tier: 1 },
  { value: '1099-DIV', label: '1099-DIV (Dividends)', tier: 1 },
  { value: '1099-B', label: '1099-B (Broker Transactions)', tier: 1 },
  { value: '1099-R', label: '1099-R (Retirement Distributions)', tier: 1 },
  { value: '1099-NEC', label: '1099-NEC (Nonemployee Compensation)', tier: 1 },
  { value: '1099-MISC', label: '1099-MISC (Miscellaneous Income)', tier: 1 },

  // Priority Tier 2 - Supporting Documents
  { value: 'K-1', label: 'K-1 (Partnership/S-Corp Income)', tier: 2 },
  { value: 'brokerage_statement', label: 'Brokerage Account Statement', tier: 2 },
  { value: 'IRA_statement', label: 'IRA Statement', tier: 2 },
  { value: 'custodian_statement', label: 'Custodian Statement', tier: 2 },
  { value: 'pay_stub', label: 'Pay Stub', tier: 2 },
  { value: 'property_tax_statement', label: 'Property Tax Statement', tier: 2 },
  { value: 'charitable_summary', label: 'Charitable Giving Summary', tier: 2 },
  { value: 'estimated_tax_voucher', label: 'Estimated Tax Payment Record', tier: 2 },

  // Priority Tier 3 - Additional Documents
  { value: 'prior_year_return', label: 'Prior Year Tax Return', tier: 3 },
  { value: 'spouse_document', label: 'Spouse Document', tier: 3 },
  { value: 'CPA_projection', label: 'CPA Tax Projection', tier: 3 },
  { value: 'meeting_notes', label: 'Meeting Notes (Tax Facts)', tier: 3 },
  { value: 'client_questionnaire', label: 'Client Tax Organizer/Questionnaire', tier: 3 },

  // Fallback
  { value: 'unknown', label: 'Unknown / Let System Classify', tier: 3 },
];

interface DocumentTypeSelectorProps {
  value: DocumentType;
  onChange: (value: DocumentType) => void;
  disabled?: boolean;
  error?: string;
}

export default function DocumentTypeSelector({
  value,
  onChange,
  disabled = false,
  error,
}: DocumentTypeSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="document-type" className="block text-sm font-medium text-white">
        Document Type
        <span className="ml-1.5 text-xs text-white/40">(optional - system will auto-classify)</span>
      </label>

      <select
        id="document-type"
        value={value}
        onChange={(e) => onChange(e.target.value as DocumentType)}
        disabled={disabled}
        className={`block w-full rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors
          ${
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
              : 'border-white/[0.06] focus:border-teal-500 focus:ring-teal-500/20'
          }
          focus:outline-none focus:ring-2
          disabled:cursor-not-allowed disabled:opacity-50
        `}
      >
        <optgroup label="Priority Tier 1 — Core Tax Forms">
          {documentTypes
            .filter((t) => t.tier === 1)
            .map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
        </optgroup>

        <optgroup label="Priority Tier 2 — Supporting Documents">
          {documentTypes
            .filter((t) => t.tier === 2)
            .map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
        </optgroup>

        <optgroup label="Priority Tier 3 — Additional Documents">
          {documentTypes
            .filter((t) => t.tier === 3)
            .map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
        </optgroup>
      </select>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <p className="text-xs text-white/40">
        Select document type if known, or choose "Unknown" to let the system classify automatically.
      </p>
    </div>
  );
}

export { documentTypes };
export type { DocumentTypeOption };
