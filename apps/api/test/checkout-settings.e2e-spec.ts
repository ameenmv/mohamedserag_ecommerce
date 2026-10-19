import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'

describe('Checkout Settings API E2E (GET /api/settings/checkout)', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  it('returns 200 with checkout settings including enabled payment methods, deposit rules, 27 governorates, and city suggestions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/settings/checkout')
      .expect(200)

    expect(res.body).toHaveProperty('paymentMethods')
    expect(res.body).toHaveProperty('codDeposit')
    expect(res.body).toHaveProperty('governorates')
    expect(res.body).toHaveProperty('citySuggestions')

    // 1. Payment methods: Fawry is absent while disabled, COD is present
    expect(Array.isArray(res.body.paymentMethods)).toBe(true)
    const methods = res.body.paymentMethods.map((m: { method: string }) => m.method)
    expect(methods).toContain('cod')
    expect(methods).not.toContain('fawry')

    // 2. Governorates: length 27 and Dakahlia first
    expect(res.body.governorates).toHaveLength(27)
    expect(res.body.governorates[0]).toBe('الدقهلية')

    // 3. COD deposit rules
    expect(res.body.codDeposit).toMatchObject({
      threshold: expect.any(Number),
      pct: expect.any(Number),
    })

    // 4. City suggestions contains Dakahlia cities from default zones
    expect(res.body.citySuggestions).toHaveProperty('الدقهلية')
    expect(res.body.citySuggestions['الدقهلية']).toContain('المنصورة')
    expect(res.body.citySuggestions['الدقهلية']).toContain('طلخا')
  })

  it('GET /api/settings/store returns the public store details as strings', async () => {
    const res = await request(app.getHttpServer()).get('/api/settings/store').expect(200)
    for (const key of ['name', 'phone', 'whatsapp', 'tradersWhatsapp', 'address', 'hours']) {
      expect(typeof res.body[key]).toBe('string')
    }
    expect(res.body.name.length).toBeGreaterThan(0)
  })
})
