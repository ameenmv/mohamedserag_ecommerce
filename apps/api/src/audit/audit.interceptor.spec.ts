import { type CallHandler, type ExecutionContext, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { firstValueFrom, of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service.js'
import {
  AUDIT_ENTITY_KEY,
  AuditInterceptor,
  resolveAuditEntityId,
  truncateAuditAfter,
} from './audit.interceptor.js'

describe('AuditInterceptor', () => {
  it('writes an AuditLog entry on successful non-GET admin requests with @Audit metadata', async () => {
    const reflector = new Reflector()
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
      key === AUDIT_ENTITY_KEY ? 'product' : undefined,
    )
    const createMock = vi.fn().mockResolvedValue({ id: 'audit-1' })
    const prisma = {
      auditLog: { create: createMock },
    } as unknown as PrismaService

    const interceptor = new AuditInterceptor(reflector, prisma)
    const handler = Object.defineProperty(() => undefined, 'name', { value: 'updateProduct' })
    const ctx = {
      getHandler: () => handler,
      getClass: () => class ProductsController {},
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/api/admin/products/prod-42',
          method: 'PATCH',
          params: { id: 'prod-42' },
          ip: '127.0.0.1',
          admin: {
            userId: 'user-1',
            name: 'محمد سراج',
            email: 'admin@serag.co',
            permissions: new Set(),
            sessionId: 'sess-1',
          },
        }),
      }),
    } as unknown as ExecutionContext

    const next: CallHandler = {
      handle: () => of({ id: 'prod-42', name: 'ثلاجة' }),
    }

    const res = await firstValueFrom(interceptor.intercept(ctx, next))
    expect(res).toEqual({ id: 'prod-42', name: 'ثلاجة' })
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'product.updateProduct',
        entity: 'product',
        entityId: 'prod-42',
        after: { id: 'prod-42', name: 'ثلاجة' },
        ip: '127.0.0.1',
      },
    })
  })

  it('logs and swallows audit write failures without breaking the response', async () => {
    const reflector = new Reflector()
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('order')
    const prisma = {
      auditLog: { create: vi.fn().mockRejectedValue(new Error('DB connection lost')) },
    } as unknown as PrismaService
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)

    const interceptor = new AuditInterceptor(reflector, prisma)
    const handler = Object.defineProperty(() => undefined, 'name', { value: 'confirm' })
    const ctx = {
      getHandler: () => handler,
      getClass: () => class OrdersController {},
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/api/admin/orders/ord-1',
          method: 'POST',
          params: {},
          ip: '127.0.0.1',
          admin: { userId: 'user-1' },
        }),
      }),
    } as unknown as ExecutionContext

    const next: CallHandler = {
      handle: () => of({ id: 'ord-1', status: 'confirmed' }),
    }

    const res = await firstValueFrom(interceptor.intercept(ctx, next))
    expect(res).toEqual({ id: 'ord-1', status: 'confirmed' })
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('truncates large response bodies to ~20 KB and resolves entityId fallbacks', () => {
    expect(resolveAuditEntityId({ id: 'from-param' }, { id: 'from-res' })).toBe('from-param')
    expect(resolveAuditEntityId({}, { id: 'from-res' })).toBe('from-res')
    expect(resolveAuditEntityId({}, {})).toBe('')

    const huge = { data: 'x'.repeat(30_000) }
    const truncated = truncateAuditAfter(huge) as { _truncated?: boolean; preview?: string }
    expect(truncated._truncated).toBe(true)
    expect(truncated.preview?.length).toBe(20_480)
  })

  it('redacts customer phones and whatsapp URLs in audit snapshot while preserving non-PII fields', () => {
    const rawPayload = {
      id: 'order-123',
      customerPhone: '01012345678',
      phone: '01298765432',
      PHONE: '01511223344',
      CustomerPhone: '+201012345678',
      whatsappUrl: 'https://wa.me/201012345678?text=%D8%A3%D9%87%D9%84%D8%A7',
      to: '01012345678',
      nonPhoneTo: 'support-team',
      entry: {
        id: 'entry-1',
        name: 'عميل سراج',
        phone: '01055554444',
      },
      items: [
        { productId: 'prod-1', customerPhone: '01099998888' },
      ],
      amount: 150000,
      status: 'confirmed',
    }

    const snapshot = truncateAuditAfter(rawPayload) as Record<string, unknown>

    expect(snapshot.id).toBe('order-123')
    expect(snapshot.customerPhone).toBe('010******78')
    expect(snapshot.phone).toBe('012******32')
    expect(snapshot.PHONE).toBe('015******44')
    expect(snapshot.CustomerPhone).toBe('+20********78')
    expect(snapshot.whatsappUrl).toBe('[redacted]')
    expect(snapshot.to).toBe('[redacted]')
    expect(snapshot.nonPhoneTo).toBe('support-team')
    expect((snapshot.entry as Record<string, unknown>).phone).toBe('010******44')
    expect((snapshot.entry as Record<string, unknown>).name).toBe('عميل سراج')
    expect(((snapshot.items as Array<Record<string, unknown>>)[0])?.customerPhone).toBe('010******88')
    expect(snapshot.amount).toBe(150000)
    expect(snapshot.status).toBe('confirmed')
  })

  it('AuditInterceptor saves redacted snapshot in auditLog.create data.after', async () => {
    const reflector = new Reflector()
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('notify_request')
    const createMock = vi.fn().mockResolvedValue({ id: 'audit-2' })
    const prisma = {
      auditLog: { create: createMock },
    } as unknown as PrismaService

    const interceptor = new AuditInterceptor(reflector, prisma)
    const handler = Object.defineProperty(() => undefined, 'name', { value: 'markSent' })
    const ctx = {
      getHandler: () => handler,
      getClass: () => class AdminNotifyController {},
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/api/admin/notify-me/req-10',
          method: 'PATCH',
          params: { id: 'req-10' },
          ip: '10.0.0.5',
          admin: { userId: 'admin-1' },
        }),
      }),
    } as unknown as ExecutionContext

    const responsePayload = {
      whatsappUrl: 'https://wa.me/201012345678?text=test',
      entry: {
        id: 'req-10',
        name: 'عميل الإشعار',
        phone: '01012345678',
        status: 'sent',
      },
    }

    const next: CallHandler = {
      handle: () => of(responsePayload),
    }

    const res = await firstValueFrom(interceptor.intercept(ctx, next))
    // The HTTP response returned to the caller retains its original body
    expect(res).toEqual(responsePayload)

    // The audit record persisted to the database contains the redacted after field
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        action: 'notify_request.markSent',
        entity: 'notify_request',
        entityId: 'req-10',
        after: {
          whatsappUrl: '[redacted]',
          entry: {
            id: 'req-10',
            name: 'عميل الإشعار',
            phone: '010******78',
            status: 'sent',
          },
        },
        ip: '10.0.0.5',
      },
    })
  })
})
