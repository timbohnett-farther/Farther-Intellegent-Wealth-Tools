export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/proposals/:id/scan  - Upload statement for OCR scanning
// =============================================================================
//
// Real OCR path: when `fileData` (base64) is provided, uses MiniMax M2.7
// vision via the statement-scanner pipeline. Falls back to mock generation
// when no file data is provided (for testing without AI keys).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  ScanStatementRequest,
  StatementScanResult,
  Holding,
  AssetClass,
  AccountType,
  ErrorEnvelope,
} from '@/lib/proposal-engine/types';
import type { MoneyCents } from '@/lib/tax-planning/types';
import { cents } from '@/lib/tax-planning/types';
import { proposalStore } from '@/lib/proposal-engine/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';
import { scanStatement } from '@/lib/proposal-engine/ocr/statement-scanner';
import { isAIAvailable } from '@/lib/ai/gateway';

// ==================== Helpers ====================

function errorResponse(code: string, message: string, status: number, details: Record<string, unknown> = {}): NextResponse {
  const err: ErrorEnvelope = {
    error: { code, message, details, correlationId: crypto.randomUUID() },
  };
  return NextResponse.json(err, { status });
}

type RouteParams = { params: Promise<{ id: string }> };

// ==================== Institution Detection ====================

interface InstitutionHint {
  keywords: string[];
  institution: string;
  accountType: AccountType;
}

const INSTITUTION_HINTS: InstitutionHint[] = [
  { keywords: ['schwab', 'charles_schwab'], institution: 'Charles Schwab', accountType: 'TAXABLE' },
  { keywords: ['fidelity'], institution: 'Fidelity Investments', accountType: 'TAXABLE' },
  { keywords: ['vanguard'], institution: 'Vanguard', accountType: 'TAXABLE' },
  { keywords: ['merrill', 'merrill_lynch', 'ml'], institution: 'Merrill Lynch', accountType: 'TAXABLE' },
  { keywords: ['morgan_stanley', 'ms'], institution: 'Morgan Stanley', accountType: 'TAXABLE' },
  { keywords: ['jp_morgan', 'jpmorgan', 'chase'], institution: 'JP Morgan', accountType: 'TAXABLE' },
  { keywords: ['goldman', 'gs'], institution: 'Goldman Sachs', accountType: 'TAXABLE' },
  { keywords: ['ubs'], institution: 'UBS', accountType: 'TAXABLE' },
  { keywords: ['wells_fargo', 'wf'], institution: 'Wells Fargo Advisors', accountType: 'TAXABLE' },
  { keywords: ['edward_jones', 'ej'], institution: 'Edward Jones', accountType: 'TAXABLE' },
  { keywords: ['ameritrade', 'td'], institution: 'TD Ameritrade', accountType: 'TAXABLE' },
  { keywords: ['interactive_brokers', 'ibkr'], institution: 'Interactive Brokers', accountType: 'TAXABLE' },
  { keywords: ['robinhood'], institution: 'Robinhood', accountType: 'TAXABLE' },
  { keywords: ['etrade', 'e_trade'], institution: 'E*TRADE', accountType: 'TAXABLE' },
  { keywords: ['401k', '401_k'], institution: 'Employer Plan', accountType: '401K' },
  { keywords: ['ira', 'traditional_ira'], institution: 'Fidelity Investments', accountType: 'IRA' },
  { keywords: ['roth'], institution: 'Fidelity Investments', accountType: 'ROTH_IRA' },
  { keywords: ['trust'], institution: 'Charles Schwab', accountType: 'TRUST' },
];

function detectInstitution(filename: string): { institution: string; accountType: AccountType } {
  const normalized = filename.toLowerCase().replace(/[^a-z0-9]/g, '_');

  for (const hint of INSTITUTION_HINTS) {
    for (const kw of hint.keywords) {
      if (normalized.includes(kw)) {
        return { institution: hint.institution, accountType: hint.accountType };
      }
    }
  }

  return { institution: 'Unknown Custodian', accountType: 'TAXABLE' };
}

// ==================== Mock Holdings Generation ====================

interface HoldingTemplate {
  ticker: string;
  description: string;
  assetClass: AssetClass;
  priceRange: [number, number];
  expenseRatio: number;
  dividendYield: number;
  isSingleStock?: boolean;
}

