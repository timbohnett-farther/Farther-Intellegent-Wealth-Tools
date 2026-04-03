/**
 * Salesforce CRM Parser
 *
 * Parses Salesforce CSV exports for Contacts, Accounts, and Opportunities.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { CRMParser, ParseResult, ParseProgressCallback, SourceSystemType, RawContactData, RawHouseholdData, RawActivityData } from "./base-parser";
import { prisma } from "@/lib/prisma";

export class SalesforceParser implements CRMParser {
  platform: SourceSystemType = "SALESFORCE";
  supportedExtensions = [".csv", ".zip"];

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
      await prisma.migrationSession.update({
        where: { id: sessionId },
        data: { status: "PARSING" },
      });

      onProgress?.({ status: "PARSING", progress: 10, message: "Reading Salesforce CSV...", recordsParsed: 0 });

      const ext = path.extname(filePath).toLowerCase();

      if (ext === ".zip") {
        result.errors.push({
          record: 0,
          field: "format",
          message: "ZIP extraction not yet implemented. Please extract manually and upload CSV files.",
          severity: "ERROR",
        });
        return result;
      }

      // Read CSV file
      const fileContent = await fs.readFile(filePath, "utf-8");
      const lines = fileContent.split("\n").filter((line) => line.trim().length > 0);

      if (lines.length === 0) {
        result.errors.push({
          record: 0,
          field: "content",
          message: "CSV file is empty",
          severity: "ERROR",
        });
        return result;
      }

      onProgress?.({ status: "PARSING", progress: 30, message: "Parsing Salesforce CSV...", recordsParsed: 0 });

      // Parse CSV (handle quoted fields with commas)
      const rows = lines.map((line) => this.parseCSVLine(line));
      const headers = rows[0];

      // Detect Salesforce object type from headers
      const objectType = this.detectObjectType(headers);

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];

        if (values.length !== headers.length) {
          result.errors.push({
            record: i + 1,
            field: "columns",
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

        try {
          switch (objectType) {
            case "Contact":
              result.contacts.push(await this.parseContact(record, sessionId));
              break;
            case "Account":
              result.households.push(await this.parseAccount(record, sessionId));
              break;
            case "Opportunity":
              result.activities.push(await this.parseOpportunity(record, sessionId));
              break;
            case "Task":
            case "Event":
              result.activities.push(await this.parseActivity(record, sessionId));
              break;
            default:
              // Default to contact
              result.contacts.push(await this.parseContact(record, sessionId));
          }
        } catch (error) {
          result.errors.push({
            record: i + 1,
            field: "parsing",
            message: error instanceof Error ? error.message : "Failed to parse record",
            severity: "ERROR",
          });
        }

        if (i % 100 === 0) {
          const progress = Math.floor((i / rows.length) * 100);
          onProgress?.({
            status: "PARSING",
            progress,
            message: `Parsed ${i} of ${rows.length} records...`,
            recordsParsed: i,
          });
        }
      }

      onProgress?.({ status: "PARSING", progress: 100, message: "Salesforce parse complete", recordsParsed: 0 });

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
        message: error instanceof Error ? error.message : "Failed to parse Salesforce file",
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

      // Read first line to verify CSV format
      const content = await fs.readFile(filePath, "utf-8");
      const firstLine = content.split("\n")[0];
      if (!firstLine.includes(",")) {
        return { valid: false, error: "File does not appear to be a valid CSV" };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "File validation failed",
      };
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private detectObjectType(headers: string[]): string {
    // Salesforce standard object field patterns
    if (headers.includes("FirstName") || headers.includes("LastName")) {
      return "Contact";
    }
    if (headers.includes("AccountName") || headers.includes("Type")) {
      return "Account";
    }
    if (headers.includes("StageName") || headers.includes("Amount")) {
      return "Opportunity";
    }
    if (headers.includes("Subject") && headers.includes("ActivityDate")) {
      return "Task";
    }
    if (headers.includes("StartDateTime") && headers.includes("EndDateTime")) {
      return "Event";
    }

    return "Unknown";
  }

  private async parseContact(record: any, sessionId: string): Promise<RawContactData> {
    const sourceId = record.Id || record.ContactId || `sf-contact-${Date.now()}-${Math.random()}`;

    await prisma.rawContact.create({
      data: {
        sessionId,
        sourceId,
        sourceType: "Salesforce Contact",
        rawData: record,
        firstName: record.FirstName || null,
        lastName: record.LastName || null,
        email: record.Email || null,
        phone: record.Phone || record.MobilePhone || null,
        company: record.Account?.Name || record.AccountName || null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      sourceType: "Salesforce Contact",
      rawData: record,
      firstName: record.FirstName || undefined,
      lastName: record.LastName || undefined,
      email: record.Email || undefined,
      phone: record.Phone || record.MobilePhone || undefined,
      company: record.Account?.Name || record.AccountName || undefined,
    };
  }

  private async parseAccount(record: any, sessionId: string): Promise<RawHouseholdData> {
    const sourceId = record.Id || record.AccountId || `sf-account-${Date.now()}-${Math.random()}`;

    const aum = record.AnnualRevenue ? parseFloat(record.AnnualRevenue) : undefined;

    await prisma.rawHousehold.create({
      data: {
        sessionId,
        sourceId,
        rawData: record,
        householdName: record.Name || record.AccountName || null,
        primaryContact: record.OwnerId || record.Owner?.Name || null,
        aum: aum ?? null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      rawData: record,
      householdName: record.Name || record.AccountName || undefined,
      primaryContact: record.OwnerId || record.Owner?.Name || undefined,
      aum,
    };
  }

  private async parseOpportunity(record: any, sessionId: string): Promise<RawActivityData> {
    const sourceId =
      record.Id || record.OpportunityId || `sf-opportunity-${Date.now()}-${Math.random()}`;

    const activityDate = record.CloseDate ? new Date(record.CloseDate) : undefined;

    await prisma.rawActivity.create({
      data: {
        sessionId,
        sourceId,
        rawData: record,
        activityType: "NOTE",
        subject: record.Name || record.OpportunityName || null,
        description: record.Description || `Stage: ${record.StageName}, Amount: ${record.Amount}`,
        activityDate: activityDate ?? null,
        relatedContactId: record.AccountId || null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      rawData: record,
      activityType: "NOTE",
      subject: record.Name || record.OpportunityName || undefined,
      description: record.Description || `Stage: ${record.StageName}, Amount: ${record.Amount}`,
      activityDate,
      relatedContactId: record.AccountId || undefined,
    };
  }

  private async parseActivity(record: any, sessionId: string): Promise<RawActivityData> {
    const sourceId = record.Id || `sf-activity-${Date.now()}-${Math.random()}`;

    // Determine activity type
    let activityType: "NOTE" | "MEETING" | "CALL" | "EMAIL" | "TASK" = "TASK";
    const taskType = (record.TaskSubtype || record.Type || "").toLowerCase();
    if (taskType.includes("call")) activityType = "CALL";
    else if (taskType.includes("email")) activityType = "EMAIL";
    else if (record.StartDateTime) activityType = "MEETING"; // Event object

    const activityDate = (record.ActivityDate || record.StartDateTime) ? new Date(record.ActivityDate || record.StartDateTime) : undefined;

    await prisma.rawActivity.create({
      data: {
        sessionId,
        sourceId,
        rawData: record,
        activityType,
        subject: record.Subject || null,
        description: record.Description || record.Comments || null,
        activityDate: activityDate ?? null,
        relatedContactId: record.WhoId || record.WhatId || null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      rawData: record,
      activityType,
      subject: record.Subject || undefined,
      description: record.Description || record.Comments || undefined,
      activityDate,
      relatedContactId: record.WhoId || record.WhatId || undefined,
    };
  }
}
