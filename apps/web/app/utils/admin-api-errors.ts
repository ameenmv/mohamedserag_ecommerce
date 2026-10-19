import { getErrorStatus } from './api'

export interface AdminParsedApiError {
  status: number | undefined
  code: string | undefined
  isInOrders: boolean
  message: string
  fieldErrors: Record<string, string>
}

interface RawErrorPayload {
  statusCode?: number
  message?: string | string[]
  field?: string
  code?: string
  errors?: Record<string, string[] | string>
}

/**
 * Extracts and maps backend API error responses into typed form and UI errors.
 * Handles:
 * - 409 Conflict with `field` (e.g. duplicate slug or modelCode)
 * - 409 Conflict with `code === 'IN_ORDERS'` on product deletion
 * - 409 Conflict with `code === 'HAS_RELATIONS' | 'HAS_PRODUCTS' | 'IN_USE'`
 * - 400 Bad Request with `errors` dictionary (Zod validation & spec validation)
 * - 400 Bad Request with single `field` & `message`
 */
export function parseAdminApiError(
  err: unknown,
  t?: (key: string, params?: Record<string, unknown>) => string,
): AdminParsedApiError {
  const status = getErrorStatus(err)
  const fieldErrors: Record<string, string> = {}
  let code: string | undefined
  let message = ''

  const defaultInvalid = t ? t('common.errors.invalidValue') : 'common.errors.invalidValue'
  const defaultUnexpected = t ? t('common.errors.unexpected') : 'common.errors.unexpected'

  if (err && typeof err === 'object') {
    const candidate = err as {
      data?: unknown
      response?: { _data?: unknown }
      message?: string
    }
    const payload = (candidate.data ?? candidate.response?._data) as RawErrorPayload | undefined

    if (payload && typeof payload === 'object') {
      if (typeof payload.code === 'string') {
        code = payload.code
      }

      if (typeof payload.message === 'string') {
        message = payload.message
      } else if (Array.isArray(payload.message) && payload.message.length > 0) {
        message = String(payload.message[0])
      }

      // 409 or 400 with a specific single field
      if (typeof payload.field === 'string' && payload.field.trim().length > 0) {
        const fieldKey = payload.field.trim()
        fieldErrors[fieldKey] = message || defaultInvalid
      }

      // 400 with errors object (ZodValidationPipe / spec validation)
      if (payload.errors && typeof payload.errors === 'object') {
        for (const [key, val] of Object.entries(payload.errors)) {
          if (Array.isArray(val) && val.length > 0) {
            fieldErrors[key] = String(val[0])
          } else if (typeof val === 'string' && val.trim().length > 0) {
            fieldErrors[key] = val
          }
        }
      }
    }

    if (!message && typeof candidate.message === 'string') {
      message = candidate.message
    }
  }

  const isInOrders = code === 'IN_ORDERS'

  return {
    status,
    code,
    isInOrders,
    message: message || defaultUnexpected,
    fieldErrors,
  }
}
