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
  fundXray?: {
    totalSecuritiesCount: number;
    top10Concentration: number;
    hiddenConcentrations: Array<{ ticker: string; name: string; effectiveWeight: number; severity: string }>;
    sectorExposure: Record<string, number>;
    decomposedHoldings: Array<{ ticker: string; name: string; effectiveWeight: number; appearsIn: string[] }>;
  } | null;
  enhancedStressTests?: {
    results: Array<{
      scenarioLabel: string;
      portfolioReturn: number;
      dollarImpact: number;
      recoveryMonths: number;
    }>;
    portfolioVaR95: number;
    portfolioCVaR95: number;
    worstCase: { scenarioLabel: string; portfolioReturn: number };
  } | null;
  monteCarlo?: {
    timeHorizon: number;
    paths: number;
    terminalValues: { mean: number; median: number; p5: number; p95: number };
    probabilityOfSuccess: number;
    probabilityOfLoss: number;
    probabilityOfDoubling: number;
    percentiles: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  } | null;
  ips?: {
    clientName: string;
    investmentObjective: string;
    riskTolerance: string;
    timeHorizon: string;
    liquidityNeeds: string;
    targetAllocation: Array<{ assetClass: string; targetPct: number; minPct: number; maxPct: number }>;
    benchmarks: Array<{ component: string; benchmark: string; weight: number }>;
    rebalancingThreshold: number;
    rebalancingFrequency: string;
    effectiveDate: string;
    reviewDate: string;
  } | null;
  regBI?: {
    clientProfileSummary: string;
    recommendationRationale: string;
    alternativesConsidered: string[];
    costsAndFees: string;
    conflictsOfInterest: string;
    locked: boolean;
    checklist: Record<string, boolean>;
  } | null;
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

  // Calculate dynamic total page count
  let totalPages = 9; // base pages
  if (params.fundXray) totalPages++;
  if (params.enhancedStressTests) totalPages++;
  if (params.monteCarlo) totalPages++;
  if (params.ips) totalPages++;
  if (params.regBI) totalPages++;

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
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
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
  // Optional: Fund X-Ray Analysis
  // =====================================================================

  if (params.fundXray) {
    doc.addPage();
    currentPage++;
    addHeader();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.primary);
    doc.text('Fund X-Ray Analysis', margins.left, margins.top + 10);

    // Stat line
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.text);
    const statLine = `Total Securities: ${params.fundXray.totalSecuritiesCount} | Top 10 Concentration: ${params.fundXray.top10Concentration.toFixed(1)}% | Alerts: ${params.fundXray.hiddenConcentrations.length}`;
    doc.text(statLine, margins.left, margins.top + 22);

    yPos = margins.top + 32;

    // Decomposed holdings table (top 15)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Decomposed Holdings', margins.left, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Ticker', margins.left, yPos);
    doc.text('Name', margins.left + 20, yPos);
    doc.text('Eff. Weight', margins.left + 90, yPos);
    doc.text('Appears In', margins.left + 120, yPos);
    doc.setLineWidth(0.3);
    doc.setDrawColor(BRAND.border);
    doc.line(margins.left, yPos + 2, pageWidth - margins.right, yPos + 2);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    params.fundXray.decomposedHoldings.slice(0, 15).forEach((holding) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(holding.ticker, margins.left, yPos);
      const nameWrapped = wrapText(holding.name, 60);
      doc.text(nameWrapped[0], margins.left + 20, yPos);
      doc.text(`${(holding.effectiveWeight * 100).toFixed(2)}%`, margins.left + 90, yPos);
      const fundsWrapped = wrapText(holding.appearsIn.join(', '), 50);
      doc.text(fundsWrapped[0], margins.left + 120, yPos);
      yPos += 5;
    });

    yPos += 5;

    // Sector breakdown
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Sector Exposure', margins.left, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    Object.entries(params.fundXray.sectorExposure).forEach(([sector, weight]) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(sector, margins.left, yPos);
      doc.text(`${(weight * 100).toFixed(2)}%`, pageWidth - margins.right, yPos, { align: 'right' });
      yPos += 5;
    });

    yPos += 5;

    // Concentration alerts
    if (params.fundXray.hiddenConcentrations.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND.accent);
      doc.text('Concentration Alerts', margins.left, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND.text);
      params.fundXray.hiddenConcentrations.forEach((alert) => {
        if (yPos > pageHeight - margins.bottom - 10) {
          doc.addPage();
          currentPage++;
          addHeader();
          yPos = margins.top + 10;
        }
        const severityColor = alert.severity === 'high' ? '#DC2626' : alert.severity === 'medium' ? '#F59E0B' : '#6B7280';
        doc.setTextColor(severityColor);
        doc.text(`[${alert.severity.toUpperCase()}]`, margins.left, yPos);
        doc.setTextColor(BRAND.text);
        doc.text(`${alert.ticker} (${alert.name}): ${(alert.effectiveWeight * 100).toFixed(2)}%`, margins.left + 20, yPos);
        yPos += 5;
      });
    }

    addFooter(currentPage);
  }

  // =====================================================================
  // Optional: Enhanced Stress Tests
  // =====================================================================

  if (params.enhancedStressTests) {
    doc.addPage();
    currentPage++;
    addHeader();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.primary);
    doc.text('Stress Test Analysis', margins.left, margins.top + 10);

    // VaR/CVaR summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.text);
    const varLine = `Value at Risk (95%): ${(params.enhancedStressTests.portfolioVaR95 * 100).toFixed(2)}% | CVaR: ${(params.enhancedStressTests.portfolioCVaR95 * 100).toFixed(2)}% | Worst Case: ${params.enhancedStressTests.worstCase.scenarioLabel} (${(params.enhancedStressTests.worstCase.portfolioReturn * 100).toFixed(2)}%)`;
    const varLines = wrapText(varLine, contentWidth);
    yPos = margins.top + 22;
    varLines.forEach((line) => {
      doc.text(line, margins.left, yPos);
      yPos += 5;
    });

    yPos += 5;

    // Scenario table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Scenario Results', margins.left, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Scenario', margins.left, yPos);
    doc.text('Portfolio Return', margins.left + 60, yPos);
    doc.text('Dollar Impact', margins.left + 105, yPos);
    doc.text('Recovery', margins.left + 145, yPos);
    doc.setLineWidth(0.3);
    doc.setDrawColor(BRAND.border);
    doc.line(margins.left, yPos + 2, pageWidth - margins.right, yPos + 2);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    params.enhancedStressTests.results.forEach((scenario) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      const returnColor = scenario.portfolioReturn < -0.2 ? '#DC2626' : BRAND.text;
      doc.setTextColor(returnColor);
      doc.text(scenario.scenarioLabel, margins.left, yPos);
      doc.text(`${(scenario.portfolioReturn * 100).toFixed(2)}%`, margins.left + 60, yPos);
      doc.text(formatCurrency(scenario.dollarImpact), margins.left + 105, yPos);
      doc.text(`${scenario.recoveryMonths} mo`, margins.left + 145, yPos);
      doc.setTextColor(BRAND.text);
      yPos += 5;
    });

    addFooter(currentPage);
  }

  // =====================================================================
  // Optional: Monte Carlo Simulation
  // =====================================================================

  if (params.monteCarlo) {
    doc.addPage();
    currentPage++;
    addHeader();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.primary);
    doc.text('Monte Carlo Projection', margins.left, margins.top + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND.textMuted);
    doc.text(`${params.monteCarlo.paths.toLocaleString()} simulations over ${params.monteCarlo.timeHorizon} years`, margins.left, margins.top + 20);

    yPos = margins.top + 30;

    // Terminal value stats
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.text);
    doc.text('Terminal Value Distribution', margins.left, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const terminalRows = [
      ['Mean', formatCurrency(params.monteCarlo.terminalValues.mean)],
      ['Median', formatCurrency(params.monteCarlo.terminalValues.median)],
      ['5th Percentile', formatCurrency(params.monteCarlo.terminalValues.p5)],
      ['95th Percentile', formatCurrency(params.monteCarlo.terminalValues.p95)],
    ];

    terminalRows.forEach((row) => {
      doc.text(row[0], margins.left, yPos);
      doc.text(row[1], margins.left + 60, yPos);
      yPos += 5;
    });

    yPos += 5;

    // Probability section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Outcome Probabilities', margins.left, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const probRows = [
      ['Success Rate', `${(params.monteCarlo.probabilityOfSuccess * 100).toFixed(1)}%`],
      ['Loss Risk', `${(params.monteCarlo.probabilityOfLoss * 100).toFixed(1)}%`],
      ['Doubling Probability', `${(params.monteCarlo.probabilityOfDoubling * 100).toFixed(1)}%`],
    ];

    probRows.forEach((row) => {
      doc.text(row[0], margins.left, yPos);
      doc.text(row[1], margins.left + 60, yPos);
      yPos += 5;
    });

    yPos += 10;

    // Simple fan chart (draw percentile paths as lines)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Projection Fan Chart', margins.left, yPos);
    yPos += 7;

    const chartHeight = 50;
    const chartWidth = contentWidth;
    const chartY = yPos;

    // Draw axes
    doc.setDrawColor(BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(margins.left, chartY + chartHeight, margins.left + chartWidth, chartY + chartHeight); // x-axis
    doc.line(margins.left, chartY, margins.left, chartY + chartHeight); // y-axis

    // Draw percentile paths
    const paths = [
      { data: params.monteCarlo.percentiles.p5, color: '#DC2626', width: 0.3 },
      { data: params.monteCarlo.percentiles.p25, color: '#F59E0B', width: 0.3 },
      { data: params.monteCarlo.percentiles.p50, color: BRAND.accent, width: 0.5 },
      { data: params.monteCarlo.percentiles.p75, color: '#10B981', width: 0.3 },
      { data: params.monteCarlo.percentiles.p95, color: '#059669', width: 0.3 },
    ];

    const maxValue = Math.max(...params.monteCarlo.percentiles.p95);
    const minValue = Math.min(...params.monteCarlo.percentiles.p5);
    const valueRange = maxValue - minValue;

    paths.forEach((path) => {
      doc.setDrawColor(path.color);
      doc.setLineWidth(path.width);
      for (let i = 0; i < path.data.length - 1; i++) {
        const x1 = margins.left + (i / (path.data.length - 1)) * chartWidth;
        const y1 = chartY + chartHeight - ((path.data[i] - minValue) / valueRange) * chartHeight;
        const x2 = margins.left + ((i + 1) / (path.data.length - 1)) * chartWidth;
        const y2 = chartY + chartHeight - ((path.data[i + 1] - minValue) / valueRange) * chartHeight;
        doc.line(x1, y1, x2, y2);
      }
    });

    addFooter(currentPage);
  }

  // =====================================================================
  // Optional: Investment Policy Statement
  // =====================================================================

  if (params.ips) {
    doc.addPage();
    currentPage++;
    addHeader();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.primary);
    doc.text('Investment Policy Statement', margins.left, margins.top + 10);

    yPos = margins.top + 22;

    // Sections
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.text);
    doc.text('Investment Objective', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const objLines = wrapText(params.ips.investmentObjective, contentWidth);
    objLines.forEach((line) => {
      doc.text(line, margins.left, yPos);
      yPos += 4;
    });
    yPos += 3;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Tolerance', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(params.ips.riskTolerance, margins.left, yPos);
    yPos += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Time Horizon', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(params.ips.timeHorizon, margins.left, yPos);
    yPos += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Liquidity Needs', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(params.ips.liquidityNeeds, margins.left, yPos);
    yPos += 10;

    // Allocation table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Target Allocation', margins.left, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Class', margins.left, yPos);
    doc.text('Target %', margins.left + 70, yPos);
    doc.text('Min %', margins.left + 105, yPos);
    doc.text('Max %', margins.left + 135, yPos);
    doc.setLineWidth(0.3);
    doc.setDrawColor(BRAND.border);
    doc.line(margins.left, yPos + 2, pageWidth - margins.right, yPos + 2);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    params.ips.targetAllocation.forEach((alloc) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(alloc.assetClass, margins.left, yPos);
      doc.text(`${alloc.targetPct.toFixed(1)}%`, margins.left + 70, yPos);
      doc.text(`${alloc.minPct.toFixed(1)}%`, margins.left + 105, yPos);
      doc.text(`${alloc.maxPct.toFixed(1)}%`, margins.left + 135, yPos);
      yPos += 5;
    });

    yPos += 5;

    // Benchmark table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Benchmarks', margins.left, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Component', margins.left, yPos);
    doc.text('Benchmark', margins.left + 70, yPos);
    doc.text('Weight', margins.left + 130, yPos);
    doc.setLineWidth(0.3);
    doc.line(margins.left, yPos + 2, pageWidth - margins.right, yPos + 2);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    params.ips.benchmarks.forEach((bench) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(bench.component, margins.left, yPos);
      doc.text(bench.benchmark, margins.left + 70, yPos);
      doc.text(`${(bench.weight * 100).toFixed(1)}%`, margins.left + 130, yPos);
      yPos += 5;
    });

    yPos += 5;

    // Rebalancing and dates
    doc.setFontSize(9);
    doc.text(`Rebalancing: ${params.ips.rebalancingFrequency} (threshold: ${(params.ips.rebalancingThreshold * 100).toFixed(1)}%)`, margins.left, yPos);
    yPos += 5;
    doc.text(`Effective Date: ${params.ips.effectiveDate}`, margins.left, yPos);
    yPos += 5;
    doc.text(`Review Date: ${params.ips.reviewDate}`, margins.left, yPos);

    addFooter(currentPage);
  }

  // =====================================================================
  // Optional: Regulation Best Interest Disclosure
  // =====================================================================

  if (params.regBI) {
    doc.addPage();
    currentPage++;
    addHeader();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.primary);
    doc.text('Regulation Best Interest Disclosure', margins.left, margins.top + 10);

    yPos = margins.top + 22;

    // Profile Summary
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.text);
    doc.text('Client Profile Summary', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const profileLines = wrapText(params.regBI.clientProfileSummary, contentWidth);
    profileLines.forEach((line) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(line, margins.left, yPos);
      yPos += 4;
    });
    yPos += 3;

    // Rationale
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendation Rationale', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const rationaleLines = wrapText(params.regBI.recommendationRationale, contentWidth);
    rationaleLines.forEach((line) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(line, margins.left, yPos);
      yPos += 4;
    });
    yPos += 3;

    // Alternatives
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Alternatives Considered', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    params.regBI.alternativesConsidered.forEach((alt) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(`• ${alt}`, margins.left, yPos);
      yPos += 5;
    });
    yPos += 3;

    // Costs and Fees
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Costs and Fees', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const costLines = wrapText(params.regBI.costsAndFees, contentWidth);
    costLines.forEach((line) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(line, margins.left, yPos);
      yPos += 4;
    });
    yPos += 3;

    // Conflicts
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Conflicts of Interest', margins.left, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const conflictLines = wrapText(params.regBI.conflictsOfInterest, contentWidth);
    conflictLines.forEach((line) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      doc.text(line, margins.left, yPos);
      yPos += 4;
    });
    yPos += 5;

    // Checklist
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Checklist', margins.left, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    Object.entries(params.regBI.checklist).forEach(([item, checked]) => {
      if (yPos > pageHeight - margins.bottom - 10) {
        doc.addPage();
        currentPage++;
        addHeader();
        yPos = margins.top + 10;
      }
      const symbol = checked ? '✓' : '✗';
      const color = checked ? '#10B981' : '#DC2626';
      doc.setTextColor(color);
      doc.text(symbol, margins.left, yPos);
      doc.setTextColor(BRAND.text);
      doc.text(item, margins.left + 8, yPos);
      yPos += 5;
    });

    addFooter(currentPage);
  }

  // =====================================================================
  // Final Page: Disclosures
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
