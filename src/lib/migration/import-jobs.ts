/**
 * Shared import jobs storage
 * In-memory storage for active import jobs (replace with Redis for production)
 */

export const activeImportJobs = new Map<string, any>();
