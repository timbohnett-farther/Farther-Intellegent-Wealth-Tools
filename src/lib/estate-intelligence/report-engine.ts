// =============================================================================
// Trust & Estate Intelligence Engine — Report Synthesis & Export
// =============================================================================
//
// Orchestrates AI-powered report composition, applies UPL compliance filter,
// and generates exportable formats (PDF, DOCX) for advisor-client delivery.
//
// =============================================================================

import { callAI } from '@/lib/ai/gateway';
import { jsPDF } from 'jspdf';
import type {
  AgentFinding,
  ClassifiedDocument,
  FindingSeverity,
} from './types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EstateReport {
  analysisId: string;
  sections: Array<{
    key: string;
    title: string;
    content: string;
    subsections?: Array<{ title: string; content: string }>;
  }>;
  executiveSummary: string;
  keyNumbers: {
    estateValue: number;
    taxExposure: number;
    findingsCount: number;
    highSeverity: number;
    topRecommendations: string[];
  };
  uplFilterPassed: boolean;
  qualityGatePassed: boolean;
  generatedAt: string;
}

export interface ComposeReportParams {
  analysisId: string;
  findings: AgentFinding[];
  clientName: string;
  documents: ClassifiedDocument[];
  estateValue?: number;
  taxExposure?: number;
}

// ── UPL Compliance Filter ────────────────────────────────────────────────────

const UPL_FORBIDDEN_PATTERNS = [
  /\byou should\b/i,
  /\byou must\b/i,
  /\bI recommend you\b/i,
  /\bmy legal opinion\b/i,
  /\bthis is legal advice\b/i,
  /\bI advise you to\b/i,
  /\bfile a lawsuit\b/i,
  /\bin my opinion as an attorney\b/i,
];

function checkUPLCompliance(text: string): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const pattern of UPL_FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push(match[0]);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

// ── Report Composition ───────────────────────────────────────────────────────

/**
 * Compose a comprehensive estate analysis report using AI synthesis.
 * Uses Opus-level model for deep reasoning across all agent findings.
 */
