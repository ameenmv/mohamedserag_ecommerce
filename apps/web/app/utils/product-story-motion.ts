import type { ProductStoryAppliance } from '@serag/shared'
import type { GsapKit } from '~/composables/useGsap'
import { setStorySceneOpen } from '~/utils/story-scene-bridge'

/**
 * Pinned scroll scene for the product story section.
 * Controls 3D appliance opening, staggered callouts, and price row reveal.
 * Starts after the visitor's first interaction (GSAP is loaded asynchronously).
 * Returns a cleanup function that reverts the GSAP context.
 */
export function startProductStoryMotion(
  kit: GsapKit,
  root: HTMLElement,
  appliance: ProductStoryAppliance,
): () => void {
  const { gsap, ScrollTrigger } = kit

  const ctx = gsap.context(() => {
    // Detect RTL orientation: Arabic hinges are on the inline-end (right), English on left
    const isRtl =
      document.documentElement.dir === 'rtl' ||
      !document.documentElement.dir ||
      document.documentElement.lang === 'ar'
    const sign = isRtl ? 1 : -1

    // Core layout targets
    const applianceEl = root.querySelector<HTMLElement>('[data-story-appliance]')
    const callouts = root.querySelectorAll<HTMLElement>('[data-story-callout]')
    const priceRow = root.querySelector<HTMLElement>('[data-story-price]')
    const pinEl = root.querySelector<HTMLElement>('[data-story-pin]') ?? root

    // Appliance parts
    const fridgeDoorTop = root.querySelector<HTMLElement>('[data-part="door-top"]')
    const fridgeDoorBottom = root.querySelector<HTMLElement>('[data-part="door-bottom"]')
    const washerDoor = root.querySelector<HTMLElement>('[data-part="door"]')
    const washerDrum = root.querySelector<HTMLElement>('[data-part="drum"]')
    const cookerKnobs = root.querySelectorAll<HTMLElement>('[data-part="knob"]')
    const cookerFlames = root.querySelectorAll<HTMLElement>('[data-part="flame"]')
    const tvScreen = root.querySelector<HTMLElement>('[data-part="screen"]')
    const tvGlow = root.querySelector<HTMLElement>('[data-part="glow"]')
    const acLouver = root.querySelector<HTMLElement>('[data-part="louver"]')
    const acAirLines = root.querySelectorAll<SVGPathElement>('[data-part="air"]')

    const loops: gsap.core.Animation[] = []
    let scene: gsap.core.Timeline | null = null

    // Only build the scroll scene when the section's top is still below the viewport
    const rootBox = root.getBoundingClientRect()
    const shouldBuildScene = rootBox.top > window.innerHeight * 0.6

    if (shouldBuildScene) {
      // 1. Initial closed / hidden state
      if (applianceEl) {
        gsap.set(applianceEl, { scale: 0.75, rotationY: sign * -20, autoAlpha: 0.4 })
      }

      // Reset 3D appliance scene openness
      setStorySceneOpen(0)

      if (appliance === 'fridge') {
        const origin = isRtl ? 'right center' : 'left center'
        if (fridgeDoorTop) gsap.set(fridgeDoorTop, { rotationY: 0, transformOrigin: origin })
        if (fridgeDoorBottom) gsap.set(fridgeDoorBottom, { rotationY: 0, transformOrigin: origin })
      } else if (appliance === 'washer') {
        const origin = isRtl ? 'right center' : 'left center'
        if (washerDoor) gsap.set(washerDoor, { rotationY: 0, transformOrigin: origin })
        if (washerDrum) gsap.set(washerDrum, { rotation: 0, transformOrigin: 'center center' })
      } else if (appliance === 'cooker') {
        if (cookerKnobs.length > 0) gsap.set(cookerKnobs, { rotation: 0, transformOrigin: 'center center' })
        if (cookerFlames.length > 0) gsap.set(cookerFlames, { scale: 0, autoAlpha: 0, transformOrigin: 'bottom center' })
      } else if (appliance === 'tv') {
        if (tvScreen) gsap.set(tvScreen, { autoAlpha: 0.25 })
        if (tvGlow) gsap.set(tvGlow, { autoAlpha: 0 })
      } else if (appliance === 'ac') {
        if (acLouver) gsap.set(acLouver, { rotationX: 0, transformOrigin: 'top center' })
        if (acAirLines.length > 0) {
          gsap.set(acAirLines, { strokeDasharray: 60, strokeDashoffset: 60, autoAlpha: 0 })
        }
      }

      if (callouts.length > 0) {
        gsap.set(callouts, { y: 50, autoAlpha: 0 })
      }
      if (priceRow) {
        gsap.set(priceRow, { y: 30, autoAlpha: 0 })
      }

      // 2. Timeline with ScrollTrigger pinning
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinEl,
          start: 'top top',
          end: '+=1400',
          pin: true,
          scrub: 1,
        },
      })

      // Step 1: Appliance from scale: .75, rotationY: -20, autoAlpha: .4 to normal
      if (applianceEl) {
        tl.to(applianceEl, { scale: 1, rotationY: 0, autoAlpha: 1, duration: 1, ease: 'power2.out' })
      }

      // Step 2: Kind-specific open
      if (appliance === 'fridge') {
        const fridgeProxy = { progress: 0 }
        tl.to(
          fridgeProxy,
          {
            progress: 1,
            duration: 1.15,
            ease: 'power2.out',
            onUpdate: () => {
              setStorySceneOpen(fridgeProxy.progress)
            },
          },
          '>-0.2',
        )
        if (fridgeDoorTop) {
          tl.to(fridgeDoorTop, { rotationY: sign * 105, duration: 1, ease: 'power2.out' }, '<')
        }
        if (fridgeDoorBottom) {
          tl.to(fridgeDoorBottom, { rotationY: sign * 95, duration: 1, ease: 'power2.out' }, '<0.15')
        }
      } else if (appliance === 'washer') {
        const washerProxy = { progress: 0 }
        tl.to(
          washerProxy,
          {
            progress: 1,
            duration: 1.15,
            ease: 'power2.out',
            onUpdate: () => {
              setStorySceneOpen(washerProxy.progress)
            },
          },
          '>-0.2',
        )
        if (washerDoor) {
          tl.to(washerDoor, { rotationY: sign * 110, duration: 1, ease: 'power2.out' }, '<')
        }
        if (washerDrum) {
          tl.to(washerDrum, { rotation: 540, duration: 1.2, ease: 'power2.out' }, '<')
        }
      } else if (appliance === 'cooker') {
        const cookerProxy = { progress: 0 }
        tl.to(
          cookerProxy,
          {
            progress: 1,
            duration: 1.15,
            ease: 'power2.out',
            onUpdate: () => {
              setStorySceneOpen(cookerProxy.progress)
            },
          },
          '>-0.2',
        )
        if (cookerKnobs.length > 0) {
          tl.to(cookerKnobs, { rotation: -120, duration: 0.6, stagger: 0.08, ease: 'power2.out' }, '<')
        }
        if (cookerFlames.length > 0) {
          tl.to(cookerFlames, { scale: 1, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.7)' }, '<0.2')
        }
      } else if (appliance === 'tv') {
        const tvProxy = { progress: 0 }
        tl.to(
          tvProxy,
          {
            progress: 1,
            duration: 1.15,
            ease: 'power2.out',
            onUpdate: () => {
              setStorySceneOpen(tvProxy.progress)
            },
          },
          '>-0.2',
        )
        const tvTargets = [tvScreen, tvGlow].filter((el): el is HTMLElement => el !== null)
        if (tvTargets.length > 0) {
          tl.to(tvTargets, { autoAlpha: 0.7, duration: 0.15, yoyo: true, repeat: 3, ease: 'power1.inOut' }, '<')
          tl.to(tvTargets, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
        }
      } else if (appliance === 'ac') {
        const acProxy = { progress: 0 }
        tl.to(
          acProxy,
          {
            progress: 1,
            duration: 1.15,
            ease: 'power2.out',
            onUpdate: () => {
              setStorySceneOpen(acProxy.progress)
            },
          },
          '>-0.2',
        )
        if (acLouver) {
          tl.to(acLouver, { rotationX: 40, duration: 0.8, ease: 'power2.out' }, '<')
        }
        if (acAirLines.length > 0) {
          tl.to(acAirLines, { strokeDashoffset: 0, autoAlpha: 1, duration: 1, stagger: 0.12, ease: 'power1.out' }, '<0.2')
        }
      }

      // Step 3: Callouts arrive two by two with stagger
      if (callouts.length > 0) {
        tl.to(callouts, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.12, ease: 'power2.out' }, '>-0.1')
      }

      // Step 4: Price row lands
      if (priceRow) {
        tl.to(priceRow, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, '>-0.2')
      }
      scene = tl
    }

    // 3. Gentle loops once motion is on
    if (appliance === 'washer' && washerDrum) {
      loops.push(
        gsap.to(washerDrum, {
          rotation: '+=360',
          duration: 9,
          ease: 'none',
          repeat: -1,
        }),
      )
    } else if (appliance === 'cooker' && cookerFlames.length > 0) {
      loops.push(
        gsap.to(cookerFlames, {
          scaleY: 0.82,
          scaleX: 1.08,
          duration: 0.35,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.08,
        }),
      )
    } else if (appliance === 'tv' && tvGlow) {
      loops.push(
        gsap.to(tvGlow, {
          autoAlpha: 0.45,
          duration: 2.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        }),
      )
    } else if (appliance === 'ac' && acAirLines.length > 0) {
      loops.push(
        gsap.to(acAirLines, {
          strokeDashoffset: -30,
          duration: 2,
          ease: 'linear',
          repeat: -1,
        }),
      )
    }

    // The loops tween the same properties as the scrubbed scene (drum rotation, flame scale), so
    // they only run once the scene has played through, and only while the section is on screen.
    if (loops.length > 0) {
      for (const loop of loops) loop.pause()
      let onScreen = false
      let sceneDone = !scene
      const sync = (): void => {
        for (const loop of loops) {
          if (onScreen && sceneDone) loop.play()
          else loop.pause()
        }
      }
      const tl = scene
      tl?.eventCallback('onUpdate', () => {
        const done = tl.progress() >= 0.999
        if (done !== sceneDone) {
          sceneDone = done
          sync()
        }
      })
      ScrollTrigger.create({
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          onScreen = self.isActive
          sync()
        },
      })
    }
  }, root)

  return () => {
    ctx.revert()
  }
}
