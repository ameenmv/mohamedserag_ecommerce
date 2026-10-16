import { describe, it, expect } from 'vitest'
import { allowedTransitions, canTransition, initialStatus } from './order-flow.js'

describe('order-flow', () => {
  it('supports COD flow: new → confirmed → out_for_delivery → delivered', () => {
    expect(canTransition('new', 'confirmed')).toBe(true)
    expect(canTransition('confirmed', 'out_for_delivery')).toBe(true)
    expect(canTransition('out_for_delivery', 'delivered')).toBe(true)
    expect(canTransition('new', 'out_for_delivery')).toBe(false)
  })

  it('supports transfer flow: awaiting_payment → confirmed | payment_rejected', () => {
    expect(canTransition('awaiting_payment', 'confirmed')).toBe(true)
    expect(canTransition('awaiting_payment', 'payment_rejected')).toBe(true)
    expect(canTransition('awaiting_payment', 'out_for_delivery')).toBe(false)
  })

  it('supports large COD flow: awaiting_deposit → confirmed | payment_rejected', () => {
    expect(canTransition('awaiting_deposit', 'confirmed')).toBe(true)
    expect(canTransition('awaiting_deposit', 'payment_rejected')).toBe(true)
    expect(canTransition('awaiting_deposit', 'out_for_delivery')).toBe(false)
  })

  it('supports payment_rejected → confirmed | cancelled', () => {
    expect(canTransition('payment_rejected', 'confirmed')).toBe(true)
    expect(canTransition('payment_rejected', 'cancelled')).toBe(true)
    expect(canTransition('payment_rejected', 'out_for_delivery')).toBe(false)
  })

  it('allows cancellation from any state before delivered, and treats delivered/cancelled as final', () => {
    const preDeliveryStates = [
      'new',
      'awaiting_payment',
      'awaiting_deposit',
      'payment_rejected',
      'confirmed',
      'out_for_delivery',
    ] as const

    for (const state of preDeliveryStates) {
      expect(canTransition(state, 'cancelled')).toBe(true)
    }

    expect(allowedTransitions.delivered).toEqual([])
    expect(allowedTransitions.cancelled).toEqual([])
    expect(canTransition('delivered', 'cancelled')).toBe(false)
    expect(canTransition('cancelled', 'confirmed')).toBe(false)
  })

  it('computes initialStatus based on payment method and COD deposit threshold', () => {
    const codDeposit = { threshold: 3000000, pct: 10 }

    expect(initialStatus('cod', 3000000, codDeposit)).toBe('new')
    expect(initialStatus('cod', 1500000, codDeposit)).toBe('new')
    expect(initialStatus('cod', 3000001, codDeposit)).toBe('awaiting_deposit')
    expect(initialStatus('instapay', 1500000, codDeposit)).toBe('awaiting_payment')
    expect(initialStatus('vodafone_cash', 5000000, codDeposit)).toBe('awaiting_payment')
    expect(initialStatus('fawry', 200000, codDeposit)).toBe('awaiting_payment')
  })
})
