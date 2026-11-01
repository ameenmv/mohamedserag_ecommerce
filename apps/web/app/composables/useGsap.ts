import type { gsap as GsapInstance } from 'gsap'
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger'
import type { SplitText as SplitTextPlugin } from 'gsap/SplitText'

export interface GsapKit {
  gsap: typeof GsapInstance
  ScrollTrigger: typeof ScrollTriggerPlugin
  SplitText: typeof SplitTextPlugin
}

let kit: Promise<GsapKit> | null = null

/**
 * GSAP and its plugins, downloaded only when a component asks for them (never in the first-load
 * bundle, so the first paint does not wait on them). Resolves to null on the server and for
 * visitors who ask for reduced motion: callers then simply leave the page as rendered.
 */
export function loadGsap(): Promise<GsapKit | null> {
  if (import.meta.server) return Promise.resolve(null)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(null)
  kit ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('gsap/SplitText')]).then(
    ([core, st, split]) => {
      core.gsap.registerPlugin(st.ScrollTrigger, split.SplitText)
      return { gsap: core.gsap, ScrollTrigger: st.ScrollTrigger, SplitText: split.SplitText }
    },
  )
  return kit
}
