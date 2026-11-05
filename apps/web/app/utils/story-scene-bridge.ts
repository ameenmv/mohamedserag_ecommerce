/**
 * Lightweight bridge between the product story GSAP motion timeline
 * and the active 3D appliance scene.
 * Zero external dependencies.
 */

export type StorySceneOpenListener = (openness: number) => void

let currentOpenListener: StorySceneOpenListener | null = null

/**
 * Register the active 3D scene's openness handler.
 * Returns an unregister function to call on unmount.
 */
export function registerStoryScene(listener: StorySceneOpenListener): () => void {
  currentOpenListener = listener
  return () => {
    if (currentOpenListener === listener) {
      currentOpenListener = null
    }
  }
}

/**
 * Notify the active 3D scene of scroll progress (0..1).
 */
export function setStorySceneOpen(openness: number): void {
  currentOpenListener?.(openness)
}

/**
 * Query whether a 3D scene listener is currently registered.
 */
export function hasActiveStoryScene(): boolean {
  return currentOpenListener !== null
}
