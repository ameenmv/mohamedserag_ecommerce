import {
  adminOrderListQuerySchema,
  DEFAULT_TEMPLATES,
  formatEgpWithUnit,
  ORDER_STATUSES,
  renderTemplate,
  statusTemplateKey,
  waLink,
  type AdminOrderDetail,
  type AdminOrderListQueryOutput,
  type OrderStatus,
  type PaymentMethod,
  type WhatsAppTemplateKey,
} from '@serag/shared'

export interface StatusTabItem {
  id: OrderStatus | 'all'
  labelKey: string
  count: number
  active: boolean
}

export type OrderStatusTone = 'default' | 'secondary' | 'destructive' | 'outline'

export function statusTone(status: OrderStatus): OrderStatusTone {
  switch (status) {
    case 'confirmed':
    case 'out_for_delivery':
    case 'delivered':
      return 'default'
    case 'payment_rejected':
      return 'destructive'
    case 'cancelled':
      return 'outline'
    default:
      return 'secondary'
  }
}

export function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white'
    case 'confirmed':
      return 'bg-serag-night text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink font-bold'
    case 'out_for_delivery':
      return 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-600 dark:text-white'
    case 'payment_rejected':
      return 'bg-destructive text-white hover:bg-destructive/90'
    case 'awaiting_payment':
    case 'awaiting_deposit':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
    case 'cancelled':
      return 'border-border text-muted-foreground'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

export function buildStatusTabs(
  counts: Record<OrderStatus, number>,
  activeStatus?: OrderStatus | 'all',
): StatusTabItem[] {
  const allCount = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const current = activeStatus ?? 'all'
  const tabs: StatusTabItem[] = [
    {
      id: 'all',
      labelKey: 'admin.orders.tabs.all',
      count: allCount,
      active: current === 'all',
    },
  ]

  for (const status of ORDER_STATUSES) {
    tabs.push({
      id: status,
      labelKey: `admin.orders.tabs.${status}`,
      count: counts[status] ?? 0,
      active: current === status,
    })
  }

  return tabs
}

export function buildStatusWhatsappUrl(
  detail: AdminOrderDetail,
  templates?: Record<string, string>,
  opts?: { reason?: string },
): { url: string; templateKey: WhatsAppTemplateKey; variables: Record<string, string | number> } | null {
  const bridalLockedEvent = detail.events?.find((e) => e.status === 'bridal_locked')
  if (detail.status === 'confirmed' && bridalLockedEvent) {
    const firstName = detail.customer.name.trim().split(/\s+/)[0] || detail.customer.name
    const templateText = templates?.bridal_locked ?? DEFAULT_TEMPLATES.bridal_locked
    const lockedDate = bridalLockedEvent.note ?? ''
    const variables: Record<string, string | number> = {
      customerName: firstName,
      orderNo: detail.no,
      date: lockedDate,
      lockedUntil: lockedDate,
    }
    const rendered = renderTemplate(templateText, variables)
    const url = waLink(detail.customer.phone, rendered)
    return { url, templateKey: 'bridal_locked', variables }
  }

  const key = statusTemplateKey(detail.status)
  if (!key) return null

  const firstName = detail.customer.name.trim().split(/\s+/)[0] || detail.customer.name
  const templateText = templates?.[key] ?? DEFAULT_TEMPLATES[key]

  const variables: Record<string, string | number> = {
    customerName: firstName,
    orderNo: detail.no,
    total: formatEgpWithUnit(detail.total),
  }

  if (opts?.reason) {
    variables.reason = opts.reason
  } else if (key === 'payment_rejected') {
    const lastRejected = detail.payments.find((p) => p.status === 'rejected')
    if (lastRejected?.rejectReason) {
      variables.reason = lastRejected.rejectReason
    }
  }

  const rendered = renderTemplate(templateText, variables)
  const url = waLink(detail.customer.phone, rendered)

  return { url, templateKey: key, variables }
}

export interface OrderActionTransition {
  to: OrderStatus
  labelKey: string
  requiresReason: boolean
}

export interface OrderAvailableActions {
  canConfirmPayment: boolean
  canRejectPayment: boolean
  defaultConfirmAmount: number
  transitions: OrderActionTransition[]
  remaining: number
  depositRemaining: number
}

export function actionsFor(detail: AdminOrderDetail): OrderAvailableActions {
  const transitions: OrderActionTransition[] = detail.allowedTransitions.map((to) => ({
    to,
    labelKey: `admin.orders.detail.transition.${to}`,
    requiresReason: to === 'cancelled',
  }))

  return {
    canConfirmPayment: detail.canConfirmPayment,
    canRejectPayment: detail.canRejectPayment,
    defaultConfirmAmount: detail.defaultConfirmAmount,
    transitions,
    remaining: detail.remaining,
    depositRemaining: detail.depositRemaining,
  }
}

/**
 * Reads list filters from the route query. Each field is validated on its own with the shared
 * schema, so one bad value (e.g. `?status=foo`) is dropped without resetting the other filters.
 */
export function deserializeOrdersQuery(rawQuery: Record<string, unknown>): AdminOrderListQueryOutput {
  const shape = adminOrderListQuerySchema.shape
  const pick = <T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, value: unknown): T | undefined => {
    if (value === undefined || value === '' || value === 'all') return undefined
    const res = schema.safeParse(value)
    return res.success ? res.data : undefined
  }

  return {
    q: pick(shape.q, rawQuery.q),
    status: pick(shape.status, rawQuery.status),
    paymentMethod: pick(shape.paymentMethod, rawQuery.paymentMethod),
    from: pick(shape.from, rawQuery.from),
    to: pick(shape.to, rawQuery.to),
    page: pick(shape.page, rawQuery.page) ?? 1,
    pageSize: pick(shape.pageSize, rawQuery.pageSize) ?? 20,
  }
}

/** List filters as the UI holds them: `'all'` means "no filter" for status and method. */
export interface OrdersListFilters {
  q?: string
  status?: OrderStatus | 'all'
  paymentMethod?: PaymentMethod | 'all'
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export function serializeOrdersQuery(input: OrdersListFilters): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (input.q && input.q.trim()) query.q = input.q.trim()
  if (input.status && input.status !== 'all') query.status = input.status
  if (input.paymentMethod && input.paymentMethod !== 'all') query.paymentMethod = input.paymentMethod
  if (input.from) query.from = input.from
  if (input.to) query.to = input.to
  if (input.page && input.page > 1) query.page = input.page
  if (input.pageSize && input.pageSize !== 20) query.pageSize = input.pageSize
  return query
}
