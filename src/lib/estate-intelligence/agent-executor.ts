// =============================================================================
// Agent Executor — Generic Agent Execution Engine
// =============================================================================
//
// Provides the execution harness for all 13 TEIE agents. Handles context
// building from classified documents, prior findings from other agents,
// AI API calls with retry logic, JSON parsing, and token tracking.
//
// =============================================================================

import { callAI, extractJSON } from '@/lib/ai/gateway';
import type { AgentId, AgentOutput, ClassifiedDocument, AgentFinding } from './types';

// ── Types ────────────────────────────────────────────────────────────────────

interface ExecuteAgentParams {
  agentId: AgentId;
  systemPrompt: string;
  documents: ClassifiedDocument[];
  priorFindings?: AgentOutput[];
  model?: string;
  maxTokens?: number;
}

// ── Retry Configuration ──────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ── Agent Executor ───────────────────────────────────────────────────────────

/**
 * Executes a single agent with the given system prompt, documents, and
 * optional prior findings from other agents. Returns structured AgentOutput.
 */
export async function executeAgent(params: ExecuteAgentParams): Promise<AgentOutput> {
  const {
    agentId,
    systemPrompt,
    documents,
    priorFindings = [],
    maxTokens = 8192,
  } = params;

  console.log(`[Agent Executor] Starting ${agentId}, docs=${documents.length}, priorFindings=${priorFindings.length}`);

  // Build context from documents and prior findings
  const documentContext = buildDocumentContext(documents);
  const priorFindingsContext = priorFindings.length > 0
    ? buildPriorFindingsContext(priorFindings)
    : '';

  const userPrompt = `${documentContext}

${priorFindingsContext ? `${priorFindingsContext}\n\n` : ''}Analyze the provided documents and return structured findings in JSON format:

{
  "agent_id": "${agentId}",
  "analysis_timestamp": "<ISO timestamp>",
  "documents_analyzed": ["<document IDs>"],
  "findings": [
    {
      "finding_id": "<unique ID>",
      "category": "<FindingCategory>",
      "severity": "<HIGH|MEDIUM|LOW|INFO>",
      "title": "<Short title>",
      "detail": "<Detailed explanation>",
      "provisions_cited": ["<Document + clause references>"],
      "legal_authority": "<IRC § or case law>",
      "cross_references": ["<Other finding IDs>"],
      "action_required": <boolean>,
      "recommended_action": "<Action if action_required=true>",
      "estimated_tax_impact": {
        "annual": <number>,
        "lifetime": <number>,
        "description": "<explanation>"
      }
    }
  ],
  "summary_statistics": {
    "total_findings": <number>,
    "high_severity": <number>,
    "medium_severity": <number>,
    "low_severity": <number>,
    "estimated_total_tax_impact": <number>
  }
}

Return JSON only — no markdown, no explanatory text.`;

  // Execute with retry logic
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await callAI({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.2, // Low temperature for structured analysis
        maxTokens,
      });

      console.log(
        `[Agent Executor] ${agentId} completed via ${response.provider}, tokens=${response.tokensUsed ?? 'unknown'}`
      );

      // Parse JSON response
      const agentOutput = extractJSON<AgentOutput>(response.text);

      // Validate response structure
      if (!agentOutput.agent_id) {
        throw new Error('Agent output missing agent_id');
      }

      if (!Array.isArray(agentOutput.findings)) {
        throw new Error('Agent output missing findings array');
      }

      // Ensure summary_statistics exists
      if (!agentOutput.summary_statistics) {
        agentOutput.summary_statistics = {
          total_findings: agentOutput.findings.length,
          high_severity: agentOutput.findings.filter((f) => f.severity === 'HIGH').length,
          medium_severity: agentOutput.findings.filter((f) => f.severity === 'MEDIUM').length,
          low_severity: agentOutput.findings.filter((f) => f.severity === 'LOW').length,
        };
      }

      // Ensure ISO timestamp
      if (!agentOutput.analysis_timestamp) {
        agentOutput.analysis_timestamp = new Date().toISOString();
      }

      // Ensure documents_analyzed
      if (!agentOutput.documents_analyzed) {
        agentOutput.documents_analyzed = documents.map((d) => d.id);
      }

      return agentOutput;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Agent Executor] ${agentId} attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `[Agent Executor] ${agentId} failed after ${MAX_RETRIES} attempts: ${lastError?.message ?? 'Unknown error'}`
  );
}

// ── Context Builders ─────────────────────────────────────────────────────────

/**
 * Formats classified documents for inclusion in agent prompts.
 */
export function buildDocumentContext(documents: ClassifiedDocument[]): string {
  if (documents.length === 0) {
    return 'No documents provided.';
  }

  const sections = documents.map((doc, idx) => {
    const metadata = [
      `**Document ${idx + 1} ID:** ${doc.id}`,
      `**File Name:** ${doc.fileName}`,
      `**Type:** ${doc.document_type}`,
      doc.document_subtype ? `**Subtype:** ${doc.document_subtype}` : null,
      `**Confidence:** ${(doc.confidence * 100).toFixed(1)}%`,
      doc.metadata.execution_date ? `**Execution Date:** ${doc.metadata.execution_date}` : null,
      doc.metadata.governing_law ? `**Governing Law:** ${doc.metadata.governing_law}` : null,
      doc.metadata.grantors?.length ? `**Grantors:** ${doc.metadata.grantors.join(', ')}` : null,
      doc.metadata.trustees?.length ? `**Trustees:** ${doc.metadata.trustees.join(', ')}` : null,
      doc.metadata.beneficiaries?.length
        ? `**Beneficiaries:** ${doc.metadata.beneficiaries.join(', ')}`
        : null,
      doc.red_flags?.length ? `**Red Flags:** ${doc.red_flags.join('; ')}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const text =
      doc.extractedText.length > 6000
        ? doc.extractedText.slice(0, 6000) + '\n\n...[truncated for brevity]'
        : doc.extractedText;

    return `## Document ${idx + 1}: ${doc.fileName}

${metadata}

**Key Provisions Summary:**
${doc.key_provisions_summary}

**Full Text:**
${text}

---`;
  });

  return `# Classified Documents

${sections.join('\n\n')}`;
}

/**
 * Formats prior agent findings for Phase 2 agents.
 */
export function buildPriorFindingsContext(findings: AgentOutput[]): string {
  if (findings.length === 0) {
    return '';
  }

  const sections = findings.map((output) => {
    const findingsList = output.findings
      .map(
        (f) =>
          `- **${f.severity}** [${f.category}]: ${f.title}\n  ${f.detail.slice(0, 200)}${f.detail.length > 200 ? '...' : ''}`
      )
      .join('\n');

    return `### ${output.agent_id} (${output.findings.length} findings)

${findingsList}`;
  });

  return `# Prior Agent Findings

The following agents have already analyzed the documents. Use their findings to inform your analysis and identify strategic opportunities or conflicts.

${sections.join('\n\n')}`;
}
