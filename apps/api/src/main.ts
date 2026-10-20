import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  // Trust boundary: Caddy is the only trusted proxy in front of the API. It appends the
  // real client address to `X-Forwarded-For`, so trusting exactly one hop makes `req.ip`
  // the right-most XFF entry (any client-supplied entries stay to its left and are ignored).
  // The throttler keys its budget on `req.ip`, which is what gives each visitor their own
  // rate limit instead of one shared bucket for the web server's address.
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cookieParser())
  app.setGlobalPrefix('api')
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true })
  app.enableShutdownHooks()
  await app.listen(Number(process.env.API_PORT ?? 4000))
}
void bootstrap()
