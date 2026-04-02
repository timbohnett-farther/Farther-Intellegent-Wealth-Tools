// =============================================================================
// Rollover Engine — PDF Renderer (jsPDF)
// =============================================================================
//
// Server-side PDF generation using jsPDF. In browser context, jsPDF would
// render directly. For API routes, we generate a base64-encoded PDF.
// =============================================================================

import type { RolloverAnalysis, RolloverScore, NarrativeOutput, RolloverPlan } from '../types';

export interface PDFRenderContext {
  analysis: RolloverAnalysis;
  score: RolloverScore;
  narrative: NarrativeOutput;
  plan: RolloverPlan;
}

/**
 * Generates a PDF document as a base64 string.
 * Uses jsPDF which is already in package.json.
 *
 * Note: In the API route, this runs server-side.
 * jsPDF is imported dynamically to avoid SSR issues.
 */
export async function renderPDF(ctx: PDFRenderContext): Promise<{
  base64: string;
  filename: string;
  size_bytes: number;
  sections: string[];
}> {
  // Dynamic import for jsPDF (avoids SSR issues with canvas)
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const sections: string[] = [];
  let y = 20;

  // ---- Cover Page ----
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Rollover Analysis Report', 105, y, { align: 'center' });
  y += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(ctx.analysis.client_name, 105, y, { align: 'center' });
  y += 8;

  doc.setFontSize(11);
  doc.text(`${ctx.plan.plan_name} (EIN: ${ctx.plan.ein})`, 105, y, { align: 'center' });
  y += 8;
  doc.text(`Prepared: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 105, y, { align: 'center' });
  y += 15;

  // Score badge
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${ctx.score.composite_score}`, 105, y, { align: 'center' });
  y += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rollover Recommendation Score — ${ctx.score.recommendation_tier.replace(/_/g, ' ')}`, 105, y, { align: 'center' });
  sections.push('Cover');
  y += 20;

  // ---- Executive Summary ----
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(ctx.narrative.executive_summary, 170);
  doc.text(summaryLines, 20, y);
  y += summaryLines.length * 5 + 10;
  sections.push('Executive Summary');

  if (y > 250) { doc.addPage(); y = 20; }

  // ---- Score Overview ----
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('10-Factor Score Breakdown', 20, y);
  y += 10;
  sections.push('Score Breakdown');

  doc.setFontSize(9);
  for (const factor of ctx.score.factor_scores) {
    if (y > 270) { doc.addPage(); y = 20; }
    const label = factor.factor_name.replace(/_/g, ' ');
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}: ${factor.score}/100`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`(${factor.direction.replace(/_/g, ' ')}, weight: ${Math.round(factor.weight * 100)}%)`, 100, y);
    y += 5;
    const ratLines = doc.splitTextToSize(factor.rationale, 170);
    doc.text(ratLines, 20, y);
    y += ratLines.length * 4 + 6;
  }

  // ---- Recommendation ----
  doc.addPage();
  y = 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommendation', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const recLines = doc.splitTextToSize(ctx.narrative.recommendation_text, 170);
  doc.text(recLines, 20, y);
  y += recLines.length * 5 + 15;
  sections.push('Recommendation');

  // ---- Disclaimers ----
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Important Disclosures', 20, y);
  y += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  for (const disclaimer of ctx.narrative.disclaimers) {
    const dLines = doc.splitTextToSize(`• ${disclaimer}`, 170);
    doc.text(dLines, 20, y);
    y += dLines.length * 3.5 + 2;
  }
  sections.push('Disclosures');

  // ---- Footer ----
  doc.setFontSize(7);
  doc.text('Farther Financial Advisors, LLC | SEC Registered Investment Advisor', 105, 285, { align: 'center' });

  // Output
  const base64 = doc.output('datauristring').split(',')[1];
  const filename = `Rollover_Analysis_${ctx.analysis.client_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  const size = Math.round(base64.length * 0.75);

  return { base64, filename, size_bytes: size, sections };
}
