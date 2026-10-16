import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  // Behind Caddy: use the real client IP for rate limits and logs.
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cookieParser())
  app.setGlobalPrefix('api')
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true })
  app.enableShutdownHooks()
  await app.listen(Number(process.env.API_PORT ?? 4000))
}
void bootstrap()
