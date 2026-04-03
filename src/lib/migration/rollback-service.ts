/**
 * Rollback Service
 *
 * Handles rolling back imports and restoring previous state.
 */

import { prisma } from "@/lib/prisma";

interface RollbackResult {
  success: boolean;
  recordsReverted: number;
  errors: string[];
}

export class RollbackService {
  /**
   * Rollback all imported records for a session
   */
  static async rollbackSession(sessionId: string): Promise<RollbackResult> {
    const result: RollbackResult = {
      success: false,
      recordsReverted: 0,
      errors: [],
    };

    try {
      // Get session to validate it exists
      const session = await prisma.migrationSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        result.errors.push("Migration session not found");
        return result;
      }

      if (session.status !== "COMPLETED" && session.status !== "IMPORTING") {
        result.errors.push(
          `Cannot rollback session in ${session.status} status. Only COMPLETED or IMPORTING sessions can be rolled back.`
        );
        return result;
      }

      // Count records to be reverted
      const contactCount = await prisma.rawContact.count({
        where: {
          sessionId,
          mappingStatus: "IMPORTED",
        },
      });

      const householdCount = await prisma.rawHousehold.count({
        where: {
          sessionId,
          mappingStatus: "IMPORTED",
        },
      });

      const activityCount = await prisma.rawActivity.count({
        where: {
          sessionId,
          mappingStatus: "IMPORTED",
        },
      });

      // Revert contacts
      await prisma.rawContact.updateMany({
        where: {
          sessionId,
          mappingStatus: "IMPORTED",
        },
        data: {
          mappingStatus: "VALIDATED",
          hubspotId: null,
          importedAt: null,
          importError: null,
        },
      });

      // Revert households
      await prisma.rawHousehold.updateMany({
        where: {
          sessionId,
          mappingStatus: "IMPORTED",
        },
        data: {
          mappingStatus: "VALIDATED",
          hubspotId: null,
          importedAt: null,
          importError: null,
        },
      });

      // Revert activities
      await prisma.rawActivity.updateMany({
        where: {
          sessionId,
          mappingStatus: "IMPORTED",
        },
        data: {
          mappingStatus: "VALIDATED",
          hubspotId: null,
          importedAt: null,
          importError: null,
        },
      });

      // Update session status
      await prisma.migrationSession.update({
        where: { id: sessionId },
        data: {
          status: "VALIDATED",
          importedRecords: 0,
        },
      });

      result.success = true;
      result.recordsReverted = contactCount + householdCount + activityCount;

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Rollback failed"
      );
      return result;
    }
  }

  /**
   * Rollback specific entity type
   */
  static async rollbackEntityType(
    sessionId: string,
    entityType: "CONTACT" | "HOUSEHOLD" | "ACTIVITY"
  ): Promise<RollbackResult> {
    const result: RollbackResult = {
      success: false,
      recordsReverted: 0,
      errors: [],
    };

    try {
      const session = await prisma.migrationSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        result.errors.push("Migration session not found");
        return result;
      }

      let count = 0;

      switch (entityType) {
        case "CONTACT":
          count = await prisma.rawContact.count({
            where: { sessionId, mappingStatus: "IMPORTED" },
          });

          await prisma.rawContact.updateMany({
            where: { sessionId, mappingStatus: "IMPORTED" },
            data: {
              mappingStatus: "VALIDATED",
              hubspotId: null,
              importedAt: null,
              importError: null,
            },
          });
          break;

        case "HOUSEHOLD":
          count = await prisma.rawHousehold.count({
            where: { sessionId, mappingStatus: "IMPORTED" },
          });

          await prisma.rawHousehold.updateMany({
            where: { sessionId, mappingStatus: "IMPORTED" },
            data: {
              mappingStatus: "VALIDATED",
              hubspotId: null,
              importedAt: null,
              importError: null,
            },
          });
          break;

        case "ACTIVITY":
          count = await prisma.rawActivity.count({
            where: { sessionId, mappingStatus: "IMPORTED" },
          });

          await prisma.rawActivity.updateMany({
            where: { sessionId, mappingStatus: "IMPORTED" },
            data: {
              mappingStatus: "VALIDATED",
              hubspotId: null,
              importedAt: null,
              importError: null,
            },
          });
          break;
      }

      result.success = true;
      result.recordsReverted = count;

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Rollback failed"
      );
      return result;
    }
  }

  /**
   * Delete entire migration session and all related data
   */
  static async deleteSession(sessionId: string): Promise<RollbackResult> {
    const result: RollbackResult = {
      success: false,
      recordsReverted: 0,
      errors: [],
    };

    try {
      const session = await prisma.migrationSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        result.errors.push("Migration session not found");
        return result;
      }

      // Count total records
      const contactCount = await prisma.rawContact.count({ where: { sessionId } });
      const householdCount = await prisma.rawHousehold.count({ where: { sessionId } });
      const activityCount = await prisma.rawActivity.count({ where: { sessionId } });
      const relationshipCount = await prisma.rawRelationship.count({ where: { sessionId } });

      // Delete all related data (cascade will handle this via Prisma relations)
      await prisma.migrationSession.delete({
        where: { id: sessionId },
      });

      result.success = true;
      result.recordsReverted = contactCount + householdCount + activityCount + relationshipCount;

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Session deletion failed"
      );
      return result;
    }
  }
}
