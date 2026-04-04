/**
 * External FPE API Service
 * OpenAPI-compatible external API for proposal engine operations
 */

import { randomUUID, randomBytes } from 'crypto';

export type FPEPermission =
  | 'proposals:read'
  | 'proposals:write'
  | 'analytics:read'
  | 'models:read'
  | 'compliance:read';

export interface FPEApiKey {
  keyId: string;
  firmId: string;
  key: string; // secret key (only shown once at creation)
  name: string; // human-readable name for this key
  permissions: FPEPermission[];
  rateLimit: number; // requests per minute
  createdAt: string;
  lastUsedAt?: string;
  active: boolean;
}

export interface ApiUsageLog {
  logId: string;
  keyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetsAt: string;
}

// In-memory stores
const apiKeyStore = new Map<string, FPEApiKey>();
const keyBySecret = new Map<string, string>(); // secret -> keyId
const firmKeysIndex = new Map<string, string[]>(); // firmId -> keyIds[]
const usageLogs: ApiUsageLog[] = [];
const rateLimitBuckets = new Map<
  string,
  { count: number; resetTime: number }
>(); // keyId -> bucket

/**
 * Create a new API key with specified permissions
 * @param params - Firm ID, key name, permissions
 * @returns New API key with secret (only shown once)
 */
export function createApiKey(params: {
  firmId: string;
  name: string;
  permissions: FPEPermission[];
  rateLimit?: number;
}): FPEApiKey {
  if (!params.firmId?.trim()) {
    throw new Error('firmId required');
  }
  if (!params.name?.trim()) {
    throw new Error('name required');
  }
  if (!params.permissions?.length) {
    throw new Error('At least one permission required');
  }

  // Validate permissions
  const validPermissions: FPEPermission[] = [
    'proposals:read',
    'proposals:write',
    'analytics:read',
    'models:read',
    'compliance:read',
  ];

  for (const perm of params.permissions) {
    if (!validPermissions.includes(perm)) {
      throw new Error(`Invalid permission: ${perm}`);
    }
  }

  const keyId = randomUUID();
  const secret = `fpe_${randomBytes(32).toString('hex')}`;

  const apiKey: FPEApiKey = {
    keyId,
    firmId: params.firmId,
    key: secret,
    name: params.name,
    permissions: params.permissions,
    rateLimit: params.rateLimit ?? 60, // default 60 req/min
    createdAt: new Date().toISOString(),
    active: true,
  };

  apiKeyStore.set(keyId, apiKey);
  keyBySecret.set(secret, keyId);

  // Update firm index
  const existing = firmKeysIndex.get(params.firmId) ?? [];
  firmKeysIndex.set(params.firmId, [...existing, keyId]);

  return apiKey;
}

/**
 * Validate an API key and return its permissions
 * @param key - Secret API key
 * @returns Validation result with firmId and permissions
 */
export function validateApiKey(key: string): {
  valid: boolean;
  firmId?: string;
  permissions?: FPEPermission[];
  keyId?: string;
} {
  if (!key?.startsWith('fpe_')) {
    return { valid: false };
  }

  const keyId = keyBySecret.get(key);
  if (!keyId) {
    return { valid: false };
  }

  const apiKey = apiKeyStore.get(keyId);
  if (!apiKey || !apiKey.active) {
    return { valid: false };
  }

  // Update last used timestamp
  apiKey.lastUsedAt = new Date().toISOString();
  apiKeyStore.set(keyId, apiKey);

  return {
    valid: true,
    firmId: apiKey.firmId,
    permissions: apiKey.permissions,
    keyId: apiKey.keyId,
  };
}

/**
 * Revoke an API key (soft delete)
 * @param keyId - Key ID to revoke
 * @returns true if revoked, false if not found
 */
export function revokeApiKey(keyId: string): boolean {
  const apiKey = apiKeyStore.get(keyId);
  if (!apiKey) return false;

  apiKey.active = false;
  apiKeyStore.set(keyId, apiKey);
  return true;
}

