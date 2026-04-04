/**
 * POST /api/relocation/admin/detect-updates
 *
 * Runs the tax rule update detection workflow:
 * 1. Scrape tax documents from authoritative sources
 * 2. Use AI to extract rule changes
 * 3. Save candidate updates to database for admin review
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeAllSources } from '@/lib/relocation-calculator/scraper/tax-document-scraper';
import { extractTaxRules } from '@/lib/relocation-calculator/ai/tax-rule-extractor';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[Update Detection] Starting tax rule update detection workflow...');

    // Step 1: Scrape all tax document sources
    console.log('[Update Detection] Step 1: Scraping tax documents...');
    const scrapedDocs = await scrapeAllSources();
    console.log(`[Update Detection] Scraped ${scrapedDocs.length} documents`);

    if (scrapedDocs.length === 0) {
      return NextResponse.json(
        { error: 'No documents could be scraped. Check scraper configuration.' },
        { status: 500 }
      );
    }

    // Step 2: Extract tax rules using AI
    console.log('[Update Detection] Step 2: Extracting tax rules with AI...');
    const extractionRequests = scrapedDocs.map(doc => ({
      jurisdictionCode: inferJurisdictionFromDoc(doc),
      documentUrl: doc.url,
      documentContent: doc.content,
      sourceType: doc.sourceType as any,
    }));

    const extractedRules = await Promise.all(
      extractionRequests.map(req =>
        extractTaxRules(req).catch(err => {
          console.error(`Failed to extract rules from ${req.documentUrl}:`, err);
          return null;
        })
      )
    );

    const validRules = extractedRules.filter((r): r is NonNullable<typeof r> => r !== null);
    console.log(`[Update Detection] Extracted ${validRules.length} rule sets`);

    // Step 3: Save candidate updates to database
    console.log('[Update Detection] Step 3: Saving candidate updates...');
    const candidateUpdates = await Promise.all(
      validRules.map(async (rule) => {
        // Check if similar update already exists
        const existing = await prisma.relocation_candidate_updates.findFirst({
          where: {
            jurisdiction_code: rule.jurisdictionCode,
            review_status: 'pending',
            detected_date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
            },
          },
        });

        if (existing) {
          console.log(`[Update Detection] Skipping ${rule.jurisdictionCode} - recent pending update exists`);
          return null;
        }

        // Create new candidate update
        const sourceDoc = scrapedDocs.find(d => d.sourceType === extractionRequests.find(r => r.jurisdictionCode === rule.jurisdictionCode)?.sourceType);

        return await prisma.relocation_candidate_updates.create({
          data: {
            id: `candidate-${Date.now()}-${rule.jurisdictionCode}`,
            jurisdiction_code: rule.jurisdictionCode,
            source_type: sourceDoc?.sourceType || 'other',
            source_url: sourceDoc?.url || '',
            detected_date: new Date().toISOString(),
            proposed_changes: JSON.stringify(rule.changes),
            extracted_by: 'aizolo-gpt4o',
            confidence_score: rule.confidenceScore,
            extraction_summary: rule.summary,
            review_status: 'pending',
          },
        });
      })
    );

    const saved = candidateUpdates.filter((c): c is NonNullable<typeof c> => c !== null);
    console.log(`[Update Detection] Saved ${saved.length} new candidate updates`);

    // Save source documents to database
    await Promise.all(
      scrapedDocs.map(async (doc) => {
        const jurisdiction = await prisma.relocation_jurisdictions.findFirst({
          where: { code: inferJurisdictionFromDoc(doc) },
        });

        if (!jurisdiction) return;

        return await prisma.relocation_source_documents.create({
          data: {
            id: `source-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            jurisdiction_id: jurisdiction.id,
            source_type: doc.sourceType,
            title: doc.title,
            url: doc.url,
            publisher: getPublisherFromSourceType(doc.sourceType),
            published_date: null,
            retrieved_at: doc.scrapedAt,
            is_authoritative: true,
            content_hash: doc.contentHash,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      documentsScraped: scrapedDocs.length,
      rulesExtracted: validRules.length,
      candidateUpdatesSaved: saved.length,
      pendingReview: saved.map(c => ({
        id: c.id,
        jurisdictionCode: c.jurisdiction_code,
        confidenceScore: c.confidence_score,
        summary: c.extraction_summary,
      })),
    });
  } catch (error) {
    console.error('[Update Detection] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run update detection workflow. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * Infer jurisdiction code from document metadata
 */
function inferJurisdictionFromDoc(doc: any): string {
  // For now, extract from URL or default to 'ALL' for multi-state documents
  if (doc.url.includes('california') || doc.url.includes('/ca/')) return 'CA';
  if (doc.url.includes('newyork') || doc.url.includes('/ny/')) return 'NY';
  if (doc.url.includes('florida') || doc.url.includes('/fl/')) return 'FL';
  if (doc.url.includes('texas') || doc.url.includes('/tx/')) return 'TX';
  if (doc.url.includes('puerto-rico') || doc.url.includes('/pr/')) return 'PR';

  // For multi-state documents, mark as 'ALL' and let AI extract per-jurisdiction rules
  return 'ALL';
}

/**
 * Get publisher name from source type
 */
function getPublisherFromSourceType(sourceType: string): string {
  const publishers: Record<string, string> = {
    tax_foundation: 'Tax Foundation',
    ncsl_state_tax_actions: 'National Conference of State Legislatures (NCSL)',
    actec_death_tax_chart: 'American College of Trust and Estate Counsel (ACTEC)',
    puerto_rico_official: 'Puerto Rico Department of Economic Development and Commerce',
  };

  return publishers[sourceType] || 'Unknown';
}
