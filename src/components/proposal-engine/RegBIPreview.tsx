'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Shield, Calendar, Lock, CheckCircle, XCircle, Hash } from 'lucide-react';
import type { RegBIDocument } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegBIPreviewProps {
  /** The generated Reg BI disclosure document to display. */
  regBI: RegBIDocument;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RegBIPreview({ regBI }: RegBIPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/10">
              <Shield className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">
                Regulation Best Interest Disclosure
              </h2>
              <p className="text-xs text-text-muted">
                Document ID: {regBI.docId.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              <span>Generated {formatDate(regBI.generatedAt)}</span>
            </div>
            {regBI.locked && (
              <div className="flex items-center gap-1.5 rounded-full bg-warning-500/10 px-2.5 py-1 text-xs font-medium text-warning-700">
                <Lock className="h-3 w-3" />
                <span>Locked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client Profile Summary */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Client Profile Summary</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {regBI.clientProfileSummary}
        </p>
      </div>

      {/* Recommendation Rationale */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Recommendation Rationale</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {regBI.recommendationRationale}
        </p>
      </div>

      {/* Alternatives Considered */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">Alternatives Considered</h3>
        <ul className="space-y-2">
          {regBI.alternativesConsidered.map((alternative, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-xs font-medium text-text-muted">
                {idx + 1}
              </span>
              <p className="text-sm leading-relaxed text-text-muted">
                {alternative}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Costs & Fees */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Costs and Fees</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {regBI.costsAndFees}
        </p>
      </div>

      {/* Conflicts of Interest */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Conflicts of Interest</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {regBI.conflictsOfInterest}
        </p>
      </div>

      {/* Compliance Checklist */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">Compliance Checklist</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ChecklistItem
            label="Risk Profile Documented"
            checked={regBI.checklist.riskProfileDocumented}
          />
          <ChecklistItem
            label="Suitability Considered"
            checked={regBI.checklist.suitabilityConsidered}
          />
          <ChecklistItem
            label="Costs Disclosed"
            checked={regBI.checklist.costsDisclosed}
          />
          <ChecklistItem
            label="Alternatives Considered"
            checked={regBI.checklist.alternativesConsidered}
          />
          <ChecklistItem
            label="Conflicts Disclosed"
            checked={regBI.checklist.conflictsDisclosed}
          />
          <ChecklistItem
            label="Documentation Complete"
            checked={regBI.checklist.documentationComplete}
          />
        </div>
      </div>

      {/* Content Hash */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text">Content Hash</h3>
        </div>
        <p className="mt-2 font-mono text-xs text-text-muted">
          {regBI.contentHash.slice(0, 16)}...
        </p>
        <p className="mt-1 text-xs text-text-faint">
          SHA-256 hash for tamper detection
        </p>
      </div>
    </div>
  );
}

RegBIPreview.displayName = 'RegBIPreview';

// ---------------------------------------------------------------------------
// ChecklistItem Sub-component
// ---------------------------------------------------------------------------

interface ChecklistItemProps {
  label: string;
  checked: boolean;
}

function ChecklistItem({ label, checked }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle className="h-4 w-4 text-success-600" />
      ) : (
        <XCircle className="h-4 w-4 text-critical-600" />
      )}
      <span className={cn(
        'text-sm',
        checked ? 'text-text' : 'text-text-muted'
      )}>
        {label}
      </span>
    </div>
  );
}
