import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { z } from 'zod'

/**
 * Validates and transforms a request body, query or param with a Zod schema.
 * Usage: `@Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput`
 * Errors come back as `{ message: 'بيانات غير صحيحة', errors: { field.path: [messages] } }`.
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value)
    if (result.success) return result.data
    const errors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_'
      ;(errors[key] ??= []).push(issue.message)
    }
    throw new BadRequestException({ message: 'بيانات غير صحيحة', errors })
  }
}
