import { loadGsap } from './useGsap'
import type { Ref } from 'vue'

/**
 * The home hero's motion (GSAP, loaded after the page is up; nothing here for reduced motion):
 *  - an entrance that plays while the splash still covers the page, so the headline was already
 *    painted (largest paint unaffected) and nothing visible ever blinks out;
 *  - the stats count up when they first come into view;
 *  - the light follows the pointer and the appliance cards shift with depth;
 *  - on scroll the hero shrinks into a rounded card, the art and «1972» move at their own
 *    speeds and «1972» fills in;
 *  - the marquee under the hero speeds up and follows the scroll direction.
 */
export function useHeroMotion(rootRef: Ref<HTMLElement | null>, marqueeRef: Ref<HTMLElement | null>): void {
  let revert: (() => void) | undefined

  onMounted(async () => {
    const kit = await loadGsap()
    const root = rootRef.value
    if (!kit || !root) return
    const { gsap, ScrollTrigger, SplitText } = kit

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      const isRtl = document.documentElement.dir === 'rtl'

      // Entrance, only while the splash still hides the page (and not after the first page)
      const splash = document.querySelector<HTMLElement>('.splash')
      const splashLeft = splash && getComputedStyle(splash).display !== 'none' ? 1.15 - performance.now() / 1000 : 0
      const intro = splashLeft > 0.15
      if (intro) {
        const title = q('[data-hero-title]')[0]
        const split = title ? SplitText.create(title, { type: 'words', mask: 'words' }) : null
        const tl = gsap.timeline({ delay: splashLeft, onComplete: () => split?.revert() })
        if (split) tl.from(split.words, { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.09 }, 0)
        tl.from(q('[data-hero-intro]'), { y: 34, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.2)
          .from(q('[data-hero-art]'), { y: 90, scale: 0.86, rotate: isRtl ? 4 : -4, autoAlpha: 0, duration: 1.4, ease: 'expo.out' }, 0.05)
          .from(q('[data-hero-year]'), { yPercent: 25, autoAlpha: 0, duration: 1.6, ease: 'power2.out' }, 0)
          .from(q('[data-hero-blob]'), { scale: 0.4, autoAlpha: 0, duration: 1.8, ease: 'power2.out', stagger: 0.12 }, 0)
          // The showroom lights switch on, with a fluorescent flicker
          .fromTo(q('[data-hero-beam]'), { autoAlpha: 0 }, {
            keyframes: [{ autoAlpha: 0.7, duration: 0.06 }, { autoAlpha: 0.1, duration: 0.08 }, { autoAlpha: 0.9, duration: 0.06 }, { autoAlpha: 0.3, duration: 0.1 }, { autoAlpha: 1, duration: 0.3 }],
            stagger: 0.18,
          }, 0.35)
      }

      // Stats count up: with the entrance, or when they first scroll into view (phones)
      for (const el of q('[data-hero-stat]')) {
        const match = /^(\D*)(\d+)(\D*)$/.exec(el.textContent?.trim() ?? '')
        if (!match) continue
        const [, before = '', digits = '0', after = ''] = match
        const target = Number(digits)
        const from = target > 1000 ? target - 60 : 0
        const below = el.getBoundingClientRect().top > window.innerHeight
        if (!intro && !below) continue
        const counter = { value: from }
        el.textContent = `${before}${from}${after}`
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: 'power3.out',
          delay: intro ? splashLeft + 0.3 : 0,
          snap: { value: 1 },
          onUpdate: () => { el.textContent = `${before}${counter.value}${after}` },
          scrollTrigger: below ? { trigger: el, start: 'top 92%', once: true } : undefined,
        })
      }

      // The spotlights sway a little, like lamps on a ceiling rail
      q('[data-hero-beam]').forEach((beam, i) => {
        gsap.fromTo(beam, { rotate: i % 2 ? 5 : -5 }, { rotate: i % 2 ? -4 : 4, duration: 6 + i * 1.5, ease: 'sine.inOut', repeat: -1, yoyo: true })
      })

      // Brand-colour light drifts slowly, forever
      for (const blob of q('[data-hero-blob]')) {
        gsap.to(blob, {
          x: 'random(-90, 90)',
          y: 'random(-70, 70)',
          scale: 'random(0.85, 1.2)',
          duration: 'random(7, 12)',
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
        })
      }

      // Pointer: spotlight and card depth (mouse and trackpad only)
      if (window.matchMedia('(pointer: fine)').matches) {
        const spotX = gsap.quickTo(root, '--mx', { duration: 0.6, ease: 'power3.out' })
        const spotY = gsap.quickTo(root, '--my', { duration: 0.6, ease: 'power3.out' })
        const cards = q('[data-depth]').map((card) => ({
          depth: Number(card.dataset.depth ?? 1),
          x: gsap.quickTo(card, '--px', { duration: 0.9, ease: 'power3.out' }),
          y: gsap.quickTo(card, '--py', { duration: 0.9, ease: 'power3.out' }),
        }))
        const onMove = (event: PointerEvent): void => {
          const box = root.getBoundingClientRect()
          const px = (event.clientX - box.left) / box.width
          const py = (event.clientY - box.top) / box.height
          spotX(px * 100)
          spotY(py * 100)
          for (const card of cards) {
            card.x((px - 0.5) * -18 * card.depth)
            card.y((py - 0.5) * -14 * card.depth)
          }
        }
        root.addEventListener('pointermove', onMove)

        // The call-to-action buttons lean toward the pointer, then spring back
        const magnets = [...root.querySelectorAll<HTMLElement>('[data-magnetic]')].map((el) => {
          const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
          const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
          const pull = (event: PointerEvent): void => {
            const box = el.getBoundingClientRect()
            x((event.clientX - box.left - box.width / 2) * 0.3)
            y((event.clientY - box.top - box.height / 2) * 0.4)
          }
          const release = (): void => {
            gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: true })
          }
          el.addEventListener('pointermove', pull)
          el.addEventListener('pointerleave', release)
          return () => {
            el.removeEventListener('pointermove', pull)
            el.removeEventListener('pointerleave', release)
          }
        })
        revert = () => {
          root.removeEventListener('pointermove', onMove)
          for (const off of magnets) off()
        }
      }

      // Scroll: the hero becomes a rounded card as it leaves; layers move at their own speeds
      const leave = { trigger: root, start: 'top top', end: 'bottom top', scrub: true }
      gsap.to(root, { scale: 0.93, '--hero-r': 48, transformOrigin: '50% 0%', ease: 'none', scrollTrigger: leave })
      gsap.to(q('[data-hero-art]'), { y: -120, ease: 'none', scrollTrigger: leave })
      gsap.to(q('[data-hero-year]'), { yPercent: 18, ease: 'none', scrollTrigger: leave })
      gsap.fromTo(
        q('[data-hero-year-fill]'),
        { clipPath: 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: '60% top', scrub: true } },
      )

      // Marquee: faster while scrolling, reversing with the scroll direction, then settles
      const track = marqueeRef.value?.querySelector<HTMLElement>('[data-marquee-track]')
      const loop = track?.getAnimations()[0]
      if (track && loop) {
        const speed = { rate: 1 }
        ScrollTrigger.create({
          onUpdate: (self) => {
            const boost = Math.min(Math.abs(self.getVelocity()) / 250, 5)
            speed.rate = self.direction * (1 + boost)
            loop.playbackRate = speed.rate
            // The track's own transform belongs to its CSS loop, so the words lean instead
            gsap.to(track.children, { skewX: gsap.utils.clamp(-10, 10, self.getVelocity() / -250), duration: 0.25, overwrite: true })
            gsap.to(speed, {
              rate: self.direction,
              duration: 0.8,
              ease: 'power2.out',
              overwrite: true,
              onUpdate: () => { loop.playbackRate = speed.rate },
            })
            gsap.to(track.children, { skewX: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' })
          },
        })
      }
    }, root)

    const previous = revert
    revert = () => {
      previous?.()
      ctx.revert()
    }
  })

  onBeforeUnmount(() => revert?.())
}
