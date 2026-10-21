import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Browser } from '@e2e-dev/web'

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

export interface A11yViolation {
  id: string
  impact: string
  help: string
  targets: string[]
  /** axe's explanation for the first node, e.g. the measured contrast ratio and colours. */
  why: string
}

/**
 * Runs axe-core (WCAG 2.0–2.2 A/AA rules) on the current page and returns the serious and
 * critical violations. Injected through `evaluate`, so the page's CSP does not block it.
 */
export async function seriousA11yViolations(browser: Browser): Promise<A11yViolation[]> {
  // `evaluate` takes an expression, so wrap the library in one (CDP evaluation bypasses the CSP)
  await browser.evaluate(`(() => { ${axeSource}; return true })()`)
  return await browser.evaluate(async () => {
    interface AxeResult {
      violations: { id: string; impact: string | null; help: string; nodes: { target: unknown[]; failureSummary?: string }[] }[]
    }
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<AxeResult> } }).axe
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    })
    return result.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => ({
        id: v.id,
        impact: v.impact ?? '',
        help: v.help,
        targets: v.nodes.slice(0, 5).map((n) => String(n.target[0])),
        why: (v.nodes[0]?.failureSummary ?? '').slice(0, 300),
      }))
  })
}
