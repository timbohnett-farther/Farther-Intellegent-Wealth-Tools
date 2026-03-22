'use client';

import React from 'react';
import { UserPlus, Pencil, User } from 'lucide-react';
import type { Person } from '@/lib/tax-planning/types';

export interface PeoplePanelProps {
  /** List of people in the household */
  people: Person[];
  /** Callback to add a new person */
  onAdd: () => void;
  /** Callback to edit a person */
  onEdit: (personId: string) => void;
}

function formatDob(dob?: string): string {
  if (!dob) return '';
  try {
    return new Date(dob).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dob;
  }
}

function maskSsn(last4?: string): string {
  if (!last4) return '';
  return `***-**-${last4}`;
}

export const PeoplePanel: React.FC<PeoplePanelProps> = ({
  people,
  onAdd,
  onEdit,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">People</h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-teal-500 bg-white/[0.07] text-teal-300 text-sm font-medium hover:bg-teal-500/10 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Person
        </button>
      </div>

      {people.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-4 py-12 text-center shadow-sm">
          <User className="mx-auto h-10 w-10 text-white/30 mb-3" />
          <p className="text-sm text-white/60 font-medium">
            No people in this household
          </p>
          <p className="mt-1 text-xs text-white/50">
            Add household members to associate with tax returns.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {people.map((person) => (
            <div
              key={person.person_id}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-teal-500/15 flex-shrink-0">
                    <span className="text-sm font-semibold text-teal-300">
                      {person.first_name.charAt(0)}
                      {person.last_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {person.first_name} {person.last_name}
                    </p>
                    {person.dob && (
                      <p className="text-xs text-white/50 mt-0.5">
                        DOB: {formatDob(person.dob)}
                      </p>
                    )}
                    {person.ssn_last4 && (
                      <p className="text-xs text-white/50 mt-0.5 font-mono">
                        SSN: {maskSsn(person.ssn_last4)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onEdit(person.person_id)}
                  className="rounded p-1.5 text-white/30 hover:bg-white/[0.04] hover:text-teal-300 transition-colors"
                  aria-label={`Edit ${person.first_name} ${person.last_name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

PeoplePanel.displayName = 'PeoplePanel';
