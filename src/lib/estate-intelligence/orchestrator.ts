// =============================================================================
// Orchestrator — Agent Coordination & Execution Pipeline
// =============================================================================
//
// Controls the multi-phase analysis workflow: classification → Phase 1 agents
// (document-focused) → Phase 2 agents (strategic synthesis) → conflict
// resolution → report generation. Maintains analysis state in-memory.
//
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  extractText,
  classifyDocument,
  validateExtraction,
  detectMissingDocuments,
} from './document-processor';
import { executeAgent } from './agent-executor';
import type {
  EstateAnalysisConfig,
  OrchestratorState,
  AnalysisStatus,
  AgentId,
  ClassifiedDocument,
  AnalysisProgress,
  DocumentType,
} from './types';

// ── Agent Dispatch Rules ─────────────────────────────────────────────────────

/**
 * Defines which agents run for which document types.
 * Phase 1: Document-focused agents analyze specific doc types
 * Phase 2: Strategic agents synthesize across all findings
 */
const AGENT_DISPATCH_RULES: Record<
  DocumentType,
  { phase1: AgentId[]; phase2: AgentId[] }
> = {
  REVOCABLE_LIVING_TRUST: {
    phase1: [
      'TRUST_STRUCTURE_ANALYST',
      'TAX_OPTIMIZATION_AGENT',
      'ASSET_PROTECTION_AGENT',
      'BENEFICIARY_ALIGNMENT_AGENT',
    ],
    phase2: [
      'ESTATE_TAX_CALCULATOR',
      'LIQUIDITY_ANALYZER',
      'STRATEGIC_SYNTHESIS_AGENT',
    ],
  },
  IRREVOCABLE_TRUST: {
    phase1: [
      'TRUST_STRUCTURE_ANALYST',
      'TAX_OPTIMIZATION_AGENT',
      'ASSET_PROTECTION_AGENT',
      'CHARITABLE_PLANNING_AGENT',
    ],
    phase2: [
      'ESTATE_TAX_CALCULATOR',
      'GENERATIONAL_TRANSFER_AGENT',
      'STRATEGIC_SYNTHESIS_AGENT',
    ],
  },
  LAST_WILL_AND_TESTAMENT: {
    phase1: ['BENEFICIARY_ALIGNMENT_AGENT', 'ASSET_PROTECTION_AGENT'],
    phase2: ['ESTATE_TAX_CALCULATOR', 'STRATEGIC_SYNTHESIS_AGENT'],
  },
  POUR_OVER_WILL: {
    phase1: ['TRUST_STRUCTURE_ANALYST', 'BENEFICIARY_ALIGNMENT_AGENT'],
    phase2: ['COMPLIANCE_REVIEWER', 'STRATEGIC_SYNTHESIS_AGENT'],
  },
  TRUST_AMENDMENT: {
    phase1: ['TRUST_STRUCTURE_ANALYST', 'COMPLIANCE_REVIEWER'],
    phase2: ['STRATEGIC_SYNTHESIS_AGENT'],
  },
  TRUST_RESTATEMENT: {
    phase1: ['TRUST_STRUCTURE_ANALYST', 'TAX_OPTIMIZATION_AGENT'],
    phase2: ['STRATEGIC_SYNTHESIS_AGENT'],
  },
  POWER_OF_ATTORNEY: {
    phase1: ['COMPLIANCE_REVIEWER'],
    phase2: [],
  },
  ADVANCE_DIRECTIVE: {
    phase1: ['COMPLIANCE_REVIEWER'],
    phase2: [],
  },
  LLC_OPERATING_AGREEMENT: {
    phase1: ['BUSINESS_SUCCESSION_AGENT', 'ASSET_PROTECTION_AGENT'],
    phase2: ['ESTATE_TAX_CALCULATOR', 'STRATEGIC_SYNTHESIS_AGENT'],
  },
  PARTNERSHIP_AGREEMENT: {
    phase1: ['BUSINESS_SUCCESSION_AGENT'],
    phase2: ['ESTATE_TAX_CALCULATOR', 'STRATEGIC_SYNTHESIS_AGENT'],
  },
  CORPORATE_DOCUMENTS: {
    phase1: ['BUSINESS_SUCCESSION_AGENT'],
    phase2: ['STRATEGIC_SYNTHESIS_AGENT'],
  },
  BENEFICIARY_DESIGNATION: {
    phase1: ['BENEFICIARY_ALIGNMENT_AGENT'],
    phase2: ['COMPLIANCE_REVIEWER', 'STRATEGIC_SYNTHESIS_AGENT'],
  },
  DEED: {
    phase1: ['ASSET_PROTECTION_AGENT'],
    phase2: ['ESTATE_TAX_CALCULATOR'],
  },
  LIFE_INSURANCE_POLICY: {
    phase1: ['LIQUIDITY_ANALYZER', 'BENEFICIARY_ALIGNMENT_AGENT'],
    phase2: ['ESTATE_TAX_CALCULATOR', 'STRATEGIC_SYNTHESIS_AGENT'],
  },
  ACCOUNT_STATEMENT: {
    phase1: ['LIQUIDITY_ANALYZER'],
    phase2: ['ESTATE_TAX_CALCULATOR'],
  },
  TAX_RETURN: {
    phase1: ['TAX_OPTIMIZATION_AGENT', 'ESTATE_TAX_CALCULATOR'],
    phase2: ['STRATEGIC_SYNTHESIS_AGENT'],
  },
  APPRAISAL: {
    phase1: ['ESTATE_TAX_CALCULATOR'],
    phase2: [],
  },
  PRENUPTIAL_POSTNUPTIAL_AGREEMENT: {
    phase1: ['MARITAL_DEDUCTION_OPTIMIZER', 'ASSET_PROTECTION_AGENT'],
    phase2: ['STRATEGIC_SYNTHESIS_AGENT'],
  },
  COURT_ORDER: {
    phase1: ['COMPLIANCE_REVIEWER'],
    phase2: [],
  },
  LETTER_OF_INSTRUCTION: {
    phase1: [],
    phase2: [],
  },
  DIGITAL_ASSET_INVENTORY: {
    phase1: ['ASSET_PROTECTION_AGENT'],
    phase2: [],
  },
  OTHER: {
    phase1: [],
    phase2: ['STRATEGIC_SYNTHESIS_AGENT'],
  },
};

