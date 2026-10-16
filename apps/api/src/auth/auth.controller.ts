import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AuthService, type AuthSessionPayload, type LoginInput, loginSchema } from './auth.service.js'
import { type AdminContext, AnyAdmin, CurrentAdmin, Public } from './decorators.js'
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from './session.util.js'

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionPayload> {
    const userAgent =
      typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null
    const { rawToken, payload } = await this.authService.login(body, {
      ip: req.ip ?? null,
      userAgent,
    })

    res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions())
    return payload
  }

  @Get('me')
  @AnyAdmin()
  async me(@CurrentAdmin() admin: AdminContext | undefined): Promise<AuthSessionPayload> {
    return this.authService.getMe(admin)
  }

  @Post('logout')
  @AnyAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentAdmin() admin: AdminContext | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(admin, req.ip ?? null)
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }
}
