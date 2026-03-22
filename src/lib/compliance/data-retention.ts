// =============================================================================
// Compliance Layer — Data Retention Management
// =============================================================================

import type {
  DataRetentionPolicy,
  RetentionRecord,
  ExpiredRecord,
} from './types';

// ==================== Default Retention Policies ====================

/**
 * Default data retention policies aligned with SEC/FINRA record-keeping
 * requirements. Financial planning records are retained for 7 years;
 * deleted client data is retained for 90 days before final action.
 */
export const DEFAULT_RETENTION_POLICIES: DataRetentionPolicy[] = [
  {
    resourceType: 'plan',
    retentionDays: 2555, // ~7 years
    action: 'archive',
  },
  {
    resourceType: 'audit',
    retentionDays: 2555, // ~7 years
    action: 'archive',
  },
  {
    resourceType: 'report',
    retentionDays: 2555, // ~7 years
    action: 'archive',
  },
  {
    resourceType: 'deleted_client',
    retentionDays: 90,
    action: 'delete',
  },
  {
    resourceType: 'document',
    retentionDays: 2555, // ~7 years
    action: 'archive',
  },
  {
    resourceType: 'account',
    retentionDays: 2555, // ~7 years
    action: 'archive',
  },
  {
    resourceType: 'workflow_execution',
    retentionDays: 365, // 1 year
    action: 'delete',
  },
  {
    resourceType: 'session',
    retentionDays: 180, // 6 months
    action: 'anonymize',
  },
];

// ==================== Expired Record Identification ====================

/**
 * Identifies records that have exceeded their retention period according
 * to the provided policies.
 *
 * For each record, the matching policy is found by `resourceType`. If no
 * policy matches the record's resource type, it is not considered expired.
 * The expiry date is computed as `createdAt + retentionDays`.
 *
 * @param records - All records to evaluate.
 * @param policies - The retention policies to apply.
 * @returns An array of expired records with their matching policy and expiry details.
 */
export function identifyExpiredRecords(
  records: RetentionRecord[],
  policies: DataRetentionPolicy[]
): ExpiredRecord[] {
  const now = new Date();
  const policyMap = new Map<string, DataRetentionPolicy>();

  for (const policy of policies) {
    policyMap.set(policy.resourceType, policy);
  }

  const expired: ExpiredRecord[] = [];

  for (const record of records) {
    const policy = policyMap.get(record.resourceType);
    if (!policy) {
      continue;
    }

    const createdAt = record.createdAt instanceof Date
      ? record.createdAt
      : new Date(record.createdAt);

    const expiryDate = new Date(createdAt.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000);

    if (now > expiryDate) {
      const daysPastExpiry = Math.floor(
        (now.getTime() - expiryDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      expired.push({
        record,
        policy,
        expiredAt: expiryDate,
        daysPastExpiry,
      });
    }
  }

  return expired;
}

// ==================== Client Data Anonymization ====================

/**
 * Known PII field names that should be anonymized.
 * Case-insensitive matching is used.
 */
const PII_FIELD_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  { pattern: /^(first_?name|firstname|first)$/i, replacement: '[REDACTED_FIRST_NAME]' },
  { pattern: /^(last_?name|lastname|last|surname)$/i, replacement: '[REDACTED_LAST_NAME]' },
  { pattern: /^(name|full_?name|fullname|display_?name)$/i, replacement: '[REDACTED_NAME]' },
  { pattern: /^(email|email_?address|e_?mail)$/i, replacement: '[REDACTED_EMAIL]' },
  { pattern: /^(phone|phone_?number|mobile|cell|telephone)$/i, replacement: '[REDACTED_PHONE]' },
  { pattern: /^(ssn|social_?security|social_?security_?number|tin|tax_?id)$/i, replacement: '[REDACTED_SSN]' },
  { pattern: /^(address|street|street_?address|address_?line_?1|address_?line_?2)$/i, replacement: '[REDACTED_ADDRESS]' },
  { pattern: /^(city)$/i, replacement: '[REDACTED_CITY]' },
  { pattern: /^(zip|zip_?code|postal|postal_?code)$/i, replacement: '[REDACTED_ZIP]' },
  { pattern: /^(dob|date_?of_?birth|birth_?date|birthday)$/i, replacement: '[REDACTED_DOB]' },
  { pattern: /^(account_?number|acct_?number|acct_?no|routing_?number)$/i, replacement: '[REDACTED_ACCOUNT]' },
  { pattern: /^(driver_?license|license_?number|passport|passport_?number)$/i, replacement: '[REDACTED_ID]' },
  { pattern: /^(ip_?address|ipaddress)$/i, replacement: '[REDACTED_IP]' },
  { pattern: /^(user_?agent)$/i, replacement: '[REDACTED_USER_AGENT]' },
];

/**
 * Anonymizes personally identifiable information (PII) in a client data object.
 *
 * Recursively traverses all keys in the data structure and replaces values
 * of known PII fields with redacted placeholders. Nested objects and arrays
 * are processed recursively.
 *
 * @param clientData - The client data object to anonymize. Not modified in place.
 * @returns A new object with PII fields replaced by anonymized values.
 */
export function anonymizeClientData(
  clientData: Record<string, unknown>
): Record<string, unknown> {
  return anonymizeObject(clientData);
}

/**
 * Recursively anonymizes an object, replacing PII field values.
 */
function anonymizeObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if this key matches a PII pattern
    const piiMatch = PII_FIELD_PATTERNS.find((p) => p.pattern.test(key));

    if (piiMatch) {
      result[key] = piiMatch.replacement;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse into nested objects
      result[key] = anonymizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Recurse into arrays
      result[key] = value.map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          return anonymizeObject(item as Record<string, unknown>);
        }
        return item;
      });
    } else {
      result[key] = value;
    }
  }

  return result;
}