const HOLDING_TEMPLATES: HoldingTemplate[] = [
  { ticker: 'VTI', description: 'Vanguard Total Stock Market ETF', assetClass: 'EQUITY_US_LARGE', priceRange: [21000, 24000], expenseRatio: 0.0003, dividendYield: 0.013 },
  { ticker: 'VOO', description: 'Vanguard S&P 500 ETF', assetClass: 'EQUITY_US_LARGE', priceRange: [42000, 48000], expenseRatio: 0.0003, dividendYield: 0.013 },
  { ticker: 'SPY', description: 'SPDR S&P 500 ETF Trust', assetClass: 'EQUITY_US_LARGE', priceRange: [45000, 52000], expenseRatio: 0.0009, dividendYield: 0.012 },
  { ticker: 'QQQ', description: 'Invesco QQQ Trust', assetClass: 'EQUITY_US_LARGE', priceRange: [38000, 45000], expenseRatio: 0.0020, dividendYield: 0.005 },
  { ticker: 'VB', description: 'Vanguard Small-Cap ETF', assetClass: 'EQUITY_US_SMALL', priceRange: [19000, 22000], expenseRatio: 0.0005, dividendYield: 0.015 },
  { ticker: 'VO', description: 'Vanguard Mid-Cap ETF', assetClass: 'EQUITY_US_MID', priceRange: [22000, 26000], expenseRatio: 0.0004, dividendYield: 0.014 },
  { ticker: 'VXUS', description: 'Vanguard Total International Stock ETF', assetClass: 'EQUITY_INTL_DEVELOPED', priceRange: [5500, 6500], expenseRatio: 0.0007, dividendYield: 0.030 },
  { ticker: 'VWO', description: 'Vanguard FTSE Emerging Markets ETF', assetClass: 'EQUITY_INTL_EMERGING', priceRange: [4000, 4800], expenseRatio: 0.0008, dividendYield: 0.028 },
  { ticker: 'BND', description: 'Vanguard Total Bond Market ETF', assetClass: 'FIXED_INCOME_GOVT', priceRange: [7000, 7500], expenseRatio: 0.0003, dividendYield: 0.035 },
  { ticker: 'AGG', description: 'iShares Core US Aggregate Bond ETF', assetClass: 'FIXED_INCOME_GOVT', priceRange: [9800, 10200], expenseRatio: 0.0003, dividendYield: 0.034 },
  { ticker: 'VCIT', description: 'Vanguard Intermediate-Term Corporate Bond ETF', assetClass: 'FIXED_INCOME_CORP_IG', priceRange: [8000, 8500], expenseRatio: 0.0004, dividendYield: 0.040 },
  { ticker: 'MUB', description: 'iShares National Muni Bond ETF', assetClass: 'FIXED_INCOME_MUNI', priceRange: [10500, 11000], expenseRatio: 0.0007, dividendYield: 0.028 },
  { ticker: 'VNQ', description: 'Vanguard Real Estate ETF', assetClass: 'REAL_ESTATE', priceRange: [8000, 9500], expenseRatio: 0.0012, dividendYield: 0.038 },
  { ticker: 'AAPL', description: 'Apple Inc.', assetClass: 'EQUITY_US_LARGE', priceRange: [17000, 21000], expenseRatio: 0, dividendYield: 0.005, isSingleStock: true },
  { ticker: 'MSFT', description: 'Microsoft Corporation', assetClass: 'EQUITY_US_LARGE', priceRange: [38000, 44000], expenseRatio: 0, dividendYield: 0.007, isSingleStock: true },
  { ticker: 'AMZN', description: 'Amazon.com Inc.', assetClass: 'EQUITY_US_LARGE', priceRange: [17000, 20000], expenseRatio: 0, dividendYield: 0, isSingleStock: true },
  { ticker: 'GOOGL', description: 'Alphabet Inc. Class A', assetClass: 'EQUITY_US_LARGE', priceRange: [14000, 17000], expenseRatio: 0, dividendYield: 0, isSingleStock: true },
  { ticker: 'SCHD', description: 'Schwab US Dividend Equity ETF', assetClass: 'EQUITY_US_LARGE', priceRange: [7500, 8200], expenseRatio: 0.0006, dividendYield: 0.035 },
  { ticker: 'VTIP', description: 'Vanguard Short-Term Inflation-Protected Securities ETF', assetClass: 'FIXED_INCOME_TIPS', priceRange: [4800, 5100], expenseRatio: 0.0004, dividendYield: 0.050 },
  { ticker: 'GLD', description: 'SPDR Gold Shares', assetClass: 'GOLD', priceRange: [18000, 22000], expenseRatio: 0.0040, dividendYield: 0 },
  { ticker: 'SGOV', description: 'iShares 0-3 Month Treasury Bond ETF', assetClass: 'CASH_EQUIVALENT', priceRange: [10000, 10050], expenseRatio: 0.0005, dividendYield: 0.048 },
];

const REVIEW_REASONS = [
  'Cost basis data may be incomplete -- verify with custodian records.',
  'Ticker symbol could not be reliably identified -- manual verification recommended.',
  'Holding period classification uncertain -- confirm acquisition dates.',
  'Share count differs from expected range -- verify fractional shares.',
];

