/**
 * Agent Registry — Dispatch Rules & Configuration
 *
 * This module determines which agents run for which document types,
 * retrieves agent configurations, and orchestrates the 3-phase analysis pipeline.
 */

import { AGENT_PROMPTS, type AgentConfig } from './agent-prompts'

export type AgentId =
  | 'DOCUMENT_CLASSIFIER'
  | 'TRUST_STRUCTURE'
  | 'TAX_EXPOSURE'
  | 'BENEFICIARY_MAPPING'
  | 'ENTITY_VALUATION'
  | 'DIGITAL_ASSET'
  | 'STATE_TAX'
  | 'CHARITABLE_STRATEGY'
  | 'INSURANCE_ANALYSIS'
  | 'COMPLIANCE_RISK'
  | 'STRATEGY_RECOMMENDATION'
  | 'REPORT_COMPOSER'
  | 'CONFLICT_RESOLUTION'

export type DocumentType =
  | 'TRUST_INSTRUMENT'
  | 'POUR_OVER_WILL'
  | 'BENEFICIARY_FORM'
  | 'DEED'
  | 'ENTITY_FORMATION'
  | 'INSURANCE_POLICY'
  | 'FINANCIAL_STATEMENT'
  | 'OTHER'

/**
 * Dispatch Rules — Maps document types to required agents
 *
 * Phase 1: Specialist agents analyze specific document types
 * Phase 2: Quality control (always runs after Phase 1)
 * Phase 3: Strategy synthesis (always runs after Phase 2)
 */
export const DISPATCH_RULES: Record<DocumentType, AgentId[]> = {
  TRUST_INSTRUMENT: [
    'TRUST_STRUCTURE',
    'BENEFICIARY_MAPPING',
    'TAX_EXPOSURE',
    'DIGITAL_ASSET', // Check if trust grants digital asset access
  ],

  POUR_OVER_WILL: [
    'BENEFICIARY_MAPPING', // Will provisions + residuary clause
    'TAX_EXPOSURE', // Specific bequests may affect estate calculation
  ],

  BENEFICIARY_FORM: [
    'BENEFICIARY_MAPPING', // IRA, 401k, life insurance beneficiaries
    'TAX_EXPOSURE', // Retirement accounts included in gross estate
  ],

  DEED: [
    'TAX_EXPOSURE', // Real estate included in gross estate or transferred with retained interest
    'STATE_TAX', // Situs state tax on real estate
  ],

  ENTITY_FORMATION: [
    'ENTITY_VALUATION', // LLC, partnership, corp ownership and valuation
    'TAX_EXPOSURE', // Decedent's ownership interest included in gross estate
  ],

  INSURANCE_POLICY: [
    'INSURANCE_ANALYSIS', // Policy terms, ownership, ILIT compliance
    'TAX_EXPOSURE', // Life insurance proceeds per IRC §2042
  ],

  FINANCIAL_STATEMENT: [
    'TAX_EXPOSURE', // Asset inventory for gross estate calculation
    'DIGITAL_ASSET', // Crypto exchange accounts, online brokerage
  ],

  OTHER: [
    // Fallback — classifier will determine if specific agents needed
  ],
}

/**
 * Get agent configuration (system prompt + model + phase)
 */
export function getAgentConfig(agentId: AgentId): AgentConfig {
  const config = AGENT_PROMPTS[agentId]
  if (!config) {
    throw new Error(`Agent configuration not found: ${agentId}`)
  }
  return config
}

/**
 * Determine which Phase 1 specialist agents to run based on uploaded document types
 *
 * @param documentTypes - Array of classified document types
 * @returns Array of unique agent IDs to invoke
 */
