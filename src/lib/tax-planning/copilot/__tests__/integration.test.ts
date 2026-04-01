/**
 * Integration tests — end-to-end: API → retrieval → prompt → AI (mock) →
 * cite → confidence → persist → audit.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { askCopilot, resetAnswerIdCounter } from '../service';
import { store } from '../../store';
import { auditService } from '../../audit';
import { checkStaleness, markStale, supersedeAnswer } from '../staleness';
import { canTransition, transition } from '../review-machine';
import { scoreConfidence } from '../confidence';
import { buildSourcePackage } from '../retrieval';
import { formatEmailDraft, formatCpaNote, formatMeetingPrep, formatMissingDataReport } from '../formatters';
import { registerHook, executeHooks, clearHooks, reportingHook, workflowHook } from '../hooks';
import { getCopilotConfig, updateCopilotConfig, resetCopilotConfig } from '../admin';
import type { AuthContext } from '../../rbac';
import type { TaxYear } from '../../types';

// Mock AI client
vi.mock('../ai-client', () => ({
  isCopilotEnabled: () => true,
  callCopilotAi: vi.fn().mockResolvedValue({
    content: {
      answer_text: 'Integration test: Your AGI of $185,000 places you in the 24% bracket.',
      citations: [
        {
          type: 'authority',
          label: 'IRS Publication 590-A',
          source_title: 'IRS Publication 590-A',
          url: 'https://www.irs.gov/publications/p590a',
        },
        {
          type: 'fact',
          label: 'AGI',
          field_id: 'field-004',
          tax_line_ref: 'f1040:l11:agi',
          value_cents: 18500000,
        },
      ],
      formatted_output: undefined,
    },
    model_id: 'claude-sonnet-4-20250514',
    token_usage: { input_tokens: 800, output_tokens: 1200 },
  }),
}));

const mockAuth: AuthContext = {
  userId: 'user-002',
  firmId: 'firm-001',
  role: 'ADVISOR',
  email: 'advisor@farther.com',
};

beforeEach(() => {
  (store as any).copilotAnswers = new Map();
  (store as any).households = new Map();
  (store as any).persons = new Map();
  (store as any).documents = new Map();
  (store as any).extractedFields = new Map();
  (store as any).taxReturns = new Map();
  (store as any).scenarios = new Map();
  (store as any).calcRuns = new Map();
  store.seed();
  auditService.clear();
  resetAnswerIdCounter();
  clearHooks();
  resetCopilotConfig('firm-001');
});

// =====================================================================
// Full Pipeline Integration
// =====================================================================

describe('Full Copilot Pipeline', () => {
  it('executes the complete ask → retrieve → prompt → AI → cite → score → persist → audit pipeline', async () => {
    // 1. Ask
    const answer = await askCopilot({
      request: {
        household_id: 'hh-001',
        tax_year: 2025,
        prompt_family: 'explain_line_item',
        audience: 'advisor_internal',
        user_query: 'Explain the Smith family AGI',
      },
      authContext: mockAuth,
      ip: '10.0.0.1',
    });

    // 2. Verify answer structure
    expect(answer.answer_id).toMatch(/^copa_/);
    expect(answer.answer_text).toContain('AGI');
    expect(answer.household_id).toBe('hh-001');
    expect(answer.review_state).toBe('draft');

    // 3. Verify citations
    expect(answer.citations.length).toBeGreaterThanOrEqual(1);
    const authCite = answer.citations.find((c) => c.type === 'authority');
    expect(authCite).toBeDefined();

    // 4. Verify confidence
    expect(answer.confidence).toBeDefined();
    expect(answer.confidence_factors.data_completeness_pct).toBeGreaterThan(0);

    // 5. Verify persistence
    const stored = store.getCopilotAnswer(answer.answer_id);
    expect(stored).not.toBeUndefined();
    expect(stored!.answer_text).toBe(answer.answer_text);

    // 6. Verify audit trail
    const audit = auditService.query({ firmId: 'firm-001', eventKey: 'copilot.ask' });
    expect(audit.total).toBe(1);
    expect(audit.events[0].ip).toBe('10.0.0.1');
    expect(audit.events[0].payload.answer_id).toBe(answer.answer_id);
  });

  it('supports the full review lifecycle: draft → reviewed → approved', async () => {
    const answer = await askCopilot({
      request: {
        household_id: 'hh-001',
        tax_year: 2025,
        prompt_family: 'explain_line_item',
        audience: 'advisor_internal',
        user_query: 'Explain AGI',
      },
      authContext: mockAuth,
    });

    // Draft → Reviewed
    expect(canTransition('draft', 'reviewed')).toBe(true);
    const reviewedState = transition('draft', 'reviewed');
    expect(reviewedState).toBe('reviewed');

    // Reviewed → Approved
    expect(canTransition('reviewed', 'approved_for_use')).toBe(true);
    const approvedState = transition('reviewed', 'approved_for_use');
    expect(approvedState).toBe('approved_for_use');

    // Approved → Superseded
    expect(canTransition('approved_for_use', 'superseded')).toBe(true);
    const supersededState = transition('approved_for_use', 'superseded');
    expect(supersededState).toBe('superseded');
  });
});

// =====================================================================
// Staleness Integration
// =====================================================================

describe('Staleness Detection Integration', () => {
  it('detects staleness when upstream data changes', async () => {
    const answer = await askCopilot({
      request: {
        household_id: 'hh-001',
        tax_year: 2025,
        prompt_family: 'explain_line_item',
        audience: 'advisor_internal',
        user_query: 'Explain AGI',
      },
      authContext: mockAuth,
    });

    // Modify upstream data
    const household = store.getHousehold('hh-001')!;
    store.upsertHousehold({ ...household, display_name: 'Modified Smith Family' });

    // Check staleness
    const result = checkStaleness(answer.answer_id);
    expect(result).not.toBeNull();
    expect(result!.is_stale).toBe(true);
  });

  it('marks and supersedes stale answers', async () => {
    const answer = await askCopilot({
      request: {
        household_id: 'hh-001',
        tax_year: 2025,
        prompt_family: 'explain_line_item',
        audience: 'advisor_internal',
        user_query: 'Explain AGI',
      },
      authContext: mockAuth,
    });

    // Mark stale
    const stale = markStale(answer.answer_id);
    expect(stale!.is_stale).toBe(true);

    // Supersede
    const superseded = supersedeAnswer(answer.answer_id);
    expect(superseded!.review_state).toBe('superseded');
  });
});

// =====================================================================
// Hooks Integration
// =====================================================================

describe('Hooks Integration', () => {
  it('reporting hook fires for approved answers', async () => {
    registerHook('reporting_narrative', reportingHook);

    const answer = await askCopilot({
      request: {
        household_id: 'hh-001',
        tax_year: 2025,
        prompt_family: 'explain_line_item',
        audience: 'advisor_internal',
        user_query: 'Explain AGI',
      },
      authContext: mockAuth,
    });

    // Not approved yet — hook should not fire
    const results1 = executeHooks(answer);
    expect(results1).toHaveLength(0);

    // Update to approved
    const approved = { ...answer, review_state: 'approved_for_use' as const };
    const results2 = executeHooks(approved);
    expect(results2).toHaveLength(1);
    expect(results2[0].output_type).toBe('reporting_narrative');
  });

  it('workflow hook fires for draft families', async () => {
    registerHook('workflow_task', workflowHook);

    const answer = await askCopilot({
      request: {
        household_id: 'hh-001',
        tax_year: 2025,
        prompt_family: 'draft_meeting_prep',
        audience: 'advisor_internal',
        user_query: 'Prepare for meeting',
      },
      authContext: mockAuth,
    });

    const results = executeHooks(answer);
    expect(results).toHaveLength(1);
    expect(results[0].output_type).toBe('workflow_task');
  });
});

// =====================================================================
// Config Integration
// =====================================================================

describe('Admin Config Integration', () => {
  it('config changes persist and affect behavior', () => {
    // Default: all families enabled
    const defaultConfig = getCopilotConfig('firm-001');
    expect(defaultConfig.enabled_families).toHaveLength(7);

    // Update: restrict families
    const updated = updateCopilotConfig('firm-001', {
      enabled_families: ['explain_line_item', 'explain_opportunity'],
      require_review_before_use: true,
    });
    expect(updated.enabled_families).toHaveLength(2);
    expect(updated.require_review_before_use).toBe(true);

    // Verify persisted
    const fetched = getCopilotConfig('firm-001');
    expect(fetched.enabled_families).toHaveLength(2);

    // Reset
    resetCopilotConfig('firm-001');
    const reset = getCopilotConfig('firm-001');
    expect(reset.enabled_families).toHaveLength(7);
  });
});

// =====================================================================
// Formatter Integration
// =====================================================================

describe('Formatter Integration', () => {
  it('formatters work with real source packages', () => {
    const pkg = buildSourcePackage('hh-001', 2025 as TaxYear)!;
    const baseAnswer = {
      answer_id: 'a-int',
      firm_id: 'firm-001',
      household_id: 'hh-001',
      tax_year: 2025 as TaxYear,
      prompt_family: 'draft_client_email' as const,
      audience: 'client_friendly' as const,
      user_query: 'Draft email',
      answer_text: 'Test answer text',
      citations: [],
      confidence: 'high' as const,
      confidence_factors: { data_completeness_pct: 90, blocker_count: 0, interpretation_level: 'factual' as const, all_citations_verified: true, hallucination_count: 0 },
      review_state: 'draft' as const,
      upstream_hash: 'x',
      is_stale: false,
      prompt_version: '1.0.0',
      model_id: 'test',
      token_usage: { input_tokens: 100, output_tokens: 200 },
      created_by: 'user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const email = formatEmailDraft(baseAnswer, pkg);
    expect(email.kind).toBe('email_draft');
    expect(email.greeting).toContain('John Smith');

    const cpa = formatCpaNote(baseAnswer, pkg);
    expect(cpa.kind).toBe('cpa_note');
    expect(cpa.key_figures.length).toBeGreaterThan(0);

    const prep = formatMeetingPrep(baseAnswer, pkg);
    expect(prep.kind).toBe('meeting_prep');

    const missing = formatMissingDataReport(baseAnswer, pkg);
    expect(missing.kind).toBe('missing_data_report');
  });
});

// =====================================================================
// Confidence Integration
// =====================================================================

describe('Confidence Scoring Integration', () => {
  it('scores confidence for real source packages', () => {
    const pkg = buildSourcePackage('hh-001', 2025 as TaxYear)!;
    const { factors, level } = scoreConfidence(pkg, [], 'explain_line_item');
    expect(factors.data_completeness_pct).toBeGreaterThan(0);
    expect(['high', 'medium', 'low']).toContain(level);
  });
});
