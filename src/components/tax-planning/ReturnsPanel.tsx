'use client';

import React from 'react';
import { Upload, FileText, ChevronRight } from 'lucide-react';
import type { TaxReturn } from '@/lib/tax-planning/types';
import { Badge } from '@/components/prism/atoms/Badge';

export interface ReturnsPanelProps {
  /** List of tax returns for the household */
  returns: TaxReturn[];
  /** Callback when a return is selected */
  onSelect: (returnId: string) => void;
  /** Callback to upload a new return */
  onUploadNew: () => void;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function filingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SINGLE: 'Single',
    MFJ: 'Married Filing Jointly',
    MFS: 'Married Filing Separately',
    HOH: 'Head of Household',
    QW: 'Qualifying Widow(er)',
  };
  return labels[status] || status;
}

function filingStatusBadgeVariant(
  status: string
): 'neutral' | 'info' | 'brand' | 'warning' {
  switch (status) {
    case 'MFJ':
      return 'brand';
    case 'SINGLE':
      return 'info';
    case 'HOH':
      return 'warning';
    default:
      return 'neutral';
  }
}

export const ReturnsPanel: React.FC<ReturnsPanelProps> = ({
  returns,
  onSelect,
  onUploadNew,
}) => {
  // Sort returns by tax year descending
  const sortedReturns = [...returns].sort(
    (a, b) => (b.tax_year as number) - (a.tax_year as number)
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Tax Returns</h3>
        <button
          type="button"
          onClick={onUploadNew}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-accent-primary text-text text-sm font-medium hover:bg-brand-400 transition-colors shadow-sm"
        >
          <Upload className="h-4 w-4" />
          Upload New Return
        </button>
      </div>

      {sortedReturns.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-4 py-12 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-text-faint mb-3" />
          <p className="text-sm text-text-muted font-medium">No tax returns yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Upload a return to start the analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedReturns.map((ret) => (
            <button
              key={ret.return_id}
              type="button"
              onClick={() => onSelect(ret.return_id)}
              className="w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 shadow-sm hover:border-accent-primarySoft hover:shadow transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent-primary/10 flex-shrink-0">
                    <span className="text-sm font-bold text-accent-primarySoft">
                      {String(ret.tax_year)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text">
                        Tax Year {String(ret.tax_year)}
                      </span>
                      <Badge variant={filingStatusBadgeVariant(ret.filing_status)}>
                        {filingStatusLabel(ret.filing_status)}
                      </Badge>
                    </div>

                    {ret.agi_cents != null && (
                      <p className="text-xs text-text-muted">
                        AGI: {formatCurrency(ret.agi_cents as number)}
                      </p>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-accent-primarySoft transition-colors flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

ReturnsPanel.displayName = 'ReturnsPanel';
