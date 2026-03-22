'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { Pencil, Check, X } from 'lucide-react';
import { Badge } from '@/components/prism/atoms/Badge';

export interface ReturnLine {
  taxLineRef: string;
  valueCents: number;
  source: string;
  confidence?: number;
}

export interface ReturnLineTableProps {
  /** Array of extracted tax return lines */
  lines: ReturnLine[];
  /** Optional callback to override a line value; enables edit icons when provided */
  onOverride?: (taxLineRef: string, newValueCents: number) => void;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

function getSourceBadgeVariant(source: string): 'info' | 'brand' | 'neutral' {
  switch (source.toUpperCase()) {
    case 'OCR':
    case 'PDF_TEXT':
    case 'TRANSCRIPT_TABLE':
      return 'info';
    case 'USER':
      return 'brand';
    default:
      return 'neutral';
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-success-500';
  if (confidence >= 0.5) return 'bg-warning-500';
  return 'bg-critical-500';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

function parseDescription(taxLineRef: string): string {
  // Extract a human-readable description from the taxLineRef
  const parts = taxLineRef.split(':');
  if (parts.length >= 3) {
    return parts[2]
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return taxLineRef;
}

export const ReturnLineTable: React.FC<ReturnLineTableProps> = ({
  lines,
  onOverride,
}) => {
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = useCallback(
    (line: ReturnLine) => {
      setEditingRef(line.taxLineRef);
      setEditValue((line.valueCents / 100).toFixed(2));
    },
    []
  );

  const cancelEdit = useCallback(() => {
    setEditingRef(null);
    setEditValue('');
  }, []);

  const confirmEdit = useCallback(
    (taxLineRef: string) => {
      if (!onOverride) return;
      const parsed = parseFloat(editValue);
      if (isNaN(parsed)) {
        cancelEdit();
        return;
      }
      const newCents = Math.round(parsed * 100);
      onOverride(taxLineRef, newCents);
      setEditingRef(null);
      setEditValue('');
    },
    [editValue, onOverride, cancelEdit]
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-limestone-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-200 bg-limestone-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                Line Reference
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                Confidence
              </th>
              {onOverride && (
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Edit
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={onOverride ? 6 : 5}
                  className="px-4 py-10 text-center text-charcoal-500"
                >
                  No return lines to display.
                </td>
              </tr>
            ) : (
              lines.map((line) => {
                const isEditing = editingRef === line.taxLineRef;

                return (
                  <tr
                    key={line.taxLineRef}
                    className="border-b border-limestone-100 last:border-b-0 hover:bg-limestone-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-charcoal-700">
                      {line.taxLineRef}
                    </td>
                    <td className="px-4 py-3 text-charcoal-700">
                      {parseDescription(line.taxLineRef)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-charcoal-900">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-charcoal-500">$</span>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmEdit(line.taxLineRef);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-28 h-7 rounded border border-brand-700 bg-white px-2 text-right text-sm text-charcoal-900 focus:outline-hidden focus:shadow-focus"
                            autoFocus
                          />
                        </div>
                      ) : (
                        formatCurrency(line.valueCents)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getSourceBadgeVariant(line.source)}>
                        {line.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {line.confidence != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-limestone-200">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                getConfidenceColor(line.confidence)
                              )}
                              style={{ width: `${Math.round(line.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-charcoal-500">
                            {getConfidenceLabel(line.confidence)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-charcoal-400">--</span>
                      )}
                    </td>
                    {onOverride && (
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => confirmEdit(line.taxLineRef)}
                              className="rounded p-1 text-success-600 hover:bg-success-100 transition-colors"
                              aria-label="Confirm edit"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded p-1 text-charcoal-400 hover:bg-limestone-50 transition-colors"
                              aria-label="Cancel edit"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(line)}
                            className="rounded p-1 text-charcoal-400 hover:bg-limestone-50 hover:text-brand-700 transition-colors"
                            aria-label={`Edit ${line.taxLineRef}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ReturnLineTable.displayName = 'ReturnLineTable';
