'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import type { AuditEvent } from '@/lib/tax-planning/types';
import { Badge } from '@/components/prism/atoms/Badge';

export interface AuditTableProps {
  /** Array of audit events to display */
  events: AuditEvent[];
  /** Total number of events (for pagination) */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 20;

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getEventBadgeVariant(
  eventKey: string
): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'brand' {
  if (eventKey.includes('create')) return 'success';
  if (eventKey.includes('delete') || eventKey.includes('remove')) return 'critical';
  if (eventKey.includes('update') || eventKey.includes('override')) return 'warning';
  if (eventKey.includes('compute') || eventKey.includes('extract')) return 'info';
  if (eventKey.includes('login') || eventKey.includes('auth')) return 'brand';
  return 'neutral';
}

export const AuditTable: React.FC<AuditTableProps> = ({
  events,
  total,
  page,
  onPageChange,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleExpand = (eventId: string) => {
    setExpandedId((prev) => (prev === eventId ? null : eventId));
  };

  return (
    <div className="w-full">
      <div className="bg-surface-soft rounded-lg shadow-sm border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-transparent">
                <th className="w-8 px-2 py-3" aria-label="Expand" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    No audit events to display.
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const isExpanded = expandedId === event.event_id;

                  return (
                    <React.Fragment key={event.event_id}>
                      <tr
                        className={cn(
                          'border-b border-limestone-100 hover:bg-surface-subtle transition-colors cursor-pointer',
                          isExpanded && 'bg-transparent'
                        )}
                        onClick={() => toggleExpand(event.event_id)}
                      >
                        <td className="px-2 py-3 text-center">
                          {isExpanded ? (
                            <ChevronDown className="inline-block h-4 w-4 text-text-faint" />
                          ) : (
                            <ChevronRight className="inline-block h-4 w-4 text-text-faint" />
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-text-muted tabular-nums">
                          {formatTimestamp(event.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-text-muted font-mono text-xs">
                          {event.user_id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getEventBadgeVariant(event.event_key)}>
                            {event.event_key}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-text-muted max-w-xs truncate">
                          {event.ip && (
                            <span className="text-xs">IP: {event.ip}</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded payload row */}
                      {isExpanded && (
                        <tr className="border-b border-limestone-100">
                          <td colSpan={5} className="px-4 py-4 bg-transparent">
                            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4">
                              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                                Event Payload
                              </h4>
                              <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap font-mono bg-transparent rounded p-3">
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}
            &ndash;
            {Math.min(page * PAGE_SIZE, total)} of {total} events
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-border-subtle bg-surface-soft backdrop-blur-xl text-text-muted hover:bg-surface-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors',
                    pageNum === page
                      ? 'bg-accent-primary text-text'
                      : 'border border-border-subtle bg-surface-soft backdrop-blur-xl text-text-muted hover:bg-surface-subtle'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-border-subtle bg-surface-soft backdrop-blur-xl text-text-muted hover:bg-surface-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

AuditTable.displayName = 'AuditTable';
