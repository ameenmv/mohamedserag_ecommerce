import { shallowRef } from 'vue'

/**
 * The toaster (vue-sonner + its CSS) mounts on the first notification instead of on every page
 * load. Client-only state: the server never notifies, so it always renders without the toaster.
 */
export const toasterWanted = shallowRef(false)

let resolveReady: (() => void) | null = null
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve
})

/** Called by the toaster once it is mounted and listening. */
export function markToasterReady(): void {
  resolveReady?.()
}

/** Mounts the toaster if needed; resolves when toasts can be shown. */
export function whenToasterReady(): Promise<void> {
  toasterWanted.value = true
  return ready
}
