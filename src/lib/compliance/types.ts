// =============================================================================
// Compliance Layer — Type Definitions
// =============================================================================

// ==================== Reg BI Documentation ====================

/**
 * A single recommendation made under Regulation Best Interest.
 * Contains the basis for the recommendation, alternatives considered,
 * costs, conflicts, and the benefit to the client.
 */
export interface RegBIRecommendation {
  /** Category of recommendation (e.g. 'asset_allocation', 'tax_strategy', 'insurance'). */
  type: string;
  /** Human-readable description of the recommendation. */
  description: string;
  /** The reasonable basis for making this recommendation. */
  reasonableBasis: string;
  /** Alternatives that were considered before arriving at this recommendation. */
  alternativesConsidered: string[];
  /** Costs and fees associated with the recommendation. */
  costsAndFees: string;
  /** Any conflicts of interest relevant to this recommendation. */
  conflictsOfInterest: string;
  /** Description of how this recommendation benefits the client. */
  clientBenefit: string;
}

/**
 * Complete Reg BI documentation package for a financial plan.
 * Captures advisor disclosures, client profile, recommendations,
 * and conflict acknowledgments required by SEC Regulation Best Interest.
 */
export interface RegBIDocumentation {
  /** The financial plan this documentation is associated with. */
  planId: string;
  /** Date the documentation was generated. */
  documentationDate: Date;
  /** Advisor who created the documentation. */
  advisorId: string;
  /** Client for whom the documentation was prepared. */
  clientId: string;
  /** Snapshot of the client profile at the time of documentation. */
  clientProfile: {
    name: string;
    age: number;
    riskTolerance: string;
    investmentObjective: string;
    timeHorizon: string;
    liquidityNeeds: string;
    financialSituation: string;
    taxStatus: string;
    otherInvestments: string;
  };
  /** List of recommendations made under this plan. */
  recommendations: RegBIRecommendation[];
  /** Whether all material conflicts of interest were disclosed. */
  conflictsDisclosed: boolean;
  /** Description of each conflict disclosed, if any. */
  conflictDetails: string[];
  /** ISO timestamp when the client acknowledged the disclosure. Null if not yet acknowledged. */
  clientAcknowledgedAt: Date | null;
  /** How the documentation was delivered to the client. */
  deliveryMethod: 'email' | 'portal' | 'mail' | 'in_person';
  /** Whether the document is locked (immutable). */
  locked: boolean;
  /** SHA-256 hash of the document contents when locked. Null if not locked. */
  lockHash: string | null;
}

// ==================== Audit Entry ====================

/** The type of actor that performed an auditable action. */
export type ActorType = 'advisor' | 'client' | 'system' | 'admin';

/** The category of resource being acted upon. */
export type ResourceType =
  | 'plan'
  | 'client'
  | 'account'
  | 'goal'
  | 'report'
  | 'workflow'
  | 'firm'
  | 'advisor'
  | 'document'
  | 'settings';

/**
 * A single immutable audit log entry capturing who did what, when,
 * and to which resource.
 */
export interface AuditEntry {
  /** Unique identifier for this audit entry. */
  id: string;
  /** When the action occurred. */
  timestamp: Date;
  /** Type of actor (advisor, client, system, admin). */
  actorType: ActorType;
  /** Unique identifier of the actor. */
  actorId: string;
  /** Display name of the actor. */
  actorName: string;
  /** IP address from which the action was performed. */
  ipAddress: string;
  /** User agent string of the actor's browser or client. */
  userAgent: string;
  /** The action that was performed. */
  action: string;
  /** The type of resource that was acted upon. */
  resourceType: ResourceType;
  /** The unique identifier of the resource that was acted upon. */
  resourceId: string;
  /** State of the resource before the action. Null for create actions. */
  beforeState: Record<string, unknown> | null;
  /** State of the resource after the action. Null for delete actions. */
  afterState: Record<string, unknown> | null;
  /** Financial plan associated with this action, if applicable. */
  planId: string | null;
  /** Client associated with this action, if applicable. */
  clientId: string | null;
  /** Firm under which this action was performed. */
  firmId: string;
  /** Session identifier for grouping related actions. */
  sessionId: string;
}

