// Simple in-memory fixed-window rate limiter.
// Matches the app's in-memory architecture (state is dropped on restart).
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Occasionally evict expired buckets so the map does not grow unbounded.
function sweep(now: number) {
  if (buckets.size < 5000) return
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

/**
 * Throws a 429 when `key` exceeds `limit` requests within `windowMs`.
 * Callers build a key from a stable identity (user id) plus the action name.
 */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count++
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests, please slow down.',
      data: { retryAfter }
    })
  }
}

// Build a rate-limit key scoped to an action, keyed by user id when available,
// otherwise by client IP (for pre-authentication endpoints).
export function rateLimitKey(event: any, action: string, identity?: string | null): string {
  if (identity) return `${action}:user:${identity}`
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  return `${action}:ip:${ip}`
}
