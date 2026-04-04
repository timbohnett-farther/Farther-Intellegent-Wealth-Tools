/**
 * Agentic Workflow — Autonomous Proposal Generation
 *
 * Orchestrates 8-step autonomous proposal generation with minimal human input.
 * Uses AI gateway (callAI, extractJSON) for intelligent decision-making at each step.
 */

import { callAI, extractJSON } from '@/lib/ai/gateway';

// ============================================================================
// Types
// ============================================================================

export type WorkflowStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface WorkflowStep {
  stepId: string;
  name: string;
  status: WorkflowStepStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  durationMs?: number;
}

export type WorkflowStatus = 'INITIALIZING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export interface AgenticWorkflow {
  workflowId: string;
  proposalId: string;
  clientContext: AgentContext;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  currentStepIndex: number;
  createdAt: string;
  completedAt?: string;
}

export interface AgentContext {
  clientName: string;
  clientEmail?: string;
  assetsInScope: number;
  proposalType: string;
  occasion: string;
  meetingNotes?: string;
  riskPreferences?: string;
  constraints?: string[];
}

// ============================================================================
// In-Memory Store
// ============================================================================

const workflows = new Map<string, AgenticWorkflow>();

// ============================================================================
// Step Definitions
// ============================================================================

const WORKFLOW_STEPS: Array<Omit<WorkflowStep, 'status' | 'input' | 'output'>> = [
  { stepId: 'analyze-context', name: 'Analyze Client Context' },
  { stepId: 'pull-portfolio', name: 'Pull Portfolio Data' },
  { stepId: 'assess-risk', name: 'Assess Risk Profile' },
  { stepId: 'select-model', name: 'Select Optimal Model' },
  { stepId: 'run-analytics', name: 'Run Analytics' },
  { stepId: 'generate-narrative', name: 'Generate Narrative' },
  { stepId: 'generate-compliance', name: 'Generate Compliance Docs' },
  { stepId: 'compile-proposal', name: 'Compile Final Proposal' },
];

// ============================================================================
// Workflow Execution
// ============================================================================

