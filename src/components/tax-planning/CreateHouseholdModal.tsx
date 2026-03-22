'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';

export interface CreateHouseholdModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when the form is submitted */
  onSubmit: (data: { displayName: string; primaryState?: string }) => void;
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

export const CreateHouseholdModal: React.FC<CreateHouseholdModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [primaryState, setPrimaryState] = useState('');
  const [errors, setErrors] = useState<{ displayName?: string }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDisplayName('');
      setPrimaryState('');
      setErrors({});
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

  const validate = useCallback((): boolean => {
    const newErrors: { displayName?: string } = {};
    const trimmed = displayName.trim();

    if (!trimmed) {
      newErrors.displayName = 'Display name is required.';
    } else if (trimmed.length > 120) {
      newErrors.displayName = 'Display name must be 120 characters or fewer.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [displayName]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      onSubmit({
        displayName: displayName.trim(),
        primaryState: primaryState || undefined,
      });
    },
    [validate, displayName, primaryState, onSubmit]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1a1a1a]/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-household-title"
        className="relative z-10 w-full max-w-md rounded-lg bg-white/[0.07] backdrop-blur-xl shadow-lg border border-white/[0.06]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2
            id="create-household-title"
            className="text-lg font-semibold text-white"
          >
            Create Household
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/30 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="household-display-name"
              className="text-sm font-medium text-white/60"
            >
              Display Name <span className="text-critical-500">*</span>
            </label>
            <input
              id="household-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Smith Family"
              maxLength={120}
              className={cn(
                'h-9 w-full rounded-lg border-[1.5px] bg-white/[0.07] backdrop-blur-xl px-3 text-sm text-white placeholder:text-white/30 transition-colors focus:outline-hidden focus:shadow-focus',
                errors.displayName
                  ? 'border-critical-500 focus:border-critical-500'
                  : 'border-white/[0.06] focus:border-teal-500'
              )}
            />
            {errors.displayName && (
              <p className="text-xs text-critical-500">{errors.displayName}</p>
            )}
            <p className="text-xs text-white/30">
              {displayName.length}/120 characters
            </p>
          </div>

          {/* Primary State */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="household-state"
              className="text-sm font-medium text-white/60"
            >
              Primary State
            </label>
            <select
              id="household-state"
              value={primaryState}
              onChange={(e) => setPrimaryState(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border-[1.5px] border-white/[0.06] bg-white pl-3 pr-9 text-sm text-white transition-colors focus:outline-hidden focus:border-teal-500 focus:shadow-focus"
            >
              <option value="">Select a state (optional)</option>
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit as () => void}
            className="h-10 px-5 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-400 transition-colors shadow-sm"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

CreateHouseholdModal.displayName = 'CreateHouseholdModal';
