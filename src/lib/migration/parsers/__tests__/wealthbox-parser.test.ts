/**
 * Wealthbox Parser Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WealthboxParser } from "../wealthbox-parser";
import * as fs from "fs/promises";
import { prisma } from "@/lib/prisma";

// Mock fs and prisma
vi.mock("fs/promises");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    migrationSession: {
      update: vi.fn(),
    },
    rawContact: {
      create: vi.fn(),
    },
    rawHousehold: {
      create: vi.fn(),
    },
    rawActivity: {
      create: vi.fn(),
    },
  },
}));

describe("WealthboxParser", () => {
  const parser = new WealthboxParser();
  const testSessionId = "test-session-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateFile", () => {
    it("should accept valid JSON files", async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 1000 } as any);

      const result = await parser.validateFile("/path/to/file.json");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept ZIP files", async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 1000 } as any);

      const result = await parser.validateFile("/path/to/file.zip");

      expect(result.valid).toBe(true);
    });

    it("should reject empty files", async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 0 } as any);

      const result = await parser.validateFile("/path/to/file.json");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("File is empty");
    });

    it("should reject unsupported file types", async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 1000 } as any);

      const result = await parser.validateFile("/path/to/file.txt");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unsupported file type");
    });
  });

  describe("parse", () => {
    it("should parse valid Wealthbox JSON with contacts", async () => {
      const mockData = {
        contacts: [
          {
            id: "123",
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            phone: "555-1234",
          },
        ],
        groups: [],
        notes: [],
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);
      vi.mocked(prisma.rawContact.create).mockResolvedValue({
        id: "created-id",
        firstName: "John",
        lastName: "Doe",
      } as any);

      const result = await parser.parse("/path/to/file.json", testSessionId);

      expect(result.contacts).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(prisma.rawContact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            sessionId: testSessionId,
          }),
        })
      );
    });

    it("should parse households from groups", async () => {
      const mockData = {
        contacts: [],
        groups: [
          {
            id: "456",
            name: "Smith Family",
          },
        ],
        notes: [],
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);
      vi.mocked(prisma.rawHousehold.create).mockResolvedValue({
        id: "created-id",
        householdName: "Smith Family",
      } as any);

      const result = await parser.parse("/path/to/file.json", testSessionId);

      expect(result.households).toHaveLength(1);
      expect(prisma.rawHousehold.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            householdName: "Smith Family",
            sessionId: testSessionId,
          }),
        })
      );
    });

    it("should parse activities from notes", async () => {
      const mockData = {
        contacts: [],
        groups: [],
        notes: [
          {
            id: "789",
            subject: "Client Meeting",
            body: "Discussed portfolio",
            created_at: "2024-01-15T10:00:00Z",
          },
        ],
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);
      vi.mocked(prisma.rawActivity.create).mockResolvedValue({
        id: "created-id",
        subject: "Client Meeting",
      } as any);

      const result = await parser.parse("/path/to/file.json", testSessionId);

      expect(result.activities).toHaveLength(1);
      expect(prisma.rawActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: "Client Meeting",
            description: "Discussed portfolio",
            sessionId: testSessionId,
          }),
        })
      );
    });

    it("should handle invalid JSON gracefully", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("{ invalid json");

      const result = await parser.parse("/path/to/file.json", testSessionId);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("ERROR");
    });

    it("should handle empty arrays", async () => {
      const mockData = {
        contacts: [],
        groups: [],
        notes: [],
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);

      const result = await parser.parse("/path/to/file.json", testSessionId);

      expect(result.contacts).toHaveLength(0);
      expect(result.households).toHaveLength(0);
      expect(result.activities).toHaveLength(0);
    });
  });
});
