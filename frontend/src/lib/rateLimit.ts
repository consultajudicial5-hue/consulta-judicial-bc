interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()
const RPM = parseInt(process.env.RATE_LIMIT_RPM ?? '30', 10)

// For testing only - clears the rate limit store
export function clearRateLimitStore() {
  store.clear()
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const windowMs = 60_000
  let entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs }
    store.set(ip, entry)
    return { allowed: true, remaining: RPM - 1, resetIn: windowMs }
  }

  entry.count++
  const remaining = Math.max(0, RPM - entry.count)
  const resetIn = entry.resetAt - now

  if (entry.count > RPM) {
    return { allowed: false, remaining: 0, resetIn }
  }
  return { allowed: true, remaining, resetIn }
}

// Prune old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of store) {
    if (now > val.resetAt) store.delete(key)
  }
}, 5 * 60_000)