/**
 * List all API keys for a firm
 * @param firmId - Firm ID
 * @returns Array of API keys (secrets masked)
 */
export function listApiKeys(firmId: string): FPEApiKey[] {
  const keyIds = firmKeysIndex.get(firmId) ?? [];
  const keys = keyIds
    .map(id => apiKeyStore.get(id))
    .filter((k): k is FPEApiKey => k !== undefined);

  // Mask secrets for security
  return keys.map(k => ({
    ...k,
    key: maskSecret(k.key),
  }));
}

/**
 * Check rate limit for a key
 * @param keyId - Key ID to check
 * @returns Rate limit status
 */
export function checkRateLimit(keyId: string): RateLimitStatus {
  const apiKey = apiKeyStore.get(keyId);
  if (!apiKey) {
    throw new Error('Invalid API key');
  }

  const now = Date.now();
  const bucket = rateLimitBuckets.get(keyId);

  // Rate limit window is 1 minute
  const WINDOW_MS = 60 * 1000;

  if (!bucket || now >= bucket.resetTime) {
    // Create new bucket
    const newBucket = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
    rateLimitBuckets.set(keyId, newBucket);

    return {
      allowed: true,
      remaining: apiKey.rateLimit - 1,
      resetsAt: new Date(newBucket.resetTime).toISOString(),
    };
  }

  // Check existing bucket
  const remaining = apiKey.rateLimit - bucket.count;

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      resetsAt: new Date(bucket.resetTime).toISOString(),
    };
  }

  // Increment bucket
  bucket.count += 1;
  rateLimitBuckets.set(keyId, bucket);

  return {
    allowed: true,
    remaining: remaining - 1,
    resetsAt: new Date(bucket.resetTime).toISOString(),
  };
}

/**
 * Log API usage for analytics
 * @param keyId - Key ID
 * @param endpoint - Endpoint path
 * @param method - HTTP method
 * @param statusCode - Response status code
 * @param latencyMs - Request latency in milliseconds
 */
export function logApiUsage(
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  latencyMs?: number
): void {
  const log: ApiUsageLog = {
    logId: randomUUID(),
    keyId,
    endpoint,
    method,
    statusCode,
    latencyMs: latencyMs ?? 0,
    timestamp: new Date().toISOString(),
  };

  usageLogs.push(log);

  // Keep only last 10,000 logs to avoid memory bloat
  if (usageLogs.length > 10_000) {
    usageLogs.splice(0, usageLogs.length - 10_000);
  }
}

/**
 * Get API usage statistics for a key
 * @param keyId - Key ID
 * @param days - Number of days to look back (default 7)
 * @returns Usage statistics
 */
export function getApiUsageStats(
  keyId: string,
  days: number = 7
): {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  byStatus: Record<number, number>;
  avgLatencyMs: number;
  errorRate: number;
} {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const logs = usageLogs.filter(
    log => log.keyId === keyId && new Date(log.timestamp) >= cutoff
  );

  const byEndpoint: Record<string, number> = {};
  const byStatus: Record<number, number> = {};
  let totalLatency = 0;
  let errorCount = 0;

  for (const log of logs) {
    // Count by endpoint
    byEndpoint[log.endpoint] = (byEndpoint[log.endpoint] ?? 0) + 1;

    // Count by status
    byStatus[log.statusCode] = (byStatus[log.statusCode] ?? 0) + 1;

    // Sum latency
    totalLatency += log.latencyMs;

    // Count errors (4xx, 5xx)
    if (log.statusCode >= 400) {
      errorCount += 1;
    }
  }

  const avgLatencyMs = logs.length > 0 ? totalLatency / logs.length : 0;
  const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;

  return {
    totalRequests: logs.length,
    byEndpoint,
    byStatus,
    avgLatencyMs,
    errorRate,
  };
}

/**
 * Get detailed usage logs for a key
 * @param keyId - Key ID
 * @param limit - Max number of logs to return (default 100)
 * @returns Array of usage logs sorted by timestamp (newest first)
 */
