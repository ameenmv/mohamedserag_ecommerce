import { Test } from '@nestjs/testing'
import { HealthController } from './health.controller.js'
import { PrismaService } from './prisma/prisma.service.js'

describe('HealthController', () => {
  it('is created through Nest DI and reports ok when the database answers', async () => {
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) } }],
    }).compile()
    await expect(mod.get(HealthController).check()).resolves.toMatchObject({ status: 'ok', db: 'ok' })
  })
})
