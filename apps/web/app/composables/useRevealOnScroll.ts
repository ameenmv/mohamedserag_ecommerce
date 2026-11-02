import type { Ref, WatchSource } from 'vue'
import { loadGsap } from './useGsap'

/**
 * Items under `rootRef` matching `selector` rise into place, a few at a time, as they scroll into
 * view (GSAP ScrollTrigger.batch). Only items still below the screen when this runs: what the
 * visitor already sees never moves. Transform only, so text never fades (contrast checks and
 * keyboard focus stay as they are). Pass `refreshOn` to pick up items rendered later (filters,
 * next page).
 */
export function useRevealOnScroll(
  rootRef: Ref<HTMLElement | null>,
  selector: string,
  refreshOn?: WatchSource,
): void {
  const kills: (() => void)[] = []

  async function setup(): Promise<void> {
    const kit = await loadGsap()
    const root = rootRef.value
    if (!kit || !root) return
    const { gsap, ScrollTrigger } = kit

    const items = [...root.querySelectorAll<HTMLElement>(selector)].filter(
      (el) => !el.dataset.revealed && el.getBoundingClientRect().top > window.innerHeight,
    )
    if (items.length === 0) return
    for (const el of items) el.dataset.revealed = ''

    gsap.set(items, { y: 64, scale: 0.95 })
    const triggers = ScrollTrigger.batch(items, {
      start: 'top 94%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.07,
          overwrite: true,
          // Hand the element back to its own CSS (hover lifts use `translate`)
          clearProps: 'transform,translate,scale,rotate',
        }),
    })
    kills.push(() => {
      for (const trigger of triggers) trigger.kill()
      gsap.set(items, { clearProps: 'transform,translate,scale,rotate' })
    })
  }

  onMounted(setup)
  if (refreshOn) watch(refreshOn, () => nextTick(setup))
  onBeforeUnmount(() => {
    for (const kill of kills) kill()
  })
}
