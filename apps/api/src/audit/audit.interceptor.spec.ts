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
})
