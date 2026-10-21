import type { CouponStatus, CouponType, FlashStatus } from '@serag/shared'

export type PromotionStatusTone = 'default' | 'secondary' | 'destructive' | 'outline'

/**
 * Converts an ISO datetime string into local "YYYY-MM-DDTHH:mm" format
 * suitable for <input type="datetime-local"> in the user's browser time zone.
 */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Converts a local "YYYY-MM-DDTHH:mm" datetime string from <input type="datetime-local">
 * into a UTC ISO string for backend API transmission.
 * Returns null if the value is empty or invalid.
 */
export function datetimeLocalToIso(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null

  return d.toISOString()
}

/**
 * Maps a flash sale status to a badge variant name.
 */
export function flashStatusTone(status: FlashStatus | string): PromotionStatusTone {
  switch (status) {
    case 'running':
      return 'default'
    case 'scheduled':
      return 'secondary'
    case 'ended':
    default:
      return 'outline'
  }
}

/**
 * Maps a coupon status to a badge variant name.
 */
export function couponStatusTone(status: CouponStatus | string): PromotionStatusTone {
  switch (status) {
    case 'running':
      return 'default'
    case 'scheduled':
      return 'secondary'
    case 'expired':
      return 'outline'
    case 'inactive':
    default:
      return 'destructive'
  }
}

export interface CouponValueDescriptor {
  key: string
  params: Record<string, string | number>
}

/**
 * Pure descriptor helper for formatting coupon values without directly calling i18n inside utils.
 */
export function couponValueDescriptor(type: CouponType, value: number): CouponValueDescriptor {
  if (type === 'percent') {
    return {
      key: 'admin.promotions.coupons.percentValue',
      params: { value },
    }
  }
  return {
    key: 'admin.promotions.coupons.fixedValue',
    params: { value },
  }
}

export interface CouponUsageDescriptor {
  activeUses: number
  maxUses: number | null
  isUnlimited: boolean
}

/**
 * Pure descriptor helper for coupon usage counts.
 */
export function couponUsageDescriptor(
  activeUses: number,
  maxUses: number | null | undefined,
): CouponUsageDescriptor {
  const safeActive = Math.max(0, activeUses || 0)
  const isUnlimited = maxUses === null || maxUses === undefined || maxUses <= 0
  return {
    activeUses: safeActive,
    maxUses: isUnlimited ? null : (maxUses as number),
    isUnlimited,
  }
}
