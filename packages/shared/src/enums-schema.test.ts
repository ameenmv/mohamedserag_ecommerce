import { describe, expect, it } from 'vitest'
import {
  orderTypeSchema,
  orderStatusSchema,
  bridalStatusSchema,
  paymentMethodSchema,
  availabilityModeSchema,
  reviewStatusSchema,
  notifyStatusSchema,
} from './enums-schema.js'

describe('enums-schema', () => {
  it('validates orderTypeSchema', () => {
    expect(orderTypeSchema.safeParse('order').success).toBe(true)
    expect(orderTypeSchema.safeParse('bridal').success).toBe(true)
    expect(orderTypeSchema.safeParse('invalid').success).toBe(false)
  })

  it('validates orderStatusSchema', () => {
    expect(orderStatusSchema.safeParse('new').success).toBe(true)
    expect(orderStatusSchema.safeParse('delivered').success).toBe(true)
    expect(orderStatusSchema.safeParse('cancelled').success).toBe(true)
    expect(orderStatusSchema.safeParse('unknown').success).toBe(false)
  })

  it('validates bridalStatusSchema', () => {
    expect(bridalStatusSchema.safeParse('locked').success).toBe(true)
    expect(bridalStatusSchema.safeParse('lock_expired').success).toBe(true)
    expect(bridalStatusSchema.safeParse('invalid').success).toBe(false)
  })

  it('validates paymentMethodSchema', () => {
    expect(paymentMethodSchema.safeParse('cod').success).toBe(true)
    expect(paymentMethodSchema.safeParse('instapay').success).toBe(true)
    expect(paymentMethodSchema.safeParse('card').success).toBe(false)
  })

  it('validates availabilityModeSchema', () => {
    expect(availabilityModeSchema.safeParse('auto').success).toBe(true)
    expect(availabilityModeSchema.safeParse('on_request').success).toBe(true)
    expect(availabilityModeSchema.safeParse('out').success).toBe(true)
    expect(availabilityModeSchema.safeParse('in_stock').success).toBe(false)
  })

  it('validates reviewStatusSchema', () => {
    expect(reviewStatusSchema.safeParse('pending').success).toBe(true)
    expect(reviewStatusSchema.safeParse('approved').success).toBe(true)
    expect(reviewStatusSchema.safeParse('rejected').success).toBe(true)
    expect(reviewStatusSchema.safeParse('spam').success).toBe(false)
  })

  it('validates notifyStatusSchema', () => {
    expect(notifyStatusSchema.safeParse('waiting').success).toBe(true)
    expect(notifyStatusSchema.safeParse('sent').success).toBe(true)
    expect(notifyStatusSchema.safeParse('cancelled').success).toBe(false)
  })
})
