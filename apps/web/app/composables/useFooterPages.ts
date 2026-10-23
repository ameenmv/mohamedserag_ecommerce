import type { FooterResolvedLink } from '~/constants/navigation'
import { FOOTER_PAGE_LINKS, FOOTER_TRADERS_LINK } from '~/constants/navigation'

/**
 * Resolves the footer informational links: the published CMS pages (label = page title)
 * followed by the fixed traders entry point. Falls back to the static page list when the
 * pages request fails, so the footer never renders an empty column. Not awaited: the
 * footer renders in every layout, and Nuxt still prefetches it during SSR.
 */
export function useFooterPages() {
  const storeApi = useStoreApi()
  const { t } = useI18n()

  const asyncData = useAsyncData(
    'store:footer-pages',
    () => storeApi.pages().then((response) => response.items),
    { getCachedData: payloadCache },
  )

  const links = computed<FooterResolvedLink[]>(() => {
    const pages = asyncData.error.value ? null : asyncData.data.value
    // Trust the API list even when empty (every page unpublished); fall back only on failure
    const pageLinks: FooterResolvedLink[] = pages
      ? pages.map((page) => ({ label: page.title, to: `/pages/${page.slug}` }))
      : FOOTER_PAGE_LINKS.map((page) => ({ label: t(page.labelKey), to: `/pages/${page.slug}` }))

    return [...pageLinks, { label: t(FOOTER_TRADERS_LINK.labelKey), to: FOOTER_TRADERS_LINK.to }]
  })

  return {
    ...asyncData,
    links,
  }
}