// ── In-Memory State Store ────────────────────────────────────────────────────

const analysisStore = new Map<string, OrchestratorState>();

// ── Analysis Creation ────────────────────────────────────────────────────────

/**
 * Creates a new analysis record and returns the analysis ID.
 */
export async function createAnalysis(config: EstateAnalysisConfig): Promise<string> {
  const analysisId = uuidv4();
  const now = new Date().toISOString();

  const state: OrchestratorState = {
    analysis_id: analysisId,
    config,
    status: 'PENDING',
    current_phase: 'classification',
    classified_documents: [],
    active_agents: [],
    completed_agents: [],
    all_findings: [],
    created_at: now,
    updated_at: now,
  };

  analysisStore.set(analysisId, state);

  console.log(
    `[Orchestrator] Created analysis ${analysisId} for client="${config.client_name}", docs=${config.documents.length}`
  );

  return analysisId;
}

// ── Main Orchestration Flow ──────────────────────────────────────────────────

/**
 * Runs the full analysis pipeline for a given analysis ID.
 */
export async function runAnalysis(analysisId: string): Promise<void> {
  const state = analysisStore.get(analysisId);
  if (!state) {
    throw new Error(`[Orchestrator] Analysis ${analysisId} not found`);
  }

  try {
    // Phase 0: Classification
    await classifyAllDocuments(state);

    // Determine required agents from dispatch rules
    const { phase1Agents, phase2Agents } = determineRequiredAgents(state);

    console.log(
      `[Orchestrator] ${analysisId}: phase1=${phase1Agents.length} agents, phase2=${phase2Agents.length} agents`
    );

    // Phase 1: Document-focused agents (parallel execution)
    state.status = 'ANALYZING';
    state.current_phase = 'phase1';
    state.updated_at = new Date().toISOString();

    await executeAgentsInParallel(state, phase1Agents);

    // Phase 2: Strategic synthesis agents (parallel execution with Phase 1 findings)
    state.current_phase = 'phase2';
    state.updated_at = new Date().toISOString();

    await executeAgentsInParallel(state, phase2Agents, state.all_findings);

    // Phase 3: Synthesis and conflict resolution
    state.status = 'SYNTHESIZING';
    state.current_phase = 'synthesis';
    state.updated_at = new Date().toISOString();

    await runConflictResolution(state);

    // Complete
    state.status = 'COMPLETE';
    state.current_phase = 'complete';
    state.updated_at = new Date().toISOString();

    console.log(
      `[Orchestrator] ${analysisId} complete: ${state.all_findings.length} agent outputs, ${state.all_findings.reduce((sum, o) => sum + o.findings.length, 0)} total findings`
    );
  } catch (err) {
    state.status = 'ERROR';
    state.error = err instanceof Error ? err.message : String(err);
    state.updated_at = new Date().toISOString();

    console.error(`[Orchestrator] ${analysisId} failed:`, err);
    throw err;
  }
}

