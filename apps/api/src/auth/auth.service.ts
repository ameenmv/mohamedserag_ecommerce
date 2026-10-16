import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import type { Permission } from '@serag/shared'
import argon2 from 'argon2'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AdminContext } from './decorators.js'
import { extractPermissions, hashSessionToken, SESSION_TTL_MS } from './session.util.js'

export const INVALID_CREDENTIALS_MESSAGE = 'البريد أو كلمة المرور غير صحيحة'

export const loginSchema = z.object({
  email: z
    .string({ message: 'البريد الإلكتروني مطلوب' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'البريد الإلكتروني غير صحيح' })),
  password: z.string({ message: 'كلمة المرور مطلوبة' }).min(1, { message: 'كلمة المرور مطلوبة' }),
})

export type LoginInput = z.output<typeof loginSchema>

export interface AuthSessionPayload {
  user: {
    id: string
    name: string
    email: string
  }
  permissions: Permission[]
  csrfToken: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private dummyHashPromise: Promise<string> | null = null

  constructor(private readonly prisma: PrismaService) {}

  private getDummyHash(): Promise<string> {
    if (!this.dummyHashPromise) {
      this.dummyHashPromise = argon2.hash(nanoid(32))
    }
    return this.dummyHashPromise
  }

  async login(
    input: LoginInput,
    meta: { ip: string | null; userAgent: string | null },
  ): Promise<{ rawToken: string; payload: AuthSessionPayload }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
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
    })

    if (!user) {
      const dummyHash = await this.getDummyHash()
      await argon2.verify(dummyHash, input.password).catch(() => false)
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE)
    }

    const passwordValid = await argon2.verify(user.passwordHash, input.password).catch(() => false)
    if (!passwordValid || !user.active) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE)
    }

    const rawToken = nanoid(48)
    const sessionId = hashSessionToken(rawToken)
    const csrfToken = nanoid(32)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
        csrfToken,
      },
    })

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    })

    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: 'auth.login',
          entity: 'auth',
          entityId: user.id,
          ip: meta.ip,
        },
      })
      .catch((err: unknown) => {
        this.logger.error(
          'Failed to write auth.login audit log',
          err instanceof Error ? err.stack : String(err),
        )
      })

    const permissions = Array.from(extractPermissions(user.roles))

    return {
      rawToken,
      payload: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        permissions,
        csrfToken,
      },
    }
  }

  async getMe(admin: AdminContext | undefined): Promise<AuthSessionPayload> {
    if (!admin) {
      throw new UnauthorizedException('غير مصرح')
    }

    const session = await this.prisma.session.findUnique({
      where: { id: admin.sessionId },
      select: { csrfToken: true },
    })

    if (!session) {
      throw new UnauthorizedException('غير مصرح')
    }

    return {
      user: {
        id: admin.userId,
        name: admin.name,
        email: admin.email,
      },
      permissions: Array.from(admin.permissions),
      csrfToken: session.csrfToken,
    }
  }

  async logout(admin: AdminContext | undefined, ip: string | null): Promise<void> {
    if (!admin) {
      throw new UnauthorizedException('غير مصرح')
    }

    await this.prisma.session.delete({ where: { id: admin.sessionId } }).catch(() => undefined)

    await this.prisma.auditLog
      .create({
        data: {
          userId: admin.userId,
          action: 'auth.logout',
          entity: 'auth',
          entityId: admin.userId,
          ip,
        },
      })
      .catch((err: unknown) => {
        this.logger.error(
          'Failed to write auth.logout audit log',
          err instanceof Error ? err.stack : String(err),
        )
      })
  }
}
