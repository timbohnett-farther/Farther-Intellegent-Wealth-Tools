/**
 * Duplicate Detection Service Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DuplicateDetectionService } from "../duplicate-detection";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rawContact: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    rawHousehold: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe("DuplicateDetectionService", () => {
  const testSessionId = "test-session-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkContactDuplicate", () => {
    it("should detect exact email match", async () => {
      const existingContact = {
        id: "existing-id",
        email: "test@example.com",
      };

      vi.mocked(prisma.rawContact.findFirst).mockResolvedValue(existingContact as any);

      const result = await DuplicateDetectionService.checkContactDuplicate(
        testSessionId,
        {
          firstName: "John",
          lastName: "Doe",
          email: "test@example.com",
        }
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.matchScore).toBe(100);
      expect(result.matchReason).toBe("Exact email match");
      expect(result.matchedId).toBe("existing-id");
    });

    it("should detect name and phone match", async () => {
      const existingContact = {
        id: "existing-id",
        firstName: "John",
        lastName: "Doe",
        phone: "555-123-4567",
        email: null,
      };

      vi.mocked(prisma.rawContact.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce(existingContact as any);

      const result = await DuplicateDetectionService.checkContactDuplicate(
        testSessionId,
        {
          firstName: "John",
          lastName: "Doe",
          phone: "(555) 123-4567", // Different format, same number
        }
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.matchScore).toBe(95);
      expect(result.matchReason).toBe("Name and phone match");
    });

    it("should detect fuzzy name match", async () => {
      const nameMatches = [
        {
          id: "existing-id",
          firstName: "John",
          lastName: "Doe",
        },
      ];

      vi.mocked(prisma.rawContact.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.rawContact.findMany).mockResolvedValue(nameMatches as any);

      const result = await DuplicateDetectionService.checkContactDuplicate(
        testSessionId,
        {
          firstName: "John",
          lastName: "Doe",
          email: "different@example.com",
        }
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.matchScore).toBe(75);
      expect(result.matchReason).toBe("Name match (possible duplicate)");
    });

    it("should not detect duplicate when no match", async () => {
      vi.mocked(prisma.rawContact.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.rawContact.findMany).mockResolvedValue([]);

      const result = await DuplicateDetectionService.checkContactDuplicate(
        testSessionId,
        {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        }
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.matchScore).toBe(0);
    });
  });

  describe("checkHouseholdDuplicate", () => {
    it("should detect household name and AUM match", async () => {
      const existingHousehold = {
        id: "existing-id",
        householdName: "Smith Family",
        aum: 1000000,
      };

      vi.mocked(prisma.rawHousehold.findFirst).mockResolvedValue(existingHousehold as any);

      const result = await DuplicateDetectionService.checkHouseholdDuplicate(
        testSessionId,
        {
          householdName: "Smith Family",
          aum: 1000500, // Within $1000 threshold
        }
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.matchScore).toBe(100);
      expect(result.matchReason).toBe("Household name and AUM match");
    });

    it("should detect household name match only", async () => {
      const existingHousehold = {
        id: "existing-id",
        householdName: "Smith Family",
        aum: null,
      };

      vi.mocked(prisma.rawHousehold.findFirst).mockResolvedValue(existingHousehold as any);

      const result = await DuplicateDetectionService.checkHouseholdDuplicate(
        testSessionId,
        {
          householdName: "Smith Family",
          aum: 500000,
        }
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.matchScore).toBe(85);
      expect(result.matchReason).toBe("Household name match");
    });

    it("should detect primary contact match", async () => {
      const existingHousehold = {
        id: "existing-id",
        primaryContact: "John Doe",
      };

      vi.mocked(prisma.rawHousehold.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce(existingHousehold as any);

      const result = await DuplicateDetectionService.checkHouseholdDuplicate(
        testSessionId,
        {
          householdName: "Different Family",
          primaryContact: "John Doe",
        }
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.matchScore).toBe(70);
      expect(result.matchReason).toBe("Primary contact match (possible duplicate)");
    });

    it("should not detect duplicate when no match", async () => {
      vi.mocked(prisma.rawHousehold.findFirst).mockResolvedValue(null);

      const result = await DuplicateDetectionService.checkHouseholdDuplicate(
        testSessionId,
        {
          householdName: "Unique Family",
          aum: 250000,
        }
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.matchScore).toBe(0);
    });
  });
});
