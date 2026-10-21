import type { MaybeRefOrGetter } from 'vue'
import { absoluteUrl } from '@serag/shared'
import { buildCanonicalUrl } from '~/utils/seo-url'

export interface SeoPageOptions {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  image?: MaybeRefOrGetter<string | undefined>
  noindex?: MaybeRefOrGetter<boolean>
}

function toAbsoluteImage(siteUrl: string, value: string | undefined): string | undefined {
  if (!value) return undefined
  if (/^https?:\/\//i.test(value)) return value
  return absoluteUrl(siteUrl, value)
}

/**
 * Sets the standard storefront page head: title/description, Open Graph, Twitter Card and exactly one
 * canonical link. The canonical reuses the i18n module's `i18n-can` key so `useLocaleHead()`'s default
 * canonical is replaced rather than duplicated. `noindex` is only applied to explicitly private pages;
 * non-production origins are handled by robots.txt.
 */
export function useSeoPage(options: SeoPageOptions): void {
  const config = useRuntimeConfig()
  const route = useRoute()
  const { locale } = useI18n()
  const siteUrl = String(config.public.siteUrl)

  const title = () => toValue(options.title)
  const description = () => toValue(options.description)

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: () => toAbsoluteImage(siteUrl, toValue(options.image)),
    ogType: 'website',
    twitterCard: 'summary_large_image',
    robots: () => (toValue(options.noindex) ? 'noindex, follow' : undefined),
  })

  // Only `page` survives canonicalization, so it is the only query value passed on
  const canonical = computed(() => {
    const page = route.query.page
    return buildCanonicalUrl(
      siteUrl,
      route.path,
      { page: typeof page === 'string' ? page : undefined },
      locale.value === 'en' ? '/en' : '',
    )
  })

  useHead({
    link: [{ key: 'i18n-can', id: 'i18n-can', rel: 'canonical', href: () => canonical.value }],
  })
}
