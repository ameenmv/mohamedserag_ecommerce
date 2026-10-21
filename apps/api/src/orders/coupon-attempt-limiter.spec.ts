import { describe, expect, it } from 'vitest'
import {
  COUPON_ATTEMPT_WINDOW_MS,
  CouponAttemptLimiter,
  MAX_FAILED_COUPON_ATTEMPTS,
  MAX_TRACKED_IPS,
} from './coupon-attempt-limiter.js'

describe('CouponAttemptLimiter', () => {
  it('blocks after 10 failures within the sliding window, and stays unblocked at 9', () => {
    const limiter = new CouponAttemptLimiter()
    const ip = '192.168.1.100'
    const baseTime = 1_700_000_000_000

    // 1 to 9 failures: still not blocked
    for (let i = 1; i <= 9; i++) {
      limiter.recordFailure(ip, baseTime + i * 1_000)
      expect(limiter.isBlocked(ip, baseTime + i * 1_000)).toBe(false)
    }

    // 10th failure: now blocked
    limiter.recordFailure(ip, baseTime + 10_000)
    expect(limiter.isBlocked(ip, baseTime + 10_000)).toBe(true)
  })

  it('unblocks automatically once failures age past COUPON_ATTEMPT_WINDOW_MS', () => {
    const limiter = new CouponAttemptLimiter()
    const ip = '192.168.1.101'
    const t0 = 1_700_000_000_000

    // Record 10 failures at t0
    for (let i = 0; i < MAX_FAILED_COUPON_ATTEMPTS; i++) {
      limiter.recordFailure(ip, t0 + i * 100)
    }
    expect(limiter.isBlocked(ip, t0 + 1_000)).toBe(true)

    // Right before window expiry: still blocked
    const justBeforeExpiry = t0 + COUPON_ATTEMPT_WINDOW_MS - 1
    expect(limiter.isBlocked(ip, justBeforeExpiry)).toBe(true)

    // Right after window expiry: all failures have aged out -> unblocked
    const afterExpiry = t0 + COUPON_ATTEMPT_WINDOW_MS + 2_000
    expect(limiter.isBlocked(ip, afterExpiry)).toBe(false)
  })

  it('enforces strict per-IP isolation', () => {
    const limiter = new CouponAttemptLimiter()
    const badIp = '10.0.0.1'
    const goodIp = '10.0.0.2'
    const now = 1_700_000_000_000

    // Bad IP hits the 10 failure threshold
    for (let i = 0; i < MAX_FAILED_COUPON_ATTEMPTS; i++) {
      limiter.recordFailure(badIp, now + i * 100)
    }

    expect(limiter.isBlocked(badIp, now + 1_000)).toBe(true)
    expect(limiter.isBlocked(goodIp, now + 1_000)).toBe(false)

    // Good IP can record some failures without being blocked
    limiter.recordFailure(goodIp, now + 2_000)
    expect(limiter.isBlocked(goodIp, now + 2_000)).toBe(false)
    expect(limiter.isBlocked(badIp, now + 2_000)).toBe(true)
  })

  it('correctly handles sliding window pruning with partial expiry', () => {
    const limiter = new CouponAttemptLimiter()
    const ip = '192.168.1.102'
    const t0 = 1_700_000_000_000

    // 5 failures at t0
    for (let i = 0; i < 5; i++) {
      limiter.recordFailure(ip, t0)
    }

    // 5 failures at t0 + 10 minutes (600,000 ms)
    const t1 = t0 + 10 * 60_000
    for (let i = 0; i < 5; i++) {
      limiter.recordFailure(ip, t1)
    }

    // At t1, total is 10 within the 15-minute window -> blocked
    expect(limiter.isBlocked(ip, t1)).toBe(true)

    // At t0 + 16 minutes (960,000 ms):
    // The first 5 failures (at t0) have expired (age = 16m > 15m).
    // The second 5 failures (at t1 = 10m) are only 6m old, so still valid.
    // Total valid failures is now 5 (< 10) -> unblocked!
    const t2 = t0 + 16 * 60_000
    expect(limiter.isBlocked(ip, t2)).toBe(false)

    // Recording 4 more failures at t2 brings count to 9 -> still unblocked
    for (let i = 0; i < 4; i++) {
      limiter.recordFailure(ip, t2)
    }
    expect(limiter.isBlocked(ip, t2)).toBe(false)

    // 1 more failure brings count to 10 -> blocked again
    limiter.recordFailure(ip, t2)
    expect(limiter.isBlocked(ip, t2)).toBe(true)
  })

  it('keeps memory bounded by evicting oldest entries beyond MAX_TRACKED_IPS', () => {
    const limiter = new CouponAttemptLimiter()
    const now = 1_700_000_000_000

    // Fill up to MAX_TRACKED_IPS
    for (let i = 0; i < MAX_TRACKED_IPS; i++) {
      limiter.recordFailure(`ip-${i}`, now)
    }

    // ip-0 was the first inserted, should exist
    expect(limiter.isBlocked('ip-0', now)).toBe(false) // has 1 attempt

    // Adding one more IP beyond capacity triggers LRU eviction of the oldest entry (ip-0)
    limiter.recordFailure('ip-overflow', now)

    // ip-0 was evicted
    expect(limiter.isBlocked('ip-0', now)).toBe(false)
    // ip-overflow exists
    expect(limiter.isBlocked('ip-overflow', now)).toBe(false)
  })

  it('handles empty or missing IP gracefully', () => {
    const limiter = new CouponAttemptLimiter()
    expect(limiter.isBlocked('')).toBe(false)
    limiter.recordFailure('')
    expect(limiter.isBlocked('')).toBe(false)
  })
})
