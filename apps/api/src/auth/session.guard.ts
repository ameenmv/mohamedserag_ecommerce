import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Response } from 'express'
import { PrismaService } from '../prisma/prisma.service.js'
import { type AdminRequest, IS_PUBLIC_KEY } from './decorators.js'
import {
  CSRF_HEADER_NAME,
  extractPermissions,
  getSessionCookieOptions,
  hashSessionToken,
  isAdminRoute,
  SESSION_COOKIE_NAME,
  SESSION_EXTEND_THRESHOLD_MS,
  SESSION_TTL_MS,
  verifyCsrfToken,
} from './session.util.js'

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const rawToken = req.cookies?.[SESSION_COOKIE_NAME]
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw new UnauthorizedException('غير مصرح')
    }

    const sessionId = hashSessionToken(rawToken)
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!session) {
      throw new UnauthorizedException('غير مصرح')
    }

    const now = Date.now()
    if (session.expiresAt.getTime() <= now || !session.user.active) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
      throw new UnauthorizedException('غير مصرح')
    }

    const csrfHeader = req.headers[CSRF_HEADER_NAME]
    if (!verifyCsrfToken(req.method, csrfHeader, session.csrfToken)) {
      throw new ForbiddenException('انتهت الجلسة، حدّث الصفحة')
    }

    if (now - session.updatedAt.getTime() > SESSION_EXTEND_THRESHOLD_MS) {
      const newExpiresAt = new Date(now + SESSION_TTL_MS)
      await this.prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: newExpiresAt },
      })
      const res = context.switchToHttp().getResponse<Response>()
      res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions())
    }

    const permissions = extractPermissions(session.user.roles)
    req.admin = {
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      permissions,
      sessionId: session.id,
    }

    return true
  }
}
