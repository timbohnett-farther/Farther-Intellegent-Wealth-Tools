/**
 * Advizon CRM Parser
 *
 * Parses Advizon client and portfolio data exports (CSV/Excel).
 */

import * as fs from "fs/promises";
import * as path from "path";
import { CRMParser, ParseResult, ParseProgressCallback, SourceSystemType, RawContactData, RawHouseholdData } from "./base-parser";
import { prisma } from "@/lib/prisma";

export class AdvizonParser implements CRMParser {
  platform: SourceSystemType = "ADVIZON";
  supportedExtensions = [".csv", ".xlsx", ".zip"];

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

      onProgress?.({ status: "PARSING", progress: 10, message: "Reading Advizon export...", recordsParsed: 0 });

      const ext = path.extname(filePath).toLowerCase();

      if (ext === ".xlsx") {
        result.errors.push({
          record: 0,
          field: "format",
          message: "Excel parsing not yet implemented. Please export as CSV or convert to CSV first.",
          severity: "ERROR",
        });
        return result;
      }

      if (ext === ".zip") {
        result.errors.push({
          record: 0,
          field: "format",
          message: "ZIP extraction not yet implemented. Please extract manually and upload CSV.",
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

      onProgress?.({ status: "PARSING", progress: 30, message: "Parsing Advizon data...", recordsParsed: 0 });

      // Parse CSV
      const rows = lines.map((line) => this.parseCSVLine(line));
      const headers = rows[0];

      // Detect data type from headers
      const dataType = this.detectDataType(headers);

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
          switch (dataType) {
            case "client":
              result.contacts.push(await this.parseClient(record, sessionId));
              break;
            case "household":
              result.households.push(await this.parseHousehold(record, sessionId));
              break;
            case "portfolio":
              result.households.push(await this.parsePortfolio(record, sessionId));
              break;
            default:
              // Default to contact
              result.contacts.push(await this.parseClient(record, sessionId));
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

      onProgress?.({ status: "PARSING", progress: 100, message: "Advizon parse complete", recordsParsed: 0 });

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
        message: error instanceof Error ? error.message : "Failed to parse Advizon file",
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

      // Read first line to verify CSV format (if CSV)
      if (ext === ".csv") {
        const content = await fs.readFile(filePath, "utf-8");
        const firstLine = content.split("\n")[0];
        if (!firstLine.includes(",")) {
          return { valid: false, error: "File does not appear to be a valid CSV" };
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

  private detectDataType(headers: string[]): string {
    const lowerHeaders = headers.map((h) => h.toLowerCase());

    if (
      lowerHeaders.includes("client id") ||
      lowerHeaders.includes("client_id") ||
      lowerHeaders.includes("clientid")
    ) {
      return "client";
    }

    if (
      lowerHeaders.includes("household id") ||
      lowerHeaders.includes("household_id") ||
      lowerHeaders.includes("householdid")
    ) {
      return "household";
    }

    if (
      lowerHeaders.includes("portfolio id") ||
      lowerHeaders.includes("portfolio_id") ||
      lowerHeaders.includes("account value") ||
      lowerHeaders.includes("aum")
    ) {
      return "portfolio";
    }

    return "client";
  }

  private async parseClient(record: any, sessionId: string): Promise<RawContactData> {
    const sourceId =
      record["Client ID"] ||
      record["client_id"] ||
      record.ClientID ||
      `advizon-client-${Date.now()}-${Math.random()}`;

    await prisma.rawContact.create({
      data: {
        sessionId,
        sourceId,
        sourceType: "Advizon Client",
        rawData: record,
        firstName: record["First Name"] || record.FirstName || record.first_name || null,
        lastName: record["Last Name"] || record.LastName || record.last_name || null,
        email: record.Email || record.email || null,
        phone: record.Phone || record.phone || record["Primary Phone"] || null,
        company: record.Household || record.household || null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      sourceType: "Advizon Client",
      rawData: record,
      firstName: record["First Name"] || record.FirstName || record.first_name || undefined,
      lastName: record["Last Name"] || record.LastName || record.last_name || undefined,
      email: record.Email || record.email || undefined,
      phone: record.Phone || record.phone || record["Primary Phone"] || undefined,
      company: record.Household || record.household || undefined,
    };
  }

  private async parseHousehold(record: any, sessionId: string): Promise<RawHouseholdData> {
    const sourceId =
      record["Household ID"] ||
      record["household_id"] ||
      record.HouseholdID ||
      `advizon-household-${Date.now()}-${Math.random()}`;

    const aum =
      record.AUM ||
      record["Account Value"] ||
      record["Total Value"]
        ? parseFloat(record.AUM || record["Account Value"] || record["Total Value"])
        : undefined;

    await prisma.rawHousehold.create({
      data: {
        sessionId,
        sourceId,
        rawData: record,
        householdName: record["Household Name"] || record.HouseholdName || record.household_name || null,
        primaryContact: record["Primary Contact"] || record.PrimaryContact || null,
        aum: aum ?? null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      rawData: record,
      householdName: record["Household Name"] || record.HouseholdName || record.household_name || undefined,
      primaryContact: record["Primary Contact"] || record.PrimaryContact || undefined,
      aum,
    };
  }

  private async parsePortfolio(record: any, sessionId: string): Promise<RawHouseholdData> {
    const sourceId =
      record["Portfolio ID"] ||
      record["portfolio_id"] ||
      record.PortfolioID ||
      `advizon-portfolio-${Date.now()}-${Math.random()}`;

    const aum =
      record.AUM ||
      record["Account Value"] ||
      record["Market Value"]
        ? parseFloat(record.AUM || record["Account Value"] || record["Market Value"])
        : undefined;

    // Treat portfolio as household
    await prisma.rawHousehold.create({
      data: {
        sessionId,
        sourceId,
        rawData: record,
        householdName: record["Portfolio Name"] || record.PortfolioName || record["Account Name"] || null,
        primaryContact: record["Advisor"] || record.advisor || record["Portfolio Manager"] || null,
        aum: aum ?? null,
        mappingStatus: "UNMAPPED",
      },
    });

    return {
      sourceId,
      rawData: record,
      householdName: record["Portfolio Name"] || record.PortfolioName || record["Account Name"] || undefined,
      primaryContact: record["Advisor"] || record.advisor || record["Portfolio Manager"] || undefined,
      aum,
    };
  }
}
