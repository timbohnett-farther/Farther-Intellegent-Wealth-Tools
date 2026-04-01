/**
 * Tests for copilot/types.ts — type helpers and structure validation.
 */

import { describe, it, expect } from 'vitest';
import type {
  PromptFamily,
  AudienceMode,
  ConfidenceLevel,
  ReviewState,
  CitationType,
  CopilotAnswer,
  CopilotCitation,
  FactCitation,
  CalcCitation,
  OpportunityCitation,
  ScenarioCitation,
  AuthorityCitation,
  ConfidenceFactors,
  EmailDraft,
  CpaNote,
  MeetingPrep,
  MissingDataReport,
  SourcePackage,
} from '../types';
import type { TaxYear, MoneyCents } from '../../types';

// =====================================================================
// Enum / Union Type Validation
// =====================================================================

describe('PromptFamily', () => {
  it('accepts all 7 valid prompt families', () => {
    const families: PromptFamily[] = [
      'explain_line_item',
      'explain_opportunity',
      'compare_scenarios',
      'draft_client_email',
      'draft_cpa_note',
      'draft_meeting_prep',
      'missing_data_review',
    ];
    expect(families).toHaveLength(7);
  });
});

describe('AudienceMode', () => {
  it('accepts all 5 valid audience modes', () => {
    const modes: AudienceMode[] = [
      'advisor_internal',
      'client_friendly',
      'cpa_technical',
      'compliance_formal',
      'executive_summary',
    ];
    expect(modes).toHaveLength(5);
  });
});

describe('ConfidenceLevel', () => {
  it('accepts all 3 valid levels', () => {
    const levels: ConfidenceLevel[] = ['high', 'medium', 'low'];
    expect(levels).toHaveLength(3);
  });
});

describe('ReviewState', () => {
  it('accepts all 5 valid states', () => {
    const states: ReviewState[] = [
      'draft',
      'reviewed',
      'approved_for_use',
      'discarded',
      'superseded',
    ];
    expect(states).toHaveLength(5);
  });
});

describe('CitationType', () => {
  it('accepts all 5 valid types', () => {
    const types: CitationType[] = ['fact', 'calc', 'opportunity', 'scenario', 'authority'];
    expect(types).toHaveLength(5);
  });
});

// =====================================================================
// ConfidenceFactors Structure
// =====================================================================

describe('ConfidenceFactors', () => {
  it('has all required fields', () => {
    const factors: ConfidenceFactors = {
      data_completeness_pct: 85,
      blocker_count: 0,
      interpretation_level: 'analytical',
      all_citations_verified: true,
      hallucination_count: 0,
    };

    expect(factors.data_completeness_pct).toBe(85);
    expect(factors.blocker_count).toBe(0);
    expect(factors.interpretation_level).toBe('analytical');
    expect(factors.all_citations_verified).toBe(true);
    expect(factors.hallucination_count).toBe(0);
  });
});

// =====================================================================
// Draft Output Types
// =====================================================================

describe('EmailDraft', () => {
  it('has all required sections', () => {
    const draft: EmailDraft = {
      kind: 'email_draft',
      subject: 'Tax Planning Update',
      greeting: 'Dear Client,',
      body: 'We found opportunities...',
      closing: 'Best regards',
      disclaimer: 'For educational purposes only.',
    };
    expect(draft.kind).toBe('email_draft');
    expect(draft.subject).toBeTruthy();
    expect(draft.greeting).toBeTruthy();
    expect(draft.body).toBeTruthy();
    expect(draft.closing).toBeTruthy();
    expect(draft.disclaimer).toBeTruthy();
  });
});

describe('CpaNote', () => {
  it('has all required sections', () => {
    const note: CpaNote = {
      kind: 'cpa_note',
      subject: 'Tax Coordination',
      context: 'MFJ, AZ resident',
      key_figures: [{ label: 'AGI', value: '$185,000', source: 'Extracted' }],
      action_items: ['Review attached analysis'],
      technical_notes: 'See IRS Pub 590-A for Roth conversion limits.',
    };
    expect(note.kind).toBe('cpa_note');
    expect(note.key_figures).toHaveLength(1);
  });
});

describe('MeetingPrep', () => {
  it('has all required sections', () => {
    const prep: MeetingPrep = {
      kind: 'meeting_prep',
      meeting_title: 'Q4 Tax Review',
      agenda_items: ['Welcome', 'Review tax situation', 'Next steps'],
      talking_points: [{ topic: 'Roth Conversion', detail: 'Consider $50K conversion' }],
      key_numbers: [{ label: 'AGI', value: '$185,000' }],
      open_questions: ['What is the expected income for next year?'],
    };
    expect(prep.kind).toBe('meeting_prep');
    expect(prep.agenda_items.length).toBeGreaterThan(0);
  });
});

describe('MissingDataReport', () => {
  it('has all required sections', () => {
    const report: MissingDataReport = {
      kind: 'missing_data_report',
      completeness_pct: 65,
      critical_gaps: [{ field: 'filing_status', description: 'Missing', impact: 'high', suggested_source: 'Client' }],
      optional_gaps: [{ field: 'state_tax', description: 'Not provided', benefit: 'State tax optimization' }],
      recommendations: ['Request Form 1040 from client'],
    };
    expect(report.kind).toBe('missing_data_report');
    expect(report.completeness_pct).toBe(65);
    expect(report.critical_gaps).toHaveLength(1);
  });
});
