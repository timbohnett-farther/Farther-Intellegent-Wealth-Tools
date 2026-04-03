/**
 * Base Parser Interface for CRM Migration System
 *
 * All platform-specific parsers (Wealthbox, Redtail, Commonwealth, Salesforce, Advizon)
 * implement this interface to provide consistent parsing behavior.
 */

export type SourceSystemType = "REDTAIL" | "WEALTHBOX" | "COMMONWEALTH" | "SALESFORCE" | "ADVIZON";

export type ActivityType = "NOTE" | "MEETING" | "CALL" | "EMAIL" | "TASK";

export type EntityType = "CONTACT" | "HOUSEHOLD";

export type MappingStatus = "UNMAPPED" | "MAPPED" | "VALIDATED" | "IMPORTED" | "ERROR";

/**
 * Raw contact data extracted from source CRM
 */
export interface RawContactData {
  sourceId: string;
  sourceType?: string;
  rawData: Record<string, any>;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
}

/**
 * Raw household data extracted from source CRM
 */
export interface RawHouseholdData {
  sourceId: string;
  rawData: Record<string, any>;
  householdName?: string;
  primaryContact?: string;
  aum?: number;
}

/**
 * Raw activity data (notes, meetings, calls, emails, tasks)
 */
export interface RawActivityData {
  sourceId: string;
  rawData: Record<string, any>;
  activityType: ActivityType;
  subject?: string;
  description?: string;
  activityDate?: Date;
  relatedContactId?: string;
}

/**
 * Raw relationship data (contact-to-household, contact-to-contact)
 */
export interface RawRelationshipData {
  sourceId: string;
  rawData: Record<string, any>;
  fromEntityType: EntityType;
  fromEntityId: string;
  toEntityType: EntityType;
  toEntityId: string;
  relationshipType?: string;
}

/**
 * Parse error with context
 */
export interface ParseError {
  line?: number;
  record?: number;
  field?: string;
  message: string;
  severity: "ERROR" | "WARNING";
  rawData?: any;
}

/**
 * Parse result returned by all parsers
 */
export interface ParseResult {
  contacts: RawContactData[];
  households: RawHouseholdData[];
  activities: RawActivityData[];
  relationships: RawRelationshipData[];
  errors: ParseError[];
  metadata?: {
    totalRecords: number;
    processedRecords: number;
    skippedRecords: number;
    parseTimeMs: number;
  };
}

/**
 * Parse progress callback for real-time updates
 */
export interface ParseProgress {
  status: "PARSING" | "STORING" | "COMPLETED" | "FAILED";
  progress: number; // 0-100
  recordsParsed: number;
  currentEntity?: string;
  message?: string;
}

export type ParseProgressCallback = (progress: ParseProgress) => void;

/**
 * Base CRM Parser Interface
 *
 * All platform-specific parsers must implement this interface.
 */
export interface CRMParser {
  /**
   * Platform identifier
   */
  platform: SourceSystemType;

  /**
   * Supported file extensions for this platform
   */
  supportedExtensions: string[];

  /**
   * Parse a CRM export file
   *
   * @param filePath - Absolute path to uploaded file
   * @param sessionId - Migration session ID for storing results
   * @param onProgress - Optional callback for progress updates
   * @returns ParseResult with extracted data and errors
   */
  parse(
    filePath: string,
    sessionId: string,
    onProgress?: ParseProgressCallback
  ): Promise<ParseResult>;

  /**
   * Validate file before parsing (check format, size, structure)
   *
   * @param filePath - Absolute path to uploaded file
   * @returns Validation result with any errors
   */
  validateFile(filePath: string): Promise<{ valid: boolean; error?: string }>;
}

/**
 * Parser registry for looking up parsers by platform
 */
export class ParserRegistry {
  private parsers: Map<SourceSystemType, CRMParser> = new Map();

  register(parser: CRMParser): void {
    this.parsers.set(parser.platform, parser);
  }

  getParser(platform: SourceSystemType): CRMParser | undefined {
    return this.parsers.get(platform);
  }

  getAllParsers(): CRMParser[] {
    return Array.from(this.parsers.values());
  }
}

/**
 * Global parser registry instance
 */
export const parserRegistry = new ParserRegistry();
