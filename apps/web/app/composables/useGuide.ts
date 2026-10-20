/**
 * Loads a published buying guide by its route slug (SSR) and exposes its SEO
 * fields (with a summary / body excerpt fallback), cover, formatted publish
 * date and breadcrumb label.
 * Throws a fatal 404 when the guide is unpublished or unknown.
 */
export async function useGuide() {
  const route = useRoute()
  const storeApi = useStoreApi()
  const { locale } = useI18n()

  const slug = computed(() => String(route.params.slug ?? ''))

  const { data: guide, error } = await useAsyncData(
    () => `guide:${slug.value}`,
    () => storeApi.guide(slug.value),
  )

  if (error.value || !guide.value) {
    throw createError({ statusCode: 404, fatal: true })
  }

  const title = computed(() => guide.value?.title ?? '')
  const seoTitle = computed(() => guide.value?.seoTitle || guide.value?.title || '')
  const seoDescription = computed(
    () =>
      guide.value?.seoDescription ||
      guide.value?.summary ||
      plainTextExcerpt(guide.value?.body ?? '', 160),
  )
  const ogImage = computed(() => guide.value?.cover ?? undefined)
  const publishedLabel = computed(() =>
    guide.value?.publishedAt ? formatDate(guide.value.publishedAt, locale.value) : '',
  )

  return {
    guide,
    slug,
    title,
    seoTitle,
    seoDescription,
    ogImage,
    publishedLabel,
  }
}
