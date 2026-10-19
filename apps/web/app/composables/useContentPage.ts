/**
 * Loads a published content page by its route slug (SSR) and exposes its title,
 * SEO fields (with a plain-text description fallback) and formatted update date.
 * Throws a fatal 404 when the page is unpublished or unknown.
 */
export async function useContentPage() {
  const route = useRoute()
  const storeApi = useStoreApi()
  const { locale } = useI18n()

  const slug = computed(() => String(route.params.slug ?? ''))

  const { data: page, error } = await useAsyncData(
    () => `page:${slug.value}`,
    () => storeApi.page(slug.value),
  )

  if (error.value || !page.value) {
    throw createError({ statusCode: 404, fatal: true })
  }

  const title = computed(() => page.value?.title ?? '')
  const seoTitle = computed(() => page.value?.seoTitle || page.value?.title || '')
  const seoDescription = computed(
    () => page.value?.seoDescription || plainTextExcerpt(page.value?.body ?? '', 160),
  )
  const updatedLabel = computed(() =>
    page.value ? formatDate(page.value.updatedAt, locale.value) : '',
  )

  return { page, slug, title, seoTitle, seoDescription, updatedLabel }
}
