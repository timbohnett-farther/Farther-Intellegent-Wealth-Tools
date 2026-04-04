/**
 * AWS Textract fallback OCR service
 * Used when MiniMax OCR confidence is too low (< 0.85)
 *
 * Textract extracts tables from PDFs/images and maps columns to Holding fields
 */

import type { Holding, StatementScanResult, MoneyCents, AssetClass, AccountType } from '@/lib/proposal-engine/types'

interface TextractParams {
  base64Data: string
  mimeType: string
  fileName: string
}

interface TextractTableCell {
  RowIndex?: number
  ColumnIndex?: number
  Text?: string
}

interface TextractBlock {
  BlockType?: string
  Relationships?: Array<{ Type: string; Ids: string[] }>
  EntityTypes?: string[]
  Text?: string
  RowIndex?: number
  ColumnIndex?: number
  Id?: string
}

/**
 * Check if AWS Textract is available (credentials configured)
 */
export function isTextractAvailable(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  )
}

/**
 * Extract holdings from statement using AWS Textract
 * Falls back when MiniMax OCR confidence is too low
 */
export async function extractWithTextract(params: TextractParams): Promise<Partial<StatementScanResult>> {
  const { base64Data, mimeType, fileName } = params

  // Validate required env vars
  if (!isTextractAvailable()) {
    throw new Error(
      'AWS Textract SDK not available: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required'
    )
  }

  try {
    // Dynamic import - fails gracefully if SDK not installed
    // @ts-ignore - AWS SDK is optional dependency
    const { TextractClient, AnalyzeDocumentCommand } = await import('@aws-sdk/client-textract').catch(() => {
      throw new Error('AWS Textract SDK not installed')
    })

    const client = new TextractClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')

    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: buffer },
      FeatureTypes: ['TABLES'],
    })

    const response = await command.send(client)

    if (!response.Blocks || response.Blocks.length === 0) {
      return {
        holdings: [],
        confidence: 0.3,
        flaggedForReview: ['No content blocks found in document'],
      }
    }

    // Extract tables from blocks
    const tables = extractTables(response.Blocks)

    if (tables.length === 0) {
      return {
        holdings: [],
        confidence: 0.4,
        flaggedForReview: ['No tables detected in document'],
      }
    }

    // Map tables to holdings
    const holdings = parseTablesIntoHoldings(tables, fileName)

    // Calculate confidence based on completeness
    const confidence = calculateConfidence(holdings)

    return {
      holdings,
      confidence,
      flaggedForReview: confidence < 0.75 ? ['Low confidence OCR extraction'] : [],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    // Check for import error
    if (message.includes('Cannot find module') || message.includes('@aws-sdk/client-textract')) {
      throw new Error('AWS Textract SDK not installed')
    }

    throw new Error(`Textract extraction failed: ${message}`)
  }
}

/**
 * Extract table structures from Textract blocks
 */
function extractTables(blocks: TextractBlock[]): string[][][] {
  const tables: string[][][] = []
  const tableBlocks = blocks.filter(b => b.BlockType === 'TABLE')
  const cellBlocks = blocks.filter(b => b.BlockType === 'CELL')
  const wordBlocks = blocks.reduce((map, b) => {
    if (b.Id) map[b.Id] = b
    return map
  }, {} as Record<string, TextractBlock>)

  for (const tableBlock of tableBlocks) {
    // Get cells for this table
    const tableCells = cellBlocks.filter(cell => {
      const parentRel = tableBlock.Relationships?.find(r => r.Type === 'CHILD')
      return parentRel?.Ids.includes(cell.Id ?? '')
    })

    // Build 2D array
    const rows: string[][] = []
    for (const cell of tableCells) {
      const rowIdx = (cell.RowIndex ?? 1) - 1
      const colIdx = (cell.ColumnIndex ?? 1) - 1

      if (!rows[rowIdx]) rows[rowIdx] = []

      // Extract text from CHILD words
      const childRel = cell.Relationships?.find(r => r.Type === 'CHILD')
      const cellText = childRel?.Ids
        .map(id => wordBlocks[id]?.Text ?? '')
        .join(' ')
        .trim() ?? ''

      rows[rowIdx][colIdx] = cellText
    }

    if (rows.length > 0) tables.push(rows)
  }

  return tables
}

/**
 * Parse extracted tables into Holding objects
 */
