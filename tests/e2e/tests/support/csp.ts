import type { Browser } from '@e2e-dev/web'

export interface CspViolation {
  directive: string
  blocked: string
  source: string
}

const watchedBrowsers = new WeakSet<Browser>()

/**
 * Installs a securitypolicyviolation listener via addInitScript so violations
 * during initial page and frame loads are captured before page scripts execute.
 * Also attaches the listener immediately via evaluate on the active page if open.
 */
export async function watchCsp(browser: Browser): Promise<void> {
  if (!watchedBrowsers.has(browser)) {
    watchedBrowsers.add(browser)
    await browser.addInitScript(() => {
      const win = window as unknown as {
        __cspViolations?: Array<{ directive: string; blocked: string; source: string }>
        __cspInstalled?: boolean
      }
      if (win.__cspInstalled) return
      win.__cspInstalled = true
      win.__cspViolations = win.__cspViolations ?? []
      window.addEventListener('securitypolicyviolation', (event: unknown) => {
        const e = event as {
          effectiveDirective?: string
          blockedURI?: string
          sourceFile?: string
        }
        win.__cspViolations?.push({
          directive: e.effectiveDirective ?? '',
          blocked: e.blockedURI ?? '',
          source: e.sourceFile ?? '',
        })
      })
    })
  }

  await browser.evaluate(() => {
    const win = window as unknown as {
      __cspViolations?: Array<{ directive: string; blocked: string; source: string }>
      __cspInstalled?: boolean
    }
    if (win.__cspInstalled) return
    win.__cspInstalled = true
    win.__cspViolations = win.__cspViolations ?? []
    window.addEventListener('securitypolicyviolation', (event: unknown) => {
      const e = event as {
        effectiveDirective?: string
        blockedURI?: string
        sourceFile?: string
      }
      win.__cspViolations?.push({
        directive: e.effectiveDirective ?? '',
        blocked: e.blockedURI ?? '',
        source: e.sourceFile ?? '',
      })
    })
  }).catch(() => {})
}

/**
 * Returns recorded CSP violations from the active window and all accessible child frames.
 */
export async function cspViolations(browser: Browser): Promise<CspViolation[]> {
  return await browser.evaluate(() => {
    interface StoredViolation {
      directive?: string
      blocked?: string
      source?: string
    }
    interface WindowWithViolations {
      __cspViolations?: StoredViolation[]
      frames: ArrayLike<WindowWithViolations>
    }

    const results: Array<{ directive: string; blocked: string; source: string }> = []
    const seen = new Set<unknown>()

    function collect(win: unknown): void {
      if (!win || seen.has(win)) return
      seen.add(win)
      try {
        const frameWin = win as WindowWithViolations
        const list = frameWin.__cspViolations
        if (Array.isArray(list)) {
          for (const v of list) {
            results.push({
              directive: String(v.directive ?? ''),
              blocked: String(v.blocked ?? ''),
              source: String(v.source ?? ''),
            })
          }
        }
        for (let i = 0; i < frameWin.frames.length; i++) {
          collect(frameWin.frames[i])
        }
      } catch {
        // Cross-origin frames can throw; ignored
      }
    }

    collect(window)
    return results
  })
}

/**
 * Returns the source URL of every complete image whose naturalWidth is 0,
 * indicating a load failure (e.g. blocked by CSP during initial render).
 */
export async function brokenImages(browser: Browser): Promise<string[]> {
  return await browser.evaluate(() => {
    interface WindowWithImages {
      document: {
        querySelectorAll: (selector: string) => ArrayLike<{
          complete: boolean
          naturalWidth: number
          currentSrc?: string
          src?: string
          getAttribute: (name: string) => string | null
        }>
      }
      frames: ArrayLike<WindowWithImages>
    }

    const results: string[] = []
    const seen = new Set<unknown>()

    function collect(win: unknown): void {
      if (!win || seen.has(win)) return
      seen.add(win)
      try {
        const frameWin = win as WindowWithImages
        const images = Array.from(frameWin.document.querySelectorAll('img'))
        for (const img of images) {
          if (img.complete && img.naturalWidth === 0) {
            const src = img.currentSrc || img.src || img.getAttribute('src') || ''
            if (src) {
              results.push(src)
            }
          }
        }
        for (let i = 0; i < frameWin.frames.length; i++) {
          collect(frameWin.frames[i])
        }
      } catch {
        // Cross-origin frames can throw; ignored
      }
    }

    collect(window)
    return results
  })
}