export function getRequiredAgents(documentTypes: DocumentType[]): AgentId[] {
  // Always run DOCUMENT_CLASSIFIER first for all uploads
  const requiredAgents = new Set<AgentId>(['DOCUMENT_CLASSIFIER'])

  // Add specialist agents based on document types
  for (const docType of documentTypes) {
    const agents = DISPATCH_RULES[docType] || []
    agents.forEach(agent => requiredAgents.add(agent))
  }

  // If ANY trust or beneficiary documents present, run full beneficiary reconciliation
  const hasBeneficiaryDocs = documentTypes.some(dt =>
    ['TRUST_INSTRUMENT', 'POUR_OVER_WILL', 'BENEFICIARY_FORM'].includes(dt)
  )
  if (hasBeneficiaryDocs) {
    requiredAgents.add('BENEFICIARY_MAPPING')
  }

  // If ANY taxable assets present, run tax exposure analysis
  const hasTaxableAssets = documentTypes.some(dt =>
    ['TRUST_INSTRUMENT', 'DEED', 'ENTITY_FORMATION', 'INSURANCE_POLICY', 'FINANCIAL_STATEMENT'].includes(dt)
  )
  if (hasTaxableAssets) {
    requiredAgents.add('TAX_EXPOSURE')
  }

  // If real estate present, run state tax analysis
  const hasRealEstate = documentTypes.includes('DEED')
  if (hasRealEstate) {
    requiredAgents.add('STATE_TAX')
  }

  // If insurance present, run insurance analysis
  const hasInsurance = documentTypes.includes('INSURANCE_POLICY')
  if (hasInsurance) {
    requiredAgents.add('INSURANCE_ANALYSIS')
  }

  // If entity formation docs present, run entity valuation
  const hasEntities = documentTypes.includes('ENTITY_FORMATION')
  if (hasEntities) {
    requiredAgents.add('ENTITY_VALUATION')
  }

  // If financial statements present, check for digital assets
  const hasFinancialDocs = documentTypes.includes('FINANCIAL_STATEMENT')
  if (hasFinancialDocs) {
    requiredAgents.add('DIGITAL_ASSET')
  }

  // ALWAYS run these Phase 2 and Phase 3 agents (after specialists complete)
  // These are added by the orchestrator, not here

  return Array.from(requiredAgents)
}

/**
 * Get agents for a specific analysis phase
 */
export function getAgentsByPhase(phase: 1 | 2 | 3): AgentId[] {
  return (Object.keys(AGENT_PROMPTS) as AgentId[]).filter(
    agentId => AGENT_PROMPTS[agentId].phase === phase
  )
}

/**
 * Check if agent should run based on document types and prior findings
 *
 * Some agents only run conditionally based on what prior agents found.
 * For example:
 * - CHARITABLE_STRATEGY only runs if trust mentions CRT/CLT/foundation/DAF
 * - CONFLICT_RESOLUTION only runs if Phase 1 agents disagreed
 */
export function shouldRunAgent(
  agentId: AgentId,
  documentTypes: DocumentType[],
  priorFindings?: Record<string, unknown>
): boolean {
  // Phase 1 specialist agents run based on document types
  if (AGENT_PROMPTS[agentId].phase === 1) {
    const requiredAgents = getRequiredAgents(documentTypes)
    return requiredAgents.includes(agentId)
  }

  // Phase 2 quality control agents
  if (agentId === 'COMPLIANCE_RISK') {
    // Always run after Phase 1 completes
    return true
  }

  if (agentId === 'CONFLICT_RESOLUTION') {
    // Only run if COMPLIANCE_RISK detected conflicts
    const conflicts = priorFindings?.conflicts as unknown[] | undefined
    return !!(conflicts && conflicts.length > 0)
  }

  // Phase 3 synthesis agents
  if (agentId === 'STRATEGY_RECOMMENDATION' || agentId === 'REPORT_COMPOSER') {
    // Always run after Phase 2 completes
    return true
  }

  // Conditional specialist agents
  if (agentId === 'CHARITABLE_STRATEGY') {
    // Only run if trust mentions charitable giving or client has charitable intent
    const trustFindings = priorFindings?.TRUST_STRUCTURE as Record<string, unknown> | undefined
    const beneficiaries = trustFindings?.beneficiaries as Record<string, unknown> | undefined
    const contingent = beneficiaries?.contingent as string[] | undefined
    // Check if any contingent beneficiary is a charity (naive check — real impl would be smarter)
    const hasCharitableBeneficiary = contingent?.some(b =>
      b.toLowerCase().includes('charity') || b.toLowerCase().includes('foundation')
    )
    return hasCharitableBeneficiary || false
  }

  // Default: agent not required
  return false
}

