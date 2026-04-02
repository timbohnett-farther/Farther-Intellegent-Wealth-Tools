/**
 * Duplicate Detection Service — Phase 2 Sprint 1
 *
 * Detects duplicate document uploads using:
 * 1. Hash-based exact duplicate detection
 * 2. Semantic similarity detection (filename, metadata)
 *
 * Principle: Warn on likely duplicates but allow user override.
 */

import { prisma } from '@/lib/prisma';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType?: 'exact' | 'likely';
  existingDocumentId?: string;
  existingDocument?: {
    id: string;
    originalFilename: string;
    documentType: string;
    taxYear: number | null;
    uploadedAt: Date;
    fileHash: string | null;
  };
  similarity?: number; // 0-1 score for likely duplicates
  reason?: string;
}

/**
 * Check for exact duplicate by file hash
 */
export async function checkExactDuplicate(
  householdId: string,
  fileHash: string
): Promise<DuplicateCheckResult> {
  try {
    const existingDoc = await (prisma as any).taxDocument.findFirst({
      where: {
        householdId,
        fileHash,
      },
      select: {
        id: true,
        originalFilename: true,
        documentType: true,
        taxYear: true,
        uploadedAt: true,
        fileHash: true,
      },
    });

    if (existingDoc) {
      return {
        isDuplicate: true,
        duplicateType: 'exact',
        existingDocumentId: existingDoc.id,
        existingDocument: existingDoc,
        reason: `Exact duplicate found: "${existingDoc.originalFilename}" uploaded on ${existingDoc.uploadedAt.toLocaleDateString()}`,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Exact duplicate check error:', error);
    return { isDuplicate: false };
  }
}

/**
 * Check for likely duplicate by filename similarity and metadata
 */
export async function checkLikelyDuplicate(
  householdId: string,
  filename: string,
  taxYear?: number,
  documentType?: string
): Promise<DuplicateCheckResult> {
  try {
    // Get recent uploads for this household
    const recentDocs = await (prisma as any).taxDocument.findMany({
      where: {
        householdId,
        uploadedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        id: true,
        originalFilename: true,
        documentType: true,
        taxYear: true,
        uploadedAt: true,
        fileHash: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
      take: 50,
    });

    // Check for similar filenames
    for (const doc of recentDocs) {
      const similarity = calculateFilenameSimilarity(filename, doc.originalFilename);

      // High similarity threshold
      if (similarity > 0.85) {
        // Additional checks
        const yearMatch = !taxYear || !doc.taxYear || taxYear === doc.taxYear;
        const typeMatch = !documentType || !doc.documentType || documentType === doc.documentType;

        if (yearMatch || typeMatch) {
          return {
            isDuplicate: true,
            duplicateType: 'likely',
            existingDocumentId: doc.id,
            existingDocument: doc,
            similarity,
            reason: `Similar document found: "${doc.originalFilename}" (${(similarity * 100).toFixed(0)}% similar) uploaded on ${doc.uploadedAt.toLocaleDateString()}`,
          };
        }
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Likely duplicate check error:', error);
    return { isDuplicate: false };
  }
}

/**
 * Calculate filename similarity using Levenshtein distance
 */
function calculateFilenameSimilarity(filename1: string, filename2: string): number {
  // Normalize filenames
  const norm1 = normalizeFilename(filename1);
  const norm2 = normalizeFilename(filename2);

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);

  // Convert to similarity score (0-1)
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Normalize filename for comparison
 */
function normalizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/\s+/g, ''); // Remove whitespace
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Comprehensive duplicate check (exact + likely)
 */
export async function checkForDuplicates(
  householdId: string,
  filename: string,
  fileHash: string,
  taxYear?: number,
  documentType?: string
): Promise<DuplicateCheckResult> {
  // First check for exact duplicate
  const exactCheck = await checkExactDuplicate(householdId, fileHash);
  if (exactCheck.isDuplicate) {
    return exactCheck;
  }

  // Then check for likely duplicate
  return await checkLikelyDuplicate(householdId, filename, taxYear, documentType);
}