export async function composeReport(params: ComposeReportParams): Promise<EstateReport> {
  const {
    analysisId,
    findings,
    clientName,
    documents,
    estateValue = 0,
    taxExposure = 0,
  } = params;

  // Group findings by severity
  const highSeverity = findings.filter((f) => f.severity === 'HIGH');
  const mediumSeverity = findings.filter((f) => f.severity === 'MEDIUM');
  const lowSeverity = findings.filter((f) => f.severity === 'LOW');

  // Build AI prompt
  const systemPrompt = `You are composing a comprehensive estate analysis report for a wealth management firm.

CRITICAL RULES:
1. NEVER provide legal advice (e.g., "you should", "you must", "I recommend you")
2. Present findings as observations and planning considerations
3. Suggest advisor-client discussions or consultations with estate attorneys
4. Use language like "Consider discussing...", "This may warrant...", "Advisors should evaluate..."
5. Maintain objective, analytical tone
6. Focus on financial planning implications, not legal directives
7. Include clear disclaimers about the need for legal counsel

You are NOT a lawyer. You are a financial planning analyst identifying opportunities and risks.`;

  const userPrompt = `Compose an estate analysis report for ${clientName}.

DOCUMENTS ANALYZED:
${documents.map((d) => `- ${d.fileName} (${d.document_type}${d.document_subtype ? `, ${d.document_subtype}` : ''})`).join('\n')}

FINDINGS SUMMARY:
- Total findings: ${findings.length}
- High severity: ${highSeverity.length}
- Medium severity: ${mediumSeverity.length}
- Low severity: ${lowSeverity.length}
- Estimated estate value: $${estateValue.toLocaleString()}
- Estimated tax exposure: $${taxExposure.toLocaleString()}

HIGH SEVERITY FINDINGS:
${highSeverity.map((f) => `• ${f.title}: ${f.detail}`).join('\n') || 'None'}

MEDIUM SEVERITY FINDINGS:
${mediumSeverity.map((f) => `• ${f.title}: ${f.detail}`).join('\n') || 'None'}

LOW SEVERITY FINDINGS:
${lowSeverity.map((f) => `• ${f.title}: ${f.detail}`).join('\n') || 'None'}

Compose a report with the following sections:

1. EXECUTIVE SUMMARY (2 pages max)
   - Estate overview
   - Key findings at a glance
   - Top 3-5 planning priorities

2. ESTATE STRUCTURE MAP
   - Current structure analysis
   - Entity relationships
   - Asset ownership patterns

3. ASSET INVENTORY ANALYSIS
   - Documented assets
   - Missing asset types
   - Valuation observations

4. TAX EXPOSURE ANALYSIS
   - Federal estate tax considerations
   - State estate/inheritance tax
   - Gift tax planning observations

5. FINDINGS & RISK ASSESSMENT
   - Organized by severity (HIGH → MEDIUM → LOW)
   - Each finding: title, observation, planning consideration, legal authority (if applicable)

6. STRATEGIC RECOMMENDATIONS
   - Ranked by impact
   - Planning discussions to initiate
   - Professional consultations recommended

7. ACTION PLAN
   - Immediate next steps
   - 90-day priorities
   - Long-term planning milestones

8. STATE-SPECIFIC ANALYSIS
   - Governing law observations
   - State tax considerations
   - Multi-state planning needs

9. APPENDICES
   - Document inventory
   - Missing documents checklist
   - Legal authority references
   - Disclaimer (required legal/tax counsel)

Return valid JSON with this structure:
{
  "executiveSummary": "Full executive summary text...",
  "sections": [
    {
      "key": "estate_structure",
      "title": "Estate Structure Map",
      "content": "Section content...",
      "subsections": [
        { "title": "Subsection title", "content": "Subsection content..." }
      ]
    }
  ],
  "topRecommendations": ["Rec 1", "Rec 2", "Rec 3"]
}`;

  console.log('[Report Engine] Composing report with AI...');

  const aiResponse = await callAI({
    systemPrompt,
    userPrompt,
    temperature: 0.2, // Low temp for consistent structure
    maxTokens: 16000, // Large token budget for comprehensive report
    jsonMode: true,
  });

  // Parse AI response
  let reportData: any;
  try {
    reportData = JSON.parse(aiResponse.text);
  } catch (err) {
    console.error('[Report Engine] Failed to parse AI response as JSON, attempting extraction...');
    // Try to extract JSON from response
    const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }
    reportData = JSON.parse(jsonMatch[0]);
  }

  // Generate executive summary if not provided
  const executiveSummary = reportData.executiveSummary || generateExecutiveSummary(findings, taxExposure);

  // Build final report structure
  const fullReportText = [
    executiveSummary,
    ...reportData.sections.map((s: any) => s.content),
  ].join('\n\n');

  // Apply UPL compliance filter
  const uplCheck = checkUPLCompliance(fullReportText);

  if (!uplCheck.passed) {
    console.warn('[Report Engine] UPL violations detected:', uplCheck.violations);
    // In production, you might reject or re-generate here
  }

  const report: EstateReport = {
    analysisId,
    executiveSummary,
    sections: reportData.sections,
    keyNumbers: {
      estateValue,
      taxExposure,
      findingsCount: findings.length,
      highSeverity: highSeverity.length,
      topRecommendations: reportData.topRecommendations || [],
    },
    uplFilterPassed: uplCheck.passed,
    qualityGatePassed: true, // Could add quality checks here
    generatedAt: new Date().toISOString(),
  };

  console.log(`[Report Engine] Report composed: ${report.sections.length} sections, UPL: ${uplCheck.passed ? 'PASS' : 'FAIL'}`);

  return report;
}

/**
 * Generate a fallback executive summary (template-based).
 */
export function generateExecutiveSummary(findings: AgentFinding[], taxExposure: number): string {
  const highSeverity = findings.filter((f) => f.severity === 'HIGH');
  const actionRequired = findings.filter((f) => f.action_required);

  return `# Executive Summary

This estate analysis identifies ${findings.length} findings across the reviewed estate planning documents.

## Key Observations

- **High Priority Items**: ${highSeverity.length} findings require immediate advisor attention
- **Action Required**: ${actionRequired.length} findings suggest planning discussions with the client
- **Estimated Tax Exposure**: $${taxExposure.toLocaleString()} (based on current structure)

## Top Priorities

${highSeverity.slice(0, 5).map((f, i) => `${i + 1}. **${f.title}**: ${f.detail.substring(0, 150)}...`).join('\n')}

## Next Steps

The advisor should review these findings with the client and consider coordinating with qualified estate planning attorneys and tax professionals to address identified opportunities and risks.

---

**DISCLAIMER**: This analysis is for financial planning purposes only and does not constitute legal or tax advice. Clients should consult with qualified legal and tax professionals before implementing any estate planning strategies.`;
}

