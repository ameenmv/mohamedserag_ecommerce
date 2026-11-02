<script setup lang="ts">
/**
 * Six vertical charcoal columns close over the page (staggered, from the bottom),
 * the store's logo mark shows in the middle, and once the next page has rendered
 * the columns lift away (staggered, toward the top).
 */
const ADMIN_PATH = /^\/(?:en\/)?admin(?:\/|$)/
const wipeState = ref<'idle' | 'in' | 'out'>('idle')
const router = useRouter()
const nuxtApp = useNuxtApp()
let idleTimer: ReturnType<typeof setTimeout> | undefined

function release(): void {
  if (wipeState.value !== 'in') return
  clearTimeout(idleTimer)
  requestAnimationFrame(() => {
    wipeState.value = 'out'
    idleTimer = setTimeout(() => { wipeState.value = 'idle' }, 750)
  })
}

// Mounted after the first interaction, so the first page load never shows it. Query-only
// changes (filters, pages) and the admin never do either.
const removeBefore = router.beforeEach(async (to, from) => {
  if (from.matched.length === 0 || to.path === from.path) return
  if (ADMIN_PATH.test(to.path) || ADMIN_PATH.test(from.path)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  clearTimeout(idleTimer)
  wipeState.value = 'in'
  await new Promise<void>((resolve) => setTimeout(resolve, 450))
})
// A cancelled or failed navigation must never leave the screen covered
const removeAfter = router.afterEach((_to, _from, failure) => { if (failure) release() })
const removeError = router.onError(() => release())
const removeFinish = nuxtApp.hook('page:finish', release)

onBeforeUnmount(() => {
  removeBefore()
  removeAfter()
  removeError()
  removeFinish()
  clearTimeout(idleTimer)
})
</script>

<template>
  <div
    class="page-wipe"
    :data-state="wipeState"
    aria-hidden="true"
  >
    <span class="page-wipe-col" />
    <span class="page-wipe-col" />
    <span class="page-wipe-col" />
    <span class="page-wipe-col" />
    <span class="page-wipe-col" />
    <span class="page-wipe-col" />
    <div class="page-wipe-logo">
      <svg class="size-[72px]" focusable="false">
        <use href="#brand-mark" />
      </svg>
    </div>
  </div>
</template>
