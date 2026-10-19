import { describe, expect, it } from 'vitest'
import { parseAdminApiError } from '../app/utils/admin-api-errors'

describe('parseAdminApiError', () => {
  it('maps 409 conflict with field to fieldErrors', () => {
    const error = {
      statusCode: 409,
      data: {
        statusCode: 409,
        message: 'كود الموديل مستخدم بالفعل',
        field: 'modelCode',
      },
    }

    const parsed = parseAdminApiError(error)
    expect(parsed.status).toBe(409)
    expect(parsed.isInOrders).toBe(false)
    expect(parsed.fieldErrors.modelCode).toBe('كود الموديل مستخدم بالفعل')
    expect(parsed.message).toBe('كود الموديل مستخدم بالفعل')
  })

  it('maps 409 slug conflict with field to fieldErrors', () => {
    const error = {
      status: 409,
      data: {
        statusCode: 409,
        message: 'الرابط التعريفي مستخدم بالفعل',
        field: 'slug',
      },
    }

    const parsed = parseAdminApiError(error)
    expect(parsed.status).toBe(409)
    expect(parsed.fieldErrors.slug).toBe('الرابط التعريفي مستخدم بالفعل')
  })

  it('maps 409 IN_ORDERS code to typed isInOrders result relying strictly on code', () => {
    const error = {
      statusCode: 409,
      data: {
        statusCode: 409,
        message: 'لا يمكن حذف المنتج',
        code: 'IN_ORDERS',
      },
    }

    const parsed = parseAdminApiError(error)
    expect(parsed.status).toBe(409)
    expect(parsed.code).toBe('IN_ORDERS')
    expect(parsed.isInOrders).toBe(true)
  })

  it('does not treat 409 without IN_ORDERS code as isInOrders even if message mentions orders', () => {
    const error = {
      statusCode: 409,
      data: {
        statusCode: 409,
        message: 'يوجد طلبات سابقة',
      },
    }

    const parsed = parseAdminApiError(error)
    expect(parsed.isInOrders).toBe(false)
  })

  it('maps 400 validation error with errors dictionary to per-field errors', () => {
    const error = {
      statusCode: 400,
      data: {
        message: 'بيانات غير صحيحة',
        errors: {
          name: ['اسم المنتج مطلوب'],
          price: ['السعر لا يمكن أن يكون سالباً'],
          'specs.capacity': ['قيمة الخاصية "capacity" يجب أن تكون رقماً'],
        },
      },
    }

    const parsed = parseAdminApiError(error)
    expect(parsed.status).toBe(400)
    expect(parsed.fieldErrors.name).toBe('اسم المنتج مطلوب')
    expect(parsed.fieldErrors.price).toBe('السعر لا يمكن أن يكون سالباً')
    expect(parsed.fieldErrors['specs.capacity']).toBe('قيمة الخاصية "capacity" يجب أن تكون رقماً')
  })

  it('maps 400 single field error to fieldErrors', () => {
    const error = {
      statusCode: 400,
      data: {
        message: 'السعر القديم يجب أن يكون أكبر من السعر الحالي',
        field: 'oldPrice',
      },
    }

    const parsed = parseAdminApiError(error)
    expect(parsed.status).toBe(400)
    expect(parsed.fieldErrors.oldPrice).toBe('السعر القديم يجب أن يكون أكبر من السعر الحالي')
  })

  it('gracefully handles non-object errors or unknown shapes returning fallback key or using t', () => {
    expect(parseAdminApiError(null).message).toBe('common.errors.unexpected')
    expect(parseAdminApiError('network timeout').message).toBe('common.errors.unexpected')
    expect(parseAdminApiError(new Error('Boom')).message).toBe('Boom')

    const mockT = (key: string) => (key === 'common.errors.unexpected' ? 'Custom unexpected error' : key)
    expect(parseAdminApiError(null, mockT).message).toBe('Custom unexpected error')
  })
})