// ── Export Formats ───────────────────────────────────────────────────────────

/**
 * Export report as PDF using jsPDF.
 */
export async function exportToPDF(report: EstateReport): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  let yPos = margin;

  // Helper to add page break if needed
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Estate Analysis Report', margin, yPos);
  yPos += 30;

  // Generated date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`, margin, yPos);
  yPos += 20;

  // Key numbers box
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Metrics', margin, yPos);
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Estate Value: $${report.keyNumbers.estateValue.toLocaleString()}`, margin, yPos);
  yPos += 15;
  doc.text(`Tax Exposure: $${report.keyNumbers.taxExposure.toLocaleString()}`, margin, yPos);
  yPos += 15;
  doc.text(`Findings: ${report.keyNumbers.findingsCount} (${report.keyNumbers.highSeverity} high priority)`, margin, yPos);
  yPos += 30;

  // Executive Summary
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, yPos);
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(report.executiveSummary, contentWidth);
  for (const line of summaryLines) {
    checkPageBreak(15);
    doc.text(line, margin, yPos);
    yPos += 15;
  }

  yPos += 20;

  // Sections
  for (const section of report.sections) {
    checkPageBreak(50);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, yPos);
    yPos += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const contentLines = doc.splitTextToSize(section.content, contentWidth);
    for (const line of contentLines) {
      checkPageBreak(15);
      doc.text(line, margin, yPos);
      yPos += 15;
    }

    yPos += 10;

    // Subsections
    if (section.subsections) {
      for (const subsection of section.subsections) {
        checkPageBreak(30);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(subsection.title, margin + 20, yPos);
        yPos += 15;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const subLines = doc.splitTextToSize(subsection.content, contentWidth - 20);
        for (const line of subLines) {
          checkPageBreak(15);
          doc.text(line, margin + 20, yPos);
          yPos += 15;
        }

        yPos += 10;
      }
    }

    yPos += 20;
  }

  // Footer disclaimer on last page
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const disclaimerText = 'This analysis is for financial planning purposes only and does not constitute legal or tax advice. Consult qualified professionals.';
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth);
  yPos = pageHeight - margin - disclaimerLines.length * 10;
  for (const line of disclaimerLines) {
    doc.text(line, margin, yPos);
    yPos += 10;
  }

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Export report as DOCX (simplified: formatted text).
 * In production, use a library like `docx` for true Word format.
 */
export async function exportToDocx(report: EstateReport): Promise<Buffer> {
  // Simplified implementation: return formatted text
  // For true DOCX, integrate `docx` library

  let docText = `ESTATE ANALYSIS REPORT\n\n`;
  docText += `Generated: ${new Date(report.generatedAt).toLocaleDateString()}\n\n`;
  docText += `=== KEY METRICS ===\n`;
  docText += `Estate Value: $${report.keyNumbers.estateValue.toLocaleString()}\n`;
  docText += `Tax Exposure: $${report.keyNumbers.taxExposure.toLocaleString()}\n`;
  docText += `Findings: ${report.keyNumbers.findingsCount} (${report.keyNumbers.highSeverity} high priority)\n\n`;

  docText += `=== EXECUTIVE SUMMARY ===\n\n`;
  docText += report.executiveSummary + '\n\n';

  for (const section of report.sections) {
    docText += `=== ${section.title.toUpperCase()} ===\n\n`;
    docText += section.content + '\n\n';

    if (section.subsections) {
      for (const subsection of section.subsections) {
        docText += `--- ${subsection.title} ---\n`;
        docText += subsection.content + '\n\n';
      }
    }
  }

  docText += `\n\nDISCLAIMER: This analysis is for financial planning purposes only and does not constitute legal or tax advice. Consult qualified professionals.\n`;

  return Buffer.from(docText, 'utf-8');
}
