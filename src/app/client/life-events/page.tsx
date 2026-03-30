'use client';

import React, { useState } from 'react';
import {
  Heart,
  Baby,
  Briefcase,
  Home,
  Gift,
  ChevronRight,
  X,
  Check,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────
interface LifeEventType {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  fields: FormField[];
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'textarea';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface SubmittedEvent {
  id: string;
  eventType: string;
  eventLabel: string;
  eventDate: string;
  status: 'pending_review' | 'approved' | 'applied';
  submittedDate: string;
}

// ── Life Event Definitions ─────────────────────────────────────────
const LIFE_EVENTS: LifeEventType[] = [
  {
    key: 'marriage',
    label: 'I got married',
    description: 'Update your plan with new filing status, combined finances, and beneficiary changes.',
    icon: Heart,
    color: 'text-pink-500 bg-pink-50',
    fields: [
      { name: 'spouseName', label: 'Spouse\'s Full Name', type: 'text', required: true },
      { name: 'marriageDate', label: 'Date of Marriage', type: 'date', required: true },
      { name: 'spouseDob', label: 'Spouse\'s Date of Birth', type: 'date', required: true },
      { name: 'spouseEmployer', label: 'Spouse\'s Employer', type: 'text' },
      { name: 'spouseIncome', label: 'Spouse\'s Annual Income', type: 'number', placeholder: '0' },
      { name: 'filingStatus', label: 'Preferred Filing Status', type: 'select', options: ['Married Filing Jointly', 'Married Filing Separately'] },
      { name: 'notes', label: 'Additional Notes', type: 'textarea' },
    ],
  },
  {
    key: 'new_child',
    label: 'We had a child',
    description: 'Plan for education, update beneficiaries, and consider life insurance needs.',
    icon: Baby,
    color: 'text-accent-primarySoft bg-accent-primary/10',
    fields: [
      { name: 'childName', label: 'Child\'s Name', type: 'text', required: true },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { name: 'educationPlanning', label: 'Start 529 Plan?', type: 'select', options: ['Yes', 'No', 'Already have one'] },
      { name: 'guardianUpdate', label: 'Need to update guardian designations?', type: 'select', options: ['Yes', 'No', 'Not sure'] },
      { name: 'notes', label: 'Additional Notes', type: 'textarea' },
    ],
  },
  {
    key: 'job_change',
    label: 'I changed jobs',
    description: 'Review 401(k) rollover options, new benefits, and income changes.',
    icon: Briefcase,
    color: 'text-warning-500 bg-warning-50',
    fields: [
      { name: 'newEmployer', label: 'New Employer', type: 'text', required: true },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'newSalary', label: 'New Base Salary', type: 'number', required: true, placeholder: '0' },
      { name: 'hasEquityComp', label: 'Equity Compensation?', type: 'select', options: ['Yes - RSUs', 'Yes - Stock Options', 'Yes - ESPP', 'No'] },
      { name: 'old401kBalance', label: 'Old 401(k) Balance (approx)', type: 'number', placeholder: '0' },
      { name: 'rolloverPreference', label: '401(k) Rollover Preference', type: 'select', options: ['Roll to new employer plan', 'Roll to IRA', 'Not sure - need advice'] },
      { name: 'notes', label: 'Additional Notes', type: 'textarea' },
    ],
  },
  {
    key: 'home_purchase',
    label: 'We bought a home',
    description: 'Update net worth, review mortgage strategy, and property insurance.',
    icon: Home,
    color: 'text-success-500 bg-success-50',
    fields: [
      { name: 'propertyAddress', label: 'Property Address', type: 'text', required: true },
      { name: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true },
      { name: 'purchasePrice', label: 'Purchase Price', type: 'number', required: true, placeholder: '0' },
      { name: 'downPayment', label: 'Down Payment', type: 'number', required: true, placeholder: '0' },
      { name: 'mortgageRate', label: 'Mortgage Interest Rate (%)', type: 'number', placeholder: '6.5' },
      { name: 'mortgageTerm', label: 'Mortgage Term', type: 'select', options: ['15-year fixed', '30-year fixed', 'ARM', 'Other'] },
      { name: 'propertyType', label: 'Property Type', type: 'select', options: ['Primary Residence', 'Vacation Home', 'Investment Property'] },
      { name: 'notes', label: 'Additional Notes', type: 'textarea' },
    ],
  },
  {
    key: 'inheritance',
    label: 'I received an inheritance',
    description: 'Plan how to allocate inherited assets, understand tax implications.',
    icon: Gift,
    color: 'text-accent-primarySoft bg-accent-primary/10',
    fields: [
      { name: 'source', label: 'Inherited From', type: 'text', required: true },
      { name: 'dateReceived', label: 'Date Received', type: 'date', required: true },
      { name: 'totalValue', label: 'Estimated Total Value', type: 'number', required: true, placeholder: '0' },
      { name: 'assetTypes', label: 'Asset Types', type: 'select', options: ['Cash', 'Investments / Brokerage', 'Real Estate', 'Retirement Accounts (IRA)', 'Mixed / Multiple'] },
      { name: 'hasIRA', label: 'Includes inherited IRA?', type: 'select', options: ['Yes', 'No'] },
      { name: 'notes', label: 'Additional Notes', type: 'textarea' },
    ],
  },
];

// ── Mock Submitted Events ──────────────────────────────────────────
const INITIAL_SUBMITTED: SubmittedEvent[] = [
  {
    id: '1',
    eventType: 'job_change',
    eventLabel: 'I changed jobs',
    eventDate: '2025-11-01',
    status: 'applied',
    submittedDate: '2025-11-05',
  },
  {
    id: '2',
    eventType: 'home_purchase',
    eventLabel: 'We bought a home',
    eventDate: '2025-09-15',
    status: 'approved',
    submittedDate: '2025-09-20',
  },
];

// ── Helpers ────────────────────────────────────────────────────────
function statusConfig(status: string) {
  switch (status) {
    case 'pending_review':
      return { label: 'Pending Review', icon: Clock, className: 'bg-warning-50 text-warning-700' };
    case 'approved':
      return { label: 'Approved', icon: Check, className: 'bg-success-50 text-success-700' };
    case 'applied':
      return { label: 'Applied to Plan', icon: Check, className: 'bg-accent-primary/10 text-accent-primarySoft' };
    default:
      return { label: status, icon: AlertCircle, className: 'bg-surface-subtle text-text-muted' };
  }
}

// ── Wizard Modal ───────────────────────────────────────────────────
function EventWizard({
  event,
  onClose,
  onSubmit,
}: {
  event: LifeEventType;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const Icon = event.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-surface-soft rounded-modal shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${event.color}`}
          >
            <Icon size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text">
              {event.label}
            </h3>
            <p className="text-xs text-text-muted">{event.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-subtle text-text-faint"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {event.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-text-muted mb-1">
                {field.label}
                {field.required && (
                  <span className="text-critical-500 ml-0.5">*</span>
                )}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                  rows={3}
                  placeholder={field.placeholder}
                  className="w-full border border-border-subtle rounded-input px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-accent-primary"
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                  required={field.required}
                  className="w-full border border-border-subtle rounded-input px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-accent-primary"
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                  required={field.required}
                  placeholder={field.placeholder}
                  className="w-full border border-border-subtle rounded-input px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-accent-primary"
                />
              )}
            </div>
          ))}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-limestone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted bg-surface-soft border border-border-subtle rounded-lg hover:bg-surface-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text bg-accent-primary rounded-lg hover:bg-accent-primary/80"
            >
              <Send size={16} />
              Submit to Advisor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function ClientLifeEventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<LifeEventType | null>(
    null
  );
  const [submitted, setSubmitted] =
    useState<SubmittedEvent[]>(INITIAL_SUBMITTED);

  const handleSubmit = (data: Record<string, string>) => {
    if (!selectedEvent) return;

    const newEvent: SubmittedEvent = {
      id: `new-${Date.now()}`,
      eventType: selectedEvent.key,
      eventLabel: selectedEvent.label,
      eventDate: data.marriageDate || data.dateOfBirth || data.startDate || data.purchaseDate || data.dateReceived || new Date().toISOString().split('T')[0],
      status: 'pending_review',
      submittedDate: new Date().toISOString().split('T')[0],
    };
    setSubmitted([newEvent, ...submitted]);
    setSelectedEvent(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Life Events</h1>
        <p className="text-sm text-text-muted mt-1">
          Had a big life change? Let your advisor know so they can update your
          financial plan accordingly.
        </p>
      </div>

      {/* ── Event Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LIFE_EVENTS.map((event) => {
          const Icon = event.icon;
          return (
            <button
              key={event.key}
              onClick={() => setSelectedEvent(event)}
              className="bg-surface-soft rounded-card border border-border-subtle p-5 text-left hover:border-accent-primarySoft hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${event.color}`}
                >
                  <Icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text group-hover:text-accent-primarySoft transition-colors">
                    {event.label}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {event.description}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-text-faint group-hover:text-accent-primarySoft mt-1 flex-shrink-0"
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Submitted Events ── */}
      {submitted.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">
            Submitted Events
          </h2>
          <div className="bg-surface-soft rounded-card border border-border-subtle overflow-hidden">
            <div className="divide-y divide-limestone-100">
              {submitted.map((event) => {
                const config = statusConfig(event.status);
                const StatusIcon = config.icon;
                const eventDef = LIFE_EVENTS.find(
                  (e) => e.key === event.eventType
                );
                const EventIcon = eventDef?.icon || AlertCircle;

                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          eventDef?.color || 'bg-surface-subtle text-text-muted'
                        }`}
                      >
                        <EventIcon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text">
                          {event.eventLabel}
                        </p>
                        <p className="text-xs text-text-muted">
                          Event date:{' '}
                          {new Date(event.eventDate).toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric', year: 'numeric' }
                          )}{' '}
                          &middot; Submitted{' '}
                          {new Date(event.submittedDate).toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric', year: 'numeric' }
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${config.className}`}
                    >
                      <StatusIcon size={12} />
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Wizard Modal ── */}
      {selectedEvent && (
        <EventWizard
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
