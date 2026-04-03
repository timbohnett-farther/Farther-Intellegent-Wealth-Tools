/**
 * Validation Service Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationService } from "../validation-service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fieldMapping: {
      findMany: vi.fn(),
    },
    rawContact: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    rawHousehold: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    migrationSession: {
      update: vi.fn(),
    },
  },
}));

describe("ValidationService", () => {
  const testSessionId = "test-session-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateSession", () => {
    it("should validate contacts with no errors", async () => {
      const mockMappings = [
        {
          entityType: "CONTACT",
          sourceField: "email",
          targetProperty: "email",
          required: true,
        },
      ];

      const mockContacts = [
        {
          id: "contact-1",
          rawData: JSON.stringify({ email: "valid@example.com" }),
        },
      ];

      vi.mocked(prisma.fieldMapping.findMany).mockResolvedValue(mockMappings as any);
      vi.mocked(prisma.rawContact.findMany).mockResolvedValue(mockContacts as any);
      vi.mocked(prisma.rawContact.update).mockResolvedValue({} as any);
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);

      const result = await ValidationService.validateSession(testSessionId, "CONTACT");

      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.recordsValidated).toBe(1);
    });

    it("should detect required field missing", async () => {
      const mockMappings = [
        {
          entityType: "CONTACT",
          sourceField: "email",
          targetProperty: "email",
          required: true,
        },
      ];

      const mockContacts = [
        {
          id: "contact-1",
          rawData: JSON.stringify({ name: "John Doe" }), // Missing required email
        },
      ];

      vi.mocked(prisma.fieldMapping.findMany).mockResolvedValue(mockMappings as any);
      vi.mocked(prisma.rawContact.findMany).mockResolvedValue(mockContacts as any);
      vi.mocked(prisma.rawContact.update).mockResolvedValue({} as any);
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);

      const result = await ValidationService.validateSession(testSessionId, "CONTACT");

      expect(result.valid).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(prisma.rawContact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "contact-1" },
          data: expect.objectContaining({
            mappingStatus: "ERROR",
          }),
        })
      );
    });

    it("should validate email format", async () => {
      const mockMappings = [
        {
          entityType: "CONTACT",
          sourceField: "email",
          targetProperty: "email",
          required: false,
        },
      ];

      const mockContacts = [
        {
          id: "contact-1",
          rawData: JSON.stringify({ email: "invalid-email" }),
        },
      ];

      vi.mocked(prisma.fieldMapping.findMany).mockResolvedValue(mockMappings as any);
      vi.mocked(prisma.rawContact.findMany).mockResolvedValue(mockContacts as any);
      vi.mocked(prisma.rawContact.update).mockResolvedValue({} as any);
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);

      const result = await ValidationService.validateSession(testSessionId, "CONTACT");

      expect(result.valid).toBe(false);
      expect(result.warningCount).toBe(1);
    });

    it("should validate phone format", async () => {
      const mockMappings = [
        {
          entityType: "CONTACT",
          sourceField: "phone",
          targetProperty: "phone",
          required: false,
        },
      ];

      const mockContacts = [
        {
          id: "contact-1",
          rawData: JSON.stringify({ phone: "123" }), // Too short
        },
      ];

      vi.mocked(prisma.fieldMapping.findMany).mockResolvedValue(mockMappings as any);
      vi.mocked(prisma.rawContact.findMany).mockResolvedValue(mockContacts as any);
      vi.mocked(prisma.rawContact.update).mockResolvedValue({} as any);
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);

      const result = await ValidationService.validateSession(testSessionId, "CONTACT");

      expect(result.valid).toBe(false);
      expect(result.warningCount).toBe(1);
    });

    it("should apply default values when field missing", async () => {
      const mockMappings = [
        {
          entityType: "CONTACT",
          sourceField: "country",
          targetProperty: "country",
          required: false,
          defaultValue: "USA",
        },
      ];

      const mockContacts = [
        {
          id: "contact-1",
          rawData: JSON.stringify({ email: "test@example.com" }), // No country field
        },
      ];

      vi.mocked(prisma.fieldMapping.findMany).mockResolvedValue(mockMappings as any);
      vi.mocked(prisma.rawContact.findMany).mockResolvedValue(mockContacts as any);
      vi.mocked(prisma.rawContact.update).mockResolvedValue({} as any);
      vi.mocked(prisma.migrationSession.update).mockResolvedValue({} as any);

      const result = await ValidationService.validateSession(testSessionId, "CONTACT");

      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });
  });

  describe("validateType", () => {
    it("should validate string type", () => {
      expect(ValidationService["validateType"]("test", "string")).toBeNull();
      expect(ValidationService["validateType"](123, "string")).toBe("Expected string, got number");
    });

    it("should validate number type", () => {
      expect(ValidationService["validateType"](123, "number")).toBeNull();
      expect(ValidationService["validateType"]("123", "number")).toBe("Expected number, got string");
    });

    it("should validate date type", () => {
      expect(ValidationService["validateType"]("2024-01-15", "date")).toBeNull();
      expect(ValidationService["validateType"]("invalid-date", "date")).toBe("Invalid date format");
    });

    it("should validate boolean type", () => {
      expect(ValidationService["validateType"](true, "boolean")).toBeNull();
      expect(ValidationService["validateType"]("true", "boolean")).toBe("Expected boolean, got string");
    });
  });

  describe("validateFormat", () => {
    it("should validate email format", () => {
      expect(ValidationService["validateFormat"]("valid@example.com", "email")).toBeNull();
      expect(ValidationService["validateFormat"]("invalid-email", "email")).toBe("Invalid email format");
    });

    it("should validate phone format", () => {
      expect(ValidationService["validateFormat"]("555-123-4567", "phone")).toBeNull();
      expect(ValidationService["validateFormat"]("123", "phone")).toBe("Phone must be at least 10 characters");
    });

    it("should validate URL format", () => {
      expect(ValidationService["validateFormat"]("https://example.com", "url")).toBeNull();
      expect(ValidationService["validateFormat"]("not-a-url", "url")).toBe("Invalid URL format");
    });
  });
});
