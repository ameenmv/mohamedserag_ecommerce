import {
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common'
import { AbstractHttpAdapter, BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core'
import type { HttpServer } from '@nestjs/common'
import type { Request } from 'express'
import { getRequestId } from './request-id.middleware.js'
import { redactPii } from './redact-pii.js'

function getExceptionName(exception: unknown): string {
  if (exception instanceof Error) {
    return exception.name || exception.constructor?.name || 'Error'
  }
  if (typeof exception === 'object' && exception !== null && exception.constructor?.name) {
    return exception.constructor.name
  }
  return 'UnknownError'
}

function getExceptionMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    const res = exception.getResponse()
    if (typeof res === 'string') return res
    if (typeof res === 'object' && res !== null && 'message' in res) {
      const msg = (res as { message: unknown }).message
      if (typeof msg === 'string') return msg
      if (Array.isArray(msg)) return msg.join(', ')
    }
    return exception.message
  }
  if (exception instanceof Error) {
    return exception.message
  }
  if (typeof exception === 'string') {
    return exception
  }
  return String(exception)
}

function getExceptionStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus()
  }
  if (
    typeof exception === 'object' &&
    exception !== null &&
    'statusCode' in exception &&
    typeof (exception as { statusCode: unknown }).statusCode === 'number'
  ) {
    return (exception as { statusCode: number }).statusCode
  }
  if (
    typeof exception === 'object' &&
    exception !== null &&
    'status' in exception &&
    typeof (exception as { status: unknown }).status === 'number'
  ) {
    return (exception as { status: number }).status
  }
  return HttpStatus.INTERNAL_SERVER_ERROR
}

@Catch()
export class ErrorLogFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('HttpError')

  constructor(@Optional() @Inject(HttpAdapterHost) adapterHost?: HttpAdapterHost | HttpServer) {
    const adapter = adapterHost && 'httpAdapter' in adapterHost ? adapterHost.httpAdapter : adapterHost
    super(adapter)
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    const status = getExceptionStatus(exception)

    if (status >= 500) {
      const ctx = host.switchToHttp()
      const req = ctx.getRequest<Request>()

      const requestId = req ? getRequestId(req) : 'unknown'
      const method = req?.method ?? 'UNKNOWN'
      const path = req?.path ?? (req?.url ? req.url.split('?')[0] : '') ?? ''
      const rawMessage = getExceptionMessage(exception)
      const message = redactPii(rawMessage)
      const error = getExceptionName(exception)

      const entry = {
        requestId,
        method,
        path,
        status,
        error,
        message,
      }

      const isProd = process.env.NODE_ENV === 'production'
      // The stack's first line repeats the raw message; keep only the frames (message is above, redacted)
      const stack = exception instanceof Error ? exception.stack?.split('\n').slice(1).join('\n') : undefined

      if (!isProd && stack) {
        this.logger.error(entry, stack)
      } else {
        this.logger.error(entry)
      }
    }

    super.catch(exception, host)
  }

  /**
   * Same response as Nest's default for non-HTTP errors, minus its `logger.error(exception)`:
   * that line logs the raw message and stack, which can carry phone numbers or request bodies
   * and would bypass the redacted entry written in `catch` above.
   */
  override handleUnknownError(
    exception: unknown,
    host: ArgumentsHost,
    applicationRef: HttpServer | AbstractHttpAdapter,
  ): void {
    const status = getExceptionStatus(exception)
    const body =
      status < 500 && exception instanceof Error
        ? { statusCode: status, message: exception.message }
        : { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' }
    const response: unknown = host.getArgByIndex(1)
    if (!applicationRef.isHeadersSent(response)) {
      applicationRef.reply(response, body, body.statusCode)
    } else {
      applicationRef.end(response)
    }
  }
}
