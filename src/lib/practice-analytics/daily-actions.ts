// =============================================================================
// FP-Pulse — AI-Prioritized Daily Action List for Advisors
//
// Generates, categorizes, and manages a daily action list for each advisor.
// Actions are scored by a weighted priority algorithm and sorted from most
// to least urgent. In-memory demo data — no external DB dependencies.
//
// Stage 2 will replace demo data with BigQuery + Vertex AI pipeline.
//
// @module practice-analytics/daily-actions
// =============================================================================

import type {
  AdvisorId,
  FirmId,
  DailyActionItem,
  DailyActionList,
  ActionCategory,
  ActionUrgency,
  DailyActionType,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** Priority weight configuration for computing action scores. */
const PRIORITY_WEIGHTS = {
  aum: 0.25,
  urgency: 0.30,
  daysSinceContact: 0.15,
  complexity: 0.05,
  revenueOpportunity: 0.15,
  churnRisk: 0.10,
} as const;

/** Advisor display names for demo data. */
const ADVISOR_NAMES: Record<string, string> = {
  'adv-001': 'Sarah',
  'adv-002': 'Michael',
  'adv-003': 'Jennifer',
  'adv-004': 'David',
  'adv-005': 'Emily',
};

// =============================================================================
// In-Memory Action Store
// =============================================================================

/** In-memory store for actions, keyed by action ID. */
const actionStore: Map<string, DailyActionItem> = new Map();

// =============================================================================
// Priority Scoring
// =============================================================================

/**
 * Computes a 0-100 priority score based on weighted factors.
 *
 * Weight distribution:
 * - AUM:               25%
 * - Urgency:           30%
 * - Days Since Contact: 15%
 * - Complexity:         5%
 * - Revenue Opportunity: 15%
 * - Churn Risk:        10%
 *
 * Each factor should be provided on a 0-100 scale.
 *
 * @param factors - Object containing each scoring factor (0-100 each)
 * @returns A priority score between 0 and 100
 */
export function computePriorityScore(factors: {
  aum: number;
  urgency: number;
  daysSinceContact: number;
  complexity: number;
  revenueOpportunity: number;
  churnRisk: number;
}): number {
  const raw =
    factors.aum * PRIORITY_WEIGHTS.aum +
    factors.urgency * PRIORITY_WEIGHTS.urgency +
    factors.daysSinceContact * PRIORITY_WEIGHTS.daysSinceContact +
    factors.complexity * PRIORITY_WEIGHTS.complexity +
    factors.revenueOpportunity * PRIORITY_WEIGHTS.revenueOpportunity +
    factors.churnRisk * PRIORITY_WEIGHTS.churnRisk;

  return Math.round(Math.max(0, Math.min(100, raw)) * 100) / 100;
}

// =============================================================================
// Action Categorization
// =============================================================================

/**
 * Categorizes a daily action item into one of the defined action categories
 * based on the action's type and description content.
 *
 * @param action - The daily action item to categorize
 * @returns The action category string
 */
export function categorizeAction(action: DailyActionItem): ActionCategory {
  const desc = action.description.toLowerCase();
  const title = action.title.toLowerCase();

  if (title.includes('rmd') || title.includes('tax') || title.includes('roth')) {
    return 'COMPLIANCE';
  }
  if (title.includes('review') || title.includes('contact') || desc.includes('no contact')) {
    return 'ENGAGEMENT';
  }
  if (title.includes('portfolio') || title.includes('drift') || title.includes('rebalance')) {
    return 'PLANNING';
  }
  if (title.includes('proposal') || title.includes('follow-up') || title.includes('follow up')) {
    return 'ENGAGEMENT';
  }
  if (title.includes('plan') || title.includes('success rate') || title.includes('estate')) {
    return 'PLANNING';
  }
  if (title.includes('birthday') || title.includes('anniversary') || title.includes('milestone')) {
    return 'ENGAGEMENT';
  }
  if (title.includes('churn') || title.includes('risk') || title.includes('retention')) {
    return 'URGENT';
  }
  if (title.includes('compliance') || title.includes('regulatory') || title.includes('filing')) {
    return 'COMPLIANCE';
  }

  return 'ENGAGEMENT';
}

// =============================================================================
// Priority Classification
// =============================================================================

/**
 * Classifies a numeric priority score into a human-readable priority label.
 *
 * @param score - The computed priority score (0-100)
 * @returns The priority label
 */
function classifyUrgency(score: number): ActionUrgency {
  if (score >= 85) return 'URGENT';
  if (score >= 65) return 'HIGH';
  if (score >= 40) return 'NORMAL';
  return 'LOW';
}

// =============================================================================
// Demo Action Templates
// =============================================================================

interface ActionTemplate {
  title: string;
  description: string;
  factors: {
    aum: number;
    urgency: number;
    daysSinceContact: number;
    complexity: number;
    revenueOpportunity: number;
    churnRisk: number;
  };
  category: ActionCategory;
  dueDate: string;
  clientName: string;
  clientId: string;
}

/**
 * Creates a set of realistic daily action templates for an advisor.
 * Each template includes specific dollar amounts, dates, and recommendations.
 */
function buildActionTemplates(advisorId: string): ActionTemplate[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const inTwoDays = new Date(today);
  inTwoDays.setDate(today.getDate() + 2);
  const inThreeDays = new Date(today);
  inThreeDays.setDate(today.getDate() + 3);
  const inFiveDays = new Date(today);
  inFiveDays.setDate(today.getDate() + 5);

  const templates: ActionTemplate[] = [
    {
      title: 'RMD deadline approaching — Robert Harrison',
      description:
        'Robert Harrison (age 78) has a Required Minimum Distribution of $142,850 due by December 31. ' +
        'Current IRA balance: $3,450,000. Only $48,200 has been distributed YTD, leaving $94,650 remaining. ' +
        'Recommend scheduling a call to discuss distribution strategy and tax withholding elections. ' +
        'Consider splitting across quarterly installments to manage tax bracket impact.',
      factors: { aum: 90, urgency: 95, daysSinceContact: 60, complexity: 45, revenueOpportunity: 70, churnRisk: 30 },
      category: 'COMPLIANCE',
      dueDate: inTwoDays.toISOString().split('T')[0],
      clientName: 'Robert Harrison',
      clientId: `client-${advisorId}-001`,
    },
    {
      title: 'No contact in 187 days — Margaret & Thomas Chen',
      description:
        'The Chens ($2.8M AUM) have not been contacted in 187 days. Last interaction was a portfolio review ' +
        'on August 15. Margaret recently retired from her VP position at Salesforce. This is a critical ' +
        'retention risk — their son mentioned exploring options with another advisor at a recent community event. ' +
        'Recommend immediate outreach to schedule a retirement income planning session. Bring updated financial ' +
        'plan showing projected income streams and Social Security optimization.',
      factors: { aum: 75, urgency: 80, daysSinceContact: 95, complexity: 40, revenueOpportunity: 65, churnRisk: 85 },
      category: 'ENGAGEMENT',
      dueDate: today.toISOString().split('T')[0],
      clientName: 'Margaret & Thomas Chen',
      clientId: `client-${advisorId}-002`,
    },
    {
      title: 'Roth conversion opportunity — Patricia Williams',
      description:
        'Patricia Williams (age 62, recently retired) has a window for Roth conversion. Current Traditional ' +
        'IRA: $1,250,000. Estimated taxable income this year: $38,000 (down from $285,000 while working). ' +
        'Opportunity to convert approximately $120,000 to Roth IRA while staying within the 24% bracket. ' +
        'Projected tax savings over 20 years: $185,000-$220,000. Medicare IRMAA impact analysis needed. ' +
        'Schedule meeting before Q4 to execute conversion strategy.',
      factors: { aum: 65, urgency: 75, daysSinceContact: 30, complexity: 70, revenueOpportunity: 80, churnRisk: 15 },
      category: 'COMPLIANCE',
      dueDate: inThreeDays.toISOString().split('T')[0],
      clientName: 'Patricia Williams',
      clientId: `client-${advisorId}-003`,
    },
    {
      title: 'Annual review overdue — James & Linda Morrison',
      description:
        'The Morrisons ($1.1M AUM) are 45 days past their scheduled annual review. Last comprehensive review ' +
        'was 14 months ago. They have a new grandchild (education planning opportunity), and James mentioned ' +
        'possible early retirement at age 58. Current asset allocation may be too aggressive for shortened ' +
        'time horizon. Review agenda: retirement readiness, education funding for grandchild, estate plan update.',
      factors: { aum: 50, urgency: 55, daysSinceContact: 45, complexity: 50, revenueOpportunity: 45, churnRisk: 35 },
      category: 'ENGAGEMENT',
      dueDate: inFiveDays.toISOString().split('T')[0],
      clientName: 'James & Linda Morrison',
      clientId: `client-${advisorId}-004`,
    },
    {
      title: 'Portfolio drift alert — Anderson Family Trust',
      description:
        'The Anderson Family Trust ($4.2M) has drifted 8.3% from target allocation. Current: 78% equity / ' +
        '15% fixed income / 7% alternatives. Target: 65% / 25% / 10%. Large-cap growth overweight by 12% ' +
        'due to recent tech rally. International underweight by 6%. Recommend rebalancing with tax-loss ' +
        'harvesting — estimated $18,500 in harvestable losses in emerging market positions. Generate ' +
        'rebalancing proposal for client review.',
      factors: { aum: 85, urgency: 60, daysSinceContact: 20, complexity: 55, revenueOpportunity: 50, churnRisk: 20 },
      category: 'PLANNING',
      dueDate: inThreeDays.toISOString().split('T')[0],
      clientName: 'Anderson Family Trust',
      clientId: `client-${advisorId}-005`,
    },
    {
      title: 'New proposal needs follow-up — Dr. Amir Patel',
      description:
        'Sent comprehensive financial plan proposal to Dr. Patel ($3.1M prospective assets) 5 days ago. ' +
        'No response yet. Proposal includes: consolidated investment management, tax optimization strategy ' +
        'projecting $45,000/year in tax savings, and practice succession planning. Dr. Patel expressed ' +
        'strong interest during discovery meeting. Competitor RIA (Mercer Advisors) is also courting. ' +
        'Follow up with a brief email highlighting the tax savings analysis and offer a 15-minute call.',
      factors: { aum: 80, urgency: 70, daysSinceContact: 5, complexity: 30, revenueOpportunity: 90, churnRisk: 10 },
      category: 'ENGAGEMENT',
      dueDate: today.toISOString().split('T')[0],
      clientName: 'Dr. Amir Patel',
      clientId: `client-${advisorId}-006`,
    },
    {
      title: 'Plan success rate dropped — Katherine & Steven Brooks',
      description:
        'Monte Carlo success rate for the Brooks household ($1.8M AUM) dropped from 87% to 72% after ' +
        'latest market correction and updated expense assumptions. Key concerns: increased healthcare ' +
        'costs ($12,000/year above original projection), Steven\'s delayed Social Security claiming ' +
        '(now targeting age 67 instead of 70), and daughter\'s wedding expenses ($85,000). Recommend ' +
        'scenario analysis showing impact of: (a) reducing discretionary spending by 10%, (b) part-time ' +
        'consulting income, (c) downsizing primary residence.',
      factors: { aum: 55, urgency: 70, daysSinceContact: 15, complexity: 65, revenueOpportunity: 40, churnRisk: 50 },
      category: 'PLANNING',
      dueDate: inTwoDays.toISOString().split('T')[0],
      clientName: 'Katherine & Steven Brooks',
      clientId: `client-${advisorId}-007`,
    },
    {
      title: 'Client birthday approaching — Elizabeth Warren-Hughes',
      description:
        'Elizabeth Warren-Hughes turns 70 on March 15. She is a top-tier client ($5.8M AUM) and a strong ' +
        'referral source (3 introductions in the past year, 2 converted). Send personalized birthday card ' +
        'and consider a small gift. Her 70th birthday also triggers: review of estate plan (last updated 4 ' +
        'years ago), beneficiary designation audit, and charitable giving strategy discussion (she expressed ' +
        'interest in establishing a donor-advised fund).',
      factors: { aum: 95, urgency: 35, daysSinceContact: 25, complexity: 15, revenueOpportunity: 30, churnRisk: 5 },
      category: 'ENGAGEMENT',
      dueDate: nextWeek.toISOString().split('T')[0],
      clientName: 'Elizabeth Warren-Hughes',
      clientId: `client-${advisorId}-008`,
    },
    {
      title: 'Tax loss harvesting opportunity — Nguyen Joint Account',
      description:
        'The Nguyen joint taxable account ($890,000) has $32,400 in unrealized losses across 3 positions: ' +
        'VXUS (-$14,200), EEM (-$11,800), and individual bond position (-$6,400). Year-to-date realized ' +
        'gains: $28,700. Harvesting all three would offset gains and provide $3,700 in additional ' +
        'deduction against ordinary income. Wash sale risk: check for VXUS holdings in IRA. Replace with ' +
        'IXUS and IEMG to maintain exposure while respecting 30-day rule.',
      factors: { aum: 40, urgency: 55, daysSinceContact: 10, complexity: 60, revenueOpportunity: 35, churnRisk: 10 },
      category: 'COMPLIANCE',
      dueDate: inFiveDays.toISOString().split('T')[0],
      clientName: 'David & Mai Nguyen',
      clientId: `client-${advisorId}-009`,
    },
    {
      title: 'Estate plan missing for high-net-worth — Richard Blackwell III',
      description:
        'Richard Blackwell III ($8.2M AUM, $12.4M net worth) has no estate plan on file. He is 71 years ' +
        'old with a blended family (3 children from first marriage, 2 stepchildren). Current beneficiary ' +
        'designations may conflict with verbal wishes expressed in last meeting. Federal estate tax ' +
        'exposure estimated at $1.8M under current exemption levels. Recommend urgent meeting to discuss: ' +
        'revocable living trust, irrevocable life insurance trust (ILIT), generation-skipping trust for ' +
        'grandchildren, and charitable remainder trust for appreciated real estate holdings.',
      factors: { aum: 95, urgency: 75, daysSinceContact: 40, complexity: 80, revenueOpportunity: 70, churnRisk: 25 },
      category: 'PLANNING',
      dueDate: tomorrow.toISOString().split('T')[0],
      clientName: 'Richard Blackwell III',
      clientId: `client-${advisorId}-010`,
    },
    {
      title: 'Portfolio rebalance proposal ready — Tanaka Family',
      description:
        'Rebalancing proposal for the Tanaka Family ($2.3M AUM) has been generated and is awaiting advisor ' +
        'review before sending to client. Proposed changes: reduce US large-cap by 8%, increase international ' +
        'developed by 5%, add 3% allocation to TIPS for inflation protection. Estimated transaction costs: ' +
        '$340. Tax impact: $2,100 in short-term gains (offset by existing losses). The Tanakas prefer email ' +
        'communication — attach one-page summary with before/after allocation pie charts.',
      factors: { aum: 60, urgency: 45, daysSinceContact: 12, complexity: 40, revenueOpportunity: 35, churnRisk: 10 },
      category: 'PLANNING',
      dueDate: inThreeDays.toISOString().split('T')[0],
      clientName: 'Tanaka Family',
      clientId: `client-${advisorId}-011`,
    },
    {
      title: 'Retention risk — Sandra & Mark Fischer',
      description:
        'The Fischers ($1.5M AUM) have shown multiple churn signals: decreased login frequency (down 70% ' +
        'in past 90 days), missed last two scheduled calls, and Sandra requested a complete portfolio ' +
        'performance report going back 5 years. These patterns historically correlate with 65% attrition ' +
        'probability within 90 days. Annual revenue at risk: $12,750. Recommend proactive outreach with ' +
        'value-add: complimentary comprehensive financial plan review, updated retirement projection, and ' +
        'fee transparency report showing total cost vs. industry benchmarks.',
      factors: { aum: 55, urgency: 80, daysSinceContact: 35, complexity: 35, revenueOpportunity: 55, churnRisk: 90 },
      category: 'URGENT',
      dueDate: today.toISOString().split('T')[0],
      clientName: 'Sandra & Mark Fischer',
      clientId: `client-${advisorId}-012`,
    },
  ];

  // Add a few more per advisor to reach 13-15 range based on advisor index
  const advisorSuffix = advisorId.slice(-1);
  if (advisorSuffix === '1' || advisorSuffix === '3' || advisorSuffix === '5') {
    templates.push({
      title: 'Compliance review needed — quarterly billing audit',
      description:
        'Quarterly fee billing audit is due for 12 accounts. Two accounts flagged for review: ' +
        'the Morrison account shows a $230 billing discrepancy (charged advisory fee on held-away ' +
        'assets not under management), and the Blackwell account has a pending fee schedule change ' +
        'from 85bps to 75bps effective next quarter that needs to be configured in the billing system. ' +
        'Complete review and submit to compliance officer by end of week.',
      factors: { aum: 30, urgency: 50, daysSinceContact: 0, complexity: 45, revenueOpportunity: 20, churnRisk: 5 },
      category: 'COMPLIANCE',
      dueDate: inFiveDays.toISOString().split('T')[0],
      clientName: 'Multiple Clients',
      clientId: `client-${advisorId}-013`,
    });
  }

  if (advisorSuffix === '2' || advisorSuffix === '4') {
    templates.push(
      {
        title: 'New client onboarding — Dr. Rebecca Torres',
        description:
          'Dr. Torres signed the advisory agreement last week. Assets in transit: $1.2M from Vanguard ' +
          'and $450,000 from a former employer 401(k). Complete onboarding checklist: verify beneficiary ' +
          'designations, collect trust documents, set up systematic contributions ($5,000/month), and ' +
          'schedule initial investment policy discussion. Target: complete onboarding within 10 business days.',
        factors: { aum: 55, urgency: 60, daysSinceContact: 3, complexity: 50, revenueOpportunity: 65, churnRisk: 5 },
        category: 'ENGAGEMENT',
        dueDate: inTwoDays.toISOString().split('T')[0],
        clientName: 'Dr. Rebecca Torres',
        clientId: `client-${advisorId}-014`,
      },
      {
        title: 'Beneficiary update needed — Corporate 401(k) rollover accounts',
        description:
          'Three clients who recently rolled over 401(k) assets still have former employer plans listed ' +
          'as beneficiary on rollover IRA accounts: Johnson ($340,000), Kim ($215,000), and Rossi ($178,000). ' +
          'Total at risk: $733,000. This is a compliance and fiduciary issue — beneficiary designations ' +
          'must match estate planning documents. Send beneficiary change forms to each client with ' +
          'pre-populated data from their estate plans on file.',
        factors: { aum: 45, urgency: 65, daysSinceContact: 8, complexity: 30, revenueOpportunity: 20, churnRisk: 15 },
        category: 'COMPLIANCE',
        dueDate: inThreeDays.toISOString().split('T')[0],
        clientName: 'Multiple Clients',
        clientId: `client-${advisorId}-015`,
      },
    );
  }

  return templates;
}

// =============================================================================
// Action Generation
// =============================================================================

/**
 * Generates a daily prioritized action list for the given advisor.
 *
 * Produces 10-15 realistic daily actions, each scored using the weighted
 * priority algorithm. Actions are sorted by priority score (highest first)
 * and include category counts and a personalized greeting.
 *
 * @param advisorId - Branded AdvisorId for the requesting advisor
 * @param firmId - Branded FirmId for the advisor's firm
 * @returns A complete DailyActionList with greeting, sorted items, and stats
 */
export function generateDailyActions(
  advisorId: AdvisorId,
  _firmId: FirmId,
): DailyActionList {
  const advisorName = ADVISOR_NAMES[advisorId as string] ?? 'Advisor';
  const templates = buildActionTemplates(advisorId as string);

  // Clear any existing actions for this advisor
  for (const [id] of actionStore.entries()) {
    if (id.startsWith(`action-${advisorId as string}`)) {
      actionStore.delete(id);
    }
  }

  // Helper to build priority factors from template factors
  function buildPriorityFactors(factors: ActionTemplate['factors']): string[] {
    const result: string[] = [];
    if (factors.churnRisk >= 70) result.push('High churn risk');
    if (factors.urgency >= 80) result.push('Time-sensitive');
    if (factors.aum >= 80) result.push('High-AUM household');
    if (factors.daysSinceContact >= 60) result.push('Extended period without contact');
    if (factors.revenueOpportunity >= 70) result.push('Significant revenue opportunity');
    if (factors.complexity >= 60) result.push('Complex planning needs');
    if (result.length === 0) result.push('Routine follow-up');
    return result;
  }

  // Helper to build action buttons based on category
  function buildActions(category: ActionCategory): Array<{ label: string; actionType: DailyActionType }> {
    switch (category) {
      case 'URGENT':
        return [
          { label: 'Call Client', actionType: 'CALL' },
          { label: 'Send Email', actionType: 'EMAIL' },
          { label: 'Mark Complete', actionType: 'MARK_COMPLETE' },
        ];
      case 'COMPLIANCE':
        return [
          { label: 'Open Module', actionType: 'OPEN_MODULE' },
          { label: 'Schedule Review', actionType: 'SCHEDULE' },
          { label: 'Mark Complete', actionType: 'MARK_COMPLETE' },
        ];
      case 'PLANNING':
        return [
          { label: 'Open Module', actionType: 'OPEN_MODULE' },
          { label: 'Call Client', actionType: 'CALL' },
          { label: 'Mark Complete', actionType: 'MARK_COMPLETE' },
        ];
      case 'ENGAGEMENT':
        return [
          { label: 'Call Client', actionType: 'CALL' },
          { label: 'Send Email', actionType: 'EMAIL' },
          { label: 'Schedule Meeting', actionType: 'SCHEDULE' },
          { label: 'Mark Complete', actionType: 'MARK_COMPLETE' },
        ];
      default:
        return [
          { label: 'View Details', actionType: 'VIEW' },
          { label: 'Mark Complete', actionType: 'MARK_COMPLETE' },
        ];
    }
  }

  // Generate action items from templates
  const items: DailyActionItem[] = templates.map((template, index) => {
    const score = computePriorityScore(template.factors);
    const urgency = classifyUrgency(score);
    const actionId = `action-${advisorId}-${String(index + 1).padStart(3, '0')}`;

    // Estimate AUM from the aum factor (scaled)
    const estimatedAum = Math.round(template.factors.aum * 50_000);

    const item: DailyActionItem = {
      id: actionId,
      householdId: template.clientId,
      householdName: template.clientName,
      aum: estimatedAum,
      urgency,
      category: template.category,
      title: template.title,
      description: template.description,
      actions: buildActions(template.category),
      priorityScore: score,
      priorityFactors: buildPriorityFactors(template.factors),
    };

    actionStore.set(actionId, item);
    return item;
  });

  // Sort by priority score descending
  items.sort((a, b) => b.priorityScore - a.priorityScore);

  // Compute category counts (must be Record<ActionCategory, number>)
  const categoryCounts: Record<ActionCategory, number> = {
    ALL: items.length,
    URGENT: 0,
    PLANNING: 0,
    ENGAGEMENT: 0,
    COMPLIANCE: 0,
  };
  for (const item of items) {
    if (item.category !== 'ALL') {
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
    }
  }

  // Count high-priority actions (URGENT + HIGH)
  const highPriorityCount = items.filter(
    (item) => item.urgency === 'URGENT' || item.urgency === 'HIGH',
  ).length;

  // Build greeting
  const hour = new Date().getHours();
  let timeOfDay = 'morning';
  if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  if (hour >= 17) timeOfDay = 'evening';

  const greeting =
    `Good ${timeOfDay}, ${advisorName}. You have ${highPriorityCount} high-priority ` +
    `action${highPriorityCount !== 1 ? 's' : ''} today.`;

  return {
    advisorId,
    advisorName,
    greeting,
    items,
    categoryCounts,
  };
}

// =============================================================================
// Action Status Tracking (separate from the canonical DailyActionItem shape)
// =============================================================================

type InternalActionStatus = 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'DISMISSED';

/** Side-car tracking for action lifecycle (not part of canonical DailyActionItem). */
const actionStatusStore: Map<string, {
  status: InternalActionStatus;
  completedAt: string | null;
  snoozedUntil: string | null;
  updatedAt: string;
}> = new Map();

// =============================================================================
// Action Management
// =============================================================================

/**
 * Marks a daily action as completed by its ID.
 *
 * Throws if the action ID is not found.
 *
 * @param actionId - The unique ID of the action to complete
 * @throws Error if action ID is not found in the store
 */
export function completeAction(actionId: string): void {
  const action = actionStore.get(actionId);
  if (!action) {
    throw new Error(`Action not found: ${actionId}`);
  }
  actionStatusStore.set(actionId, {
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
    snoozedUntil: null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Snoozes a daily action for a given number of hours.
 *
 * @param actionId - The unique ID of the action to snooze
 * @param hours - Number of hours to snooze the action (must be > 0)
 * @throws Error if action ID is not found in the store
 * @throws Error if hours is not a positive number
 */
export function snoozeAction(actionId: string, hours: number): void {
  if (hours <= 0) {
    throw new Error('Snooze hours must be a positive number');
  }

  const action = actionStore.get(actionId);
  if (!action) {
    throw new Error(`Action not found: ${actionId}`);
  }

  const snoozedUntil = new Date();
  snoozedUntil.setTime(snoozedUntil.getTime() + hours * 60 * 60 * 1000);

  actionStatusStore.set(actionId, {
    status: 'SNOOZED',
    completedAt: null,
    snoozedUntil: snoozedUntil.toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// =============================================================================
// Action Queries
// =============================================================================

/**
 * Retrieves a single action by its ID.
 *
 * @param actionId - The unique action identifier
 * @returns The action item, or null if not found
 */
export function getAction(actionId: string): DailyActionItem | null {
  return actionStore.get(actionId) ?? null;
}

/**
 * Returns all actions for a given advisor, optionally filtered by status.
 *
 * @param advisorId - The advisor ID to filter by
 * @param status - Optional internal status filter
 * @returns Array of matching action items sorted by priority score descending
 */
export function getActionsForAdvisor(
  advisorId: AdvisorId,
  status?: InternalActionStatus,
): DailyActionItem[] {
  const results: DailyActionItem[] = [];
  const prefix = `action-${advisorId as string}`;

  for (const [id, action] of actionStore.entries()) {
    if (!id.startsWith(prefix)) continue;
    if (status) {
      const tracked = actionStatusStore.get(id);
      const currentStatus = tracked?.status ?? 'PENDING';
      if (currentStatus !== status) continue;
    }
    results.push(action);
  }

  results.sort((a, b) => b.priorityScore - a.priorityScore);
  return results;
}

/**
 * Returns all actions for a given firm, useful for MD/Principal dashboards.
 * In the demo implementation, returns all actions in the store since
 * all demo data belongs to a single firm.
 *
 * @param _firmId - The firm ID to filter by
 * @returns Array of all action items across all advisors in the firm
 */
export function getActionsForFirm(_firmId: FirmId): DailyActionItem[] {
  const results: DailyActionItem[] = Array.from(actionStore.values());
  results.sort((a, b) => b.priorityScore - a.priorityScore);
  return results;
}

/**
 * Dismisses a daily action, removing it from the active list.
 *
 * @param actionId - The unique ID of the action to dismiss
 * @throws Error if action ID is not found in the store
 */
export function dismissAction(actionId: string): void {
  const action = actionStore.get(actionId);
  if (!action) {
    throw new Error(`Action not found: ${actionId}`);
  }
  actionStatusStore.set(actionId, {
    status: 'DISMISSED',
    completedAt: null,
    snoozedUntil: null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Returns summary statistics for all actions belonging to an advisor.
 *
 * @param advisorId - The advisor ID
 * @returns Object with total, completed, pending, snoozed, and dismissed counts
 */
export function getActionSummary(advisorId: AdvisorId): {
  total: number;
  completed: number;
  pending: number;
  snoozed: number;
  dismissed: number;
  byCategory: Record<string, number>;
  byUrgency: Record<string, number>;
} {
  let total = 0;
  let completed = 0;
  let pending = 0;
  let snoozed = 0;
  let dismissed = 0;
  const byCategory: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};
  const prefix = `action-${advisorId as string}`;

  for (const [id, action] of actionStore.entries()) {
    if (!id.startsWith(prefix)) continue;
    total++;
    const tracked = actionStatusStore.get(id);
    const currentStatus = tracked?.status ?? 'PENDING';
    if (currentStatus === 'COMPLETED') completed++;
    if (currentStatus === 'PENDING') pending++;
    if (currentStatus === 'SNOOZED') snoozed++;
    if (currentStatus === 'DISMISSED') dismissed++;
    byCategory[action.category] = (byCategory[action.category] ?? 0) + 1;
    byUrgency[action.urgency] = (byUrgency[action.urgency] ?? 0) + 1;
  }

  return { total, completed, pending, snoozed, dismissed, byCategory, byUrgency };
}

/**
 * Clears all actions from the in-memory store. Used primarily for testing.
 */
export function clearActionStore(): void {
  actionStore.clear();
  actionStatusStore.clear();
}
