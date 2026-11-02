/**
 * The admin panel's messages (about two thirds of all of them) are not part of the locale files the
 * storefront downloads on every page: they are fetched, and merged into both locales, only when a
 * visit or a navigation reaches an /admin route. Keeping them out is what keeps the storefront's
 * first load (and its Lighthouse LCP) light.
 */
const ADMIN_PATH = /^\/(?:en\/)?admin(?:\/|$)/

export default defineNuxtPlugin({
  name: 'admin-i18n',
  dependsOn: ['i18n:plugin'],
  setup(nuxtApp) {
    let merged: Promise<void> | null = null

    function mergeAdminMessages(): Promise<void> {
      merged ??= Promise.all([import('~~/i18n/admin/ar.json'), import('~~/i18n/admin/en.json')]).then(
        ([ar, en]) => {
          nuxtApp.$i18n.mergeLocaleMessage('ar', ar.default)
          nuxtApp.$i18n.mergeLocaleMessage('en', en.default)
        },
      )
      return merged
    }

    // Runs for the first navigation too (during SSR and before hydration), so no admin page
    // ever renders without its messages
    useRouter().beforeEach(async (to) => {
      if (ADMIN_PATH.test(to.path)) await mergeAdminMessages()
    })
  },
})
