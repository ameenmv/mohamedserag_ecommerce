import { BadRequestException } from '@nestjs/common'
import { z } from 'zod'
import { phoneSchema } from '@serag/shared'
import { ZodValidationPipe } from './zod-validation.pipe.js'

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().min(2), phone: phoneSchema }))

  it('returns parsed and transformed data', () => {
    expect(pipe.transform({ name: 'منى', phone: '+20 101 234 5678' })).toEqual({ name: 'منى', phone: '01012345678' })
  })

  it('throws 400 with errors keyed by path', () => {
    try {
      pipe.transform({ name: 'م', phone: '123' })
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException)
      const body = (e as BadRequestException).getResponse() as { errors: Record<string, string[]> }
      expect(Object.keys(body.errors).sort()).toEqual(['name', 'phone'])
      expect(body.errors.phone).toEqual(['رقم الموبايل مش صحيح'])
    }
  })
})
