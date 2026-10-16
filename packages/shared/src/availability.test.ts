import { describe, it, expect } from 'vitest'
import { deriveAvailability } from './availability.js'

describe('deriveAvailability', () => {
  it('returns in_stock («متوفر») when mode is auto and stock > lowStockThreshold', () => {
    expect(deriveAvailability({ mode: 'auto', stock: 12, lowStockThreshold: 5 })).toEqual({
      state: 'in_stock',
      label: 'متوفر',
      orderable: true,
      maxQty: 12,
    })
  })

  it('returns low («كمية محدودة») when mode is auto and 1 <= stock <= lowStockThreshold', () => {
    expect(deriveAvailability({ mode: 'auto', stock: 5, lowStockThreshold: 5 })).toEqual({
      state: 'low',
      label: 'كمية محدودة',
      orderable: true,
      maxQty: 5,
    })
    expect(deriveAvailability({ mode: 'auto', stock: 1, lowStockThreshold: 5 })).toEqual({
      state: 'low',
      label: 'كمية محدودة',
      orderable: true,
      maxQty: 1,
    })
  })

  it('returns out («نفذ») when mode is auto and stock <= 0', () => {
    expect(deriveAvailability({ mode: 'auto', stock: 0, lowStockThreshold: 5 })).toEqual({
      state: 'out',
      label: 'نفذ',
      orderable: false,
      maxQty: 0,
    })
  })

  it('returns on_request («متاح بالطلب») with maxQty null regardless of stock', () => {
    expect(deriveAvailability({ mode: 'on_request', stock: 0, lowStockThreshold: 5 })).toEqual({
      state: 'on_request',
      label: 'متاح بالطلب',
      orderable: true,
      maxQty: null,
    })
    expect(deriveAvailability({ mode: 'on_request', stock: 10, lowStockThreshold: 5 })).toEqual({
      state: 'on_request',
      label: 'متاح بالطلب',
      orderable: true,
      maxQty: null,
    })
  })

  it('returns out («نفذ») when mode is out regardless of stock', () => {
    expect(deriveAvailability({ mode: 'out', stock: 25, lowStockThreshold: 5 })).toEqual({
      state: 'out',
      label: 'نفذ',
      orderable: false,
      maxQty: 0,
    })
  })
})
