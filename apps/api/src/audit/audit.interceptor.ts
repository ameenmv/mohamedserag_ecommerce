import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { type Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
import type { AdminRequest } from '../auth/decorators.js'
import { isAdminRoute } from '../auth/session.util.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { AUDIT_ENTITY_KEY, Audit } from './audit.decorator.js'

export { AUDIT_ENTITY_KEY, Audit }

export const MAX_AUDIT_JSON_BYTES = 20_480

/**
 * Converts a response body into a JSON-serializable Prisma value truncated to ~20 KB.
 */
export function truncateAuditAfter(
  value: unknown,
  maxBytes: number = MAX_AUDIT_JSON_BYTES,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return Prisma.JsonNull
  }
  try {
    const serialized = JSON.stringify(value)
    if (!serialized) {
      return undefined
    }
    if (Buffer.byteLength(serialized, 'utf8') <= maxBytes) {
      return JSON.parse(serialized) as Prisma.InputJsonValue
    }
    return {
      _truncated: true,
      preview: serialized.slice(0, maxBytes),
    }
  } catch {
    return undefined
  }
}

export function resolveAuditEntityId(
  params: Record<string, unknown> | undefined,
  responseBody: unknown,
): string {
  const paramId = params?.id
  if (typeof paramId === 'string' && paramId.length > 0) {
    return paramId
  }
  if (
    responseBody !== null &&
    typeof responseBody === 'object' &&
    'id' in responseBody
  ) {
    const resId = (responseBody as { id?: unknown }).id
    if (typeof resId === 'string' || typeof resId === 'number') {
      return String(resId)
    }
  }
  return ''
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AdminRequest>()
    if (!isAdminRoute(req) || (req.method ?? 'GET').toUpperCase() === 'GET') {
      return next.handle()
    }

    const entity = this.reflector.getAllAndOverride<string | undefined>(AUDIT_ENTITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!entity) {
      return next.handle()
    }

    const handlerName = context.getHandler()?.name || 'unknown'

    return next.handle().pipe(
      mergeMap(async (responseBody: unknown) => {
        try {
          const entityId = resolveAuditEntityId(
            req.params as Record<string, unknown> | undefined,
            responseBody,
          )
          const after = truncateAuditAfter(responseBody)
          await this.prisma.auditLog.create({
            data: {
              userId: req.admin?.userId ?? null,
              action: `${entity}.${handlerName}`,
              entity,
              entityId,
              after,
              ip: req.ip ?? null,
            },
          })
        } catch (err: unknown) {
          this.logger.error(
            `Failed to write audit log for ${entity}.${handlerName}`,
            err instanceof Error ? err.stack : String(err),
          )
        }
        return responseBody
      }),
    )
  }
}
