/**
 * Wealthbox CRM Parser
 *
 * Parses Wealthbox JSON exports into standardized format.
 * Expected format: JSON file or ZIP containing JSON files.
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

export class WealthboxParser implements CRMParser {
  platform: "WEALTHBOX" = "WEALTHBOX";
  supportedExtensions = [".json", ".zip"];

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
        message: "Reading Wealthbox export file...",
      });

      // Read and parse JSON file
      const fileContent = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(fileContent);

      // Wealthbox export structure (inferred - adjust based on actual format)
      // Expected structure: { contacts: [...], households: [...], activities: [...] }
      const wealthboxData = this.normalizeWealthboxExport(data);

      // Parse contacts
      if (wealthboxData.contacts && Array.isArray(wealthboxData.contacts)) {
        const totalContacts = wealthboxData.contacts.length;
        for (let i = 0; i < wealthboxData.contacts.length; i++) {
          try {
            const contact = this.parseContact(wealthboxData.contacts[i]);
            result.contacts.push(contact);
          } catch (error) {
            result.errors.push({
              record: i,
              message: `Failed to parse contact: ${error instanceof Error ? error.message : "Unknown error"}`,
              severity: "WARNING",
              rawData: wealthboxData.contacts[i],
            });
          }

          onProgress?.({
            status: "PARSING",
            progress: (i / totalContacts) * 30,
            recordsParsed: i + 1,
            currentEntity: "contacts",
          });
        }
      }

      // Parse households (groups in Wealthbox)
      if (wealthboxData.households && Array.isArray(wealthboxData.households)) {
        const totalHouseholds = wealthboxData.households.length;
        for (let i = 0; i < wealthboxData.households.length; i++) {
          try {
            const household = this.parseHousehold(wealthboxData.households[i]);
            result.households.push(household);
          } catch (error) {
            result.errors.push({
              record: i,
              message: `Failed to parse household: ${error instanceof Error ? error.message : "Unknown error"}`,
              severity: "WARNING",
              rawData: wealthboxData.households[i],
            });
          }

          onProgress?.({
            status: "PARSING",
            progress: 30 + (i / totalHouseholds) * 30,
            recordsParsed: result.contacts.length + i + 1,
            currentEntity: "households",
          });
        }
      }

      // Parse activities (notes, events, tasks)
      if (wealthboxData.activities && Array.isArray(wealthboxData.activities)) {
        const totalActivities = wealthboxData.activities.length;
        for (let i = 0; i < wealthboxData.activities.length; i++) {
          try {
            const activity = this.parseActivity(wealthboxData.activities[i]);
            result.activities.push(activity);
          } catch (error) {
            result.errors.push({
              record: i,
              message: `Failed to parse activity: ${error instanceof Error ? error.message : "Unknown error"}`,
              severity: "WARNING",
              rawData: wealthboxData.activities[i],
            });
          }

          onProgress?.({
            status: "PARSING",
            progress: 60 + (i / totalActivities) * 30,
            recordsParsed: result.contacts.length + result.households.length + i + 1,
            currentEntity: "activities",
          });
        }
      }

      // Parse relationships (contact-to-household links)
      if (wealthboxData.relationships && Array.isArray(wealthboxData.relationships)) {
        for (let i = 0; i < wealthboxData.relationships.length; i++) {
          try {
            const relationship = this.parseRelationship(wealthboxData.relationships[i]);
            result.relationships.push(relationship);
          } catch (error) {
            result.errors.push({
              record: i,
              message: `Failed to parse relationship: ${error instanceof Error ? error.message : "Unknown error"}`,
              severity: "WARNING",
              rawData: wealthboxData.relationships[i],
            });
          }
        }
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

      // For JSON, verify it's valid JSON
      if (ext === ".json") {
        const content = await fs.readFile(filePath, "utf-8");
        JSON.parse(content); // Will throw if invalid JSON
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
   * Normalize Wealthbox export to expected structure
   */
  private normalizeWealthboxExport(data: any): {
    contacts: any[];
    households: any[];
    activities: any[];
    relationships: any[];
  } {
    // Handle different export formats
    if (Array.isArray(data)) {
      // If export is array, assume it's contacts
      return { contacts: data, households: [], activities: [], relationships: [] };
    }

    return {
      contacts: data.contacts || data.people || [],
      households: data.households || data.groups || data.families || [],
      activities: data.activities || data.notes || data.events || [],
      relationships: data.relationships || data.associations || [],
    };
  }

  /**
   * Parse individual contact
   */
  private parseContact(raw: any): RawContactData {
    return {
      sourceId: String(raw.id || raw.contactId || raw.personId),
      sourceType: raw.type || raw.contactType,
      rawData: raw,
      firstName: raw.firstName || raw.first_name,
      lastName: raw.lastName || raw.last_name,
      email: raw.email || raw.primaryEmail || raw.emailAddress,
      phone: raw.phone || raw.primaryPhone || raw.phoneNumber,
      company: raw.company || raw.companyName || raw.organization,
    };
  }

  /**
   * Parse individual household
   */
  private parseHousehold(raw: any): RawHouseholdData {
    return {
      sourceId: String(raw.id || raw.householdId || raw.groupId),
      rawData: raw,
      householdName: raw.name || raw.householdName || raw.groupName,
      primaryContact: raw.primaryContact || raw.primaryContactName,
      aum: raw.aum || raw.totalAssets || raw.portfolioValue,
    };
  }

  /**
   * Parse individual activity
   */
  private parseActivity(raw: any): RawActivityData {
    // Map Wealthbox activity types to our ActivityType enum
    const activityTypeMap: Record<string, ActivityType> = {
      note: "NOTE",
      meeting: "MEETING",
      call: "CALL",
      email: "EMAIL",
      task: "TASK",
      appointment: "MEETING",
      event: "MEETING",
    };

    const rawType = (raw.type || raw.activityType || "note").toLowerCase();
    const activityType = activityTypeMap[rawType] || "NOTE";

    return {
      sourceId: String(raw.id || raw.activityId),
      rawData: raw,
      activityType,
      subject: raw.subject || raw.title || raw.name,
      description: raw.description || raw.notes || raw.body,
      activityDate: raw.date || raw.activityDate || raw.createdAt ? new Date(raw.date || raw.activityDate || raw.createdAt) : undefined,
      relatedContactId: raw.contactId || raw.personId || raw.relatedTo,
    };
  }

  /**
   * Parse individual relationship
   */
  private parseRelationship(raw: any): RawRelationshipData {
    return {
      sourceId: String(raw.id || raw.relationshipId),
      rawData: raw,
      fromEntityType: raw.fromEntityType === "household" ? "HOUSEHOLD" : "CONTACT",
      fromEntityId: String(raw.fromId || raw.fromEntityId),
      toEntityType: raw.toEntityType === "household" ? "HOUSEHOLD" : "CONTACT",
      toEntityId: String(raw.toId || raw.toEntityId),
      relationshipType: raw.relationshipType || raw.type || raw.role,
    };
  }
}
