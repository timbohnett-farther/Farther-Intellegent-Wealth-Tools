// =============================================================================
// Tax Planning Platform — In-Memory Data Store (Stage 1)
// =============================================================================
//
// Simple in-memory store keyed by entity type. Provides CRUD operations for all
// entity types. In Stage 2 this will be replaced by a database-backed repository
// layer (e.g. Prisma / Drizzle).
//
// The singleton `store` is auto-seeded on import with realistic demo data.
// =============================================================================

import type {
  Firm,
  User,
  Household,
  Person,
  ReturnDocument,
  ExtractedField,
  TaxReturn,
  Scenario,
  ScenarioOverride,
  CalcRun,
  CalcLine,
  MoneyCents,
  TaxYear,
  TaxLineRef,
} from './types';
import type { CopilotAnswer } from './copilot/types';
import type { Deliverable, DeliverableExport } from './deliverables/types';
import type {
  WorkflowTask,
  WorkflowRun,
  RecommendationExecutionStatus,
  CRMSyncPayload,
  CPACoordinationRequest,
  ReminderRecord,
  EscalationRecord,
} from './workflow/types';
import type {
  PlatformRole,
  PermissionPolicy,
  AccessScope,
  ApprovalPolicy,
  AIGovernancePolicy,
  TemplateGovernanceRecord,
  AdminSetting,
  ReviewQueueItem,
  GovernanceAuditEvent,
  FeatureFlag,
} from './governance/types';
import type {
  MetricDefinition,
  KPIValue,
  ValueAttribution,
} from './analytics/types';
import type {
  RolloverPlan,
  RolloverAnalysis,
  RolloverScore,
  BenchmarkEntry,
  NarrativeOutput,
  RolloverReport,
  ScrapeJob,
  HubSpotDealSync,
} from '../rollover-engine/types';

// ==================== Deep Clone Helper ====================

