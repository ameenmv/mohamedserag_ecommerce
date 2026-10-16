import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common'
import type { Permission } from '@serag/shared'
import type { Request } from 'express'

export interface AdminContext {
  userId: string
  name: string
  email: string
  permissions: Set<Permission>
  sessionId: string
}

export interface AdminRequest extends Request {
  admin?: AdminContext
}

export const IS_PUBLIC_KEY = 'auth:isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

export const IS_ANY_ADMIN_KEY = 'auth:isAnyAdmin'
export const AnyAdmin = () => SetMetadata(IS_ANY_ADMIN_KEY, true)

export const REQUIRED_PERMISSIONS_KEY = 'auth:requiredPermissions'
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions)

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminContext | undefined => {
    const req = ctx.switchToHttp().getRequest<AdminRequest>()
    return req.admin
  },
)

export { AUDIT_ENTITY_KEY, Audit } from '../audit/audit.decorator.js'

