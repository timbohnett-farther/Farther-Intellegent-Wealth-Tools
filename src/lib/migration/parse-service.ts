/**
 * Parse Service - Orchestrates CRM file parsing and database storage
 *
 * Handles:
 * - Parser selection based on platform
 * - Progress tracking
 * - Database storage of parsed results
 * - Error handling and logging
 */

import { prisma } from "@/lib/prisma";
import {
  CRMParser,
  ParseProgress,
  ParseResult,
  RawContactData,
  RawHouseholdData,
  RawActivityData,
  RawRelationshipData,
  SourceSystemType,
} from "./parsers/base-parser";

/**
 * Parse job status
 */
export interface ParseJob {
  id: string;
  sessionId: string;
  uploadId: string;
  status: "QUEUED" | "PARSING" | "STORING" | "COMPLETED" | "FAILED";
  progress: number;
  recordsParsed: number;
  recordsStored: number;
  errors: Array<{ message: string; severity: string }>;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * In-memory job storage (replace with Redis for production)
 */
const activeJobs = new Map<string, ParseJob>();

/**
 * Parse service class
 */
export class ParseService {
  /**
   * Start a parse job
   */
  static async startParseJob(
    sessionId: string,
    uploadId: string,
    parser: CRMParser,
    filePath: string
  ): Promise<string> {
    // Validate session exists and is in PARSING status
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Migration session not found");
    }

    if (session.status !== "PARSING") {
      throw new Error(`Session is not in PARSING status (current: ${session.status})`);
    }

    // Create job ID
    const jobId = `parse-${sessionId}-${Date.now()}`;

    // Initialize job
    const job: ParseJob = {
      id: jobId,
      sessionId,
      uploadId,
      status: "QUEUED",
      progress: 0,
      recordsParsed: 0,
      recordsStored: 0,
      errors: [],
      startedAt: new Date(),
    };

    activeJobs.set(jobId, job);

    // Start parsing asynchronously
    this.executeParseJob(jobId, parser, filePath).catch((error) => {
      console.error(`Parse job ${jobId} failed:`, error);
      const job = activeJobs.get(jobId);
      if (job) {
        job.status = "FAILED";
        job.errors.push({
          message: error instanceof Error ? error.message : "Unknown error",
          severity: "ERROR",
        });
        job.completedAt = new Date();
      }
    });

    return jobId;
  }

  /**
   * Execute parse job
   */
  private static async executeParseJob(
    jobId: string,
    parser: CRMParser,
    filePath: string
  ): Promise<void> {
    const job = activeJobs.get(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    try {
      // Update status to PARSING
      job.status = "PARSING";

      // Parse file with progress callback
      const result = await parser.parse(filePath, job.sessionId, (progress) => {
        job.progress = Math.floor(progress.progress * 0.7); // 0-70% for parsing
        job.recordsParsed = progress.recordsParsed;
      });

      // Update status to STORING
      job.status = "STORING";
      job.progress = 70;

      // Store results in database
      await this.storeParseResults(job.sessionId, result, (stored, total) => {
        job.progress = 70 + Math.floor((stored / total) * 30); // 70-100% for storing
        job.recordsStored = stored;
      });

      // Update session with totals
      await prisma.migrationSession.update({
        where: { id: job.sessionId },
        data: {
          status: "MAPPING",
          totalRecords: result.metadata?.totalRecords || 0,
          parsedRecords: result.metadata?.processedRecords || 0,
          errorCount: result.errors.filter((e) => e.severity === "ERROR").length,
          errorLog: JSON.stringify(result.errors),
        },
      });

      // Mark job complete
      job.status = "COMPLETED";
      job.progress = 100;
      job.completedAt = new Date();
    } catch (error) {
      job.status = "FAILED";
      job.errors.push({
        message: error instanceof Error ? error.message : "Unknown error",
        severity: "ERROR",
      });
      job.completedAt = new Date();

      // Update session status to FAILED
      await prisma.migrationSession.update({
        where: { id: job.sessionId },
        data: {
          status: "FAILED",
          errorLog: JSON.stringify(job.errors),
        },
      });

      throw error;
    }
  }

  /**
   * Store parse results in database
   */
  private static async storeParseResults(
    sessionId: string,
    result: ParseResult,
    onProgress?: (stored: number, total: number) => void
  ): Promise<void> {
    const totalRecords =
      result.contacts.length +
      result.households.length +
      result.activities.length +
      result.relationships.length;
    let storedCount = 0;

    // Store contacts
    for (const contact of result.contacts) {
      await prisma.rawContact.create({
        data: {
          sessionId,
          sourceId: contact.sourceId,
          sourceType: contact.sourceType,
          rawData: JSON.stringify(contact.rawData),
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          mappingStatus: "UNMAPPED",
        },
      });
      storedCount++;
      onProgress?.(storedCount, totalRecords);
    }

    // Store households
    for (const household of result.households) {
      await prisma.rawHousehold.create({
        data: {
          sessionId,
          sourceId: household.sourceId,
          rawData: JSON.stringify(household.rawData),
          householdName: household.householdName,
          primaryContact: household.primaryContact,
          aum: household.aum,
          mappingStatus: "UNMAPPED",
        },
      });
      storedCount++;
      onProgress?.(storedCount, totalRecords);
    }

    // Store activities
    for (const activity of result.activities) {
      await prisma.rawActivity.create({
        data: {
          sessionId,
          sourceId: activity.sourceId,
          rawData: JSON.stringify(activity.rawData),
          activityType: activity.activityType,
          subject: activity.subject,
          description: activity.description,
          activityDate: activity.activityDate,
          relatedContactId: activity.relatedContactId,
          mappingStatus: "UNMAPPED",
        },
      });
      storedCount++;
      onProgress?.(storedCount, totalRecords);
    }

    // Store relationships
    for (const relationship of result.relationships) {
      await prisma.rawRelationship.create({
        data: {
          sessionId,
          sourceId: relationship.sourceId,
          rawData: JSON.stringify(relationship.rawData),
          fromEntityType: relationship.fromEntityType,
          fromEntityId: relationship.fromEntityId,
          toEntityType: relationship.toEntityType,
          toEntityId: relationship.toEntityId,
          relationshipType: relationship.relationshipType,
          mappingStatus: "UNMAPPED",
        },
      });
      storedCount++;
      onProgress?.(storedCount, totalRecords);
    }
  }

  /**
   * Get parse job status
   */
  static getJobStatus(jobId: string): ParseJob | undefined {
    return activeJobs.get(jobId);
  }

  /**
   * Get all active jobs for a session
   */
  static getSessionJobs(sessionId: string): ParseJob[] {
    return Array.from(activeJobs.values()).filter((job) => job.sessionId === sessionId);
  }

  /**
   * Clean up completed jobs older than 1 hour
   */
  static cleanupOldJobs(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [jobId, job] of activeJobs.entries()) {
      if (
        (job.status === "COMPLETED" || job.status === "FAILED") &&
        job.completedAt &&
        job.completedAt < oneHourAgo
      ) {
        activeJobs.delete(jobId);
      }
    }
  }
}

// Cleanup old jobs every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => ParseService.cleanupOldJobs(), 10 * 60 * 1000);
}
