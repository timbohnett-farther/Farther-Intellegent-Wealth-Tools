/**
 * Redtail CRM Parser
 *
 * Parses Redtail CSV exports into standardized format.
 * Expected format: Multiple CSV files (contacts.csv, accounts.csv, activities.csv, relationships.csv)
 * or a ZIP file containing these CSVs.
 */

import * as fs from "fs/promises";
import * as path from "path";
import {
  CRMParser,
  ParseProgress,
  ParseProgressCallback,
  ParseResult,
  RawContactData,
  RawHouseholdData,
  RawActivityData,
  RawRelationshipData,
  ActivityType,
  ParseError,
} from "./base-parser";

// Simple CSV parser (for production, use a library like papaparse or csv-parse)
function parseCSV(content: string): any[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

export class RedtailParser implements CRMParser {
  platform: "REDTAIL" = "REDTAIL";
  supportedExtensions = [".csv", ".zip"];

  async parse(
    filePath: string,
    sessionId: string,
    onProgress?: ParseProgressCallback
  ): Promise<ParseResult> {
    const startTime = Date.now();
    const result: ParseResult = {
      contacts: [],
      households: [],
      activities: [],
      relationships: [],
      errors: [],
    };

    try {
      onProgress?.({
        status: "PARSING",
        progress: 0,
        recordsParsed: 0,
        message: "Reading Redtail export file...",
      });

      const ext = path.extname(filePath).toLowerCase();

      if (ext === ".csv") {
        // Single CSV file - assume it's contacts
        const content = await fs.readFile(filePath, "utf-8");
        const rows = parseCSV(content);

        for (let i = 0; i < rows.length; i++) {
          try {
            const contact = this.parseContact(rows[i]);
            result.contacts.push(contact);
          } catch (error) {
            result.errors.push({
              record: i,
              message: `Failed to parse contact row ${i}: ${error instanceof Error ? error.message : "Unknown error"}`,
              severity: "WARNING",
              rawData: rows[i],
            });
          }

          onProgress?.({
            status: "PARSING",
            progress: ((i + 1) / rows.length) * 100,
            recordsParsed: i + 1,
            currentEntity: "contacts",
          });
        }
      } else if (ext === ".zip") {
        // ZIP file with multiple CSVs - not implemented yet
        // TODO: Use a ZIP library to extract and parse multiple CSV files
        result.errors.push({
          message: "ZIP file parsing not yet implemented. Please extract ZIP manually and upload individual CSV files.",
          severity: "ERROR",
        });
      }

      onProgress?.({
        status: "PARSING",
        progress: 100,
        recordsParsed:
          result.contacts.length +
          result.households.length +
          result.activities.length +
          result.relationships.length,
        message: "Parsing completed",
      });

      // Add metadata
      result.metadata = {
        totalRecords:
          result.contacts.length +
          result.households.length +
          result.activities.length +
          result.relationships.length,
        processedRecords:
          result.contacts.length +
          result.households.length +
          result.activities.length +
          result.relationships.length,
        skippedRecords: result.errors.filter((e) => e.severity === "ERROR").length,
        parseTimeMs: Date.now() - startTime,
      };

      return result;
    } catch (error) {
      result.errors.push({
        message: `Fatal parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "ERROR",
      });

      onProgress?.({
        status: "FAILED",
        progress: 0,
        recordsParsed: 0,
        message: `Parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });

      throw error;
    }
  }

  async validateFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file exists
      await fs.access(filePath);

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedExtensions.includes(ext)) {
        return {
          valid: false,
          error: `Unsupported file extension: ${ext}. Expected: ${this.supportedExtensions.join(", ")}`,
        };
      }

      // For CSV, verify it has valid structure
      if (ext === ".csv") {
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          return { valid: false, error: "CSV file must have at least a header and one data row" };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "File validation failed",
      };
    }
  }

  /**
   * Parse individual contact from Redtail CSV
   *
   * Expected columns (adjust based on actual Redtail export):
   * - ContactID, FirstName, LastName, Email, Phone, Type, etc.
   */
  private parseContact(row: any): RawContactData {
    return {
      sourceId: String(row.ContactID || row.ID || row.ClientID || ""),
      sourceType: row.Type || row.ContactType || row.Category,
      rawData: row,
      firstName: row.FirstName || row.First || row.GivenName,
      lastName: row.LastName || row.Last || row.FamilyName || row.Surname,
      email: row.Email || row.EmailAddress || row.PrimaryEmail,
      phone: row.Phone || row.PhoneNumber || row.PrimaryPhone,
      company: row.Company || row.CompanyName || row.Organization,
    };
  }

  /**
   * Parse individual household from Redtail CSV
   */
  private parseHousehold(row: any): RawHouseholdData {
    return {
      sourceId: String(row.HouseholdID || row.FamilyID || row.GroupID || ""),
      rawData: row,
      householdName: row.HouseholdName || row.FamilyName || row.GroupName,
      primaryContact: row.PrimaryContact || row.HeadOfHousehold,
      aum: parseFloat(row.AUM || row.TotalAssets || row.PortfolioValue || "0"),
    };
  }

  /**
   * Parse individual activity from Redtail CSV
   */
  private parseActivity(row: any): RawActivityData {
    // Map Redtail activity types to our ActivityType enum
    const activityTypeMap: Record<string, ActivityType> = {
      note: "NOTE",
      meeting: "MEETING",
      call: "CALL",
      email: "EMAIL",
      task: "TASK",
      appointment: "MEETING",
      "phone call": "CALL",
    };

    const rawType = (row.Type || row.ActivityType || "note").toLowerCase();
    const activityType = activityTypeMap[rawType] || "NOTE";

    return {
      sourceId: String(row.ActivityID || row.ID || ""),
      rawData: row,
      activityType,
      subject: row.Subject || row.Title || row.Description,
      description: row.Notes || row.Description || row.Details,
      activityDate: row.Date || row.ActivityDate ? new Date(row.Date || row.ActivityDate) : undefined,
      relatedContactId: row.ContactID || row.ClientID || row.RelatedTo,
    };
  }

  /**
   * Parse individual relationship from Redtail CSV
   */
  private parseRelationship(row: any): RawRelationshipData {
    return {
      sourceId: String(row.RelationshipID || row.ID || ""),
      rawData: row,
      fromEntityType: row.FromType === "Household" ? "HOUSEHOLD" : "CONTACT",
      fromEntityId: String(row.FromID || row.ContactID1 || ""),
      toEntityType: row.ToType === "Household" ? "HOUSEHOLD" : "CONTACT",
      toEntityId: String(row.ToID || row.ContactID2 || ""),
      relationshipType: row.RelationshipType || row.Relationship || row.Role,
    };
  }
}
