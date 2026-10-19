/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = import.meta.dirname ?? fileURLToPath(new URL('.', import.meta.url))

function getTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const result: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...getTsFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      result.push(fullPath)
    }
  }
  return result
}

describe('Zod boundary in @serag/shared', () => {
  it('ensures no non-schema files in packages/shared/src import zod', () => {
    const files = getTsFiles(currentDir)
    const violations: string[] = []

    for (const filePath of files) {
      if (filePath.endsWith('.test.ts') || filePath.endsWith('-schema.ts')) {
        continue
      }

      const content = readFileSync(filePath, 'utf-8')
      if (content.includes("from 'zod'") || content.includes('from "zod"')) {
        const relativeName = filePath.slice(currentDir.length + 1)
        violations.push(relativeName)
      }
    }

    expect(
      violations,
      `Non-schema file(s) importing zod: ${violations.join(', ')}. Zod schemas must live only in *-schema.ts files to keep Zod out of client bundles.`,
    ).toEqual([])
  })
})