// ── Classification Phase ─────────────────────────────────────────────────────

async function classifyAllDocuments(state: OrchestratorState): Promise<void> {
  state.status = 'CLASSIFYING';
  state.updated_at = new Date().toISOString();

  const { documents } = state.config;

  console.log(`[Orchestrator] Classifying ${documents.length} documents...`);

  const classifiedDocs: ClassifiedDocument[] = [];

  for (const doc of documents) {
    console.log(`[Orchestrator] Extracting text from ${doc.fileName}...`);

    const extracted = await extractText({
      buffer: doc.buffer,
      mimeType: doc.mimeType,
      fileName: doc.fileName,
    });

    const validation = validateExtraction(extracted);
    if (!validation.valid) {
      console.warn(`[Orchestrator] ${doc.fileName} validation warnings:`, validation.warnings);
    }

    console.log(`[Orchestrator] Classifying ${doc.fileName}...`);

    const classification = await classifyDocument({
      text: extracted.text,
      fileName: doc.fileName,
    });

    classifiedDocs.push({
      ...classification,
      id: doc.id,
      fileName: doc.fileName,
      extractedText: extracted.text,
    });

    console.log(
      `[Orchestrator] ${doc.fileName} → ${classification.document_type} (confidence=${(classification.confidence * 100).toFixed(1)}%)`
    );
  }

  state.classified_documents = classifiedDocs;
  state.updated_at = new Date().toISOString();

  // Detect missing documents
  const missing = detectMissingDocuments(classifiedDocs);
  if (missing.length > 0) {
    console.warn(
      `[Orchestrator] ${state.analysis_id}: Missing ${missing.length} referenced documents:`,
      missing
    );
  }
}

// ── Agent Dispatch ───────────────────────────────────────────────────────────

function determineRequiredAgents(state: OrchestratorState): {
  phase1Agents: AgentId[];
  phase2Agents: AgentId[];
} {
  const phase1Set = new Set<AgentId>();
  const phase2Set = new Set<AgentId>();

  for (const doc of state.classified_documents) {
    const rules = AGENT_DISPATCH_RULES[doc.document_type];

    if (rules) {
      for (const agent of rules.phase1) {
        phase1Set.add(agent);
      }
      for (const agent of rules.phase2) {
        phase2Set.add(agent);
      }
    }
  }

  // Always run COMPLIANCE_REVIEWER in Phase 2
  phase2Set.add('COMPLIANCE_REVIEWER');

  return {
    phase1Agents: Array.from(phase1Set),
    phase2Agents: Array.from(phase2Set),
  };
}

// ── Agent Execution ──────────────────────────────────────────────────────────

async function executeAgentsInParallel(
  state: OrchestratorState,
  agents: AgentId[],
  priorFindings: any[] = []
): Promise<void> {
  if (agents.length === 0) {
    return;
  }

  state.active_agents = agents;
  state.updated_at = new Date().toISOString();

  // Execute all agents in parallel
  const results = await Promise.allSettled(
    agents.map(async (agentId) => {
      const systemPrompt = getAgentSystemPrompt(agentId);

      return executeAgent({
        agentId,
        systemPrompt,
        documents: state.classified_documents,
        priorFindings,
      });
    })
  );

  // Collect successful results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const agentId = agents[i];

    if (result.status === 'fulfilled') {
      state.all_findings.push(result.value);
      state.completed_agents.push(agentId);
      console.log(
        `[Orchestrator] ${agentId} completed: ${result.value.findings.length} findings`
      );
    } else {
      console.error(`[Orchestrator] ${agentId} failed:`, result.reason);
    }
  }

  state.active_agents = [];
  state.updated_at = new Date().toISOString();
}

// ── Conflict Resolution ──────────────────────────────────────────────────────

async function runConflictResolution(state: OrchestratorState): Promise<void> {
  // TODO: Implement cross-agent conflict detection and resolution
  // For now, just log a placeholder
  console.log(`[Orchestrator] Conflict resolution phase (placeholder)`);
}

// ── Progress Tracking ────────────────────────────────────────────────────────

/**
 * Returns current analysis progress for UI updates.
 */
