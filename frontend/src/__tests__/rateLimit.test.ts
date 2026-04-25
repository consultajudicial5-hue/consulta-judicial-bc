import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit } from '@/lib/rateLimit'

// The rate limiter uses module-level state (Map + setInterval).
// We reset between tests by manipulating time via vi.useFakeTimers.
describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('allows the first request', () => {
    const result = checkRateLimit('1.2.3.4')
    expect(result.allowed).toBe(true)
  })

  it('tracks remaining count', () => {
    const ip = '10.0.0.1'
    const first = checkRateLimit(ip)
    expect(first.allowed).toBe(true)
    const second = checkRateLimit(ip)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBeLessThan(first.remaining)
  })

  it('rejects after exceeding the limit', () => {
    const ip = '192.168.1.1'
    const limit = parseInt(process.env.RATE_LIMIT_RPM ?? '30', 10)
    for (let i = 0; i < limit; i++) {
      checkRateLimit(ip)
    }
    const result = checkRateLimit(ip)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    const ip = '172.16.0.1'
    const limit = parseInt(process.env.RATE_LIMIT_RPM ?? '30', 10)
    for (let i = 0; i <= limit; i++) {
      checkRateLimit(ip)
    }
    // Advance past the 1-minute window
    vi.advanceTimersByTime(61_000)
    const result = checkRateLimit(ip)
    expect(result.allowed).toBe(true)
  })
})