function parseTablesIntoHoldings(tables: string[][][], fileName: string): Holding[] {
  const holdings: Holding[] = []

  for (const table of tables) {
    if (table.length < 2) continue // Need header + at least 1 row

    const header = table[0].map(h => h.toLowerCase().trim())
    const dataRows = table.slice(1)

    // Map header indices
    const colMap = {
      ticker: findColumnIndex(header, ['symbol', 'ticker', 'stock']),
      cusip: findColumnIndex(header, ['cusip']),
      description: findColumnIndex(header, ['description', 'name', 'security']),
      quantity: findColumnIndex(header, ['quantity', 'shares', 'units']),
      price: findColumnIndex(header, ['price', 'unit price', 'cost']),
      marketValue: findColumnIndex(header, ['value', 'market value', 'total value', 'amount']),
      costBasis: findColumnIndex(header, ['cost basis', 'basis', 'original cost']),
    }

    for (const row of dataRows) {
      // Skip empty rows
      if (row.every(cell => !cell.trim())) continue

      const ticker = colMap.ticker !== -1 ? row[colMap.ticker]?.trim() : ''
      const description = colMap.description !== -1 ? row[colMap.description]?.trim() : ''

      // Skip rows without ticker or description
      if (!ticker && !description) continue

      const quantity = colMap.quantity !== -1 ? parseFloat(row[colMap.quantity]?.replace(/[,$]/g, '') ?? '0') : 0
      const price = colMap.price !== -1 ? parseCurrency(row[colMap.price]) : (0 as MoneyCents)
      const marketValue = colMap.marketValue !== -1 ? parseCurrency(row[colMap.marketValue]) : (0 as MoneyCents)
      const costBasis = colMap.costBasis !== -1 ? parseCurrency(row[colMap.costBasis]) : null

      const holding: Holding = {
        ticker: ticker || 'UNKNOWN',
        cusip: colMap.cusip !== -1 ? (row[colMap.cusip]?.trim() || null) : null,
        name: description || ticker || 'Unknown Security',
        description: description || '',
        assetClass: inferAssetClass(ticker, description),
        quantity,
        price,
        marketValue,
        costBasis,
        unrealizedGain: costBasis ? ((marketValue - costBasis) as MoneyCents) : null,
        gainPct: costBasis && costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : null,
        holdingPeriod: null,
        expenseRatio: null,
        dividendYield: null,
        accountType: inferAccountType(fileName),
        accountName: fileName,
      }

      holdings.push(holding)
    }
  }

  return holdings
}

/**
 * Find column index by matching keywords
 */
function findColumnIndex(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase()
    if (keywords.some(kw => header.includes(kw))) {
      return i
    }
  }
  return -1
}

/**
 * Parse currency string to MoneyCents (cents)
 * Examples: "$1,234.56" → 123456, "1234.56" → 123456
 */
function parseCurrency(value: string | undefined): MoneyCents {
  if (!value) return 0 as MoneyCents
  const cleaned = value.replace(/[$,]/g, '').trim()
  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return 0 as MoneyCents
  return Math.round(parsed * 100) as MoneyCents
}

/**
 * Infer asset class from ticker/description
 */
function inferAssetClass(ticker: string, description: string): AssetClass {
  const text = `${ticker} ${description}`.toLowerCase()

  if (text.includes('bond') || text.includes('note')) return 'FIXED_INCOME_GOVT'
  if (text.includes('equity') || text.includes('stock')) return 'EQUITY_US_LARGE'
  if (text.includes('cash') || text.includes('money market')) return 'CASH_EQUIVALENT'
  if (text.includes('alternative') || text.includes('hedge')) return 'ALTERNATIVES_OTHER'
  if (text.includes('real estate') || text.includes('reit')) return 'REAL_ESTATE'
  if (text.includes('gold')) return 'GOLD'

  return 'EQUITY_US_LARGE' // Default fallback
}

/**
 * Infer account type from filename
 */
function inferAccountType(fileName: string): AccountType {
  const name = fileName.toLowerCase()

  if (name.includes('roth')) return 'ROTH_IRA'
  if (name.includes('401k')) return '401K'
  if (name.includes('403b')) return '403B'
  if (name.includes('sep')) return 'SEP_IRA'
  if (name.includes('simple')) return 'SIMPLE_IRA'
  if (name.includes('ira') || name.includes('retirement')) return 'IRA'
  if (name.includes('trust')) return 'TRUST'
  if (name.includes('joint')) return 'JOINT'
  if (name.includes('hsa')) return 'HSA'
  if (name.includes('529')) return '529'

  return 'TAXABLE' // Default fallback
}

/**
 * Calculate confidence score based on completeness of holdings data
 */
function calculateConfidence(holdings: Holding[]): number {
  if (holdings.length === 0) return 0

  let totalScore = 0
  let maxScore = 0

  for (const holding of holdings) {
    let score = 0

    // Core fields (required)
    if (holding.ticker && holding.ticker !== 'UNKNOWN') score += 20
    if (holding.description && holding.description.length > 0) score += 20
    if (holding.quantity > 0) score += 15
    if (holding.marketValue > 0) score += 15

    // Optional enrichment fields
    if (holding.price > 0) score += 10
    if (holding.costBasis !== null) score += 10
    if (holding.cusip) score += 5
    if (holding.assetClass !== 'EQUITY_US_LARGE') score += 5 // Non-default means better classification

    totalScore += score
    maxScore += 100
  }

  const avgScore = totalScore / maxScore
  return Math.min(Math.max(avgScore, 0), 1) // Clamp to [0, 1]
}
