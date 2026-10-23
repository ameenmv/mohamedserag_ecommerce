import { describe, expect, it } from 'vitest'
import type { Request, Response } from 'express'
import { contentLocale, currentLocale, runWithLocale } from './content-locale.middleware.js'

function handle(query: Record<string, unknown>): Promise<string> {
  return new Promise((resolve) => {
    contentLocale({ query } as unknown as Request, {} as Response, () => {
      // Survives an async hop, like a controller awaiting the database
      void Promise.resolve().then(() => resolve(currentLocale()))
    })
  })
}

describe('contentLocale middleware', () => {
  it('is English for ?lang=en and Arabic otherwise', async () => {
    expect(await handle({ lang: 'en' })).toBe('en')
    expect(await handle({})).toBe('ar')
    expect(await handle({ lang: ['en', 'en'] })).toBe('ar')
  })

  it('defaults to Arabic outside a request and can be set for tests', () => {
    expect(currentLocale()).toBe('ar')
    expect(runWithLocale('en', () => currentLocale())).toBe('en')
  })
})