export function getApiUsageLogs(keyId: string, limit: number = 100): ApiUsageLog[] {
  const logs = usageLogs.filter(log => log.keyId === keyId);
  return logs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Check if a key has a specific permission
 * @param keyId - Key ID
 * @param permission - Permission to check
 * @returns true if key has permission
 */
export function hasPermission(keyId: string, permission: FPEPermission): boolean {
  const apiKey = apiKeyStore.get(keyId);
  if (!apiKey || !apiKey.active) return false;
  return apiKey.permissions.includes(permission);
}

/**
 * Rotate an API key (generate new secret, keep same keyId)
 * @param keyId - Key ID to rotate
 * @returns Updated API key with new secret
 */
export function rotateApiKey(keyId: string): FPEApiKey | null {
  const apiKey = apiKeyStore.get(keyId);
  if (!apiKey) return null;

  // Remove old secret from index
  keyBySecret.delete(apiKey.key);

  // Generate new secret
  const newSecret = `fpe_${randomBytes(32).toString('hex')}`;

  const updated: FPEApiKey = {
    ...apiKey,
    key: newSecret,
  };

  apiKeyStore.set(keyId, updated);
  keyBySecret.set(newSecret, keyId);

  return updated;
}

/**
 * Update API key permissions
 * @param keyId - Key ID
 * @param permissions - New permissions
 * @returns Updated API key or null if not found
 */
export function updateApiKeyPermissions(
  keyId: string,
  permissions: FPEPermission[]
): FPEApiKey | null {
  const apiKey = apiKeyStore.get(keyId);
  if (!apiKey) return null;

  const updated: FPEApiKey = {
    ...apiKey,
    permissions,
  };

  apiKeyStore.set(keyId, updated);
  return updated;
}

/**
 * Update API key rate limit
 * @param keyId - Key ID
 * @param rateLimit - New rate limit (requests per minute)
 * @returns Updated API key or null if not found
 */
export function updateApiKeyRateLimit(
  keyId: string,
  rateLimit: number
): FPEApiKey | null {
  const apiKey = apiKeyStore.get(keyId);
  if (!apiKey) return null;

  if (rateLimit <= 0) {
    throw new Error('Rate limit must be positive');
  }

  const updated: FPEApiKey = {
    ...apiKey,
    rateLimit,
  };

  apiKeyStore.set(keyId, updated);
  return updated;
}

// Utility functions

function maskSecret(secret: string): string {
  if (secret.length <= 12) return '***';
  return `${secret.slice(0, 8)}...${secret.slice(-4)}`;
}

/**
 * Get all API keys across all firms (admin only)
 * @returns Array of all API keys (secrets masked)
 */
export function getAllApiKeys(): FPEApiKey[] {
  const keys = Array.from(apiKeyStore.values());
  return keys.map(k => ({
    ...k,
    key: maskSecret(k.key),
  }));
}

/**
 * Clear rate limit bucket for a key (admin/testing)
 * @param keyId - Key ID
 */
export function clearRateLimit(keyId: string): void {
  rateLimitBuckets.delete(keyId);
}

/**
 * Get OpenAPI specification for FPE API
 * @returns OpenAPI 3.0 spec object
 */
export function getOpenAPISpec(): Record<string, unknown> {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Farther Proposal Engine API',
      version: '1.0.0',
      description: 'External API for proposal engine operations',
    },
    servers: [
      {
        url: 'https://api.farther.com/v1',
        description: 'Production',
      },
    ],
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    paths: {
      '/proposals': {
        get: {
          summary: 'List proposals',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50 },
            },
          ],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
            '401': { description: 'Unauthorized' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
        post: {
          summary: 'Create proposal',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['clientId', 'modelId'],
                  properties: {
                    clientId: { type: 'string' },
                    modelId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Created' },
            '400': { description: 'Bad request' },
            '401': { description: 'Unauthorized' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/analytics': {
        get: {
          summary: 'Get analytics',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': { description: 'Success' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
    },
  };
}
