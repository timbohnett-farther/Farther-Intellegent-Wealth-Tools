// Table Publisher — publishes validated tax table updates.
// In production: writes to BigQuery farther_tax_tables.tax_table_versions.
// Pure functional — no React, Next.js, or Prisma imports.

import type { TaxTableType } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaxTablePublication {
  versionId: string;
  tableType: TaxTableType;
  taxYear: number;
  publishedAt: string;
  publishedBy: string;
  changeCount: number;
  source: string;
}

interface TableVersion {
  id: string;
  tableType: TaxTableType;
  taxYear: number;
  data: unknown;
  isCurrent: boolean;
  source: string;
  createdAt: string;
  createdBy: string;
}

// ---------------------------------------------------------------------------
// In-memory version store (production: BigQuery)
// ---------------------------------------------------------------------------

const versions: TableVersion[] = [];

/**
 * Publish a new tax table version.
 * Archives the prior current version and sets the new one as current.
 */
export function publishTaxTableUpdate(
  tableData: unknown,
  tableType: TaxTableType,
  taxYear: number,
  source: string,
  publishedBy = 'auto_update_engine',
): TaxTablePublication {
  const versionId = `TTV-${taxYear}-${tableType}-${Date.now()}`;

  // Archive prior version
  archivePriorVersion(tableType, taxYear);

  // Create new version
  versions.push({
    id: versionId,
    tableType,
    taxYear,
    data: tableData,
    isCurrent: true,
    source,
    createdAt: new Date().toISOString(),
    createdBy: publishedBy,
  });

  return {
    versionId,
    tableType,
    taxYear,
    publishedAt: new Date().toISOString(),
    publishedBy,
    changeCount: 1,
    source,
  };
}

/**
 * Archive the current version of a table (mark is_current = false).
 */
export function archivePriorVersion(tableType: TaxTableType, taxYear: number): void {
  for (const v of versions) {
    if (v.tableType === tableType && v.taxYear === taxYear && v.isCurrent) {
      v.isCurrent = false;
    }
  }
}

/**
 * Rollback to a prior version by ID.
 */
export function rollbackTableUpdate(versionId: string): boolean {
  const target = versions.find((v) => v.id === versionId);
  if (!target) return false;

  // Archive all current versions of this type/year
  archivePriorVersion(target.tableType, target.taxYear);

  // Restore the target
  target.isCurrent = true;
  return true;
}

/**
 * Get version history for a table type and year.
 */
export function getTableHistory(tableType: TaxTableType, taxYear: number): TableVersion[] {
  return versions
    .filter((v) => v.tableType === tableType && v.taxYear === taxYear)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
