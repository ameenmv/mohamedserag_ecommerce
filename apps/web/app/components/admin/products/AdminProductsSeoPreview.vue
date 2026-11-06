<script setup lang="ts">
import { useProductFormContext } from '~/composables/useProductFormContext'

const {
  form,
  autoSlug,
  autoSeoTitleAr,
  autoSeoDescriptionAr,
  autoSeoTitleEn,
  autoSeoDescriptionEn,
} = useProductFormContext()
const { t, locale } = useI18n()
const config = useRuntimeConfig()

const isEnglish = computed(() => locale.value === 'en')

const displayTitle = computed(() => {
  if (isEnglish.value) {
    return (
      form.translations.en.seoTitle.trim() ||
      form.seoTitle.trim() ||
      autoSeoTitleEn.value
    )
  }
  return form.seoTitle.trim() || autoSeoTitleAr.value
})

const displayDescription = computed(() => {
  if (isEnglish.value) {
    return (
      form.translations.en.seoDescription.trim() ||
      form.seoDescription.trim() ||
      autoSeoDescriptionEn.value
    )
  }
  return form.seoDescription.trim() || autoSeoDescriptionAr.value
})

const displaySlug = computed(() => form.slug.trim() || autoSlug.value)

const host = computed(() => {
  const siteUrl = String(config.public.siteUrl)
  try {
    return new URL(siteUrl).host
  } catch {
    return siteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
})
</script>

<template>
  <div
    class="rounded-xl border border-border bg-background p-4"
    :dir="isEnglish ? 'ltr' : 'rtl'"
    :aria-label="t('admin.products.editor.seo.previewLabel')"
  >
    <p class="line-clamp-1 text-base font-medium text-[#1a0dab] dark:text-[#8ab4f8]">
      {{ displayTitle }} · {{ t('brand.storeName') }}
    </p>
    <p class="mt-1 flex min-w-0 items-center text-xs text-muted-foreground" dir="ltr">
      <span class="shrink-0">{{ host }}/p/</span>
      <span class="truncate">{{ displaySlug }}</span>
    </p>
    <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
      {{ displayDescription }}
    </p>
  </div>
</template>
