/**
 * Parts of the storefront are server-rendered and never hydrated to keep the first-load script
 * budget (the header category bar, the announcement bar, …). Their NuxtLinks stay plain <a>
 * elements, so a click would do a full page load and replay the splash. This listener turns
 * plain clicks on internal links into router navigation, so the page transition runs instead.
 * Hydrated NuxtLinks call preventDefault themselves and are left alone.
 */
const SKIP_PATH = /^\/(?:en\/)?(?:admin|api|uploads|_nuxt|fonts)(?:\/|$)/

export default defineNuxtPlugin(() => {
  const router = useRouter()

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) return
    if (anchor.target && anchor.target !== '_self') return
    if (anchor.hasAttribute('download') || anchor.dataset.noSpa !== undefined) return

    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin) return
    if (SKIP_PATH.test(url.pathname)) return
    // Same-page anchors (#reviews-section) keep the browser's own scrolling
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return

    event.preventDefault()
    void router.push(url.pathname + url.search + url.hash)
  })
})
