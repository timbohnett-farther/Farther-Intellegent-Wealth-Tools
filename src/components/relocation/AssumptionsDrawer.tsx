/**
 * Assumptions & Caveats Drawer
 *
 * Expandable panel showing calculation assumptions and important disclosures
 */

'use client';

import React, { useState } from 'react';

interface AssumptionsDrawerProps {
  assumptions: string[];
  caveats: string[];
  jurisdictionNotes?: string[];
  calculationDate: string;
  rulesVersion: {
    origin: string;
    destination: string;
  };
}

export function AssumptionsDrawer({
  assumptions,
  caveats,
  jurisdictionNotes,
  calculationDate,
  rulesVersion,
}: AssumptionsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border" style={{ borderColor: 'var(--s-border-subtle)', background: 'var(--s-card-bg)' }}>
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-subtle"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-warning-600 dark:text-warning-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-text">Assumptions & Disclosures</span>
        </div>
        <svg
          className={`h-5 w-5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="space-y-6 border-t px-4 py-6" style={{ borderColor: 'var(--s-border-subtle)' }}>
          {/* Assumptions */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text">Calculation Assumptions</h3>
            <ul className="ml-4 list-disc space-y-2 text-xs text-text-muted">
              {assumptions.map((assumption, idx) => (
                <li key={idx}>{assumption}</li>
              ))}
            </ul>
          </div>

          {/* Jurisdiction Notes */}
          {jurisdictionNotes && jurisdictionNotes.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-text">Jurisdiction-Specific Notes</h3>
              <ul className="ml-4 list-disc space-y-2 text-xs text-text-muted">
                {jurisdictionNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Important Disclosures */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-warning-700 dark:text-warning-400">
              Important Disclosures
            </h3>
            <ul className="ml-4 list-disc space-y-2 text-xs text-text-muted">
              {caveats.map((caveat, idx) => (
                <li key={idx}>{caveat}</li>
              ))}
            </ul>
          </div>

          {/* Metadata */}
          <div className="border-t pt-4 text-xs text-text-faint" style={{ borderColor: 'var(--s-border-subtle)' }}>
            <p>
              <strong>Calculation Date:</strong> {new Date(calculationDate).toLocaleString()}
            </p>
            <p className="mt-1">
              <strong>Rules Version:</strong> {rulesVersion.origin} / {rulesVersion.destination}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
