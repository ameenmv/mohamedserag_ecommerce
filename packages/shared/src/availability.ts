import type { AvailabilityMode } from './enums.js'

export type AvailabilityState = 'in_stock' | 'low' | 'on_request' | 'out'

export interface DeriveAvailabilityInput {
  mode: AvailabilityMode
  stock: number
  lowStockThreshold: number
}

export interface AvailabilityResult {
  state: AvailabilityState
  label: string
  orderable: boolean
  maxQty: number | null
}

/**
 * Derives storefront availability state, Arabic badge label, orderability,
 * and maximum cart quantity per PRD US-3.1.
 */
export function deriveAvailability({
  mode,
  stock,
  lowStockThreshold,
}: DeriveAvailabilityInput): AvailabilityResult {
  if (mode === 'out') {
    return {
      state: 'out',
      label: 'نفذ',
      orderable: false,
      maxQty: 0,
    }
  }

  if (mode === 'on_request') {
    return {
      state: 'on_request',
      label: 'متاح بالطلب',
      orderable: true,
      maxQty: null,
    }
  }

  if (stock <= 0) {
    return {
      state: 'out',
      label: 'نفذ',
      orderable: false,
      maxQty: 0,
    }
  }

  if (stock <= lowStockThreshold) {
    return {
      state: 'low',
      label: 'كمية محدودة',
      orderable: true,
      maxQty: stock,
    }
  }

  return {
    state: 'in_stock',
    label: 'متوفر',
    orderable: true,
    maxQty: stock,
  }
}