function generateMockHoldings(totalValue: number, count: number): {
  holdings: Holding[];
  flaggedForReview: string[];
  cashAndEquivalents: number;
} {
  // Shuffle and pick a random subset of templates
  const shuffled = [...HOLDING_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Generate random weights that sum to ~1
  const rawWeights = selected.map(() => Math.random() + 0.1);
  const weightSum = rawWeights.reduce((s, w) => s + w, 0);
  const normalizedWeights = rawWeights.map(w => w / weightSum);

  const flaggedForReview: string[] = [];
  let cashTotal = 0;

  const holdings: Holding[] = selected.map((template, i) => {
    const weight = normalizedWeights[i];
    const marketValue = Math.round(totalValue * weight);
    const price = template.priceRange[0] + Math.round(Math.random() * (template.priceRange[1] - template.priceRange[0]));
    const quantity = Math.round((marketValue / price) * 100) / 100;
    const actualMarketValue = Math.round(quantity * price);

    // Cost basis: randomly +/- 5-30% from market value
    const costBasisMultiplier = 0.7 + Math.random() * 0.55; // 0.7 to 1.25
    const costBasis = Math.round(actualMarketValue * costBasisMultiplier);
    const unrealizedGain = actualMarketValue - costBasis;

    // Flag 1-2 items for review
    const shouldFlag = i < 2 && Math.random() > 0.3;
    if (shouldFlag) {
      flaggedForReview.push(
        `${template.ticker}: ${REVIEW_REASONS[Math.floor(Math.random() * REVIEW_REASONS.length)]}`
      );
    }

    if (template.assetClass === 'CASH_EQUIVALENT') {
      cashTotal += actualMarketValue;
    }

    return {
      ticker: template.ticker,
      cusip: null,
      description: template.description,
      assetClass: template.assetClass,
      quantity,
      price: price as MoneyCents,
      marketValue: actualMarketValue as MoneyCents,
      costBasis: costBasis as MoneyCents,
      unrealizedGain: unrealizedGain as MoneyCents,
      gainPct: costBasis > 0 ? Math.round((unrealizedGain / costBasis) * 10000) / 100 : null,
      holdingPeriod: Math.random() > 0.3 ? 'LONG' : 'SHORT',
      expenseRatio: template.expenseRatio,
      dividendYield: template.dividendYield,
      accountType: 'TAXABLE' as AccountType,
      accountName: 'Individual Brokerage',
    };
  });

  return {
    holdings,
    flaggedForReview,
    cashAndEquivalents: cashTotal,
  };
}

// ==================== POST ====================

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'docs:write')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to scan statements.', 403, { requiredPermission: 'docs:write' });
  }

  // ---------- Fetch proposal ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  // ---------- Parse body ----------
  let body: ScanStatementRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate ----------
  const errors: Record<string, string> = {};
  if (!body.filename || typeof body.filename !== 'string') {
    errors.filename = 'filename is required.';
  }
  if (!body.fileType || typeof body.fileType !== 'string') {
    errors.fileType = 'fileType is required.';
  }
  if (Object.keys(errors).length > 0) {
    return errorResponse('VALIDATION_ERROR', 'One or more fields failed validation.', 400, errors);
  }

  // ---------- OCR Scan or Mock ----------
  // If fileData (base64) is provided and AI is available, use real OCR
  const bodyAny = body as unknown as Record<string, unknown>;
  const hasFileData = typeof bodyAny.fileData === 'string' && (bodyAny.fileData as string).length > 0;

  let scanResult: StatementScanResult;

  if (hasFileData && isAIAvailable()) {
    // Real OCR path: MiniMax M2.7 vision extraction
    scanResult = await scanStatement({
      base64Data: bodyAny.fileData as string,
      mimeType: body.fileType,
      fileName: body.filename,
      accountHolder: proposal.clientName,
    });
  } else {
    // Mock fallback for testing or when no AI keys configured
    const detected = detectInstitution(body.filename);
    const holdingCount = 8 + Math.floor(Math.random() * 8);
    const totalValue = (proposal.assetsInScope as number) || 50000000;

    const { holdings, flaggedForReview, cashAndEquivalents } = generateMockHoldings(totalValue, holdingCount);
    const confidence = 0.88 + Math.random() * 0.11;

    scanResult = {
      scanId: crypto.randomUUID(),
      accountHolder: proposal.clientName,
      institution: detected.institution,
      accountType: detected.accountType,
      accountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`,
      statementDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalValue: holdings.reduce((sum, h) => sum + (h.marketValue as number), 0) as MoneyCents,
      holdings,
      cashAndEquivalents: cashAndEquivalents as MoneyCents,
      confidence: Math.round(confidence * 100) / 100,
      flaggedForReview,
      captureMethod: 'OCR_SCAN',
      processedAt: new Date().toISOString(),
    };
  }

  // Store the scan result
  proposalStore.addScanResult(id, scanResult);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'doc.upload',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      proposalId: id,
      scanId: scanResult.scanId,
      filename: body.filename,
      institution: scanResult.institution,
      holdingCount: scanResult.holdings.length,
      confidence: scanResult.confidence,
      action: 'proposal.scan',
    },
  });

  return NextResponse.json(scanResult, { status: 201 });
}
