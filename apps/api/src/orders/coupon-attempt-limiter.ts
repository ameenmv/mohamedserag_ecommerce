import { Injectable } from '@nestjs/common'

export const MAX_FAILED_COUPON_ATTEMPTS = 10
export const COUPON_ATTEMPT_WINDOW_MS = 15 * 60_000 // 15 minutes
export const MAX_TRACKED_IPS = 10_000

@Injectable()
export class CouponAttemptLimiter {
  private readonly attempts = new Map<string, number[]>()

  /**
   * Checks whether the given IP has exceeded failed coupon lookup attempts within the sliding window.
   */
  isBlocked(ip: string, now: number = Date.now()): boolean {
    if (!ip) {
      return false
    }
    this.pruneIp(ip, now)
    const timestamps = this.attempts.get(ip)
    if (!timestamps) {
      return false
    }
    return timestamps.length >= MAX_FAILED_COUPON_ATTEMPTS
  }

  /**
   * Records a failed coupon lookup for the given IP and updates the sliding window.
   */
  recordFailure(ip: string, now: number = Date.now()): void {
    if (!ip) {
      return
    }
    this.pruneIp(ip, now)
    let timestamps = this.attempts.get(ip)
    if (!timestamps) {
      this.enforceCapacity()
      timestamps = []
    } else {
      // Re-insert to refresh insertion order (LRU eviction)
      this.attempts.delete(ip)
    }
    timestamps.push(now)
    this.attempts.set(ip, timestamps)
  }

  /**
   * Prunes entries older than COUPON_ATTEMPT_WINDOW_MS for the specified IP.
   */
  private pruneIp(ip: string, now: number): void {
    const timestamps = this.attempts.get(ip)
    if (!timestamps) {
      return
    }
    const cutoff = now - COUPON_ATTEMPT_WINDOW_MS
    const valid = timestamps.filter((t) => t > cutoff)
    if (valid.length === 0) {
      this.attempts.delete(ip)
    } else if (valid.length !== timestamps.length) {
      this.attempts.set(ip, valid)
    }
  }

  /**
   * Drops the oldest tracked IPs if map size reaches or exceeds MAX_TRACKED_IPS.
   */
  private enforceCapacity(): void {
    while (this.attempts.size >= MAX_TRACKED_IPS) {
      const oldestKey = this.attempts.keys().next().value
      if (oldestKey === undefined) {
        break
      }
      this.attempts.delete(oldestKey)
    }
  }

  /**
   * Clears all tracked IP attempts (useful in tests).
   */
  clear(): void {
    this.attempts.clear()
  }
}
