/**
 * Tests for copilot/service.ts — full service with mocked AI, all 7 families.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { askCopilot, resetAnswerIdCounter } from '../service';
import { store } from '../../store';
import { auditService } from '../../audit';
import type { CopilotAskRequest } from '../types';
import type { AuthContext } from '../../rbac';
import type { TaxYear } from '../../types';

// Mock the AI client
vi.mock('../ai-client', () => ({
  isCopilotEnabled: () => true,
  callCopilotAi: vi.fn().mockResolvedValue({
    content: {
      answer_text: 'Mocked AI answer about tax planning.',
      citations: [
        {
          type: 'authority',
          label: 'IRS Pub 590-A',
          source_title: 'IRS Publication 590-A',
          url: 'https://www.irs.gov/publications/p590a',
        },
      ],
      formatted_output: undefined,
    },
    model_id: 'claude-sonnet-4-20250514',
    token_usage: { input_tokens: 500, output_tokens: 800 },
  }),
}));

const mockAuth: AuthContext = {
  userId: 'user-002',
  firmId: 'firm-001',
  role: 'ADVISOR',
  email: 'advisor@farther.com',
};

function makeRequest(overrides: Partial<CopilotAskRequest> = {}): CopilotAskRequest {
  return {
    household_id: 'hh-001',
    tax_year: 2025,
    prompt_family: 'explain_line_item',
    audience: 'advisor_internal',
    user_query: 'Explain my AGI',
    ...overrides,
  };
}

beforeEach(() => {
  // Reset stores
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
});

describe('askCopilot()', () => {
  it('returns a CopilotAnswer with all required fields', async () => {
    const answer = await askCopilot({ request: makeRequest(), authContext: mockAuth });

    expect(answer.answer_id).toMatch(/^copa_/);
    expect(answer.firm_id).toBe('firm-001');
    expect(answer.household_id).toBe('hh-001');
    expect(answer.tax_year).toBe(2025);
    expect(answer.prompt_family).toBe('explain_line_item');
    expect(answer.audience).toBe('advisor_internal');
    expect(answer.answer_text).toContain('Mocked AI answer');
    expect(answer.review_state).toBe('draft');
    expect(answer.is_stale).toBe(false);
    expect(answer.created_by).toBe('user-002');
  });

  it('validates citations and includes valid ones', async () => {
    const answer = await askCopilot({ request: makeRequest(), authContext: mockAuth });
    // The mock returns an authority citation for IRS Pub 590-A which is in our knowledge base
    expect(answer.citations.length).toBeGreaterThanOrEqual(1);
    expect(answer.citations[0].type).toBe('authority');
  });

  it('includes confidence factors', async () => {
    const answer = await askCopilot({ request: makeRequest(), authContext: mockAuth });
    expect(answer.confidence_factors).toBeDefined();
    expect(answer.confidence_factors.data_completeness_pct).toBeGreaterThan(0);
  });

  it('includes token usage', async () => {
    const answer = await askCopilot({ request: makeRequest(), authContext: mockAuth });
    expect(answer.token_usage.input_tokens).toBe(500);
    expect(answer.token_usage.output_tokens).toBe(800);
  });

  it('persists the answer in the store', async () => {
    const answer = await askCopilot({ request: makeRequest(), authContext: mockAuth });
    const stored = store.getCopilotAnswer(answer.answer_id);
    expect(stored).not.toBeUndefined();
    expect(stored!.answer_text).toBe(answer.answer_text);
  });

  it('emits an audit event', async () => {
    await askCopilot({ request: makeRequest(), authContext: mockAuth });
    const audit = auditService.query({ firmId: 'firm-001', eventKey: 'copilot.ask' });
    expect(audit.total).toBe(1);
    expect(audit.events[0].payload).toHaveProperty('answer_id');
  });

  it('throws for non-existent household', async () => {
    await expect(
      askCopilot({
        request: makeRequest({ household_id: 'non-existent' }),
        authContext: mockAuth,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws for unauthorized role', async () => {
    await expect(
      askCopilot({
        request: makeRequest(),
        authContext: { ...mockAuth, role: 'CLIENT' },
      }),
    ).rejects.toThrow('Authorization denied');
  });

  // Test all 7 prompt families
  const families = [
    'explain_line_item',
    'explain_opportunity',
    'compare_scenarios',
    'draft_client_email',
    'draft_cpa_note',
    'draft_meeting_prep',
    'missing_data_review',
  ] as const;

  it.each(families)('handles prompt family: %s', async (family) => {
    const answer = await askCopilot({
      request: makeRequest({ prompt_family: family }),
      authContext: mockAuth,
    });
    expect(answer.prompt_family).toBe(family);
    expect(answer.answer_text).toBeTruthy();
  });
});
