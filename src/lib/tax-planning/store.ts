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
  private firms: Map<string, Firm> = new Map();
  private users: Map<string, User> = new Map();
  private households: Map<string, Household> = new Map();
  private persons: Map<string, Person> = new Map();
  private documents: Map<string, ReturnDocument> = new Map();
  private extractedFields: Map<string, ExtractedField> = new Map();
  private taxReturns: Map<string, TaxReturn> = new Map();
  private scenarios: Map<string, Scenario> = new Map();
  private overrides: Map<string, ScenarioOverride> = new Map();
  private calcRuns: Map<string, CalcRun> = new Map();
  private calcLines: Map<string, CalcLine> = new Map();
  private copilotAnswers: Map<string, CopilotAnswer> = new Map();

  // ==================================================================
  // Firm CRUD
  // ==================================================================

  getFirm(firmId: string): Firm | undefined {
    const firm = this.firms.get(firmId);
    return firm ? clone(firm) : undefined;
  }

  listFirms(): Firm[] {
    return clone(Array.from(this.firms.values()));
  }

  upsertFirm(firm: Firm): Firm {
    this.firms.set(firm.firm_id, clone(firm));
    return clone(firm);
  }

  // ==================================================================
  // User CRUD
  // ==================================================================

  getUser(userId: string): User | undefined {
    const user = this.users.get(userId);
    return user ? clone(user) : undefined;
  }

  getUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email === email.toLowerCase()) {
        return clone(user);
      }
    }
    return undefined;
  }

  listUsers(firmId?: string): User[] {
    let result = Array.from(this.users.values());
    if (firmId) {
      result = result.filter((u) => u.firm_id === firmId);
    }
    return clone(result);
  }

  upsertUser(user: User): User {
    this.users.set(user.user_id, clone(user));
    return clone(user);
  }

  // ==================================================================
  // Household CRUD
  // ==================================================================

  getHousehold(householdId: string): Household | undefined {
    const hh = this.households.get(householdId);
    return hh ? clone(hh) : undefined;
  }

  listHouseholds(filters?: {
    firmId?: string;
    q?: string;
  }): Household[] {
    let result = Array.from(this.households.values());
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
    this.households.set(household.household_id, clone(household));
    return clone(household);
  }

  deleteHousehold(householdId: string): boolean {
    return this.households.delete(householdId);
  }

  // ==================================================================
  // Person CRUD
  // ==================================================================

  getPerson(personId: string): Person | undefined {
    const p = this.persons.get(personId);
    return p ? clone(p) : undefined;
  }

  listPersons(householdId?: string): Person[] {
    let result = Array.from(this.persons.values());
    if (householdId) {
      result = result.filter((p) => p.household_id === householdId);
    }
    return clone(result);
  }

  upsertPerson(person: Person): Person {
    this.persons.set(person.person_id, clone(person));
    return clone(person);
  }

  // ==================================================================
  // ReturnDocument CRUD
  // ==================================================================

  getDocument(docId: string): ReturnDocument | undefined {
    const doc = this.documents.get(docId);
    return doc ? clone(doc) : undefined;
  }

  listDocuments(householdId?: string): ReturnDocument[] {
    let result = Array.from(this.documents.values());
    if (householdId) {
      result = result.filter((d) => d.household_id === householdId);
    }
    return clone(result);
  }

  upsertDocument(doc: ReturnDocument): ReturnDocument {
    this.documents.set(doc.doc_id, clone(doc));
    return clone(doc);
  }

  // ==================================================================
  // ExtractedField CRUD
  // ==================================================================

  getExtractedField(fieldId: string): ExtractedField | undefined {
    const f = this.extractedFields.get(fieldId);
    return f ? clone(f) : undefined;
  }

  listExtractedFields(docId?: string): ExtractedField[] {
    let result = Array.from(this.extractedFields.values());
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
    const taxReturn = this.taxReturns.get(returnId);
    if (!taxReturn) return [];

    // Find all documents for this household + tax year
    const docIds: string[] = [];
    for (const doc of this.documents.values()) {
      if (
        doc.household_id === taxReturn.household_id &&
        doc.tax_year === taxReturn.tax_year
      ) {
        docIds.push(doc.doc_id);
      }
    }

    let result: ExtractedField[] = [];
    for (const docId of docIds) {
      const fields = Array.from(this.extractedFields.values()).filter(
        (f) => f.doc_id === docId
      );
      result = result.concat(fields);
    }
    return clone(result);
  }

  upsertExtractedField(field: ExtractedField): ExtractedField {
    this.extractedFields.set(field.field_id, clone(field));
    return clone(field);
  }

  // ==================================================================
  // TaxReturn CRUD
  // ==================================================================

  getTaxReturn(returnId: string): TaxReturn | undefined {
    const r = this.taxReturns.get(returnId);
    return r ? clone(r) : undefined;
  }

  listTaxReturns(householdId?: string): TaxReturn[] {
    let result = Array.from(this.taxReturns.values());
    if (householdId) {
      result = result.filter((r) => r.household_id === householdId);
    }
    return clone(result);
  }

  upsertTaxReturn(taxReturn: TaxReturn): TaxReturn {
    this.taxReturns.set(taxReturn.return_id, clone(taxReturn));
    return clone(taxReturn);
  }

  // ==================================================================
  // Scenario CRUD
  // ==================================================================

  getScenario(scenarioId: string): Scenario | undefined {
    const s = this.scenarios.get(scenarioId);
    return s ? clone(s) : undefined;
  }

  listScenarios(returnId?: string): Scenario[] {
    let result = Array.from(this.scenarios.values());
    if (returnId) {
      result = result.filter((s) => s.return_id === returnId);
    }
    return clone(result);
  }

  upsertScenario(scenario: Scenario): Scenario {
    this.scenarios.set(scenario.scenario_id, clone(scenario));
    return clone(scenario);
  }

  // ==================================================================
  // ScenarioOverride CRUD
  // ==================================================================

  getOverride(overrideId: string): ScenarioOverride | undefined {
    const o = this.overrides.get(overrideId);
    return o ? clone(o) : undefined;
  }

  listOverrides(scenarioId?: string): ScenarioOverride[] {
    let result = Array.from(this.overrides.values());
    if (scenarioId) {
      result = result.filter((o) => o.scenario_id === scenarioId);
    }
    return clone(result);
  }

  upsertOverride(override: ScenarioOverride): ScenarioOverride {
    this.overrides.set(override.override_id, clone(override));
    return clone(override);
  }

  deleteOverride(overrideId: string): boolean {
    return this.overrides.delete(overrideId);
  }

  // ==================================================================
  // CalcRun CRUD
  // ==================================================================

  getCalcRun(calcRunId: string): CalcRun | undefined {
    const r = this.calcRuns.get(calcRunId);
    return r ? clone(r) : undefined;
  }

  listCalcRuns(scenarioId?: string): CalcRun[] {
    let result = Array.from(this.calcRuns.values());
    if (scenarioId) {
      result = result.filter((r) => r.scenario_id === scenarioId);
    }
    return clone(result);
  }

  upsertCalcRun(calcRun: CalcRun): CalcRun {
    this.calcRuns.set(calcRun.calc_run_id, clone(calcRun));
    return clone(calcRun);
  }

  // ==================================================================
  // CalcLine CRUD
  // ==================================================================

  getCalcLine(calcLineId: string): CalcLine | undefined {
    const l = this.calcLines.get(calcLineId);
    return l ? clone(l) : undefined;
  }

  listCalcLines(calcRunId?: string): CalcLine[] {
    let result = Array.from(this.calcLines.values());
    if (calcRunId) {
      result = result.filter((l) => l.calc_run_id === calcRunId);
    }
    return clone(result);
  }

  upsertCalcLine(calcLine: CalcLine): CalcLine {
    this.calcLines.set(calcLine.calc_line_id, clone(calcLine));
    return clone(calcLine);
  }

  // ==================================================================
  // CopilotAnswer CRUD
  // ==================================================================

  getCopilotAnswer(answerId: string): CopilotAnswer | undefined {
    const a = this.copilotAnswers.get(answerId);
    return a ? clone(a) : undefined;
  }

  listCopilotAnswers(filters?: {
    householdId?: string;
    promptFamily?: string;
    reviewState?: string;
    limit?: number;
    offset?: number;
  }): { answers: CopilotAnswer[]; total: number } {
    let result = Array.from(this.copilotAnswers.values());
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
    this.copilotAnswers.set(answer.answer_id, clone(answer));
    return clone(answer);
  }

  deleteCopilotAnswer(answerId: string): boolean {
    return this.copilotAnswers.delete(answerId);
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
    this.firms.set(firm.firm_id, firm);

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
      this.users.set(u.user_id, u);
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
      this.households.set(h.household_id, h);
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
      this.persons.set(p.person_id, p);
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
      this.documents.set(d.doc_id, d);
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
      this.taxReturns.set(r.return_id, r);
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
      this.scenarios.set(s.scenario_id, s);
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
      this.extractedFields.set(f.field_id, f);
    }
  }
}

// ==================== Singleton Export ====================

export const store = new TaxPlanningStore();

// Auto-seed with demo data on import
store.seed();
