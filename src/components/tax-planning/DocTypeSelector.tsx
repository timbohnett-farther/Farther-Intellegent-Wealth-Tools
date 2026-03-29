'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { FileText, FileSearch, File } from 'lucide-react';

export interface DocTypeSelectorProps {
  /** Currently selected document type */
  value: string;
  /** Callback when selection changes */
  onChange: (docType: string) => void;
}

const DOC_TYPES = [
  {
    value: 'FORM1040_PDF',
    label: 'Form 1040 PDF',
    description: 'Standard IRS Form 1040 tax return',
    icon: FileText,
  },
  {
    value: 'IRS_RETURN_TRANSCRIPT_PDF',
    label: 'IRS Return Transcript PDF',
    description: 'Official IRS return transcript document',
    icon: FileSearch,
  },
  {
    value: 'OTHER',
    label: 'Other',
    description: 'Other tax-related document',
    icon: File,
  },
] as const;

export const DocTypeSelector: React.FC<DocTypeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <fieldset className="w-full">
      <legend className="text-sm font-medium text-text-muted mb-3">
        Document Type
      </legend>

      <div className="space-y-2">
        {DOC_TYPES.map((docType) => {
          const isSelected = value === docType.value;
          const Icon = docType.icon;

          return (
            <label
              key={docType.value}
              className={cn(
                'flex items-center gap-4 rounded-lg border-[1.5px] p-4 cursor-pointer transition-all',
                isSelected
                  ? 'border-accent-primary bg-accent-primary/10 shadow-sm'
                  : 'border-border-subtle bg-surface-soft hover:border-accent-primarySoft hover:bg-accent-primary/10/30'
              )}
            >
              <input
                type="radio"
                name="doc-type"
                value={docType.value}
                checked={isSelected}
                onChange={() => onChange(docType.value)}
                className="sr-only"
              />

              <div
                className={cn(
                  'flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0',
                  isSelected ? 'bg-accent-primary' : 'bg-surface-subtle'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isSelected ? 'text-text' : 'text-text-muted'
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-accent-primarySoft' : 'text-text'
                  )}
                >
                  {docType.label}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {docType.description}
                </p>
              </div>

              {/* Custom radio indicator */}
              <div
                className={cn(
                  'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center',
                  isSelected
                    ? 'border-accent-primary'
                    : 'border-border-subtle'
                )}
              >
                {isSelected && (
                  <div className="h-2.5 w-2.5 rounded-full bg-accent-primary" />
                )}
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

DocTypeSelector.displayName = 'DocTypeSelector';
