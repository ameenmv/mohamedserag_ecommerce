export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface FlightPath {
  start: Point
  mid: Point
  end: Point
}

/**
 * Computes start, arc midpoint, and end coordinates for a fly-to-cart animation.
 * The arc apex (mid.y) is positioned 140px above both endpoints.
 */
export function flightPath(
  source: Rect,
  target: Rect,
  size = 72,
): FlightPath {
  const half = size / 2
  const start: Point = {
    x: source.left + source.width / 2 - half,
    y: source.top + source.height / 2 - half,
  }
  const end: Point = {
    x: target.left + target.width / 2 - half,
    y: target.top + target.height / 2 - half,
  }
  const mid: Point = {
    x: (start.x + end.x) / 2,
    y: Math.min(start.y, end.y) - 140,
  }
  return { start, mid, end }
}

function getVisibleCartTarget(): HTMLElement | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'))
  const visible = targets.filter((el) => {
    const rect = el.getBoundingClientRect()
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    )
  })

  if (visible.length === 0) {
    return null
  }

  // On phones (viewport narrower than 768px), prefer the bottom nav cart button
  if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches) {
    const bottomNavTarget = visible.find((el) => el.closest('nav'))
    if (bottomNavTarget) {
      return bottomNavTarget
    }
  }

  return visible[0] ?? null
}

/**
 * Flies a copy of the product photo from `from` to the visible cart button, then bumps the cart.
 * Imported dynamically on the first add to cart, so it is never part of a page's first load.
 */
export function flyToCart(from: HTMLElement): void {
  // Skip on server, reduced-motion preferences, or older browsers without WAAPI
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof Element === 'undefined' ||
    typeof Element.prototype.animate !== 'function'
  ) {
    return
  }

  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  const target = getVisibleCartTarget()
  if (!target) {
    return
  }

  const source =
    from.closest<HTMLElement>('[data-fly-source]') ??
    from.closest('article')?.querySelector<HTMLElement>('[data-fly-source]') ??
    document.querySelector<HTMLElement>('[data-fly-source]') ??
    from

  const sourceRect = source.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const path = flightPath(sourceRect, targetRect, 72)

  // Floating card token for the flight
  const flyer = document.createElement('div')
  flyer.setAttribute('aria-hidden', 'true')
  flyer.style.position = 'fixed'
  flyer.style.left = '0'
  flyer.style.top = '0'
  flyer.style.zIndex = '96'
  flyer.style.width = '72px'
  flyer.style.height = '72px'
  flyer.style.borderRadius = '18px'
  flyer.style.background = 'var(--color-serag-ivory)'
  flyer.style.boxShadow = '0 20px 30px -12px rgb(0 0 0 / .45)'
  flyer.style.pointerEvents = 'none'
  flyer.style.display = 'grid'
  flyer.style.placeItems = 'center'
  flyer.style.overflow = 'hidden'
  flyer.style.transform = `translate(${path.start.x}px, ${path.start.y}px)`

  const img = source.querySelector('img')
  if (img) {
    const clone = document.createElement('img')
    clone.src = img.currentSrc || img.src
    clone.alt = ''
    clone.style.width = '80%'
    clone.style.height = '80%'
    clone.style.objectFit = 'contain'
    flyer.appendChild(clone)
  } else {
    const svg = source.querySelector('svg')
    if (svg) {
      const clone = svg.cloneNode(true) as SVGElement
      clone.style.width = '80%'
      clone.style.height = '80%'
      flyer.appendChild(clone)
    }
  }

  document.body.appendChild(flyer)

  const animation = flyer.animate(
    [
      {
        transform: `translate(${path.start.x}px, ${path.start.y}px) scale(1) rotate(0deg)`,
        opacity: 1,
      },
      {
        offset: 0.5,
        transform: `translate(${path.mid.x}px, ${path.mid.y}px) scale(0.9) rotate(-8deg)`,
        opacity: 1,
      },
      {
        transform: `translate(${path.end.x}px, ${path.end.y}px) scale(0.25) rotate(14deg)`,
        opacity: 0.6,
      },
    ],
    {
      duration: 850,
      easing: 'cubic-bezier(.5, 0, .5, 1)',
    },
  )

  const cleanup = (): void => {
    flyer.remove()
  }

  animation.oncancel = cleanup
  animation.onfinish = (): void => {
    cleanup()
    target.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.14)' },
        { transform: 'scale(1)' },
      ],
      {
        duration: 380,
        easing: 'cubic-bezier(.2, .9, .3, 1.25)',
      },
    )
  }
}
