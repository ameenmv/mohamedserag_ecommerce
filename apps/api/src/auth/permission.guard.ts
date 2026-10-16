import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Permission } from '@serag/shared'
import {
  type AdminRequest,
  IS_ANY_ADMIN_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './decorators.js'
import { isAdminRoute } from './session.util.js'

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name)

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AdminRequest>()
    if (!isAdminRoute(req)) {
      return true
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const isAnyAdmin = this.reflector.getAllAndOverride<boolean>(IS_ANY_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isAnyAdmin) {
      if (!req.admin) {
        throw new ForbiddenException('ليس لديك صلاحية لهذا الإجراء')
      }
      return true
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredPermissions || requiredPermissions.length === 0) {
      const className = context.getClass()?.name ?? 'UnknownController'
      const handlerName = context.getHandler()?.name ?? 'unknownHandler'
      this.logger.warn(
        `Admin handler ${className}.${handlerName} is missing @RequirePermission metadata; denying access.`,
      )
      throw new ForbiddenException('ليس لديك صلاحية لهذا الإجراء')
    }

    const admin = req.admin
    if (!admin) {
      throw new ForbiddenException('ليس لديك صلاحية لهذا الإجراء')
    }

    const hasAll = requiredPermissions.every((perm) => admin.permissions.has(perm))
    if (!hasAll) {
      throw new ForbiddenException('ليس لديك صلاحية لهذا الإجراء')
    }

    return true
  }
}
