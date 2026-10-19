import type { OrderStatus, PaymentMethod } from './enums.js'

/**
 * Allowed order status transitions matching PRD US-7.1:
 * - COD: new → confirmed → out_for_delivery → delivered
 * - Transfer: awaiting_payment → confirmed | payment_rejected
 * - Large COD: awaiting_deposit → confirmed | payment_rejected
 * - payment_rejected → confirmed | cancelled
 * - cancelled from any state before delivered
 * - delivered and cancelled are final
 */
export const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  awaiting_payment: ['confirmed', 'payment_rejected', 'cancelled'],
  awaiting_deposit: ['confirmed', 'payment_rejected', 'cancelled'],
  payment_rejected: ['confirmed', 'awaiting_deposit', 'cancelled'],
  confirmed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

/**
 * Checks whether an order can transition from `from` status to `to` status.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions[from].includes(to)
}

export interface CodDepositRule {
  threshold: number
  pct: number
}

/**
 * Computes the initial status for a new retail order:
 * - COD above `codDeposit.threshold` → `'awaiting_deposit'`
 * - COD otherwise → `'new'`
 * - Transfer methods (`instapay`, `vodafone_cash`, `fawry`) → `'awaiting_payment'`
 */
export function initialStatus(
  method: PaymentMethod,
  total: number,
  codDeposit: CodDepositRule,
): OrderStatus {
  if (method === 'cod') {
    return total > codDeposit.threshold && codDeposit.pct > 0 ? 'awaiting_deposit' : 'new'
  }
  return 'awaiting_payment'
}
