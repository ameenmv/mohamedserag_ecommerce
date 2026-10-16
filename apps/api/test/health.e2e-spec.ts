import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'

describe('GET /api/health', () => {
  let app: INestApplication
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
  })
  afterAll(() => app.close())

  it('returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200)
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' })
  })
})
