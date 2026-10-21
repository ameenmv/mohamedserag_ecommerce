<script setup lang="ts">
import type { BreadcrumbItem } from '@serag/shared'
import { buildBreadcrumbList } from '@serag/shared'
import { buildGuideJsonLd } from '~/utils/guide-jsonld'

const { t, locale } = useI18n()
const requestUrl = useRequestURL()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl)

const { guide, title, seoTitle, seoDescription, ogImage, publishedLabel } = await useGuide()

useSeoPage({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  image: () => ogImage.value,
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () =>
        guide.value ? JSON.stringify(buildGuideJsonLd(guide.value, requestUrl.href, t('brand.storeName'))) : '',
    },
  ],
})

useJsonLd('ld-breadcrumb', () => {
  const current = guide.value
  if (!current) return null
  const prefix = locale.value === 'en' ? '/en' : ''
  const items: BreadcrumbItem[] = [
    { name: t('store.listing.breadcrumb.home'), path: prefix || '/' },
    { name: t('store.guides.heading'), path: `${prefix}/guides` },
    { name: title.value, path: `${prefix}/guides/${current.slug}` },
  ]
  return buildBreadcrumbList(items, siteUrl)
})

const breadcrumbItems = computed(() => [{ label: t('store.guides.heading'), to: '/guides' }, { label: title.value }])
</script>

<template>
  <main class="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <StoreListingBreadcrumb :items="breadcrumbItems" />

    <article v-if="guide" class="mt-4">
      <h1 class="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
        {{ title }}
      </h1>

      <div class="mt-3 flex flex-wrap items-center gap-3">
        <span
          v-for="category in guide.categories"
          :key="category.slug"
          class="rounded-full bg-serag-green/10 px-3.5 py-1 text-xs font-bold text-serag-green"
        >
          {{ category.name }}
        </span>
        <span v-if="publishedLabel" class="num text-xs text-muted-foreground">
          {{ t('store.guides.publishedAt', { date: publishedLabel }) }}
        </span>
      </div>

      <StoreContentProse class="mt-6" :html="guide.body" />

      <section
        v-if="guide.products.length > 0"
        class="mt-12 border-t border-border/80 pt-8 sm:pt-10"
        :aria-label="t('store.guides.relatedProducts')"
      >
        <h2 class="mb-6 font-display text-2xl text-foreground sm:text-3xl">
          {{ t('store.guides.relatedProducts') }}
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <StoreProductCard
            v-for="product in guide.products"
            :key="product.id"
            :product="product"
          />
        </div>
      </section>
    </article>
  </main>
</template>
