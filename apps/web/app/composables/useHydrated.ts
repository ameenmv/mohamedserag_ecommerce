import { onMounted, readonly, ref, type DeepReadonly, type Ref } from 'vue'

/**
 * `false` on the server and while THIS component hydrates; `true` once it has mounted.
 *
 * Use it to render browser-stored state (cart, wishlist, compare, theme) only after hydration, so
 * the first client render matches the server HTML. It is deliberately per component: Nuxt can mount
 * the root before async layouts/pages hydrate, and lazily hydrated components (`hydrate-on-visible`)
 * hydrate much later — a shared app-wide flag would already be `true` for them and cause mismatches.
 */
export function useHydrated(): DeepReadonly<Ref<boolean>> {
  const hydrated = ref(false)
  onMounted(() => {
    hydrated.value = true
  })
  return readonly(hydrated)
}
