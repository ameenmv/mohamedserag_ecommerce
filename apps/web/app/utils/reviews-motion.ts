import type { GsapKit } from '~/composables/useGsap'

/**
 * The reviews community motion on wide screens, started after the visitor's first interaction.
 * Columns A and B scroll at different speeds (parallax) alongside a sticky headline.
 * Each card gets a tiny independent drift and settles its rotation toward 0 as it passes the middle.
 * Cards still below the viewport when motion starts rise in once.
 * Transform only (no opacity) preserves WCAG AA contrast throughout.
 * Returns a cleanup function that reverts matchMedia and GSAP context.
 */
export function startReviewsMotion(kit: GsapKit, root: HTMLElement): () => void {
  const { gsap } = kit

  const ctx = gsap.context(() => {}, root)
  const mm = gsap.matchMedia()

  mm.add('(min-width: 1024px)', () => {
    const colA = root.querySelector<HTMLElement>('[data-review-col="a"]')
    const colB = root.querySelector<HTMLElement>('[data-review-col="b"]')
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-review-card]'))

    // Column A scrolls faster than default scroll rate
    if (colA) {
      gsap.fromTo(
        colA,
        { y: 80 },
        {
          y: -80,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
    }

    // Column B scrolls at a steeper offset rate
    if (colB) {
      gsap.fromTo(
        colB,
        { y: 140 },
        {
          y: -140,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
    }

    const vh = window.innerHeight

    cards.forEach((card, index) => {
      // The resting tilt is the CSS `rotate` property (Tailwind); move it into the transform so it
      // can settle to 0 while scrolling, and give it back when the screen narrows.
      const tilt = parseFloat(getComputedStyle(card).rotate) || 0
      card.style.rotate = '0deg'

      // Cards still below the viewport grow in once as they enter (scale only: y is scrubbed below)
      if (card.getBoundingClientRect().top > vh) {
        gsap.from(card, {
          scale: 0.94,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 95%', once: true },
        })
      }

      // A small drift of its own (alternating ±30px), settling flat as it reaches the middle
      gsap.fromTo(
        card,
        { rotation: tilt, y: 0 },
        {
          rotation: 0,
          y: index % 2 === 0 ? 30 : -30,
          ease: 'power1.out',
          scrollTrigger: { trigger: card, start: 'top 90%', end: 'center 50%', scrub: true },
        },
      )
    })

    return () => {
      for (const card of cards) card.style.rotate = ''
    }
  })

  return () => {
    mm.revert()
    ctx.revert()
  }
}