/**
 * Returns a deep clone of a value so callers never hold a reference
 * to the internal store objects.
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ==================== TaxPlanningStore ====================

class TaxPlanningStore {
  private firmsMap: Map<string, Firm> = new Map();
  private usersMap: Map<string, User> = new Map();
  private householdsMap: Map<string, Household> = new Map();
  private personsMap: Map<string, Person> = new Map();
  private documentsMap: Map<string, ReturnDocument> = new Map();
  private extractedFieldsMap: Map<string, ExtractedField> = new Map();
  private taxReturnsMap: Map<string, TaxReturn> = new Map();
  private scenariosMap: Map<string, Scenario> = new Map();
  private overridesMap: Map<string, ScenarioOverride> = new Map();
  private calcRunsMap: Map<string, CalcRun> = new Map();
  private calcLinesMap: Map<string, CalcLine> = new Map();
  private copilotAnswersMap: Map<string, CopilotAnswer> = new Map();
  private deliverablesMap: Map<string, Deliverable> = new Map();
  private deliverableExportsMap: Map<string, DeliverableExport> = new Map();
  private workflowTasksMap: Map<string, WorkflowTask> = new Map();
  private workflowRunsMap: Map<string, WorkflowRun> = new Map();
  private recommendationStatusesMap: Map<string, RecommendationExecutionStatus> = new Map();
  private crmSyncPayloadsMap: Map<string, CRMSyncPayload> = new Map();
  private cpaRequestsMap: Map<string, CPACoordinationRequest> = new Map();
  private reminderRecordsMap: Map<string, ReminderRecord> = new Map();
  private escalationRecordsMap: Map<string, EscalationRecord> = new Map();
  private platformRoles: Map<string, PlatformRole> = new Map();
  private permissionPolicies: Map<string, PermissionPolicy> = new Map();
  private accessScopes: Map<string, AccessScope> = new Map();
  private approvalPolicies: Map<string, ApprovalPolicy> = new Map();
  private aiGovernancePolicies: Map<string, AIGovernancePolicy> = new Map();
  private templateGovernanceRecords: Map<string, TemplateGovernanceRecord> = new Map();
  private adminSettings: Map<string, AdminSetting> = new Map();
  private reviewQueueItems: Map<string, ReviewQueueItem> = new Map();
  private governanceAuditEvents: Map<string, GovernanceAuditEvent> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private kpiValues: Map<string, KPIValue> = new Map();
  private valueAttributionsMap: Map<string, ValueAttribution> = new Map();

  // Rollover Engine Maps
  private rolloverPlansMap: Map<string, RolloverPlan> = new Map();
  private rolloverAnalysesMap: Map<string, RolloverAnalysis> = new Map();
  private rolloverScoresMap: Map<string, RolloverScore> = new Map();
  private rolloverBenchmarksMap: Map<string, BenchmarkEntry> = new Map();
  private rolloverNarrativesMap: Map<string, NarrativeOutput> = new Map();
  private rolloverReportsMap: Map<string, RolloverReport> = new Map();
  private rolloverScrapeJobsMap: Map<string, ScrapeJob> = new Map();
  private rolloverHubSpotSyncsMap: Map<string, HubSpotDealSync> = new Map();

  // ==================================================================
  // Firm CRUD
  // ==================================================================

  getFirm(firmId: string): Firm | undefined {
    const firm = this.firmsMap.get(firmId);
    return firm ? clone(firm) : undefined;
  }

  listFirms(): Firm[] {
    return clone(Array.from(this.firmsMap.values()));
  }

  upsertFirm(firm: Firm): Firm {
    this.firmsMap.set(firm.firm_id, clone(firm));
    return clone(firm);
  }

  // ==================================================================
  // User CRUD
  // ==================================================================

  getUser(userId: string): User | undefined {
    const user = this.usersMap.get(userId);
    return user ? clone(user) : undefined;
  }

  getUserByEmail(email: string): User | undefined {
    for (const user of this.usersMap.values()) {
      if (user.email === email.toLowerCase()) {
        return clone(user);
      }
    }
    return undefined;
  }

  listUsers(firmId?: string): User[] {
    let result = Array.from(this.usersMap.values());
    if (firmId) {
      result = result.filter((u) => u.firm_id === firmId);
    }
    return clone(result);
  }

  upsertUser(user: User): User {
    this.usersMap.set(user.user_id, clone(user));
    return clone(user);
  }

  // ==================================================================
  // Household CRUD
  // ==================================================================

  getHousehold(householdId: string): Household | undefined {
    const hh = this.householdsMap.get(householdId);
    return hh ? clone(hh) : undefined;
  }

  listHouseholds(filters?: {
    firmId?: string;
    q?: string;
  }): Household[] {
    let result = Array.from(this.householdsMap.values());
    if (filters?.firmId) {
      result = result.filter((h) => h.firm_id === filters.firmId);
    }
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      result = result.filter((h) =>
        h.display_name.toLowerCase().includes(query)
      );
    }
    return clone(result);
  }

  upsertHousehold(household: Household): Household {
    this.householdsMap.set(household.household_id, clone(household));
    return clone(household);
  }

  deleteHousehold(householdId: string): boolean {
    return this.householdsMap.delete(householdId);
  }

  // ==================================================================
  // Person CRUD
  // ==================================================================

  getPerson(personId: string): Person | undefined {
    const p = this.personsMap.get(personId);
    return p ? clone(p) : undefined;
  }

  listPersons(householdId?: string): Person[] {
    let result = Array.from(this.personsMap.values());
    if (householdId) {
      result = result.filter((p) => p.household_id === householdId);
    }
    return clone(result);
  }

  upsertPerson(person: Person): Person {
    this.personsMap.set(person.person_id, clone(person));
    return clone(person);
  }

  // ==================================================================
  // ReturnDocument CRUD
  // ==================================================================

  getDocument(docId: string): ReturnDocument | undefined {
    const doc = this.documentsMap.get(docId);
    return doc ? clone(doc) : undefined;
  }

  listDocuments(householdId?: string): ReturnDocument[] {
    let result = Array.from(this.documentsMap.values());
    if (householdId) {
      result = result.filter((d) => d.household_id === householdId);
    }
    return clone(result);
  }

  upsertDocument(doc: ReturnDocument): ReturnDocument {
    this.documentsMap.set(doc.doc_id, clone(doc));
    return clone(doc);
  }

  // ==================================================================
  // ExtractedField CRUD
  // ==================================================================

  getExtractedField(fieldId: string): ExtractedField | undefined {
    const f = this.extractedFieldsMap.get(fieldId);
    return f ? clone(f) : undefined;
  }

  listExtractedFields(docId?: string): ExtractedField[] {
    let result = Array.from(this.extractedFieldsMap.values());
    if (docId) {
      result = result.filter((f) => f.doc_id === docId);
    }
    return clone(result);
  }

  /**
   * List extracted fields for a given tax return by finding all documents
   * that belong to the return's household + tax year combination.
   */
  listExtractedFieldsByReturn(returnId: string): ExtractedField[] {
    const taxReturn = this.taxReturnsMap.get(returnId);
    if (!taxReturn) return [];

    // Find all documents for this household + tax year
    const docIds: string[] = [];
    for (const doc of this.documentsMap.values()) {
      if (
        doc.household_id === taxReturn.household_id &&
        doc.tax_year === taxReturn.tax_year
      ) {
        docIds.push(doc.doc_id);
      }
    }

    let result: ExtractedField[] = [];
    for (const docId of docIds) {
      const fields = Array.from(this.extractedFieldsMap.values()).filter(
        (f) => f.doc_id === docId
      );
      result = result.concat(fields);
    }
    return clone(result);
  }

  upsertExtractedField(field: ExtractedField): ExtractedField {
    this.extractedFieldsMap.set(field.field_id, clone(field));
    return clone(field);
  }

  // ==================================================================
  // TaxReturn CRUD
  // ==================================================================

  getTaxReturn(returnId: string): TaxReturn | undefined {
    const r = this.taxReturnsMap.get(returnId);
    return r ? clone(r) : undefined;
  }

  listTaxReturns(householdId?: string): TaxReturn[] {
    let result = Array.from(this.taxReturnsMap.values());
    if (householdId) {
      result = result.filter((r) => r.household_id === householdId);
    }
    return clone(result);
  }

  upsertTaxReturn(taxReturn: TaxReturn): TaxReturn {
    this.taxReturnsMap.set(taxReturn.return_id, clone(taxReturn));
    return clone(taxReturn);
  }

  // ==================================================================
  // Scenario CRUD
  // ==================================================================

  getScenario(scenarioId: string): Scenario | undefined {
    const s = this.scenariosMap.get(scenarioId);
    return s ? clone(s) : undefined;
  }

  listScenarios(returnId?: string): Scenario[] {
    let result = Array.from(this.scenariosMap.values());
    if (returnId) {
      result = result.filter((s) => s.return_id === returnId);
    }
    return clone(result);
  }

  upsertScenario(scenario: Scenario): Scenario {
    this.scenariosMap.set(scenario.scenario_id, clone(scenario));
    return clone(scenario);
  }

  // ==================================================================
  // ScenarioOverride CRUD
  // ==================================================================

  getOverride(overrideId: string): ScenarioOverride | undefined {
    const o = this.overridesMap.get(overrideId);
    return o ? clone(o) : undefined;
  }

  listOverrides(scenarioId?: string): ScenarioOverride[] {
    let result = Array.from(this.overridesMap.values());
    if (scenarioId) {
      result = result.filter((o) => o.scenario_id === scenarioId);
    }
    return clone(result);
  }

  upsertOverride(override: ScenarioOverride): ScenarioOverride {
    this.overridesMap.set(override.override_id, clone(override));
    return clone(override);
  }

  deleteOverride(overrideId: string): boolean {
    return this.overridesMap.delete(overrideId);
  }

  // ==================================================================
  // CalcRun CRUD
  // ==================================================================

  getCalcRun(calcRunId: string): CalcRun | undefined {
    const r = this.calcRunsMap.get(calcRunId);
    return r ? clone(r) : undefined;
  }

  listCalcRuns(scenarioId?: string): CalcRun[] {
    let result = Array.from(this.calcRunsMap.values());
    if (scenarioId) {
      result = result.filter((r) => r.scenario_id === scenarioId);
    }
    return clone(result);
  }

  upsertCalcRun(calcRun: CalcRun): CalcRun {
    this.calcRunsMap.set(calcRun.calc_run_id, clone(calcRun));
    return clone(calcRun);
  }

  // ==================================================================
  // CalcLine CRUD
  // ==================================================================

  getCalcLine(calcLineId: string): CalcLine | undefined {
    const l = this.calcLinesMap.get(calcLineId);
    return l ? clone(l) : undefined;
  }

  listCalcLines(calcRunId?: string): CalcLine[] {
    let result = Array.from(this.calcLinesMap.values());
    if (calcRunId) {
      result = result.filter((l) => l.calc_run_id === calcRunId);
    }
    return clone(result);
  }

  upsertCalcLine(calcLine: CalcLine): CalcLine {
    this.calcLinesMap.set(calcLine.calc_line_id, clone(calcLine));
    return clone(calcLine);
  }

  // ==================================================================
  // CopilotAnswer CRUD
  // ==================================================================

  getCopilotAnswer(answerId: string): CopilotAnswer | undefined {
    const a = this.copilotAnswersMap.get(answerId);
    return a ? clone(a) : undefined;
  }

  listCopilotAnswers(filters?: {
    householdId?: string;
    promptFamily?: string;
    reviewState?: string;
    limit?: number;
    offset?: number;
  }): { answers: CopilotAnswer[]; total: number } {
    let result = Array.from(this.copilotAnswersMap.values());
    if (filters?.householdId) {
      result = result.filter((a) => a.household_id === filters.householdId);
    }
    if (filters?.promptFamily) {
      result = result.filter((a) => a.prompt_family === filters.promptFamily);
    }
    if (filters?.reviewState) {
      result = result.filter((a) => a.review_state === filters.reviewState);
    }
    // Sort newest first
    result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const total = result.length;
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    const page = result.slice(offset, offset + limit);
    return { answers: clone(page), total };
  }

  upsertCopilotAnswer(answer: CopilotAnswer): CopilotAnswer {
    this.copilotAnswersMap.set(answer.answer_id, clone(answer));
    return clone(answer);
  }

  deleteCopilotAnswer(answerId: string): boolean {
    return this.copilotAnswersMap.delete(answerId);
  }

  // ==================================================================
  // Deliverable CRUD
  // ==================================================================

  getDeliverable(deliverableId: string): Deliverable | undefined {
    const d = this.deliverablesMap.get(deliverableId);
    return d ? clone(d) : undefined;
  }

  listDeliverables(filters?: {
    householdId?: string;
    taxYear?: number;
    deliverableType?: string;
    status?: string;
    audienceMode?: string;
    limit?: number;
    offset?: number;
  }): { deliverables: Deliverable[]; total: number } {
    let result = Array.from(this.deliverablesMap.values());
    if (filters?.householdId) {
      result = result.filter((d) => d.householdId === filters.householdId);
    }
    if (filters?.taxYear) {
      result = result.filter((d) => d.taxYear === filters.taxYear);
    }
    if (filters?.deliverableType) {
      result = result.filter((d) => d.deliverableType === filters.deliverableType);
    }
    if (filters?.status) {
      result = result.filter((d) => d.status === filters.status);
    }
    if (filters?.audienceMode) {
      result = result.filter((d) => d.audienceMode === filters.audienceMode);
    }
    // Sort newest first
    result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = result.length;
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    const page = result.slice(offset, offset + limit);
    return { deliverables: clone(page), total };
  }

  upsertDeliverable(deliverable: Deliverable): Deliverable {
    this.deliverablesMap.set(deliverable.deliverableId, clone(deliverable));
    return clone(deliverable);
  }

  deleteDeliverable(deliverableId: string): boolean {
    return this.deliverablesMap.delete(deliverableId);
  }

  // ==================================================================
  // DeliverableExport CRUD
  // ==================================================================

  getDeliverableExport(exportId: string): DeliverableExport | undefined {
    const e = this.deliverableExportsMap.get(exportId);
    return e ? clone(e) : undefined;
  }

  listDeliverableExports(deliverableId?: string): DeliverableExport[] {
    let result = Array.from(this.deliverableExportsMap.values());
    if (deliverableId) {
      result = result.filter((e) => e.deliverableId === deliverableId);
    }
    // Sort newest first
    result.sort(
      (a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime(),
    );
    return clone(result);
  }

  upsertDeliverableExport(deliverableExport: DeliverableExport): DeliverableExport {
    this.deliverableExportsMap.set(deliverableExport.exportId, clone(deliverableExport));
    return clone(deliverableExport);
  }

  // ==================================================================
  // WorkflowTask CRUD
  // ==================================================================

  getWorkflowTask(taskId: string): WorkflowTask | undefined {
    const t = this.workflowTasksMap.get(taskId);
    return t ? clone(t) : undefined;
  }

  listWorkflowTasks(filters?: {
    householdId?: string;
    taxYear?: number;
    workflowRunId?: string;
    status?: string;
    taskType?: string;
    ownerUserId?: string;
  }): WorkflowTask[] {
    let result = Array.from(this.workflowTasksMap.values());
    if (filters?.householdId) {
      result = result.filter((t) => t.householdId === filters.householdId);
    }
    if (filters?.taxYear) {
      result = result.filter((t) => t.taxYear === filters.taxYear);
    }
    if (filters?.workflowRunId) {
      result = result.filter((t) => t.workflowRunId === filters.workflowRunId);
    }
    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters?.taskType) {
      result = result.filter((t) => t.taskType === filters.taskType);
    }
    if (filters?.ownerUserId) {
      result = result.filter((t) => t.ownerUserId === filters.ownerUserId);
    }
    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return clone(result);
  }

  upsertWorkflowTask(task: WorkflowTask): WorkflowTask {
    this.workflowTasksMap.set(task.taskId, clone(task));
    return clone(task);
  }

  // ==================================================================
  // WorkflowRun CRUD
  // ==================================================================

  getWorkflowRun(workflowRunId: string): WorkflowRun | undefined {
    const w = this.workflowRunsMap.get(workflowRunId);
    return w ? clone(w) : undefined;
  }

  listWorkflowRuns(filters?: {
    householdId?: string;
    taxYear?: number;
    workflowType?: string;
    status?: string;
  }): WorkflowRun[] {
    let result = Array.from(this.workflowRunsMap.values());
    if (filters?.householdId) {
      result = result.filter((w) => w.householdId === filters.householdId);
    }
    if (filters?.taxYear) {
      result = result.filter((w) => w.taxYear === filters.taxYear);
    }
    if (filters?.workflowType) {
      result = result.filter((w) => w.workflowType === filters.workflowType);
    }
    if (filters?.status) {
      result = result.filter((w) => w.status === filters.status);
    }
    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return clone(result);
  }

  upsertWorkflowRun(workflow: WorkflowRun): WorkflowRun {
    this.workflowRunsMap.set(workflow.workflowRunId, clone(workflow));
    return clone(workflow);
  }

  // ==================================================================
  // RecommendationExecutionStatus CRUD
  // ==================================================================

  getRecommendationExecutionStatus(recommendationId: string): RecommendationExecutionStatus | undefined {
    const r = this.recommendationStatusesMap.get(recommendationId);
    return r ? clone(r) : undefined;
  }

  listRecommendationExecutionStatuses(filters?: {
    householdId?: string;
    taxYear?: number;
    status?: string;
  }): RecommendationExecutionStatus[] {
    let result = Array.from(this.recommendationStatusesMap.values());
    if (filters?.householdId) {
      result = result.filter((r) => r.householdId === filters.householdId);
    }
    if (filters?.taxYear) {
      result = result.filter((r) => r.taxYear === filters.taxYear);
    }
    if (filters?.status) {
      result = result.filter((r) => r.status === filters.status);
    }
    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return clone(result);
  }

  upsertRecommendationExecutionStatus(rec: RecommendationExecutionStatus): RecommendationExecutionStatus {
    this.recommendationStatusesMap.set(rec.recommendationId, clone(rec));
    return clone(rec);
  }

  // ==================================================================
  // CRMSyncPayload CRUD
  // ==================================================================

  getCRMSyncPayload(payloadId: string): CRMSyncPayload | undefined {
    const c = this.crmSyncPayloadsMap.get(payloadId);
    return c ? clone(c) : undefined;
  }

  listCRMSyncPayloads(filters?: {
    householdId?: string;
    payloadType?: string;
    syncStatus?: string;
  }): CRMSyncPayload[] {
    let result = Array.from(this.crmSyncPayloadsMap.values());
    if (filters?.householdId) {
      result = result.filter((c) => c.householdId === filters.householdId);
    }
    if (filters?.payloadType) {
      result = result.filter((c) => c.payloadType === filters.payloadType);
    }
    if (filters?.syncStatus) {
      result = result.filter((c) => c.syncStatus === filters.syncStatus);
    }
    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return clone(result);
  }

  upsertCRMSyncPayload(payload: CRMSyncPayload): CRMSyncPayload {
    this.crmSyncPayloadsMap.set(payload.payloadId, clone(payload));
    return clone(payload);
  }

  // ==================================================================
  // CPACoordinationRequest CRUD
  // ==================================================================

  getCPACoordinationRequest(requestId: string): CPACoordinationRequest | undefined {
    const r = this.cpaRequestsMap.get(requestId);
    return r ? clone(r) : undefined;
  }

  listCPACoordinationRequests(filters?: {
    householdId?: string;
    taxYear?: number;
    status?: string;
  }): CPACoordinationRequest[] {
    let result = Array.from(this.cpaRequestsMap.values());
    if (filters?.householdId) {
      result = result.filter((r) => r.householdId === filters.householdId);
    }
    if (filters?.taxYear) {
      result = result.filter((r) => r.taxYear === filters.taxYear);
    }
    if (filters?.status) {
      result = result.filter((r) => r.status === filters.status);
    }
    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return clone(result);
  }

  upsertCPACoordinationRequest(request: CPACoordinationRequest): CPACoordinationRequest {
    this.cpaRequestsMap.set(request.requestId, clone(request));
    return clone(request);
  }

  // ==================================================================
  // ReminderRecord CRUD
  // ==================================================================

  getReminderRecord(reminderId: string): ReminderRecord | undefined {
    const r = this.reminderRecordsMap.get(reminderId);
    return r ? clone(r) : undefined;
  }

  listReminderRecords(): ReminderRecord[] {
    return clone(Array.from(this.reminderRecordsMap.values()));
  }

  upsertReminderRecord(reminder: ReminderRecord): ReminderRecord {
    this.reminderRecordsMap.set(reminder.reminderId, clone(reminder));
    return clone(reminder);
  }

  // ==================================================================
  // EscalationRecord CRUD
  // ==================================================================

  getEscalationRecord(escalationId: string): EscalationRecord | undefined {
    const e = this.escalationRecordsMap.get(escalationId);
    return e ? clone(e) : undefined;
  }

  listEscalationRecords(): EscalationRecord[] {
    return clone(Array.from(this.escalationRecordsMap.values()));
  }

  upsertEscalationRecord(escalation: EscalationRecord): EscalationRecord {
    this.escalationRecordsMap.set(escalation.escalationId, clone(escalation));
    return clone(escalation);
  }

  // ==================================================================
  // Analytics — MetricDefinition CRUD
  // ==================================================================

  getMetricDefinition(metricId: string): MetricDefinition | undefined {
    const m = this.metricDefinitions.get(metricId);
    return m ? clone(m) : undefined;
  }

  listMetricDefinitions(): MetricDefinition[] {
    return clone(Array.from(this.metricDefinitions.values()));
  }

  upsertMetricDefinition(metric: MetricDefinition): MetricDefinition {
    this.metricDefinitions.set(metric.metricId, clone(metric));
    return clone(metric);
  }

  // ==================================================================
  // Analytics — KPIValue CRUD
  // ==================================================================

  getKPIValue(key: string): KPIValue | undefined {
    const k = this.kpiValues.get(key);
    return k ? clone(k) : undefined;
  }

  listKPIValues(): KPIValue[] {
    return clone(Array.from(this.kpiValues.values()));
  }

  upsertKPIValue(kpi: KPIValue): KPIValue {
    // Key by metricId + scopeType + scopeRefId + periodStart
    const key = `${kpi.metricId}:${kpi.scopeType}:${kpi.scopeRefId}:${kpi.periodStart}`;
    this.kpiValues.set(key, clone(kpi));
    return clone(kpi);
  }

  // ==================================================================
  // Analytics — ValueAttribution CRUD
  // ==================================================================

  getValueAttribution(attributionId: string): ValueAttribution | undefined {
    const v = this.valueAttributionsMap.get(attributionId);
    return v ? clone(v) : undefined;
  }

  listValueAttributions(householdId?: string): ValueAttribution[] {
    let result = Array.from(this.valueAttributionsMap.values());
    if (householdId) {
      result = result.filter((v: any) => v.householdId === householdId || v.household_id === householdId);
    }
    return clone(result);
  }

  upsertValueAttribution(attribution: ValueAttribution): ValueAttribution {
    this.valueAttributionsMap.set(attribution.attributionId, clone(attribution));
    return clone(attribution);
  }

  // ==================================================================
  // Analytics — Accessor Helpers (Alias Pattern)
  // ==================================================================

  /**
   * Public accessor objects for analytics queries.
   * These provide findAll/findById aliases for consistency with analytics code.
   */
  public readonly users = {
    findAll: () => this.listUsers(),
  };

  public readonly households = {
    findAll: () => this.listHouseholds(),
  };

  public readonly scenarios = {
    findAll: () => this.listScenarios(),
    findById: (id: string) => this.getScenario(id),
  };

  public readonly calcRuns = {
    findAll: () => this.listCalcRuns(),
    findByScenario: (scenarioId: string) => {
      const runs = this.listCalcRuns(scenarioId);
      return runs.length > 0 ? runs[0] : undefined;
    },
  };

  public readonly deliverables = {
    findAll: () => this.listDeliverables().deliverables,
  };

  public readonly workflowTasks = {
    findAll: () => this.listWorkflowTasks(),
  };

  public readonly cpaRequests = {
    findAll: () => this.listCPACoordinationRequests(),
  };

  public readonly recommendationStatuses = {
    findAll: () => this.listRecommendationExecutionStatuses(),
  };

  public readonly copilotAnswers = {
    findAll: () => this.listCopilotAnswers().answers,
  };

  public readonly valueAttributions = {
    findAll: () => this.listValueAttributions(),
  };

  // ==================================================================
  // Governance Objects - Generic CRUD
  // ==================================================================

  /**
   * Generic getter for governance objects.
   */
  getGovernanceObject<T>(type: string, id: string): T | undefined {
    const map = this.getGovernanceMap(type);
    const obj = map.get(id);
    return obj ? (clone(obj) as any) : undefined;
  }

  /**
   * Generic lister for governance objects.
   */
  listGovernanceObjects<T>(type: string): T[] {
    const map = this.getGovernanceMap(type);
    return clone(Array.from(map.values())) as T[];
  }

  /**
   * Generic upsert for governance objects.
   */
  upsertGovernanceObject<T>(type: string, id: string, obj: T): T {
    const map = this.getGovernanceMap(type);
    map.set(id, clone(obj));
    return clone(obj);
  }

  /**
   * Returns the appropriate Map for a governance object type.
   */
  private getGovernanceMap(type: string): Map<string, unknown> {
    switch (type) {
      case 'platform_roles':
        return this.platformRoles as Map<string, unknown>;
      case 'permission_policies':
        return this.permissionPolicies as Map<string, unknown>;
      case 'access_scopes':
        return this.accessScopes as Map<string, unknown>;
      case 'approval_policies':
        return this.approvalPolicies as Map<string, unknown>;
      case 'ai_governance_policies':
        return this.aiGovernancePolicies as Map<string, unknown>;
      case 'template_governance_records':
        return this.templateGovernanceRecords as Map<string, unknown>;
      case 'admin_settings':
        return this.adminSettings as Map<string, unknown>;
      case 'review_queue_items':
        return this.reviewQueueItems as Map<string, unknown>;
      case 'governance_audit_events':
        return this.governanceAuditEvents as Map<string, unknown>;
      case 'feature_flags':
        return this.featureFlags as Map<string, unknown>;
      default:
        throw new Error(`Unknown governance object type: ${type}`);
    }
  }

  // ==================================================================
  // Rollover Engine — RolloverPlan CRUD
  // ==================================================================

  getRolloverPlan(planId: string): RolloverPlan | undefined {
    const p = this.rolloverPlansMap.get(planId);
    return p ? clone(p) : undefined;
  }

  listRolloverPlans(filters?: {
    ein?: string;
    q?: string;
    planType?: string;
    limit?: number;
  }): RolloverPlan[] {
    let result = Array.from(this.rolloverPlansMap.values());
    if (filters?.ein) {
      result = result.filter((p) => p.ein === filters.ein);
    }
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      result = result.filter(
        (p) =>
          p.plan_name.toLowerCase().includes(query) ||
          p.sponsor_name.toLowerCase().includes(query) ||
          p.ein.includes(query) ||
          p.recordkeeper.toLowerCase().includes(query),
      );
    }
    if (filters?.planType) {
      result = result.filter((p) => p.plan_type === filters.planType);
    }
    const limit = filters?.limit ?? 50;
    return clone(result.slice(0, limit));
  }

  upsertRolloverPlan(plan: RolloverPlan): RolloverPlan {
    this.rolloverPlansMap.set(plan.plan_id, clone(plan));
    return clone(plan);
  }

  // ==================================================================
  // Rollover Engine — RolloverAnalysis CRUD
  // ==================================================================

  getRolloverAnalysis(analysisId: string): RolloverAnalysis | undefined {
    const a = this.rolloverAnalysesMap.get(analysisId);
    return a ? clone(a) : undefined;
  }

  listRolloverAnalyses(filters?: {
    firmId?: string;
    advisorId?: string;
    householdId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): { analyses: RolloverAnalysis[]; total: number } {
    let result = Array.from(this.rolloverAnalysesMap.values());
    if (filters?.firmId) {
      result = result.filter((a) => a.firm_id === filters.firmId);
    }
    if (filters?.advisorId) {
      result = result.filter((a) => a.advisor_id === filters.advisorId);
    }
    if (filters?.householdId) {
      result = result.filter((a) => a.household_id === filters.householdId);
    }
    if (filters?.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const total = result.length;
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    const page = result.slice(offset, offset + limit);
    return { analyses: clone(page), total };
  }

  upsertRolloverAnalysis(analysis: RolloverAnalysis): RolloverAnalysis {
    this.rolloverAnalysesMap.set(analysis.analysis_id, clone(analysis));
    return clone(analysis);
  }

  deleteRolloverAnalysis(analysisId: string): boolean {
    return this.rolloverAnalysesMap.delete(analysisId);
  }

  // ==================================================================
  // Rollover Engine — RolloverScore CRUD
  // ==================================================================

  getRolloverScore(scoreId: string): RolloverScore | undefined {
    const s = this.rolloverScoresMap.get(scoreId);
    return s ? clone(s) : undefined;
  }

  getRolloverScoreByAnalysis(analysisId: string): RolloverScore | undefined {
    for (const score of this.rolloverScoresMap.values()) {
      if (score.analysis_id === analysisId) {
        return clone(score);
      }
    }
    return undefined;
  }

  upsertRolloverScore(score: RolloverScore): RolloverScore {
    this.rolloverScoresMap.set(score.score_id, clone(score));
    return clone(score);
  }

  // ==================================================================
  // Rollover Engine — BenchmarkEntry CRUD
  // ==================================================================

  getRolloverBenchmark(benchmarkId: string): BenchmarkEntry | undefined {
    const b = this.rolloverBenchmarksMap.get(benchmarkId);
    return b ? clone(b) : undefined;
  }

  listRolloverBenchmarks(filters?: {
    planSizeTier?: string;
    metricName?: string;
  }): BenchmarkEntry[] {
    let result = Array.from(this.rolloverBenchmarksMap.values());
    if (filters?.planSizeTier) {
      result = result.filter((b) => b.plan_size_tier === filters.planSizeTier);
    }
    if (filters?.metricName) {
      result = result.filter((b) => b.metric_name === filters.metricName);
    }
    return clone(result);
  }

  upsertRolloverBenchmark(benchmark: BenchmarkEntry): BenchmarkEntry {
    this.rolloverBenchmarksMap.set(benchmark.benchmark_id, clone(benchmark));
    return clone(benchmark);
  }

  // ==================================================================
  // Rollover Engine — NarrativeOutput CRUD
  // ==================================================================

  getRolloverNarrative(narrativeId: string): NarrativeOutput | undefined {
    const n = this.rolloverNarrativesMap.get(narrativeId);
    return n ? clone(n) : undefined;
  }

  getRolloverNarrativeByAnalysis(analysisId: string): NarrativeOutput | undefined {
    for (const n of this.rolloverNarrativesMap.values()) {
      if (n.analysis_id === analysisId) {
        return clone(n);
      }
    }
    return undefined;
  }

  upsertRolloverNarrative(narrative: NarrativeOutput): NarrativeOutput {
    this.rolloverNarrativesMap.set(narrative.narrative_id, clone(narrative));
    return clone(narrative);
  }

  // ==================================================================
  // Rollover Engine — RolloverReport CRUD
  // ==================================================================

  getRolloverReport(reportId: string): RolloverReport | undefined {
    const r = this.rolloverReportsMap.get(reportId);
    return r ? clone(r) : undefined;
  }

  listRolloverReports(analysisId?: string): RolloverReport[] {
    let result = Array.from(this.rolloverReportsMap.values());
    if (analysisId) {
      result = result.filter((r) => r.analysis_id === analysisId);
    }
    result.sort(
      (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
    );
    return clone(result);
  }

  upsertRolloverReport(report: RolloverReport): RolloverReport {
    this.rolloverReportsMap.set(report.report_id, clone(report));
    return clone(report);
  }

  // ==================================================================
  // Rollover Engine — ScrapeJob CRUD
  // ==================================================================

  getScrapeJob(jobId: string): ScrapeJob | undefined {
    const j = this.rolloverScrapeJobsMap.get(jobId);
    return j ? clone(j) : undefined;
  }

  listScrapeJobs(analysisId?: string): ScrapeJob[] {
    let result = Array.from(this.rolloverScrapeJobsMap.values());
    if (analysisId) {
      result = result.filter((j) => j.analysis_id === analysisId);
    }
    return clone(result);
  }

  upsertScrapeJob(job: ScrapeJob): ScrapeJob {
    this.rolloverScrapeJobsMap.set(job.job_id, clone(job));
    return clone(job);
  }

  // ==================================================================
  // Rollover Engine — HubSpotDealSync CRUD
  // ==================================================================

  getHubSpotDealSync(syncId: string): HubSpotDealSync | undefined {
    const s = this.rolloverHubSpotSyncsMap.get(syncId);
    return s ? clone(s) : undefined;
  }

  getHubSpotDealSyncByAnalysis(analysisId: string): HubSpotDealSync | undefined {
    for (const s of this.rolloverHubSpotSyncsMap.values()) {
      if (s.analysis_id === analysisId) {
        return clone(s);
      }
    }
    return undefined;
  }

  upsertHubSpotDealSync(sync: HubSpotDealSync): HubSpotDealSync {
    this.rolloverHubSpotSyncsMap.set(sync.sync_id, clone(sync));
    return clone(sync);
  }

  // ==================================================================
  // Seed Demo Data
  // ==================================================================

  seed(): void {
    const now = new Date().toISOString();

    // ---- Firm ----
    const firm: Firm = {
      firm_id: 'firm-001',
      name: 'Farther Financial Advisors',
      home_currency: 'USD',
      created_at: now,
      updated_at: now,
    };
    this.firmsMap.set(firm.firm_id, firm);

    // ---- Users ----
    const users: User[] = [
      {
        user_id: 'user-001',
        firm_id: 'firm-001',
        email: 'admin@farther.com',
        role: 'ADMIN',
        first_name: 'Alex',
        last_name: 'Admin',
        created_at: now,
        updated_at: now,
      },
      {
        user_id: 'user-002',
        firm_id: 'firm-001',
        email: 'advisor@farther.com',
        role: 'ADVISOR',
        first_name: 'Sarah',
        last_name: 'Advisor',
        created_at: now,
        updated_at: now,
      },
      {
        user_id: 'user-003',
        firm_id: 'firm-001',
        email: 'ops@farther.com',
        role: 'OPS',
        first_name: 'Omar',
        last_name: 'Operations',
        created_at: now,
        updated_at: now,
      },
    ];
    for (const u of users) {
      this.usersMap.set(u.user_id, u);
    }

    // ---- Households ----
    const households: Household[] = [
      {
        household_id: 'hh-001',
        firm_id: 'firm-001',
        display_name: 'Smith Family',
        primary_state: 'AZ',
        created_at: now,
        updated_at: now,
      },
      {
        household_id: 'hh-002',
        firm_id: 'firm-001',
        display_name: 'Johnson Household',
        primary_state: 'CA',
        created_at: now,
        updated_at: now,
      },
      {
        household_id: 'hh-003',
        firm_id: 'firm-001',
        display_name: 'Williams Trust',
        primary_state: 'NY',
        created_at: now,
        updated_at: now,
      },
    ];
    for (const h of households) {
      this.householdsMap.set(h.household_id, h);
    }

    // ---- Persons ----
    const persons: Person[] = [
      {
        person_id: 'person-001',
        household_id: 'hh-001',
        first_name: 'John',
        last_name: 'Smith',
        dob: '1975-03-15',
        ssn_last4: '1234',
        created_at: now,
        updated_at: now,
      },
      {
        person_id: 'person-002',
        household_id: 'hh-001',
        first_name: 'Jane',
        last_name: 'Smith',
        dob: '1978-07-22',
        ssn_last4: '5678',
        created_at: now,
        updated_at: now,
      },
      {
        person_id: 'person-003',
        household_id: 'hh-002',
        first_name: 'Robert',
        last_name: 'Johnson',
        dob: '1982-11-30',
        ssn_last4: '9012',
        created_at: now,
        updated_at: now,
      },
      {
        person_id: 'person-004',
        household_id: 'hh-003',
        first_name: 'Margaret',
        last_name: 'Williams',
        dob: '1960-01-05',
        ssn_last4: '3456',
        created_at: now,
        updated_at: now,
      },
    ];
    for (const p of persons) {
      this.personsMap.set(p.person_id, p);
    }

    // ---- Return Documents ----
    const documents: ReturnDocument[] = [
      {
        doc_id: 'doc-001',
        household_id: 'hh-001',
        tax_year: 2025 as TaxYear,
        doc_type: 'FORM1040_PDF',
        storage_uri: 's3://farther-tax-docs/firm-001/hh-001/2025/form1040.pdf',
        sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        ingested_at: now,
        ingest_status: 'EXTRACTED',
        original_filename: 'smith_2025_1040.pdf',
      },
      {
        doc_id: 'doc-002',
        household_id: 'hh-002',
        tax_year: 2025 as TaxYear,
        doc_type: 'FORM1040_PDF',
        storage_uri: 's3://farther-tax-docs/firm-001/hh-002/2025/form1040.pdf',
        sha256: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
        ingested_at: now,
        ingest_status: 'UPLOADED',
        original_filename: 'johnson_2025_1040.pdf',
      },
    ];
    for (const d of documents) {
      this.documentsMap.set(d.doc_id, d);
    }

    // ---- Tax Returns ----
    const taxReturns: TaxReturn[] = [
      {
        return_id: 'return-001',
        household_id: 'hh-001',
        tax_year: 2025 as TaxYear,
        filing_status: 'MFJ',
        agi_cents: 18500000 as MoneyCents, // $185,000
        taxable_income_cents: 15500000 as MoneyCents, // $155,000
        created_at: now,
        updated_at: now,
      },
    ];
    for (const r of taxReturns) {
      this.taxReturnsMap.set(r.return_id, r);
    }

    // ---- Scenarios ----
    const scenarios: Scenario[] = [
      {
        scenario_id: 'scenario-001',
        return_id: 'return-001',
        name: 'Baseline (Actuals)',
        is_baseline: true,
        created_at: now,
        updated_at: now,
      },
    ];
    for (const s of scenarios) {
      this.scenariosMap.set(s.scenario_id, s);
    }

    // ---- Calc Runs ----
    const calcRuns: CalcRun[] = [
      {
        calc_run_id: 'calc-run-001',
        scenario_id: 'scenario-001',
        engine_version: '1.0.0',
        policy_version: 'policy-2025-v1',
        status: 'OK',
        computed_at: now,
        metrics: {
          'federal.total_tax': 2475000 as MoneyCents,
          'federal.agi': 18500000 as MoneyCents,
          'federal.taxable_income': 15500000 as MoneyCents,
        },
      },
    ];
    for (const cr of calcRuns) {
      this.calcRunsMap.set(cr.calc_run_id, cr);
    }

    // ---- Calc Lines ----
    const calcLines: CalcLine[] = [
      {
        calc_line_id: 'calc-line-001',
        calc_run_id: 'calc-run-001',
        metric_id: 'f1040:l11:agi',
        value_cents: 18500000 as MoneyCents,
        source: 'computed',
      },
      {
        calc_line_id: 'calc-line-002',
        calc_run_id: 'calc-run-001',
        metric_id: 'f1040:l15:taxable_income',
        value_cents: 15500000 as MoneyCents,
        source: 'computed',
      },
      {
        calc_line_id: 'calc-line-003',
        calc_run_id: 'calc-run-001',
        metric_id: 'f1040:l16:tax',
        value_cents: 2475000 as MoneyCents,
        source: 'computed',
      },
    ];
    for (const cl of calcLines) {
      this.calcLinesMap.set(cl.calc_line_id, cl);
    }

    // ---- Extracted Fields for Smith 2025 Return ----
    const extractedFields: ExtractedField[] = [
      {
        field_id: 'field-001',
        doc_id: 'doc-001',
        tax_line_ref: 'f1040:l1z:wages' as TaxLineRef,
        value_cents: 12000000 as MoneyCents, // $120,000
        confidence: 0.97,
        source_kind: 'PDF_TEXT',
        page_num: 1,
      },
      {
        field_id: 'field-002',
        doc_id: 'doc-001',
        tax_line_ref: 'f1040:l2b:taxable_interest' as TaxLineRef,
        value_cents: 350000 as MoneyCents, // $3,500
        confidence: 0.95,
        source_kind: 'PDF_TEXT',
        page_num: 1,
      },
      {
        field_id: 'field-003',
        doc_id: 'doc-001',
        tax_line_ref: 'f1040:l3b:ordinary_dividends' as TaxLineRef,
        value_cents: 850000 as MoneyCents, // $8,500
        confidence: 0.93,
        source_kind: 'PDF_TEXT',
        page_num: 1,
      },
      {
        field_id: 'field-004',
        doc_id: 'doc-001',
        tax_line_ref: 'f1040:l11:agi' as TaxLineRef,
        value_cents: 18500000 as MoneyCents, // $185,000
        confidence: 0.99,
        source_kind: 'PDF_TEXT',
        page_num: 1,
      },
      {
        field_id: 'field-005',
        doc_id: 'doc-001',
        tax_line_ref: 'f1040:l15:taxable_income' as TaxLineRef,
        value_cents: 15500000 as MoneyCents, // $155,000
        confidence: 0.98,
        source_kind: 'PDF_TEXT',
        page_num: 2,
      },
      {
        field_id: 'field-006',
        doc_id: 'doc-001',
        tax_line_ref: 'f1040:l16:tax' as TaxLineRef,
        value_cents: 2475000 as MoneyCents, // $24,750
        confidence: 0.96,
        source_kind: 'PDF_TEXT',
        page_num: 2,
      },
    ];
    for (const f of extractedFields) {
      this.extractedFieldsMap.set(f.field_id, f);
    }

    // ==================================================================
    // Governance Seed Data
    // ==================================================================

    // ---- Platform Roles ----
    const roles: PlatformRole[] = [
      {
        roleId: 'role-001',
        name: 'firm_admin',
        description: 'Full administrative access to firm resources',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        roleId: 'role-002',
        name: 'compliance_reviewer',
        description: 'Can review and approve deliverables for compliance',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        roleId: 'role-003',
        name: 'advisor',
        description: 'Primary client-facing role with full planning access',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        roleId: 'role-004',
        name: 'associate_advisor',
        description: 'Junior advisor with limited approval authority',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        roleId: 'role-005',
        name: 'planner',
        description: 'Technical planning support role',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        roleId: 'role-006',
        name: 'service_ops',
        description: 'Operations and service support',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        roleId: 'role-007',
        name: 'read_only_auditor',
        description: 'Read-only access for audit and compliance',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const r of roles) {
      this.platformRoles.set(r.roleId, r);
    }

    // ---- Permission Policies ----
    const policies: PermissionPolicy[] = [
      {
        policyId: 'policy-001',
        name: 'Admin Full Access',
        description: 'Grants all permissions to admin role',
        roleIds: ['ADMIN'],
        permissions: [
          'households:read',
          'households:write',
          'docs:read',
          'docs:write',
          'returns:read',
          'returns:write',
          'scenarios:read',
          'scenarios:write',
          'compute:run',
          'compute:read',
          'export:pdf',
          'admin:settings',
          'admin:audit',
          'integrations:manage',
          'copilot:ask',
          'copilot:read',
          'copilot:review',
          'copilot:admin',
          'deliverables:read',
          'deliverables:write',
          'deliverables:approve',
          'deliverables:export',
          'deliverables:admin',
          'workflow:read',
          'workflow:write',
          'workflow:admin',
          'crm:write',
          'crm:read',
          'cpa:write',
          'cpa:read',
          'governance:admin',
          'governance:read',
          'governance:review',
          'governance:settings',
        ],
        status: 'active',
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        policyId: 'policy-002',
        name: 'Advisor Standard Access',
        description: 'Standard permissions for advisor role',
        roleIds: ['ADVISOR'],
        permissions: [
          'households:read',
          'households:write',
          'docs:read',
          'docs:write',
          'returns:read',
          'returns:write',
          'scenarios:read',
          'scenarios:write',
          'compute:run',
          'compute:read',
          'export:pdf',
          'copilot:ask',
          'copilot:read',
          'copilot:review',
          'deliverables:read',
          'deliverables:write',
          'deliverables:approve',
          'deliverables:export',
          'workflow:read',
          'workflow:write',
          'crm:write',
          'crm:read',
          'cpa:write',
          'cpa:read',
          'governance:read',
        ],
        status: 'active',
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        policyId: 'policy-003',
        name: 'OPS Support Access',
        description: 'Operations team permissions',
        roleIds: ['OPS'],
        permissions: [
          'households:read',
          'docs:read',
          'docs:write',
          'returns:read',
          'admin:audit',
          'copilot:read',
          'deliverables:read',
          'workflow:read',
          'crm:read',
          'cpa:read',
          'governance:read',
          'governance:review',
        ],
        status: 'active',
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const p of policies) {
      this.permissionPolicies.set(p.policyId, p);
    }

    // ---- Access Scopes ----
    const scopes: AccessScope[] = [
      {
        scopeId: 'scope-001',
        userId: 'user-001',
        scopeType: 'firm',
        scopeRefId: 'firm-001',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        scopeId: 'scope-002',
        userId: 'user-002',
        scopeType: 'firm',
        scopeRefId: 'firm-001',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        scopeId: 'scope-003',
        userId: 'user-002',
        scopeType: 'household',
        scopeRefId: 'hh-001',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const s of scopes) {
      this.accessScopes.set(s.scopeId, s);
    }
  }
}

// ==================== Singleton Export ====================

export const store = new TaxPlanningStore();

// Auto-seed with demo data on import
store.seed();
