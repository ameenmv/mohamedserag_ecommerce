import { z } from 'zod'
import {
  ORDER_TYPES,
  ORDER_STATUSES,
  BRIDAL_STATUSES,
  PAYMENT_METHODS,
  AVAILABILITY_MODES,
  REVIEW_STATUSES,
  NOTIFY_STATUSES,
} from './enums.js'

export const orderTypeSchema = z.enum(ORDER_TYPES)
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export const bridalStatusSchema = z.enum(BRIDAL_STATUSES)
export const paymentMethodSchema = z.enum(PAYMENT_METHODS)
export const availabilityModeSchema = z.enum(AVAILABILITY_MODES)
export const reviewStatusSchema = z.enum(REVIEW_STATUSES)
export const notifyStatusSchema = z.enum(NOTIFY_STATUSES)
