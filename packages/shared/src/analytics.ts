export const FUNNEL_EVENTS = [
  'product_view',
  'add_to_cart',
  'checkout_start',
  'order_placed',
  'bridal_list_created',
  'bridal_reserved',
  'whatsapp_click',
  'search',
] as const

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

export type FunnelEventData = Record<string, string | number | boolean>

export function isFunnelEvent(event: unknown): event is FunnelEvent {
  return typeof event === 'string' && (FUNNEL_EVENTS as readonly string[]).includes(event)
}
