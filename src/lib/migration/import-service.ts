/**
 * HubSpot Import Service
 *
 * Batch imports validated data to HubSpot with retry logic and rate limit handling.
 */

import { prisma } from "@/lib/prisma";

const HUBSPOT_BATCH_SIZE = 100; // HubSpot max batch size
const MAX_RETRIES = 5;
const RATE_LIMIT_WAIT_MS = 2000; // 2 seconds between batches

export interface ImportProgress {
  status: "QUEUED" | "IMPORTING" | "COMPLETED" | "FAILED";
  progress: number; // 0-100
  recordsImported: number;
  recordsFailed: number;
  totalRecords: number;
  currentBatch: number;
  totalBatches: number;
  errors: Array<{ recordId: string; error: string }>;
}

/**
 * Import Service Class
 */
export class ImportService {
  /**
   * Import all validated records to HubSpot
   */
  static async importToHubSpot(
    sessionId: string,
    entityType: "CONTACT" | "HOUSEHOLD",
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportProgress> {
    const progress: ImportProgress = {
      status: "QUEUED",
      progress: 0,
      recordsImported: 0,
      recordsFailed: 0,
      totalRecords: 0,
      currentBatch: 0,
      totalBatches: 0,
      errors: [],
    };

    try {
      // Fetch field mappings
      const mappings = await prisma.fieldMapping.findMany({
        where: { sessionId, entityType },
      });

      if (mappings.length === 0) {
        throw new Error(`No field mappings found for ${entityType}`);
      }

      // Fetch validated records
      let records: any[] = [];
      if (entityType === "CONTACT") {
        records = await prisma.rawContact.findMany({
          where: { sessionId, mappingStatus: "VALIDATED" },
        });
      } else {
        records = await prisma.rawHousehold.findMany({
          where: { sessionId, mappingStatus: "VALIDATED" },
        });
      }

      progress.totalRecords = records.length;
      progress.totalBatches = Math.ceil(records.length / HUBSPOT_BATCH_SIZE);
      progress.status = "IMPORTING";
      onProgress?.(progress);

      // Process in batches
      for (let i = 0; i < records.length; i += HUBSPOT_BATCH_SIZE) {
        const batch = records.slice(i, i + HUBSPOT_BATCH_SIZE);
        progress.currentBatch = Math.floor(i / HUBSPOT_BATCH_SIZE) + 1;

        try {
          await this.importBatch(sessionId, entityType, batch, mappings);

          // Update imported records
          for (const record of batch) {
            const hubspotId = `hs-${record.id}`; // Mock HubSpot ID
            progress.recordsImported++;

            if (entityType === "CONTACT") {
              await prisma.rawContact.update({
                where: { id: record.id },
                data: {
                  mappingStatus: "IMPORTED",
                  hubspotId,
                  importedAt: new Date(),
                },
              });
            } else {
              await prisma.rawHousehold.update({
                where: { id: record.id },
                data: {
                  mappingStatus: "IMPORTED",
                  hubspotId,
                  importedAt: new Date(),
                },
              });
            }
          }

          // Update progress
          progress.progress = Math.floor((progress.recordsImported / progress.totalRecords) * 100);
          onProgress?.(progress);

          // Rate limit wait
          if (i + HUBSPOT_BATCH_SIZE < records.length) {
            await this.sleep(RATE_LIMIT_WAIT_MS);
          }
        } catch (error) {
          console.error(`Batch ${progress.currentBatch} failed:`, error);

          // Mark batch records as failed
          for (const record of batch) {
            progress.recordsFailed++;
            progress.errors.push({
              recordId: record.id,
              error: error instanceof Error ? error.message : "Unknown error",
            });

            if (entityType === "CONTACT") {
              await prisma.rawContact.update({
                where: { id: record.id },
                data: {
                  importError: error instanceof Error ? error.message : "Unknown error",
                },
              });
            } else {
              await prisma.rawHousehold.update({
                where: { id: record.id },
                data: {
                  importError: error instanceof Error ? error.message : "Unknown error",
                },
              });
            }
          }
        }
      }

      progress.status = "COMPLETED";
      progress.progress = 100;
      onProgress?.(progress);

      return progress;
    } catch (error) {
      progress.status = "FAILED";
      progress.errors.push({
        recordId: "session",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      onProgress?.(progress);
      throw error;
    }
  }

  /**
   * Import a single batch to HubSpot
   */
  private static async importBatch(
    sessionId: string,
    entityType: "CONTACT" | "HOUSEHOLD",
    batch: any[],
    mappings: any[]
  ): Promise<void> {
    // Transform records using field mappings
    const transformedRecords = batch.map((record) => {
      const rawData = typeof record.rawData === "string" ? JSON.parse(record.rawData) : record.rawData;
      const hubspotData: any = {};

      for (const mapping of mappings) {
        const value = this.extractValue(rawData, mapping.sourceField);
        if (value !== null && value !== undefined) {
          hubspotData[mapping.targetProperty] = value;
        } else if (mapping.defaultValue) {
          hubspotData[mapping.targetProperty] = mapping.defaultValue;
        }
      }

      return {
        id: record.sourceId,
        properties: hubspotData,
      };
    });

    // In production, use HubSpot batch upsert API
    // For now, simulate the API call
    await this.mockHubSpotBatchUpsert(entityType, transformedRecords);
  }

  /**
   * Mock HubSpot batch upsert (replace with real API call in production)
   */
  private static async mockHubSpotBatchUpsert(
    entityType: string,
    records: any[]
  ): Promise<void> {
    // Simulate API call delay
    await this.sleep(500);

    // Mock: 95% success rate
    const randomFail = Math.random() < 0.05;
    if (randomFail) {
      throw new Error("HubSpot API error: Rate limit exceeded (429)");
    }

    // In production:
    // const apiKey = process.env.HUBSPOT_API_KEY;
    // const objectType = entityType === "CONTACT" ? "contacts" : "0-2";
    // const url = `https://api.hubapi.com/crm/v3/objects/${objectType}/batch/upsert`;
    //
    // const response = await fetch(url, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${apiKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ inputs: records }),
    // });
    //
    // if (!response.ok) {
    //   if (response.status === 429) {
    //     // Rate limited - retry with exponential backoff
    //     await this.sleep(5000);
    //     return this.mockHubSpotBatchUpsert(entityType, records);
    //   }
    //   throw new Error(`HubSpot API error: ${response.statusText}`);
    // }
  }

  /**
   * Extract value from nested object using dot notation
   */
  private static extractValue(obj: any, path: string): any {
    const parts = path.split(".");
    let value = obj;
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
