/**
 * Simple in-memory rate limiter for API routes
 *
 * Usage:
 * ```typescript
 * import { checkRateLimit } from '@/lib/rate-limit';
 *
 * if (!checkRateLimit(clientIp, 100, 60000)) {
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 * }
 * ```
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate-limited
 *
 * @param key - Unique identifier for the client (IP, user ID, etc.)
 * @param maxRequests - Maximum number of requests allowed in the window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns true if request is allowed, false if rate-limited
 */
export function checkRateLimit(
  key: string,
  maxRequests = 10,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // No entry or window expired — allow and reset
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  // Limit exceeded — deny
  if (entry.count >= maxRequests) {
    return false;
  }

  // Increment and allow
  entry.count++;
  return true;
}

/**
 * Clean up expired entries (call periodically if needed)
 */
export function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}
