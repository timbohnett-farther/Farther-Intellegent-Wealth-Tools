/**
 * Farther Proposal PDF Generator
 *
 * Server-side PDF generation using jsPDF for branded 9-page proposal documents.
 * Generates a complete investment proposal with client narrative, metrics, and disclosures.
 *
 * @module proposal-engine/documents/proposal-pdf
 */

import jsPDF from 'jspdf';
import type { Holding, PortfolioMetrics, MoneyCents } from '../types';

// =====================================================================
// Brand Colors (Farther Design System)
// =====================================================================

const BRAND = {
  primary: '#1B3A4B',    // Dark blue
  accent: '#D4A574',     // Gold
  light: '#F5F0EB',      // Cream
  text: '#2C3E50',       // Charcoal
  textMuted: '#6B7280',  // Gray
  border: '#E5E7EB',     // Light gray
};

// =====================================================================
// Types
// =====================================================================

export interface ProposalPDFParams {
  proposal: {
    clientName: string;
    proposalType: string;
    occasion: string;
    createdAt: string;
  };
  narrative: {
    executiveSummary: string;
    riskAnalysis: string;
    portfolioDiagnosis: string;
    recommendation: string;
    feeTransparency: string;
    whatHappensNext: string;
  };
  currentMetrics: PortfolioMetrics;
  proposedMetrics: PortfolioMetrics;
  riskScore?: number;
  riskLabel?: string;
  feeSavings?: {
    annual: number;
    fiveYear: number;
    tenYear: number;
    twentyYear: number;
  };
  holdings?: Holding[];
  advisorName?: string;
  firmName?: string;
}

// =====================================================================
// Main Export
// =====================================================================

/**
 * Generate a branded 9-page proposal PDF.
 *
 * @param params - Proposal data and narrative sections
 * @returns Buffer containing the PDF document
 *
 * @example
 * ```ts
 * const pdfBuffer = await generateProposalPDF({
 *   proposal: { clientName: 'John Smith', proposalType: 'NEW_RELATIONSHIP', occasion: 'INITIAL_MEETING', createdAt: '2026-04-04' },
 *   narrative: { executiveSummary: '...', riskAnalysis: '...', portfolioDiagnosis: '...', recommendation: '...', feeTransparency: '...', whatHappensNext: '...' },
 *   currentMetrics: { totalValue: 100000000, holdingCount: 15, ... },
 *   proposedMetrics: { totalValue: 100000000, holdingCount: 8, ... },
 *   riskScore: 62,
 *   riskLabel: 'MODERATELY_AGGRESSIVE',
 *   feeSavings: { annual: 5000, fiveYear: 25000, tenYear: 50000, twentyYear: 100000 },
 *   advisorName: 'Jane Advisor',
 *   firmName: 'Farther'
 * });
 * ```
 */
