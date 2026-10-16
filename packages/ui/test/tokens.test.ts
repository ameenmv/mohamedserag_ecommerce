import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { brand } from '../tokens.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const tokensCss = readFileSync(resolve(currentDir, '../tokens.css'), 'utf8')

const SHADCN_VARS = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--border',
  '--input',
  '--ring',
  '--radius',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
] as const

function parseCssBlock(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`).exec(css)
  const body = match?.[1] ?? ''
  const vars: Record<string, string> = {}

  for (const line of body.split(';')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    if (key.startsWith('--')) {
      vars[key] = val
    }
  }
  return vars
}

function hexToRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const toLinear = (channel: number): number =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function wcagContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = hexToRelativeLuminance(fgHex)
  const l2 = hexToRelativeLuminance(bgHex)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('packages/ui tokens', () => {
  const rootVars = parseCssBlock(tokensCss, ':root')
  const darkVars = parseCssBlock(tokensCss, '.dark')

  it('defines every shadcn-vue semantic CSS variable in both :root and .dark', () => {
    for (const variableName of SHADCN_VARS) {
      expect(rootVars[variableName], `missing ${variableName} in :root`).toBeDefined()
      expect(darkVars[variableName], `missing ${variableName} in .dark`).toBeDefined()
    }
  })

  it('includes all brand hex values in tokens.css @theme block', () => {
    for (const [key, hex] of Object.entries(brand)) {
      expect(tokensCss).toContain(`--color-serag-${key}: ${hex}`)
    }
  })

  it('meets WCAG 2.2 AA contrast (>= 4.5:1) for light mode muted-foreground on card and primary-foreground on primary', () => {
    const mutedFg = rootVars['--muted-foreground'] ?? '#000000'
    const cardBg = rootVars['--card'] ?? '#000000'
    const primaryFg = rootVars['--primary-foreground'] ?? '#000000'
    const primaryBg = rootVars['--primary'] ?? '#000000'

    expect(wcagContrastRatio(mutedFg, cardBg)).toBeGreaterThanOrEqual(4.5)
    expect(wcagContrastRatio(primaryFg, primaryBg)).toBeGreaterThanOrEqual(4.5)
  })
})
