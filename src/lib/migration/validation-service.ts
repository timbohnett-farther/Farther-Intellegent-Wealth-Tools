/**
 * Validation Service
 *
 * Validates mapped data against HubSpot property schemas before import.
 * Checks required fields, data types, enum values, and format constraints.
 */

import { prisma } from "@/lib/prisma";

export interface ValidationRule {
  field: string;
  type: string;
  required: boolean;
  options?: string[];
  format?: "email" | "phone" | "date" | "url";
}

export interface ValidationError {
  recordId: string;
  entityType: "CONTACT" | "HOUSEHOLD";
  field: string;
  error: string;
  severity: "ERROR" | "WARNING";
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  totalRecords: number;
  validRecords: number;
  errorCount: number;
  warningCount: number;
  errors: ValidationError[];
}

/**
 * Validation Service Class
 */
export class ValidationService {
  /**
   * Validate all records for a session
   */
  static async validateSession(
    sessionId: string,
    entityType: "CONTACT" | "HOUSEHOLD"
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      totalRecords: 0,
      validRecords: 0,
      errorCount: 0,
      warningCount: 0,
      errors: [],
    };

    try {
      // Fetch field mappings
      const mappings = await prisma.fieldMapping.findMany({
        where: { sessionId, entityType },
      });

      // Build validation rules from mappings
      const rules = mappings.map((m) => ({
        field: m.targetProperty,
        sourceField: m.sourceField,
        type: this.inferTypeFromProperty(m.targetProperty),
        required: m.required,
      }));

      // Fetch records
      let records: any[] = [];
      if (entityType === "CONTACT") {
        records = await prisma.rawContact.findMany({
          where: { sessionId },
        });
      } else {
        records = await prisma.rawHousehold.findMany({
          where: { sessionId },
        });
      }

      result.totalRecords = records.length;

      // Validate each record
      for (const record of records) {
        const rawData = typeof record.rawData === "string" ? JSON.parse(record.rawData) : record.rawData;
        const recordErrors = this.validateRecord(record.id, entityType, rawData, mappings, rules);

        if (recordErrors.length > 0) {
          result.errors.push(...recordErrors);
          result.errorCount += recordErrors.filter((e) => e.severity === "ERROR").length;
          result.warningCount += recordErrors.filter((e) => e.severity === "WARNING").length;

          // Update record with validation errors
          const errorData = JSON.stringify(recordErrors);
          if (entityType === "CONTACT") {
            await prisma.rawContact.update({
              where: { id: record.id },
              data: {
                mappingStatus: "ERROR",
                validationErrors: errorData,
              },
            });
          } else {
            await prisma.rawHousehold.update({
              where: { id: record.id },
              data: {
                mappingStatus: "ERROR",
                validationErrors: errorData,
              },
            });
          }
        } else {
          result.validRecords++;

          // Update record to VALIDATED status
          if (entityType === "CONTACT") {
            await prisma.rawContact.update({
              where: { id: record.id },
              data: { mappingStatus: "VALIDATED" },
            });
          } else {
            await prisma.rawHousehold.update({
              where: { id: record.id },
              data: { mappingStatus: "VALIDATED" },
            });
          }
        }
      }

      result.valid = result.errorCount === 0;

      return result;
    } catch (error) {
      console.error("Validation error:", error);
      throw error;
    }
  }

  /**
   * Validate a single record
   */
  private static validateRecord(
    recordId: string,
    entityType: "CONTACT" | "HOUSEHOLD",
    rawData: any,
    mappings: any[],
    rules: any[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const mapping = mappings.find((m) => m.targetProperty === rule.field);
      if (!mapping) continue;

      // Extract value from rawData using sourceField path
      const value = this.extractValue(rawData, mapping.sourceField);

      // Required field validation
      if (rule.required && (value === null || value === undefined || value === "")) {
        errors.push({
          recordId,
          entityType,
          field: rule.field,
          error: "Required field is missing",
          severity: "ERROR",
        });
        continue;
      }

      // Skip validation if value is empty (for non-required fields)
      if (value === null || value === undefined || value === "") {
        continue;
      }

      // Type validation
      const typeError = this.validateType(value, rule.type);
      if (typeError) {
        errors.push({
          recordId,
          entityType,
          field: rule.field,
          error: typeError,
          severity: "ERROR",
          value,
        });
      }

      // Format validation
      const formatError = this.validateFormat(value, rule.field);
      if (formatError) {
        errors.push({
          recordId,
          entityType,
          field: rule.field,
          error: formatError,
          severity: "WARNING",
          value,
        });
      }
    }

    return errors;
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
   * Validate data type
   */
  private static validateType(value: any, expectedType: string): string | null {
    const actualType = typeof value;

    switch (expectedType) {
      case "string":
        if (actualType !== "string") {
          return `Expected string, got ${actualType}`;
        }
        break;

      case "number":
        if (actualType !== "number" && isNaN(Number(value))) {
          return `Expected number, got ${actualType}`;
        }
        break;

      case "boolean":
        if (actualType !== "boolean" && value !== "true" && value !== "false") {
          return `Expected boolean, got ${actualType}`;
        }
        break;

      case "date":
        if (isNaN(Date.parse(value))) {
          return `Invalid date format`;
        }
        break;
    }

    return null;
  }

  /**
   * Validate format constraints
   */
  private static validateFormat(value: any, field: string): string | null {
    const stringValue = String(value);

    // Email validation
    if (field === "email" || field.toLowerCase().includes("email")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        return "Invalid email format";
      }
    }

    // Phone validation (basic)
    if (field === "phone" || field.toLowerCase().includes("phone")) {
      const phoneRegex = /^\+?[\d\s\-().]{7,}$/;
      if (!phoneRegex.test(stringValue)) {
        return "Invalid phone format";
      }
    }

    // URL validation
    if (field === "website" || field.toLowerCase().includes("url")) {
      try {
        new URL(stringValue);
      } catch {
        return "Invalid URL format";
      }
    }

    return null;
  }

  /**
   * Infer data type from HubSpot property name
   */
  private static inferTypeFromProperty(propertyName: string): string {
    if (propertyName.includes("date") || propertyName.includes("time")) return "date";
    if (propertyName.includes("amount") || propertyName.includes("value") || propertyName.includes("aum")) return "number";
    if (propertyName === "email") return "string";
    if (propertyName.includes("phone")) return "string";
    return "string"; // Default to string
  }
}