export function getAnalysisProgress(analysisId: string): AnalysisProgress {
  const state = analysisStore.get(analysisId);

  if (!state) {
    throw new Error(`[Orchestrator] Analysis ${analysisId} not found`);
  }

  const totalFindings = state.all_findings.reduce((sum, o) => sum + o.findings.length, 0);
  const highFindings = state.all_findings.reduce(
    (sum, o) => sum + o.summary_statistics.high_severity,
    0
  );
  const mediumFindings = state.all_findings.reduce(
    (sum, o) => sum + o.summary_statistics.medium_severity,
    0
  );
  const lowFindings = state.all_findings.reduce(
    (sum, o) => sum + o.summary_statistics.low_severity,
    0
  );
  const infoFindings = totalFindings - highFindings - mediumFindings - lowFindings;

  // Estimate agents (rough heuristic based on doc types)
  const { phase1Agents, phase2Agents } = determineRequiredAgents(state);
  const totalAgents = phase1Agents.length + phase2Agents.length;

  return {
    status: state.status,
    totalAgents,
    completedAgents: state.completed_agents.length,
    activeAgents: state.active_agents,
    findings: {
      total: totalFindings,
      high: highFindings,
      medium: mediumFindings,
      low: lowFindings,
      info: infoFindings,
    },
  };
}

// ── Agent System Prompts (Placeholder) ───────────────────────────────────────

function getAgentSystemPrompt(agentId: AgentId): string {
  // TODO: Replace with full agent prompts from spec
  const prompts: Record<AgentId, string> = {
    TRUST_STRUCTURE_ANALYST: `You are a Trust Structure Analyst specializing in trust architecture, funding, and administrative provisions. Analyze trust documents for structural issues, funding gaps, successor provisions, and administrative efficiency.`,

    TAX_OPTIMIZATION_AGENT: `You are a Tax Optimization Agent specializing in estate, gift, and income tax planning. Identify tax inefficiencies, missed deductions, suboptimal basis step-up strategies, and opportunities for tax-advantaged wealth transfer.`,

    ASSET_PROTECTION_AGENT: `You are an Asset Protection Specialist. Analyze documents for creditor protection weaknesses, fraudulent transfer risks, and opportunities to strengthen asset shielding through trust structures and entity formations.`,

    BENEFICIARY_ALIGNMENT_AGENT: `You are a Beneficiary Alignment Specialist. Identify conflicts between beneficiary designations across documents, missing contingent beneficiaries, and alignment issues with the client's stated goals.`,

    CHARITABLE_PLANNING_AGENT: `You are a Charitable Planning Expert. Analyze charitable remainder trusts, charitable lead trusts, donor-advised funds, and other charitable vehicles for tax efficiency and goal alignment.`,

    ESTATE_TAX_CALCULATOR: `You are an Estate Tax Calculator. Estimate federal and state estate tax liability based on asset values, exemptions, deductions, and marital/charitable transfers. Identify estate tax exposure and mitigation strategies.`,

    LIQUIDITY_ANALYZER: `You are a Liquidity Analyst. Assess cash flow needs for estate settlement, tax payments, and beneficiary distributions. Identify liquidity gaps and recommend funding strategies (life insurance, cash reserves).`,

    BUSINESS_SUCCESSION_AGENT: `You are a Business Succession Planner. Analyze buy-sell agreements, operating agreements, and corporate documents for succession planning adequacy, valuation methods, and funding mechanisms.`,

    MARITAL_DEDUCTION_OPTIMIZER: `You are a Marital Deduction Specialist. Analyze QTIP trusts, marital trusts, and spousal transfers for optimal use of the marital deduction while preserving control and tax efficiency.`,

    GENERATIONAL_TRANSFER_AGENT: `You are a Generational Transfer Strategist. Analyze dynasty trusts, generation-skipping transfer tax planning, and multi-generational wealth preservation structures.`,

    SPECIAL_NEEDS_PLANNER: `You are a Special Needs Planning Expert. Analyze special needs trusts for compliance with SSI/Medicaid rules, trustee discretion, and beneficiary protection.`,

    COMPLIANCE_REVIEWER: `You are a Compliance Reviewer. Identify execution defects, missing signatures, notarization issues, and regulatory compliance gaps across all documents.`,

    STRATEGIC_SYNTHESIS_AGENT: `You are the Strategic Synthesis Agent. Integrate findings from all other agents, identify cross-cutting themes, and prioritize action items based on impact, urgency, and complexity.`,
  };

  return prompts[agentId] ?? `You are agent ${agentId}.`;
}
