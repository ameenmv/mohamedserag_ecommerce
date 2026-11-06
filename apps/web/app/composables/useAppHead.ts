/**
 * Root head setup shared by `app.vue` and `error.vue` (the error page replaces `app.vue`,
 * so without this it would lose `lang`/`dir` and the store-name title template).
 */
export function useAppHead(): void {
  const head = useLocaleHead()
  const { t } = useI18n()

  useHead({
    htmlAttrs: {
      lang: () => head.value.htmlAttrs?.lang,
      dir: () => head.value.htmlAttrs?.dir,
    },
    titleTemplate: (titleChunk) => {
      const storeName = t('brand.storeName')
      const trimmed = titleChunk?.trim()
      if (!trimmed || trimmed === storeName) {
        return storeName
      }
      // Older manual titles already end with the store name; do not repeat it.
      if (trimmed.includes(storeName)) {
        return trimmed
      }
      return `${trimmed} · ${storeName}`
    },
    link: () => head.value.link || [],
    meta: () => head.value.meta || [],
  })
}
