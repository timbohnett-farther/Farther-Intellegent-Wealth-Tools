// Alert Publisher — generates and distributes advisor notifications for tax changes.
// In production: publishes to Cloud Pub/Sub 'advisor-alerts' topic.
// Pure functional — no React, Next.js, or Prisma imports.

import type { ChangeItem, AdvisorBulletin, UpdateRunResult } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdvisorAlert {
  advisorId: string;
  advisorName: string;
  alertType: 'tax_table_update' | 'pending_legislation' | 'quarterly_bulletin';
  title: string;
  summary: string;
  affectedClientCount: number;
  severity: 'info' | 'warning' | 'action_required';
  actions: string[];
}

// ---------------------------------------------------------------------------
// Alert Generation
// ---------------------------------------------------------------------------

/**
 * Generate advisor alerts from the changes detected in an update run.
 */
export function generateAdvisorAlerts(
  autoChanges: ChangeItem[],
  humanReviewChanges: ChangeItem[],
): AdvisorAlert[] {
  const alerts: AdvisorAlert[] = [];

  // Demo advisors
  const advisors = [
    { id: 'adv-001', name: 'Sarah Chen', clients: 42 },
    { id: 'adv-002', name: 'Michael Torres', clients: 38 },
    { id: 'adv-003', name: 'Lisa Park', clients: 35 },
    { id: 'adv-004', name: 'James Wilson', clients: 32 },
    { id: 'adv-005', name: 'Emily Davis', clients: 28 },
  ];

  // Notify all advisors of auto-published changes (informational)
  if (autoChanges.length > 0) {
    for (const advisor of advisors) {
      alerts.push({
        advisorId: advisor.id,
        advisorName: advisor.name,
        alertType: 'tax_table_update',
        title: `${autoChanges.length} Tax Table Update${autoChanges.length === 1 ? '' : 's'} Published`,
        summary: `${autoChanges.length} numeric adjustment${autoChanges.length === 1 ? '' : 's'} ha${autoChanges.length === 1 ? 's' : 've'} been automatically validated and published. Your clients' plans will be recalculated with updated tables.`,
        affectedClientCount: advisor.clients,
        severity: 'info',
        actions: ['View updated tables', 'Review client plans after recalculation'],
      });
    }
  }

  // Notify about pending legislation (may require proactive client outreach)
  for (const change of humanReviewChanges) {
    if (change.type === 'pending_legislation') {
      for (const advisor of advisors) {
        alerts.push({
          advisorId: advisor.id,
          advisorName: advisor.name,
          alertType: 'pending_legislation',
          title: `Pending Legislation: ${change.description.slice(0, 60)}...`,
          summary: change.summary ?? change.description,
          affectedClientCount: Math.round(advisor.clients * 0.3),
          severity: 'warning',
          actions: ['Model impact for your clients', 'Draft proactive client communication'],
        });
      }
    }
  }

  return alerts;
}

/**
 * Generate quarterly "What Changed This Quarter" bulletin.
 */
export function generateQuarterlyBulletin(
  changes: ChangeItem[],
  runResult: Partial<UpdateRunResult>,
): AdvisorBulletin {
  const autoChanges = changes.filter((c) => c.autoApprovable);
  const lawChanges = changes.filter((c) => c.type === 'law_change' || c.type === 'pending_legislation');

  const sections: string[] = [];

  if (autoChanges.length > 0) {
    sections.push(`**Automatic Updates (${autoChanges.length}):**\n${autoChanges.map((c) => `- ${c.description}`).join('\n')}`);
  }

  if (lawChanges.length > 0) {
    sections.push(`**Legislative Updates (${lawChanges.length}):**\n${lawChanges.map((c) => `- ${c.description} [${c.type}]`).join('\n')}`);
  }

  if (runResult.plansRequiringRecalc) {
    sections.push(`**Plans Recalculated:** ${runResult.plansRequiringRecalc} plans updated with new tables.`);
  }

  return {
    id: `BULLETIN-${new Date().toISOString().slice(0, 7)}`,
    title: `Quarterly Tax Update — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    generatedAt: new Date().toISOString(),
    changes,
    summary: sections.join('\n\n'),
    affectedPlanCount: runResult.plansRequiringRecalc ?? 0,
  };
}

/**
 * Format a bulletin as email-ready content.
 */
export function formatBulletinEmail(bulletin: AdvisorBulletin): string {
  return [
    `Subject: ${bulletin.title}`,
    '',
    'Dear Advisor,',
    '',
    `This is your quarterly update from the Farther Prism Tax Update Engine.`,
    '',
    bulletin.summary,
    '',
    `${bulletin.affectedPlanCount} client plans have been recalculated with the latest tax tables.`,
    '',
    'Please review any affected client plans and reach out to clients where material changes apply.',
    '',
    'Best regards,',
    'Farther Prism Tax Update Engine',
  ].join('\n');
}

/**
 * Publish alerts. In production: sends to Cloud Pub/Sub for downstream delivery (email, in-app, Slack).
 */
export function publishAlerts(alerts: AdvisorAlert[]): { published: number; channel: string } {
  // Demo: log and return count
  return { published: alerts.length, channel: 'pubsub:advisor-alerts' };
}
