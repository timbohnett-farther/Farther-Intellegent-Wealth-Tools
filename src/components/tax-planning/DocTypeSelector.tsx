'use client';

import React from 'react';
import clsx from 'clsx';
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
      <legend className="text-sm font-medium text-charcoal-700 mb-3">
        Document Type
      </legend>

      <div className="space-y-2">
        {DOC_TYPES.map((docType) => {
          const isSelected = value === docType.value;
          const Icon = docType.icon;

          return (
            <label
              key={docType.value}
              className={clsx(
                'flex items-center gap-4 rounded-lg border-[1.5px] p-4 cursor-pointer transition-all',
                isSelected
                  ? 'border-brand-700 bg-brand-50 shadow-sm'
                  : 'border-limestone-200 bg-white hover:border-brand-300 hover:bg-brand-50/30'
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
                className={clsx(
                  'flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0',
                  isSelected ? 'bg-brand-700' : 'bg-limestone-100'
                )}
              >
                <Icon
                  className={clsx(
                    'h-5 w-5',
                    isSelected ? 'text-white' : 'text-charcoal-500'
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={clsx(
                    'text-sm font-medium',
                    isSelected ? 'text-brand-700' : 'text-charcoal-900'
                  )}
                >
                  {docType.label}
                </p>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  {docType.description}
                </p>
              </div>

              {/* Custom radio indicator */}
              <div
                className={clsx(
                  'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center',
                  isSelected
                    ? 'border-brand-700'
                    : 'border-limestone-300'
                )}
              >
                {isSelected && (
                  <div className="h-2.5 w-2.5 rounded-full bg-brand-700" />
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