export async function generateProposalPDF(params: ProposalPDFParams): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const margins = { top: 20, left: 20, right: 20, bottom: 20 };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margins.left - margins.right;

  let currentPage = 1;

  // Helper: Add header to every page
  const addHeader = () => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.primary);
    doc.text('FARTHER', margins.left, 12);
  };

  // Helper: Add footer with page number
  const addFooter = (pageNum: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.textMuted);
    doc.text(`Page ${pageNum} of 9`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  // Helper: Format currency from cents to dollars
  const formatCurrency = (cents: MoneyCents | number): string => {
    const dollars = (cents as number) / 100;
    return `$${Math.abs(dollars).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper: Format percentage
  const formatPct = (decimal: number): string => {
    return `${(decimal * 100).toFixed(2)}%`;
  };

  // Helper: Wrap text and return lines
  const wrapText = (text: string, maxWidth: number): string[] => {
    return doc.splitTextToSize(text, maxWidth);
  };

  // =====================================================================
  // Page 1: Cover Page
  // =====================================================================

  doc.setFillColor(BRAND.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#FFFFFF');
  doc.text('Investment Proposal', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(params.proposal.clientName, pageWidth / 2, 55, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(BRAND.text);
  doc.text(`Prepared by: ${params.advisorName || 'Your Advisor'}`, pageWidth / 2, 100, { align: 'center' });
  doc.text(`${params.firmName || 'Farther'}`, pageWidth / 2, 108, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(BRAND.textMuted);
  doc.text(`${new Date(params.proposal.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 125, { align: 'center' });

  addFooter(currentPage);

  // =====================================================================
  // Page 2: Executive Summary
  // =====================================================================

  doc.addPage();
  currentPage++;
  addHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.primary);
  doc.text('Executive Summary', margins.left, margins.top + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND.text);

  const summaryLines = wrapText(params.narrative.executiveSummary, contentWidth);
  let yPos = margins.top + 20;
  summaryLines.forEach((line) => {
    if (yPos > pageHeight - margins.bottom - 10) {
      doc.addPage();
      currentPage++;
      addHeader();
      yPos = margins.top + 10;
    }
    doc.text(line, margins.left, yPos);
    yPos += 5;
  });

  addFooter(currentPage);

  // =====================================================================
  // Page 3: Risk Analysis
  // =====================================================================

  doc.addPage();
  currentPage++;
  addHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.primary);
  doc.text('Risk Analysis', margins.left, margins.top + 10);

  if (params.riskScore !== undefined && params.riskLabel) {
    doc.setFontSize(14);
    doc.setTextColor(BRAND.accent);
    doc.text(`Risk Profile: ${params.riskLabel}`, margins.left, margins.top + 22);
    doc.setFontSize(12);
    doc.setTextColor(BRAND.text);
    doc.text(`Composite Risk Score: ${params.riskScore}/100`, margins.left, margins.top + 30);
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const riskLines = wrapText(params.narrative.riskAnalysis, contentWidth);
  yPos = margins.top + 40;
  riskLines.forEach((line) => {
    if (yPos > pageHeight - margins.bottom - 10) {
      doc.addPage();
      currentPage++;
      addHeader();
      yPos = margins.top + 10;
    }
    doc.text(line, margins.left, yPos);
    yPos += 5;
  });

  addFooter(currentPage);

  // =====================================================================
  // Page 4: Portfolio Diagnosis
  // =====================================================================

  doc.addPage();
  currentPage++;
  addHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.primary);
  doc.text('Portfolio Diagnosis', margins.left, margins.top + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND.text);
  const diagnosisLines = wrapText(params.narrative.portfolioDiagnosis, contentWidth);
  yPos = margins.top + 20;
  diagnosisLines.forEach((line) => {
    if (yPos > pageHeight - margins.bottom - 10) {
      doc.addPage();
      currentPage++;
      addHeader();
      yPos = margins.top + 10;
    }
    doc.text(line, margins.left, yPos);
    yPos += 5;
  });

  // Current holdings summary
  if (params.holdings && params.holdings.length > 0) {
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Current Holdings Summary', margins.left, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    params.holdings.slice(0, 10).forEach((holding) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      const ticker = holding.ticker || 'N/A';
      const name = holding.description || holding.name || '';
      const value = formatCurrency(holding.marketValue);
      doc.text(`${ticker}: ${name}`, margins.left, yPos);
      doc.text(value, pageWidth - margins.right, yPos, { align: 'right' });
      yPos += 5;
    });

    if (params.holdings.length > 10) {
      doc.setTextColor(BRAND.textMuted);
      doc.text(`...and ${params.holdings.length - 10} more holdings`, margins.left, yPos);
    }
  }

  addFooter(currentPage);

  // =====================================================================
  // Page 5: Recommendation
  // =====================================================================

  doc.addPage();
  currentPage++;
  addHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.primary);
  doc.text('Our Recommendation', margins.left, margins.top + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND.text);
  const recLines = wrapText(params.narrative.recommendation, contentWidth);
  yPos = margins.top + 20;
  recLines.forEach((line) => {
    if (yPos > pageHeight - margins.bottom - 10) {
      doc.addPage();
      currentPage++;
      addHeader();
      yPos = margins.top + 10;
    }
    doc.text(line, margins.left, yPos);
    yPos += 5;
  });

  addFooter(currentPage);

  // =====================================================================
  // Page 6: Side-by-Side Comparison
  // =====================================================================

  doc.addPage();
  currentPage++;
  addHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.primary);
  doc.text('Side-by-Side Comparison', margins.left, margins.top + 10);

  yPos = margins.top + 25;
  const colWidth = contentWidth / 3;

  // Table header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.text);
  doc.text('Metric', margins.left, yPos);
  doc.text('Current', margins.left + colWidth, yPos);
  doc.text('Proposed', margins.left + colWidth * 2, yPos);

  doc.setLineWidth(0.5);
  doc.setDrawColor(BRAND.border);
  doc.line(margins.left, yPos + 2, pageWidth - margins.right, yPos + 2);

  yPos += 8;

  // Comparison rows
  doc.setFont('helvetica', 'normal');
  const comparisonRows = [
    ['Total Value', formatCurrency(params.currentMetrics.totalValue), formatCurrency(params.proposedMetrics.totalValue)],
    ['Holdings Count', String(params.currentMetrics.holdingCount), String(params.proposedMetrics.holdingCount)],
    ['Equity Allocation', formatPct(params.currentMetrics.equityPct / 100), formatPct(params.proposedMetrics.equityPct / 100)],
    ['Fixed Income', formatPct(params.currentMetrics.fixedIncomePct / 100), formatPct(params.proposedMetrics.fixedIncomePct / 100)],
    ['Expense Ratio', formatPct(params.currentMetrics.weightedExpenseRatio), formatPct(params.proposedMetrics.weightedExpenseRatio)],
  ];

  comparisonRows.forEach((row) => {
    if (yPos > pageHeight - margins.bottom - 10) {
      doc.addPage();
      currentPage++;
      addHeader();
      yPos = margins.top + 10;
    }
    doc.text(row[0], margins.left, yPos);
    doc.text(row[1], margins.left + colWidth, yPos);
    doc.text(row[2], margins.left + colWidth * 2, yPos);
    yPos += 6;
  });

  addFooter(currentPage);

  // =====================================================================
  // Page 7: Fee Analysis
  // =====================================================================

  doc.addPage();
  currentPage++;
  addHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.primary);
  doc.text('Fee Analysis', margins.left, margins.top + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND.text);
  const feeLines = wrapText(params.narrative.feeTransparency, contentWidth);
  yPos = margins.top + 20;
  feeLines.forEach((line) => {
    if (yPos > pageHeight - margins.bottom - 10) {
      doc.addPage();
      currentPage++;
      addHeader();
      yPos = margins.top + 10;
    }
    doc.text(line, margins.left, yPos);
    yPos += 5;
  });

  if (params.feeSavings) {
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Projected Fee Savings', margins.left, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const savingsRows = [
      ['Annual Savings', formatCurrency(params.feeSavings.annual)],
      ['5-Year Savings', formatCurrency(params.feeSavings.fiveYear)],
      ['10-Year Savings', formatCurrency(params.feeSavings.tenYear)],
      ['20-Year Savings', formatCurrency(params.feeSavings.twentyYear)],
    ];

    savingsRows.forEach((row) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(row[0], margins.left, yPos);
      doc.text(row[1], pageWidth - margins.right, yPos, { align: 'right' });
      yPos += 6;
    });
  }

  addFooter(currentPage);

  // =====================================================================
  // Page 8: Next Steps
  // =====================================================================

  doc.addPage();
  currentPage++;
  addHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.primary);
  doc.text('What Happens Next', margins.left, margins.top + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND.text);
  const nextLines = wrapText(params.narrative.whatHappensNext, contentWidth);
  yPos = margins.top + 20;
  nextLines.forEach((line) => {
    if (yPos > pageHeight - margins.bottom - 10) {
      doc.addPage();
      currentPage++;
      addHeader();
      yPos = margins.top + 10;
    }
    doc.text(line, margins.left, yPos);
    yPos += 5;
  });

  addFooter(currentPage);

  // =====================================================================
  // Page 9: Disclosures
  // =====================================================================

  doc.addPage();
  currentPage++;
  addHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND.primary);
  doc.text('Important Disclosures', margins.left, margins.top + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND.text);

  const disclosures = `This proposal is for illustrative purposes only and does not constitute investment advice, a solicitation, or an offer to purchase or sell securities. Past performance is not indicative of future results. Investments involve risk, including the potential loss of principal. The portfolio analysis presented is based on data provided by the client and third-party sources believed to be reliable but not guaranteed. Actual results may vary. Advisory services are provided by ${params.firmName || 'Farther'}, a registered investment advisor. Consult your tax and legal advisors before making investment decisions. This document is confidential and intended solely for the named recipient. Unauthorized distribution is prohibited.`;

  const disclosureLines = wrapText(disclosures, contentWidth);
  yPos = margins.top + 20;
  disclosureLines.forEach((line) => {
    if (yPos > pageHeight - margins.bottom - 10) {
      doc.addPage();
      currentPage++;
      addHeader();
      yPos = margins.top + 10;
    }
    doc.text(line, margins.left, yPos);
    yPos += 4;
  });

  addFooter(currentPage);

  // =====================================================================
  // Convert to Buffer and Return
  // =====================================================================

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
