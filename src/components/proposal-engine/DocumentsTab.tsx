'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { FileText, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { IPSPreview } from './IPSPreview';
import { RegBIPreview } from './RegBIPreview';
import type { InvestmentPolicyStatement, RegBIDocument } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentsTabProps {
  /** The proposal ID to generate documents for. */
  proposalId: string;
  /** Existing IPS document if already generated. */
  ips?: InvestmentPolicyStatement | null;
  /** Existing Reg BI document if already generated. */
  regBI?: RegBIDocument | null;
  /** Whether a risk profile exists (required for IPS). */
  hasRiskProfile: boolean;
  /** Whether a proposed model exists (required for Reg BI). */
  hasProposedModel: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentsTab({
  proposalId,
  ips: initialIPS,
  regBI: initialRegBI,
  hasRiskProfile,
  hasProposedModel,
}: DocumentsTabProps) {
  const [ips, setIPS] = useState(initialIPS);
  const [regBI, setRegBI] = useState(initialRegBI);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDocuments = !!ips || !!regBI;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/proposals/${proposalId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-token', // Replace with actual auth token
        },
        body: JSON.stringify({
          includeIPS: true,
          includeRegBI: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate documents');
      }

      const data = await response.json();
      setIPS(data.ips || null);
      setRegBI(data.regBI || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  }

  // Empty state when no documents exist
  if (!hasDocuments && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-subtle">
          <FileText className="h-8 w-8 text-text-faint" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-text">
          No Documents Generated
        </h3>
        <p className="mb-6 max-w-md text-sm text-text-muted">
          Generate an Investment Policy Statement and Regulation Best Interest disclosure for this proposal.
        </p>

        {/* Prerequisites check */}
        {(!hasRiskProfile || !hasProposedModel) && (
          <div className="mb-6 rounded-lg border border-warning-500/20 bg-warning-500/5 px-4 py-3 max-w-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-warning-600 mt-0.5" />
              <div className="text-left">
                <p className="text-xs font-medium text-warning-700">Missing Prerequisites</p>
                <ul className="mt-1 space-y-1 text-xs text-warning-600">
                  {!hasRiskProfile && (
                    <li>• Risk profile required for IPS generation</li>
                  )}
                  {!hasProposedModel && (
                    <li>• Proposed model required for Reg BI disclosure</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || (!hasRiskProfile && !hasProposedModel)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
            isGenerating || (!hasRiskProfile && !hasProposedModel)
              ? 'cursor-not-allowed bg-surface-subtle text-text-faint'
              : 'bg-primary-600 text-text hover:bg-primary-700'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating Documents...</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>Generate Documents</span>
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 rounded-lg border border-critical-500/20 bg-critical-500/5 px-4 py-3 max-w-md">
            <p className="text-sm text-critical-700">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary-600" />
        <h3 className="mb-2 text-lg font-semibold text-text">
          Generating Documents
        </h3>
        <p className="text-sm text-text-muted">
          This may take a moment...
        </p>
      </div>
    );
  }

  // Documents view
  return (
    <div className="space-y-8">
      {/* Header with regenerate button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">Compliance Documents</h2>
          <p className="mt-1 text-sm text-text-muted">
            Investment Policy Statement and Regulation Best Interest disclosure
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-soft px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-subtle"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Regenerate</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-critical-500/20 bg-critical-500/5 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-critical-600 mt-0.5" />
            <p className="text-sm text-critical-700">{error}</p>
          </div>
        </div>
      )}

      {/* IPS Section */}
      {ips ? (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-text">Investment Policy Statement</h3>
          <IPSPreview ips={ips} />
        </div>
      ) : hasRiskProfile ? (
        <div className="rounded-lg border border-warning-500/20 bg-warning-500/5 px-4 py-3">
          <p className="text-sm text-warning-700">
            IPS not generated. Click "Regenerate" to create it.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border-subtle bg-surface-soft px-4 py-3">
          <p className="text-sm text-text-muted">
            Risk profile required to generate Investment Policy Statement.
          </p>
        </div>
      )}

      {/* Reg BI Section */}
      {regBI ? (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-text">Regulation Best Interest Disclosure</h3>
          <RegBIPreview regBI={regBI} />
        </div>
      ) : hasProposedModel ? (
        <div className="rounded-lg border border-warning-500/20 bg-warning-500/5 px-4 py-3">
          <p className="text-sm text-warning-700">
            Reg BI disclosure not generated. Click "Regenerate" to create it.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border-subtle bg-surface-soft px-4 py-3">
          <p className="text-sm text-text-muted">
            Proposed model required to generate Regulation Best Interest disclosure.
          </p>
        </div>
      )}
    </div>
  );
}

DocumentsTab.displayName = 'DocumentsTab';
