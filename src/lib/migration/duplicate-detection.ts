/**
 * Duplicate Detection Service
 *
 * Identifies and handles duplicate records during migration.
 */

import { prisma } from "@/lib/prisma";

interface DuplicateResult {
  isDuplicate: boolean;
  matchedId?: string;
  matchScore: number;
  matchReason?: string;
}

export class DuplicateDetectionService {
  /**
   * Check if a contact is a duplicate
   */
  static async checkContactDuplicate(
    sessionId: string,
    record: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
    }
  ): Promise<DuplicateResult> {
    // Check for exact email match (highest confidence)
    if (record.email) {
      const emailMatch = await prisma.rawContact.findFirst({
        where: {
          sessionId,
          email: record.email,
          mappingStatus: { not: "ERROR" },
        },
      });

      if (emailMatch) {
        return {
          isDuplicate: true,
          matchedId: emailMatch.id,
          matchScore: 100,
          matchReason: "Exact email match",
        };
      }
    }

    // Check for name + phone match
    if (record.firstName && record.lastName && record.phone) {
      const normalizedPhone = this.normalizePhone(record.phone);
      const namePhoneMatch = await prisma.rawContact.findFirst({
        where: {
          sessionId,
          firstName: record.firstName,
          lastName: record.lastName,
          mappingStatus: { not: "ERROR" },
        },
      });

      if (namePhoneMatch && namePhoneMatch.phone) {
        const matchPhone = this.normalizePhone(namePhoneMatch.phone);
        if (matchPhone === normalizedPhone) {
          return {
            isDuplicate: true,
            matchedId: namePhoneMatch.id,
            matchScore: 95,
            matchReason: "Name and phone match",
          };
        }
      }
    }

    // Check for fuzzy name match
    if (record.firstName && record.lastName) {
      const nameMatches = await prisma.rawContact.findMany({
        where: {
          sessionId,
          firstName: record.firstName,
          lastName: record.lastName,
          mappingStatus: { not: "ERROR" },
        },
      });

      if (nameMatches.length > 0) {
        return {
          isDuplicate: true,
          matchedId: nameMatches[0].id,
          matchScore: 75,
          matchReason: "Name match (possible duplicate)",
        };
      }
    }

    return {
      isDuplicate: false,
      matchScore: 0,
    };
  }

  /**
   * Check if a household is a duplicate
   */
  static async checkHouseholdDuplicate(
    sessionId: string,
    record: {
      householdName?: string | null;
      primaryContact?: string | null;
      aum?: number | null;
    }
  ): Promise<DuplicateResult> {
    // Check for exact household name match
    if (record.householdName) {
      const nameMatch = await prisma.rawHousehold.findFirst({
        where: {
          sessionId,
          householdName: record.householdName,
          mappingStatus: { not: "ERROR" },
        },
      });

      if (nameMatch) {
        // If AUM also matches, high confidence
        if (record.aum && nameMatch.aum && Math.abs(Number(nameMatch.aum) - record.aum) < 1000) {
          return {
            isDuplicate: true,
            matchedId: nameMatch.id,
            matchScore: 100,
            matchReason: "Household name and AUM match",
          };
        }

        return {
          isDuplicate: true,
          matchedId: nameMatch.id,
          matchScore: 85,
          matchReason: "Household name match",
        };
      }
    }

    // Check for primary contact match
    if (record.primaryContact && record.householdName) {
      const contactMatch = await prisma.rawHousehold.findFirst({
        where: {
          sessionId,
          primaryContact: record.primaryContact,
          mappingStatus: { not: "ERROR" },
        },
      });

      if (contactMatch) {
        return {
          isDuplicate: true,
          matchedId: contactMatch.id,
          matchScore: 70,
          matchReason: "Primary contact match (possible duplicate)",
        };
      }
    }

    return {
      isDuplicate: false,
      matchScore: 0,
    };
  }

  /**
   * Merge duplicate records (keep first, mark others as duplicates)
   */
  static async mergeDuplicates(
    sessionId: string,
    entityType: "CONTACT" | "HOUSEHOLD"
  ): Promise<{
    totalRecords: number;
    duplicatesFound: number;
    merged: number;
  }> {
    let totalRecords = 0;
    let duplicatesFound = 0;
    let merged = 0;

    if (entityType === "CONTACT") {
      const contacts = await prisma.rawContact.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      totalRecords = contacts.length;
      const seen = new Set<string>();

      for (const contact of contacts) {
        const key = this.generateContactKey(contact);

        if (seen.has(key)) {
          duplicatesFound++;

          // Mark as duplicate (set mapping status to ERROR with note)
          await prisma.rawContact.update({
            where: { id: contact.id },
            data: {
              mappingStatus: "ERROR",
              validationErrors: JSON.stringify({ errors: [{ field: "duplicate", error: "Duplicate record detected", severity: "WARNING" }] }),
            },
          });
          merged++;
        } else {
          seen.add(key);
        }
      }
    } else if (entityType === "HOUSEHOLD") {
      const households = await prisma.rawHousehold.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      totalRecords = households.length;
      const seen = new Set<string>();

      for (const household of households) {
        const key = this.generateHouseholdKey(household);

        if (seen.has(key)) {
          duplicatesFound++;

          await prisma.rawHousehold.update({
            where: { id: household.id },
            data: {
              mappingStatus: "ERROR",
              validationErrors: JSON.stringify({ errors: [{ field: "duplicate", error: "Duplicate record detected", severity: "WARNING" }] }),
            },
          });
          merged++;
        } else {
          seen.add(key);
        }
      }
    }

    return {
      totalRecords,
      duplicatesFound,
      merged,
    };
  }

  /**
   * Generate unique key for contact deduplication
   */
  private static generateContactKey(contact: any): string {
    const parts: string[] = [];

    if (contact.email) {
      parts.push(`email:${contact.email.toLowerCase()}`);
    }

    if (contact.firstName && contact.lastName) {
      parts.push(`name:${contact.firstName.toLowerCase()}_${contact.lastName.toLowerCase()}`);
    }

    if (contact.phone) {
      parts.push(`phone:${this.normalizePhone(contact.phone)}`);
    }

    return parts.join("|");
  }

  /**
   * Generate unique key for household deduplication
   */
  private static generateHouseholdKey(household: any): string {
    const parts: string[] = [];

    if (household.householdName) {
      parts.push(`name:${household.householdName.toLowerCase()}`);
    }

    if (household.primaryContact) {
      parts.push(`contact:${household.primaryContact.toLowerCase()}`);
    }

    if (household.aum) {
      parts.push(`aum:${Math.round(Number(household.aum))}`);
    }

    return parts.join("|");
  }

  /**
   * Normalize phone number for comparison
   */
  private static normalizePhone(phone: string): string {
    return phone.replace(/[^\d]/g, "");
  }
}