export async function runAgenticWorkflow(context: AgentContext): Promise<AgenticWorkflow> {
  const workflowId = crypto.randomUUID();
  const proposalId = crypto.randomUUID();

  const workflow: AgenticWorkflow = {
    workflowId,
    proposalId,
    clientContext: context,
    steps: WORKFLOW_STEPS.map(step => ({
      ...step,
      status: 'PENDING' as WorkflowStepStatus,
    })),
    status: 'INITIALIZING',
    currentStepIndex: 0,
    createdAt: new Date().toISOString(),
  };

  workflows.set(workflowId, workflow);

  // Start workflow execution
  workflow.status = 'RUNNING';

  try {
    // Step 1: Analyze client context
    await executeStep(workflow, 0, async (input) => {
      const prompt = `Analyze this client context and extract goals, preferences, and key insights:
Client: ${context.clientName}
Assets: $${context.assetsInScope.toLocaleString()}
Proposal Type: ${context.proposalType}
Occasion: ${context.occasion}
${context.meetingNotes ? `Notes: ${context.meetingNotes}` : ''}
${context.riskPreferences ? `Risk Preferences: ${context.riskPreferences}` : ''}

Return JSON with: goals (array), preferences (object), keyInsights (array), riskTolerance (1-10)`;

      const response = await callAI({
        systemPrompt: 'You are a financial analysis expert.',
        userPrompt: prompt,
        temperature: 0.3,
      });
      return extractJSON(response.text);
    });

    // Step 2: Pull portfolio data (mock for now)
    await executeStep(workflow, 1, async (input) => {
      // In production, this would call custodian API
      return {
        holdings: [
          { symbol: 'VTI', shares: 1000, marketValue: 250000, assetClass: 'US Equity' },
          { symbol: 'BND', shares: 2000, marketValue: 150000, assetClass: 'Bonds' },
          { symbol: 'VEA', shares: 500, marketValue: 50000, assetClass: 'International Equity' },
        ],
        totalMarketValue: 450000,
        lastUpdated: new Date().toISOString(),
      };
    });

    // Step 3: Assess risk profile
    await executeStep(workflow, 2, async (input) => {
      const contextAnalysis = workflow.steps[0].output;
      const prompt = `Generate a risk profile assessment based on:
Risk Tolerance: ${(contextAnalysis as any)?.riskTolerance || 5}/10
Age: ${context.occasion.includes('retirement') ? '60+' : '40-50'}
Goals: ${JSON.stringify((contextAnalysis as any)?.goals || [])}

Return JSON with: riskScore (1-10), recommendedProfile (Conservative/Moderate/Aggressive), rationale (string)`;

      const response = await callAI({
        systemPrompt: 'You are a risk assessment expert.',
        userPrompt: prompt,
        temperature: 0.2,
      });
      return extractJSON(response.text);
    });

    // Step 4: Select optimal model
    await executeStep(workflow, 3, async (input) => {
      const riskProfile = workflow.steps[2].output as any;
      const riskScore = riskProfile?.riskScore || 5;

      // Match risk score to model allocation
      let model;
      if (riskScore <= 3) {
        model = { name: 'Conservative Growth', stocks: 30, bonds: 60, alternatives: 10 };
      } else if (riskScore <= 6) {
        model = { name: 'Balanced Growth', stocks: 60, bonds: 30, alternatives: 10 };
      } else {
        model = { name: 'Aggressive Growth', stocks: 80, bonds: 10, alternatives: 10 };
      }

      return { selectedModel: model, riskScore };
    });

    // Step 5: Run analytics (compute side-by-side)
    await executeStep(workflow, 4, async (input) => {
      const portfolio = workflow.steps[1].output as any;
      const model = (workflow.steps[3].output as any)?.selectedModel;

      const currentAllocation = {
        stocks: 66.7,
        bonds: 33.3,
        alternatives: 0,
      };

      const projectedReturn = model.name === 'Conservative Growth' ? 4.5 :
                              model.name === 'Balanced Growth' ? 6.5 : 8.0;

      return {
        currentAllocation,
        proposedAllocation: { stocks: model.stocks, bonds: model.bonds, alternatives: model.alternatives },
        projectedReturn,
        estimatedGrowth10yr: portfolio.totalMarketValue * Math.pow(1 + projectedReturn / 100, 10),
        riskMetrics: { sharpeRatio: 0.85, maxDrawdown: -15 },
      };
    });

    // Step 6: Generate narrative
    await executeStep(workflow, 5, async (input) => {
      const contextAnalysis = workflow.steps[0].output as any;
      const model = (workflow.steps[3].output as any)?.selectedModel;
      const analytics = workflow.steps[4].output as any;

      const prompt = `Write a compelling proposal narrative for:
Client: ${context.clientName}
Goals: ${JSON.stringify(contextAnalysis?.goals || [])}
Selected Model: ${model?.name}
Projected Return: ${analytics?.projectedReturn}%

Include:
1. Executive summary (2-3 sentences)
2. Why this model fits their goals (1 paragraph)
3. Expected outcomes over 10 years (bullet points)

Return JSON with: executiveSummary, modelRationale, expectedOutcomes (array)`;

      const response = await callAI({
        systemPrompt: 'You are a financial proposal writer.',
        userPrompt: prompt,
        temperature: 0.7,
      });
      return extractJSON(response.text);
    });

    // Step 7: Generate compliance docs (IPS + RegBI)
    await executeStep(workflow, 6, async (input) => {
      const model = (workflow.steps[3].output as any)?.selectedModel;
      const riskProfile = workflow.steps[2].output as any;

      const prompt = `Generate compliance documentation:
Model: ${model?.name}
Risk Profile: ${riskProfile?.recommendedProfile}
Client: ${context.clientName}

Return JSON with:
- ips: { objectives, constraints, rebalancingPolicy }
- regBi: { conflictsOfInterest, feeDisclosure, materialFacts }`;

      const response = await callAI({
        systemPrompt: 'You are a compliance documentation expert.',
        userPrompt: prompt,
        temperature: 0.1,
      });
      return extractJSON(response.text);
    });

    // Step 8: Compile final proposal
    await executeStep(workflow, 7, async (input) => {
      const narrative = workflow.steps[5].output as any;
      const compliance = workflow.steps[6].output as any;
      const analytics = workflow.steps[4].output as any;

      return {
        proposalId: workflow.proposalId,
        clientName: context.clientName,
        narrative,
        analytics,
        compliance,
        generatedAt: new Date().toISOString(),
      };
    });

    workflow.status = 'COMPLETED';
    workflow.completedAt = new Date().toISOString();
  } catch (err) {
    workflow.status = 'FAILED';
    const currentStep = workflow.steps[workflow.currentStepIndex];
    if (currentStep) {
      currentStep.status = 'FAILED';
      currentStep.error = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  return workflow;
}

// ============================================================================
// Step Execution Helper
// ============================================================================

async function executeStep(
  workflow: AgenticWorkflow,
  stepIndex: number,
  fn: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
): Promise<void> {
  const step = workflow.steps[stepIndex];
  if (!step) throw new Error(`Step ${stepIndex} not found`);

  workflow.currentStepIndex = stepIndex;
  step.status = 'RUNNING';
  step.startedAt = new Date().toISOString();

  const startTime = Date.now();

  try {
    const input = stepIndex > 0 ? workflow.steps[stepIndex - 1].output || {} : {};
    step.input = input;
    step.output = await fn(input);
    step.status = 'COMPLETED';
  } catch (err) {
    step.status = 'FAILED';
    step.error = err instanceof Error ? err.message : 'Unknown error';
    throw err;
  } finally {
    step.completedAt = new Date().toISOString();
    step.durationMs = Date.now() - startTime;
  }
}

// ============================================================================
// Workflow Management
// ============================================================================

export function getWorkflowStatus(workflowId: string): AgenticWorkflow | null {
  return workflows.get(workflowId) || null;
}

export function pauseWorkflow(workflowId: string): boolean {
  const workflow = workflows.get(workflowId);
  if (!workflow || workflow.status !== 'RUNNING') return false;

  workflow.status = 'PAUSED';
  return true;
}

export async function resumeWorkflow(workflowId: string): Promise<AgenticWorkflow | null> {
  const workflow = workflows.get(workflowId);
  if (!workflow || workflow.status !== 'PAUSED') return null;

  workflow.status = 'RUNNING';

  try {
    // Resume from current step
    for (let i = workflow.currentStepIndex; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      if (step.status === 'PENDING') {
        // Execute remaining steps
        // (In a real implementation, you'd store the step execution function)
        break;
      }
    }
  } catch (err) {
    workflow.status = 'FAILED';
  }

  return workflow;
}
