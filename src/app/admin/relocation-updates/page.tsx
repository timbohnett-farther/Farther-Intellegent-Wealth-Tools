'use client';

import React, { useState, useEffect } from 'react';

interface CandidateUpdate {
  id: string;
  jurisdictionCode: string;
  jurisdictionName: string;
  sourceType: string;
  sourceUrl: string;
  detectedDate: string;
  proposedChanges: any;
  confidenceScore: number;
  extractionSummary: string;
  reviewStatus: string;
  reviewedBy?: string;
  reviewDate?: string;
  reviewNotes?: string;
}

export default function RelocationUpdatesPage() {
  const [candidates, setCandidates] = useState<CandidateUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningDetection, setRunningDetection] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateUpdate | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/relocation/admin/candidate-updates?status=pending');
      const data = await response.json();
      setCandidates(data.candidates || []);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const runUpdateDetection = async () => {
    setRunningDetection(true);
    try {
      const response = await fetch('/api/relocation/admin/detect-updates', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✓ Update detection complete!\n\nDocuments scraped: ${result.documentsScraped}\nRules extracted: ${result.rulesExtracted}\nNew candidates: ${result.candidateUpdatesSaved}`);
        fetchCandidates();
      } else {
        const error = await response.json();
        alert(`✗ Update detection failed: ${error.details || error.error}`);
      }
    } catch (error) {
      alert(`✗ Update detection error: ${error}`);
    } finally {
      setRunningDetection(false);
    }
  };

  const handleReview = async (candidateId: string, action: 'approve' | 'reject') => {
    const confirmMsg = action === 'approve'
      ? 'Apply this tax rule update?'
      : 'Reject this update?';

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch('/api/relocation/admin/candidate-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          action,
          reviewNotes,
          reviewedBy: 'admin', // In production, get from auth context
        }),
      });

      if (response.ok) {
        alert(`✓ Update ${action === 'approve' ? 'approved' : 'rejected'}!`);
        setSelectedCandidate(null);
        setReviewNotes('');
        fetchCandidates();
      } else {
        const error = await response.json();
        alert(`✗ Failed to ${action}: ${error.error}`);
      }
    } catch (error) {
      alert(`✗ Error: ${error}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Tax Rule Updates</h1>
          <p className="mt-2 text-text-muted">
            AI-detected tax law changes pending review
          </p>
        </div>
        <button
          type="button"
          onClick={runUpdateDetection}
          disabled={runningDetection}
          className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-text-onBrand transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {runningDetection ? 'Detecting Updates...' : 'Run Update Detection'}
        </button>
      </div>

      {/* Candidate List */}
      {loading ? (
        <div className="rounded-lg border p-12 text-center" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
          <p className="text-text-muted">Loading candidates...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-lg border p-12 text-center" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
          <svg className="mx-auto h-12 w-12 text-text-muted opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-text-muted">No pending updates</p>
          <p className="mt-2 text-xs text-text-faint">Run update detection to check for new tax law changes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-lg border p-6"
              style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-text">
                      {candidate.jurisdictionName} ({candidate.jurisdictionCode})
                    </h3>
                    <span className="rounded-full bg-warning-500/20 px-3 py-1 text-xs font-medium text-warning-700 dark:text-warning-400">
                      Confidence: {(candidate.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-text-muted">{candidate.extractionSummary}</p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-text-faint">
                    <span>Source: {candidate.sourceType.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>Detected: {new Date(candidate.detectedDate).toLocaleDateString()}</span>
                  </div>

                  {selectedCandidate?.id === candidate.id && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-md bg-surface-subtle p-4">
                        <p className="mb-2 text-xs font-semibold text-text">Proposed Changes:</p>
                        <pre className="overflow-x-auto text-xs text-text-muted">
                          {JSON.stringify(candidate.proposedChanges, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">
                          Review Notes (optional)
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          style={{
                            background: 'var(--s-input-bg)',
                            borderColor: 'var(--s-border-subtle)',
                            color: 'var(--s-text)',
                          }}
                          rows={3}
                          placeholder="Add notes about this review decision..."
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleReview(candidate.id, 'approve')}
                          className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                        >
                          ✓ Approve & Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReview(candidate.id, 'reject')}
                          className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                        >
                          ✗ Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCandidate(null)}
                          className="rounded-lg border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-subtle"
                          style={{ borderColor: 'var(--s-border-subtle)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!selectedCandidate && (
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(candidate)}
                    className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-onBrand transition-colors hover:bg-accent-primary/90"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
