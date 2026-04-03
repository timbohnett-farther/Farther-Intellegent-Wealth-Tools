/**
 * Commonwealth Financial Network BAK Parser
 *
 * Parses Commonwealth BAK files and ZIP archives containing client data.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { CRMParser, ParseResult, ParseProgressCallback, SourceSystemType, RawContactData, RawHouseholdData, RawActivityData } from "./base-parser";
import { prisma } from "@/lib/prisma";

export class CommonwealthParser implements CRMParser {
  platform: SourceSystemType = "COMMONWEALTH";
  supportedExtensions = [".bak", ".zip"];

  async parse(
    filePath: string,
    sessionId: string,
    onProgress?: ParseProgressCallback
  ): Promise<ParseResult> {
    const result: ParseResult = {
      contacts: [],
      households: [],
      activities: [],
      relationships: [],
      errors: [],
    };

    try {
      // Update session status
      await prisma.migrationSession.update({
        where: { id: sessionId },
        data: { status: "PARSING" },
      });

      onProgress?.({ status: "PARSING", progress: 10, message: "Reading Commonwealth BAK file...", recordsParsed: 0 });

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();

      if (ext === ".zip") {
        // Extract ZIP and process contents
        result.errors.push({
          record: 0,
          field: "format",
          message: "ZIP extraction not yet implemented. Please extract manually and upload BAK file.",
          severity: "ERROR",
        });
        return result;
      }

      // Read BAK file as text (Commonwealth BAK files are often tab-delimited or pipe-delimited)
      const fileContent = await fs.readFile(filePath, "utf-8");

      // Try to parse as delimited format
      const lines = fileContent.split("\n").filter((line) => line.trim().length > 0);

      if (lines.length === 0) {
        result.errors.push({
          record: 0,
          field: "content",
          message: "BAK file is empty",
          severity: "ERROR",
        });
        return result;
      }

      onProgress?.({ status: "PARSING", progress: 30, message: "Parsing Commonwealth data...", recordsParsed: 0 });

      // Detect delimiter (tab or pipe)
      const firstLine = lines[0];
      const delimiter = firstLine.includes("\t") ? "\t" : "|";

      // Parse header row
      const headers = lines[0].split(delimiter).map((h) => h.trim());

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v) => v.trim());

        if (values.length !== headers.length) {
          result.errors.push({
            record: i + 1,
            field: "row",
            message: `Column count mismatch: expected ${headers.length}, got ${values.length}`,
            severity: "WARNING",
          });
          continue;
        }

        // Create record object
        const record: any = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx];
        });

        // Determine record type based on available fields
        const recordType = this.detectRecordType(record);

        try {
          switch (recordType) {
            case "contact":
              result.contacts.push(await this.parseContact(record, sessionId, i));
              break;
            case "household":
              result.households.push(await this.parseHousehold(record, sessionId, i));
              break;
            case "activity":
              result.activities.push(await this.parseActivity(record, sessionId, i));
              break;
            default:
              // Unknown type - store as contact by default
              result.contacts.push(await this.parseContact(record, sessionId, i));
          }
        } catch (error) {
          result.errors.push({
            record: i + 1,
            field: "parsing",
            message: error instanceof Error ? error.message : "Failed to parse record",
            severity: "ERROR",
          });
        }

        // Progress update
        if (i % 100 === 0) {
          const progress = Math.floor((i / lines.length) * 100);
          onProgress?.({
            status: "PARSING",
            progress,
            message: `Parsed ${i} of ${lines.length} records...`,
            recordsParsed: i,
          });
        }
      }

      onProgress?.({ status: "PARSING", progress: 100, message: "Commonwealth parse complete", recordsParsed: 0 });

      // Update session
      await prisma.migrationSession.update({
        where: { id: sessionId },
        data: {
          status: "MAPPING",
          parsedRecords:
            result.contacts.length + result.households.length + result.activities.length,
        },
      });

      return result;
    } catch (error) {
      result.errors.push({
        record: 0,
        field: "parsing",
        message: error instanceof Error ? error.message : "Failed to parse Commonwealth file",
        severity: "ERROR",
      });

      await prisma.migrationSession.update({
        where: { id: sessionId },
        data: { status: "FAILED" },
      });

      return result;
    }
  }

  async validateFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedExtensions.includes(ext)) {
        return { valid: false, error: `Unsupported file type: ${ext}` };
      }

      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        return { valid: false, error: "File is empty" };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "File validation failed",
      };
    }
  }

  private detectRecordType(record: any): "contact" | "household" | "activity" | "unknown" {
    // Detect based on field names
    const fields = Object.keys(record).map((k) => k.toLowerCase());

    if (
      fields.includes("firstname") ||
      fields.includes("first_name") ||
      fields.includes("lastname") ||
      fields.includes("last_name")
    ) {
      return "contact";
    }

    if (
      fields.includes("householdname") ||
      fields.includes("household_name") ||
      fields.includes("accountname")
    ) {
      return "household";
    }

    if (
      fields.includes("note") ||
      fields.includes("activity") ||
      fields.includes("subject") ||
      fields.includes("description")
    ) {
      return "activity";
    }

    return "unknown";
  }

  private async parseContact(record: any, sessionId: string, lineNumber: number): Promise<RawContactData> {
    const sourceId = record.ClientID || record.client_id || `commonwealth-contact-${lineNumber}`;

    await prisma.rawContact.create({
      data: {
        sessionId,
        sourceId,
        sourceType: "Commonwealth Client",
        rawData: record,
        firstName: record.FirstName || record.first_name || null,
        lastName: record.LastName || record.last_name || null,
        email: record.Email || record.email || null,
        phone: record.Phone || record.phone || null,
        company: record.Company || record.company || null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      sourceType: "Commonwealth Client",
      rawData: record,
      firstName: record.FirstName || record.first_name || undefined,
      lastName: record.LastName || record.last_name || undefined,
      email: record.Email || record.email || undefined,
      phone: record.Phone || record.phone || undefined,
      company: record.Company || record.company || undefined,
    };
  }

  private async parseHousehold(record: any, sessionId: string, lineNumber: number): Promise<RawHouseholdData> {
    const sourceId =
      record.HouseholdID || record.household_id || `commonwealth-household-${lineNumber}`;

    const aum = record.AUM ? parseFloat(record.AUM) : undefined;

    await prisma.rawHousehold.create({
      data: {
        sessionId,
        sourceId,
        rawData: record,
        householdName: record.HouseholdName || record.household_name || null,
        primaryContact: record.PrimaryContact || record.primary_contact || null,
        aum: aum ?? null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      rawData: record,
      householdName: record.HouseholdName || record.household_name || undefined,
      primaryContact: record.PrimaryContact || record.primary_contact || undefined,
      aum,
    };
  }

  private async parseActivity(record: any, sessionId: string, lineNumber: number): Promise<RawActivityData> {
    const sourceId =
      record.ActivityID || record.activity_id || `commonwealth-activity-${lineNumber}`;

    // Determine activity type
    let activityType: "NOTE" | "MEETING" | "CALL" | "EMAIL" | "TASK" = "NOTE";
    const typeField = (record.Type || record.type || "").toLowerCase();
    if (typeField.includes("meeting")) activityType = "MEETING";
    else if (typeField.includes("call")) activityType = "CALL";
    else if (typeField.includes("email")) activityType = "EMAIL";
    else if (typeField.includes("task")) activityType = "TASK";

    const activityDate = record.Date ? new Date(record.Date) : undefined;

    await prisma.rawActivity.create({
      data: {
        sessionId,
        sourceId,
        rawData: record,
        activityType,
        subject: record.Subject || record.subject || null,
        description: record.Description || record.description || record.Notes || null,
        activityDate: activityDate ?? null,
        relatedContactId: record.ContactID || record.contact_id || null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      rawData: record,
      activityType,
      subject: record.Subject || record.subject || undefined,
      description: record.Description || record.description || record.Notes || undefined,
      activityDate,
      relatedContactId: record.ContactID || record.contact_id || undefined,
    };
  }
}
