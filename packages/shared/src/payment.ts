import type { OrderStatus } from './enums.js'
import { allowedTransitions } from './order-flow.js'

export const PAYMENT_CONFIRMABLE_STATUSES = [
  'awaiting_payment',
  'awaiting_deposit',
  'payment_rejected',
] as const

export type PaymentConfirmableStatus = (typeof PAYMENT_CONFIRMABLE_STATUSES)[number]

export const PAYMENT_ADDABLE_STATUSES = [
  'confirmed',
  'out_for_delivery',
  'delivered',
] as const

export type PaymentAddableStatus = (typeof PAYMENT_ADDABLE_STATUSES)[number]

export function isPaymentConfirmable(status: OrderStatus): status is PaymentConfirmableStatus {
  return (PAYMENT_CONFIRMABLE_STATUSES as readonly string[]).includes(status)
}

export function isPaymentAddable(status: OrderStatus): status is PaymentAddableStatus {
  return (PAYMENT_ADDABLE_STATUSES as readonly string[]).includes(status)
}

export interface OrderRemainingInput {
  total: number
  paidAmount: number
}

export function remainingAmount(order: OrderRemainingInput): number {
  return Math.max(0, order.total - order.paidAmount)
}

export interface OrderDepositInput {
  depositAmount?: number | null
  paidAmount: number
}

export function depositRemaining(order: OrderDepositInput): number {
  return Math.max(0, (order.depositAmount ?? 0) - order.paidAmount)
}

export interface ReachesDepositInput {
  paidAmount: number
  depositAmount?: number | null
}

export function reachesDeposit(order: ReachesDepositInput, amount: number): boolean {
  const deposit = order.depositAmount ?? 0
  if (deposit <= 0) {
    return true
  }
  return order.paidAmount + amount >= deposit
}

export interface OrderConfirmAmountInput {
  status: OrderStatus
  total: number
  paidAmount: number
  depositAmount?: number | null
}

export function defaultConfirmAmount(order: OrderConfirmAmountInput): number {
  const deposit = order.depositAmount ?? 0
  const hasUnpaidDeposit = deposit > 0 && order.paidAmount < deposit

  if (order.status === 'awaiting_deposit' || (order.status === 'payment_rejected' && hasUnpaidDeposit)) {
    return depositRemaining(order)
  }

  return remainingAmount(order)
}

export function manualStatusTargets(status: OrderStatus): OrderStatus[] {
  const transitions = allowedTransitions[status] ?? []
  const isConfirmable = isPaymentConfirmable(status)

  return transitions.filter((target) => {
    if (target === 'payment_rejected') {
      return false
    }
    if (target === 'confirmed' && isConfirmable) {
      return false
    }
    if (target === 'awaiting_deposit') {
      return false
    }
    return true
  })
}