/**
 * Get the full analysis pipeline sequence
 *
 * Returns agents in execution order:
 * 1. DOCUMENT_CLASSIFIER (always first)
 * 2. Phase 1 specialists (parallel execution OK)
 * 3. COMPLIANCE_RISK (quality gate)
 * 4. CONFLICT_RESOLUTION (if conflicts detected)
 * 5. Phase 3 synthesis (STRATEGY_RECOMMENDATION → REPORT_COMPOSER)
 */
export function getAnalysisPipeline(documentTypes: DocumentType[]): {
  phase1: AgentId[]
  phase2: AgentId[]
  phase3: AgentId[]
} {
  const phase1Agents = getRequiredAgents(documentTypes)

  const phase2Agents: AgentId[] = ['COMPLIANCE_RISK']
  // CONFLICT_RESOLUTION added conditionally after COMPLIANCE_RISK runs

  const phase3Agents: AgentId[] = ['STRATEGY_RECOMMENDATION', 'REPORT_COMPOSER']

  return {
    phase1: phase1Agents,
    phase2: phase2Agents,
    phase3: phase3Agents,
  }
}

/**
 * Get suggested follow-up agents based on initial findings
 *
 * Example: If TRUST_STRUCTURE finds CRT mention, suggest CHARITABLE_STRATEGY
 */
export function getSuggestedFollowUpAgents(
  findings: Record<string, unknown>
): AgentId[] {
  const suggestions: AgentId[] = []

  // Check for charitable mentions
  const trustStructure = findings.TRUST_STRUCTURE as Record<string, unknown> | undefined
  if (trustStructure) {
    const ambiguities = trustStructure.ambiguities as string[] | undefined
    const hasCharitableMention = ambiguities?.some(a =>
      a.toLowerCase().includes('charit') || a.toLowerCase().includes('foundation')
    )
    if (hasCharitableMention && !findings.CHARITABLE_STRATEGY) {
      suggestions.push('CHARITABLE_STRATEGY')
    }
  }

  // Check for state tax exposure
  const taxExposure = findings.TAX_EXPOSURE as Record<string, unknown> | undefined
  if (taxExposure) {
    const stateTax = taxExposure.stateTax as Record<string, unknown> | undefined
    const taxDue = stateTax?.taxDue as number | undefined
    if (taxDue && taxDue > 100000 && !findings.STATE_TAX) {
      suggestions.push('STATE_TAX')
    }
  }

  // Check for entity valuation needs
  const hasEntityMention = Object.values(findings).some(f => {
    const str = JSON.stringify(f).toLowerCase()
    return str.includes('llc') || str.includes('partnership') || str.includes('corporation')
  })
  if (hasEntityMention && !findings.ENTITY_VALUATION) {
    suggestions.push('ENTITY_VALUATION')
  }

  return suggestions
}

/**
 * Agent execution metadata for observability
 */
export interface AgentExecution {
  agentId: AgentId
  phase: 1 | 2 | 3
  model: string
  startedAt: Date
  completedAt?: Date
  tokensUsed?: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
}

/**
 * Create execution tracker for monitoring agent pipeline
 */
export function createExecutionPlan(
  pipeline: ReturnType<typeof getAnalysisPipeline>
): AgentExecution[] {
  const plan: AgentExecution[] = []

  // Phase 1
  pipeline.phase1.forEach(agentId => {
    plan.push({
      agentId,
      phase: 1,
      model: AGENT_PROMPTS[agentId].model,
      startedAt: new Date(),
      status: 'pending',
    })
  })

  // Phase 2
  pipeline.phase2.forEach(agentId => {
    plan.push({
      agentId,
      phase: 2,
      model: AGENT_PROMPTS[agentId].model,
      startedAt: new Date(),
      status: 'pending',
    })
  })

  // Phase 3
  pipeline.phase3.forEach(agentId => {
    plan.push({
      agentId,
      phase: 3,
      model: AGENT_PROMPTS[agentId].model,
      startedAt: new Date(),
      status: 'pending',
    })
  })

  return plan
}
