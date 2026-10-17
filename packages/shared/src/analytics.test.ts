import { describe, expect, it } from 'vitest'
import { FUNNEL_EVENTS, isFunnelEvent, type FunnelEvent, type FunnelEventData } from './analytics.js'

describe('analytics shared types and constants', () => {
  it('defines the 8 canonical funnel events', () => {
    expect(FUNNEL_EVENTS).toEqual([
      'product_view',
      'add_to_cart',
      'checkout_start',
      'order_placed',
      'bridal_list_created',
      'bridal_reserved',
      'whatsapp_click',
      'search',
    ])
  })

  it('validates funnel events with isFunnelEvent type guard', () => {
    expect(isFunnelEvent('whatsapp_click')).toBe(true)
    expect(isFunnelEvent('product_view')).toBe(true)
    expect(isFunnelEvent('order_placed')).toBe(true)
    expect(isFunnelEvent('checkout_start')).toBe(true)
    expect(isFunnelEvent('unknown_event')).toBe(false)
    expect(isFunnelEvent(123)).toBe(false)
    expect(isFunnelEvent(null)).toBe(false)
  })

  it('type-checks FunnelEvent and FunnelEventData structures', () => {
    const event: FunnelEvent = 'whatsapp_click'
    const eventData: FunnelEventData = {
      source: 'header',
      step: 1,
      isMobile: true,
    }

    expect(event).toBe('whatsapp_click')
    expect(eventData.source).toBe('header')
    expect(eventData.step).toBe(1)
    expect(eventData.isMobile).toBe(true)
  })
})
