'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { X, Download, Mail, Link2, Check } from 'lucide-react';

export interface ShareModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Report ID to share */
  reportId: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  reportId,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEmail('');
      setEmailError('');
      setCopiedLink(false);
      setEmailSent(false);
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleCopyLink = useCallback(async () => {
    try {
      const link = `${window.location.origin}/api/tax-planning/reports/${reportId}/download`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      setCopiedLink(false);
    }
  }, [reportId]);

  const handleSendEmail = useCallback(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email address is required.');
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    // In a real implementation, this would call an API
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  }, [email]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1a1a1a]/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="relative z-10 w-full max-w-md rounded-lg bg-surface-soft backdrop-blur-xl shadow-lg border border-border-subtle"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2
            id="share-modal-title"
            className="text-lg font-semibold text-text"
          >
            Share Report
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-faint hover:bg-surface-subtle hover:text-text-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Download PDF */}
          <button
            type="button"
            className="flex items-center gap-3 w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 hover:border-accent-primarySoft hover:bg-accent-primary/10/30 transition-all text-left"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent-primary/10 flex-shrink-0">
              <Download className="h-5 w-5 text-accent-primarySoft" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">Download PDF</p>
              <p className="text-xs text-text-muted">
                Save a copy to your device
              </p>
            </div>
          </button>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-3 w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 hover:border-accent-primarySoft hover:bg-accent-primary/10/30 transition-all text-left"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-info-100 flex-shrink-0">
              {copiedLink ? (
                <Check className="h-5 w-5 text-success-700" />
              ) : (
                <Link2 className="h-5 w-5 text-info-700" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-text">
                {copiedLink ? 'Link Copied!' : 'Copy Link'}
              </p>
              <p className="text-xs text-text-muted">
                Share a direct link to this report
              </p>
            </div>
          </button>

          {/* Email to Client */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-warning-100 flex-shrink-0">
                <Mail className="h-5 w-5 text-warning-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">
                  Email to Client
                </p>
                <p className="text-xs text-text-muted">
                  Send the report via email
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="client@example.com"
                  className={cn(
                    'h-9 w-full rounded-lg border-[1.5px] bg-surface-soft backdrop-blur-xl px-3 text-sm text-text placeholder:text-text-faint transition-colors focus:outline-hidden focus:shadow-focus',
                    emailError
                      ? 'border-critical-500 focus:border-critical-500'
                      : 'border-border-subtle focus:border-accent-primary'
                  )}
                />
                {emailError && (
                  <p className="mt-1 text-xs text-critical-500">{emailError}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSendEmail}
                className={cn(
                  'h-9 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm',
                  emailSent
                    ? 'bg-success-500 text-text'
                    : 'bg-accent-primary text-text hover:bg-brand-400'
                )}
              >
                {emailSent ? 'Sent!' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border-subtle px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl text-sm font-medium text-text-muted hover:bg-surface-subtle transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

ShareModal.displayName = 'ShareModal';
