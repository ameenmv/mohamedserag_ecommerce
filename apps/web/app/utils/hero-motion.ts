import type { GsapKit } from '~/composables/useGsap'

/**
 * The home hero's motion, started by StoreHomeHero after the visitor's first interaction (this
 * module and GSAP are downloaded only then: the page-speed script budget has no room for them).
 * The entrance under the splash is CSS (main.css, «Hero entrance»).
 *  - the stats count up when they first come into view;
 *  - the light follows the pointer and the appliance cards shift with depth;
 *  - on scroll the hero shrinks into a rounded card, the art and «1972» move at their own
 *    speeds and «1972» fills in;
 *  - the marquee under the hero speeds up and follows the scroll direction.
 * Returns a function that stops everything and restores the page.
 */
export function startHeroMotion(kit: GsapKit, root: HTMLElement, marquee: HTMLElement | null): () => void {
  const { gsap, ScrollTrigger } = kit
  let revert: (() => void) | undefined

  const ctx = gsap.context(() => {
    const q = gsap.utils.selector(root)

    // Stats count up when they first scroll into view (phones: they start below the screen)
    for (const el of q('[data-hero-stat]')) {
      const match = /^(\D*)(\d+)(\D*)$/.exec(el.textContent?.trim() ?? '')
      if (!match || el.getBoundingClientRect().top <= window.innerHeight) continue
      const [, before = '', digits = '0', after = ''] = match
      const target = Number(digits)
      const counter = { value: target > 1000 ? target - 60 : 0 }
      el.textContent = `${before}${counter.value}${after}`
      gsap.to(counter, {
        value: target,
        duration: 1.6,
        ease: 'power3.out',
        snap: { value: 1 },
        onUpdate: () => { el.textContent = `${before}${counter.value}${after}` },
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      })
    }


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
    const track = marquee?.querySelector<HTMLElement>('[data-marquee-track]')
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

  return () => {
    revert?.()
    ctx.revert()
  }
}
