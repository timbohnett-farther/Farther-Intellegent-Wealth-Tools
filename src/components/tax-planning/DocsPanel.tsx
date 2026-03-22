'use client';

import React from 'react';
import clsx from 'clsx';
import { FileText, ChevronRight } from 'lucide-react';
import type { ReturnDocument } from '@/lib/tax-planning/types';
import { Badge } from '@/components/prism/atoms/Badge';
import { Spinner } from '@/components/prism/atoms/Spinner';

export interface DocsPanelProps {
  /** List of documents for the household */
  documents: ReturnDocument[];
  /** Callback when a document is selected */
  onSelect: (docId: string) => void;
}

function getStatusBadge(status: string): {
  variant: 'warning' | 'info' | 'success' | 'critical';
  label: string;
  showSpinner: boolean;
} {
  switch (status) {
    case 'UPLOADED':
      return { variant: 'warning', label: 'Uploaded', showSpinner: false };
    case 'QUEUED':
      return { variant: 'info', label: 'Queued', showSpinner: false };
    case 'PROCESSING':
      return { variant: 'info', label: 'Processing', showSpinner: true };
    case 'EXTRACTED':
      return { variant: 'success', label: 'Extracted', showSpinner: false };
    case 'FAILED':
      return { variant: 'critical', label: 'Failed', showSpinner: false };
    default:
      return { variant: 'warning', label: status, showSpinner: false };
  }
}

function getDocTypeLabel(docType: string): string {
  switch (docType) {
    case 'FORM1040_PDF':
      return 'Form 1040 PDF';
    case 'IRS_RETURN_TRANSCRIPT_PDF':
      return 'IRS Transcript';
    case 'OTHER':
      return 'Other';
    default:
      return docType;
  }
}

export const DocsPanel: React.FC<DocsPanelProps> = ({ documents, onSelect }) => {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Documents</h3>

      {documents.length === 0 ? (
        <div className="rounded-lg border border-limestone-200 bg-white px-4 py-12 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-charcoal-300 mb-3" />
          <p className="text-sm text-charcoal-700 font-medium">No documents</p>
          <p className="mt-1 text-xs text-charcoal-500">
            Documents will appear here once uploaded.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const statusInfo = getStatusBadge(doc.ingest_status);

            return (
              <button
                key={doc.doc_id}
                type="button"
                onClick={() => onSelect(doc.doc_id)}
                className="w-full rounded-lg border border-limestone-200 bg-white px-4 py-3 shadow-sm hover:border-brand-300 hover:shadow transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0 text-charcoal-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal-900 truncate">
                        {doc.original_filename || `Document ${doc.doc_id.slice(0, 8)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="neutral">{getDocTypeLabel(doc.doc_type)}</Badge>
                        <span className="text-xs text-charcoal-500">
                          TY {String(doc.tax_year)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      {statusInfo.showSpinner && <Spinner size="sm" />}
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-charcoal-300 group-hover:text-brand-700 transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

DocsPanel.displayName = 'DocsPanel';