// ==================== Compliance Report ====================

/**
 * A generated compliance report summarizing all auditable actions
 * within a firm over a given period.
 */
export interface ComplianceReport {
  /** The firm this report covers. */
  firmId: string;
  /** The time period covered by this report. */
  period: { start: Date; end: Date };
  /** Total number of actions in the period. */
  totalActions: number;
  /** Number of actions performed by advisors. */
  advisorActions: number;
  /** Number of actions performed by clients. */
  clientActions: number;
  /** Number of actions performed by the system. */
  systemActions: number;
  /** Recommendations generated during the period, grouped by type. */
  recommendations: { type: string; count: number }[];
  /** Compliance alerts raised during the period. */
  alerts: ComplianceAlert[];
}

/**
 * A compliance alert raised during report generation.
 */
export interface ComplianceAlert {
  /** Severity of the alert. */
  severity: 'info' | 'warning' | 'critical';
  /** Human-readable message describing the alert. */
  message: string;
  /** The resource types implicated, if any. */
  resourceType: ResourceType | null;
  /** Number of occurrences. */
  count: number;
}

// ==================== Data Retention ====================

/** The action to take when a record exceeds its retention period. */
export type RetentionAction = 'archive' | 'anonymize' | 'delete';

/**
 * Defines how long records of a given resource type should be retained,
 * and what action to take when the retention period expires.
 */
export interface DataRetentionPolicy {
  /** The type of resource this policy applies to. */
  resourceType: string;
  /** Number of days to retain records of this type. */
  retentionDays: number;
  /** What to do with the record after the retention period. */
  action: RetentionAction;
}

// ==================== Supporting Types for Functions ====================

/**
 * Input to the Reg BI document generator. Contains plan data,
 * advisor information, and optional insights from the AI engine.
 */
export interface RegBIInput {
  planId: string;
  advisorId: string;
  advisorName: string;
  clientId: string;
  clientName: string;
  clientAge: number;
  riskTolerance: string;
  investmentObjective: string;
  timeHorizon: string;
  liquidityNeeds: string;
  financialSituation: string;
  taxStatus: string;
  otherInvestments: string;
  /** Array of insight objects from the planning engine. */
  insights: PlanInsight[];
  /** Material conflicts of interest to disclose. */
  conflicts: string[];
  /** How the document will be delivered. */
  deliveryMethod: 'email' | 'portal' | 'mail' | 'in_person';
}

/**
 * A planning insight generated by the calculation or AI engine
 * that can be converted into a Reg BI recommendation.
 */
export interface PlanInsight {
  type: string;
  title: string;
  description: string;
  rationale: string;
  impact: string;
  alternatives: string[];
  costs: string;
  conflicts: string;
  benefit: string;
}

/**
 * Input for creating a new audit log entry.
 */
export interface CreateAuditInput {
  actorType: ActorType;
  actorId: string;
  actorName: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resourceType: ResourceType;
  resourceId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  planId?: string | null;
  clientId?: string | null;
  firmId: string;
  sessionId?: string;
}

/**
 * Filters for querying the audit log.
 */
export interface AuditFilters {
  actorId?: string;
  actorType?: ActorType;
  resourceType?: ResourceType;
  resourceId?: string;
  action?: string;
  firmId?: string;
  planId?: string;
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
}

/**
 * Aggregate summary statistics for a set of audit entries.
 */
export interface AuditSummary {
  totalActions: number;
  byActorType: Record<string, number>;
  byAction: Record<string, number>;
  byResourceType: Record<string, number>;
  uniqueActors: number;
  uniqueSessions: number;
  firstEntry: Date | null;
  lastEntry: Date | null;
}

/**
 * A record that is subject to retention policies.
 */
export interface RetentionRecord {
  id: string;
  resourceType: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * A record that has been identified as expired by the retention engine.
 */
export interface ExpiredRecord {
  record: RetentionRecord;
  policy: DataRetentionPolicy;
  expiredAt: Date;
  daysPastExpiry: number;
}
