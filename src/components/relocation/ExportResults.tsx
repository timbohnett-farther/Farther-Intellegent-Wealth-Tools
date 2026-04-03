/**
 * Export Results Component
 *
 * Allows users to export calculation results as PDF or CSV
 */

'use client';

import React from 'react';

interface ExportResultsProps {
  calculationResult: any;
  userInputs: {
    leavingState: string;
    destinationState: string;
    filingStatus: string;
    ordinaryIncome: string;
    capitalGains: string;
    netWorth: string;
  };
}

export function ExportResults({ calculationResult, userInputs }: ExportResultsProps) {
  const handleExportCSV = () => {
    const csvContent = generateCSV(calculationResult, userInputs);
    downloadFile(csvContent, 'relocation-tax-comparison.csv', 'text/csv');
  };

  const handleExportText = () => {
    const textContent = generateTextReport(calculationResult, userInputs);
    downloadFile(textContent, 'relocation-tax-comparison.txt', 'text/plain');
  };

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleExportCSV}
        className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-subtle"
        style={{ borderColor: 'var(--s-border-subtle)' }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export CSV
      </button>

      <button
        type="button"
        onClick={handleExportText}
        className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-subtle"
        style={{ borderColor: 'var(--s-border-subtle)' }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Report
      </button>
    </div>
  );
}

/**
 * Generate CSV export
 */
function generateCSV(result: any, inputs: any): string {
  const rows = [
    ['Interstate Tax Migration Calculator - Results'],
    [''],
    ['Calculation Date', new Date(result.calculationDate).toLocaleString()],
    [''],
    ['INPUTS'],
    ['Leaving State', result.originState.jurisdictionName],
    ['Destination State', result.destinationState.jurisdictionName],
    ['Filing Status', inputs.filingStatus],
    ['Annual Ordinary Income', `$${parseFloat(inputs.ordinaryIncome).toLocaleString()}`],
    ['Annual Capital Gains', `$${parseFloat(inputs.capitalGains || '0').toLocaleString()}`],
    inputs.netWorth ? ['Net Worth / Estate Value', `$${parseFloat(inputs.netWorth).toLocaleString()}`] : null,
    [''],
    ['TAX COMPARISON'],
    ['Category', result.originState.jurisdictionCode, result.destinationState.jurisdictionCode],
    ['Ordinary Income Tax', `$${result.originState.ordinaryIncomeTax.toFixed(0)}`, `$${result.destinationState.ordinaryIncomeTax.toFixed(0)}`],
    ['Capital Gains Tax', `$${result.originState.capitalGainsTax.toFixed(0)}`, `$${result.destinationState.capitalGainsTax.toFixed(0)}`],
    ['Total State Tax', `$${result.originState.totalIncomeTax.toFixed(0)}`, `$${result.destinationState.totalIncomeTax.toFixed(0)}`],
    ['Effective Tax Rate', `${(result.originState.effectiveTaxRate * 100).toFixed(2)}%`, `${(result.destinationState.effectiveTaxRate * 100).toFixed(2)}%`],
    [''],
    ['SAVINGS SUMMARY'],
    ['Annual Tax Difference', `$${Math.abs(result.annualTaxDifference).toFixed(0)}`],
    ['10-Year Illustration', `$${Math.abs(result.tenYearIllustration).toFixed(0)}`],
    ['Direction', result.annualTaxDifference < 0 ? 'SAVINGS (Lower in destination)' : 'INCREASE (Higher in destination)'],
    [''],
    ['ASSUMPTIONS'],
    ...result.assumptions.map((a: string) => [a]),
    [''],
    ['IMPORTANT DISCLOSURES'],
    ...result.caveats.map((c: string) => [c]),
  ].filter(Boolean);

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Generate text report export
 */
function generateTextReport(result: any, inputs: any): string {
  return `
INTERSTATE TAX MIGRATION CALCULATOR
CALCULATION REPORT

Generated: ${new Date(result.calculationDate).toLocaleString()}

════════════════════════════════════════════════════════════════════════

INPUTS

Leaving State:          ${result.originState.jurisdictionName} (${result.originState.jurisdictionCode})
Destination State:      ${result.destinationState.jurisdictionName} (${result.destinationState.jurisdictionCode})
Filing Status:          ${inputs.filingStatus}
Annual Ordinary Income: $${parseFloat(inputs.ordinaryIncome).toLocaleString()}
Annual Capital Gains:   $${parseFloat(inputs.capitalGains || '0').toLocaleString()}
${inputs.netWorth ? `Net Worth / Estate:     $${parseFloat(inputs.netWorth).toLocaleString()}` : ''}

════════════════════════════════════════════════════════════════════════

TAX COMPARISON

                                ${result.originState.jurisdictionCode.padEnd(20)} ${result.destinationState.jurisdictionCode}
Ordinary Income Tax:            $${result.originState.ordinaryIncomeTax.toFixed(0).padStart(15)} $${result.destinationState.ordinaryIncomeTax.toFixed(0).padStart(15)}
Capital Gains Tax:              $${result.originState.capitalGainsTax.toFixed(0).padStart(15)} $${result.destinationState.capitalGainsTax.toFixed(0).padStart(15)}
Total State Tax:                $${result.originState.totalIncomeTax.toFixed(0).padStart(15)} $${result.destinationState.totalIncomeTax.toFixed(0).padStart(15)}
Effective Tax Rate:             ${(result.originState.effectiveTaxRate * 100).toFixed(2).padStart(14)}% ${(result.destinationState.effectiveTaxRate * 100).toFixed(2).padStart(14)}%

════════════════════════════════════════════════════════════════════════

SAVINGS SUMMARY

Annual Tax Difference:          $${Math.abs(result.annualTaxDifference).toFixed(0)}
10-Year Illustration:           $${Math.abs(result.tenYearIllustration).toFixed(0)}

Direction: ${result.annualTaxDifference < 0
  ? 'SAVINGS (Lower tax in destination state)'
  : 'INCREASE (Higher tax in destination state)'}

════════════════════════════════════════════════════════════════════════

ASSUMPTIONS

${result.assumptions.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

════════════════════════════════════════════════════════════════════════

IMPORTANT DISCLOSURES

${result.caveats.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

════════════════════════════════════════════════════════════════════════

This calculation is for educational and illustrative purposes only and does
not constitute tax, legal, or investment advice. Actual tax consequences depend
on your specific situation, residency determination, income sourcing, deductions,
timing, and many other factors not captured in this simplified illustration.

Always consult with qualified tax and legal professionals before making any
relocation decisions or taking action based on these estimates.

Rules Version: ${result.rulesVersionUsed.origin} / ${result.rulesVersionUsed.destination}
  `.trim();
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
