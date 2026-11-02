import type { gsap as GsapInstance } from 'gsap'
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger'

export interface GsapKit {
  gsap: typeof GsapInstance
  ScrollTrigger: typeof ScrollTriggerPlugin
}

let kit: Promise<GsapKit> | null = null

const FIRST_INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel', 'scroll'] as const

/** Resolves on the visitor's first scroll, touch, mouse move or key press. */
function firstInput(): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      for (const type of FIRST_INPUT_EVENTS) window.removeEventListener(type, done)
      resolve()
    }
    for (const type of FIRST_INPUT_EVENTS) window.addEventListener(type, done, { once: true, passive: true })
  })
}

/**
 * GSAP and ScrollTrigger, downloaded only after the visitor first interacts with the page. The
 * page-speed budget (200 KB of script on load, CI's Lighthouse) has no room for them, and
 * nothing they drive is needed before the first scroll or pointer move. Resolves to null on the
 * server and for visitors who ask for reduced motion: callers then leave the page as rendered.
 */
export function loadGsap(): Promise<GsapKit | null> {
  if (import.meta.server) return Promise.resolve(null)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(null)
  kit ??= firstInput()
    .then(() => Promise.all([import('gsap'), import('gsap/ScrollTrigger')]))
    .then(([core, st]) => {
      core.gsap.registerPlugin(st.ScrollTrigger)
      return { gsap: core.gsap, ScrollTrigger: st.ScrollTrigger }
    })
  return kit
}
