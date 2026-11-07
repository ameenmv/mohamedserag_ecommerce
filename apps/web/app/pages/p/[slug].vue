<script setup lang="ts">
import type { BreadcrumbItem, ProductDetail } from '@serag/shared'
import {
  buildBreadcrumbList,
  buildProductSeoDescription,
  buildProductSeoTitle,
} from '@serag/shared'
import { buildProductJsonLd } from '~/utils/product-jsonld'
import { useRevealOnScroll } from '~/composables/useRevealOnScroll'

const { t, locale } = useI18n()
const route = useRoute()
const storeApi = useStoreApi()
const requestUrl = useRequestURL()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl)

const slug = computed(() => String(route.params.slug ?? ''))

// SSR fetch product detail by slug, throw 404 if not found
const { data: product, error } = await useAsyncData(
  () => `product:${slug.value}`,
  () => storeApi.product(slug.value),
)

if (error.value || !product.value) {
  throw createError({ statusCode: 404, fatal: true })
}

// SEO metadata
const seoLocale = computed<'ar' | 'en'>(() => (locale.value === 'en' ? 'en' : 'ar'))

function toSeoInput(current: ProductDetail) {
  return {
    name: current.name,
    brandName: current.brand.name,
    modelCode: current.modelCode,
    price: current.price,
    compareAtPrice: current.oldPrice,
    warranty: current.warranty,
    available: current.availability.state !== 'out',
  }
}

const pageTitle = computed(() => {
  const current = product.value
  if (!current) return ''
  return (
    current.seoTitle?.trim() ||
    buildProductSeoTitle(toSeoInput(current), seoLocale.value)
  )
})
const pageDescription = computed(() => {
  const current = product.value
  if (!current) return ''
  return (
    current.seoDescription?.trim() ||
    buildProductSeoDescription(toSeoInput(current), seoLocale.value)
  )
})
const ogImage = computed(
  () => product.value?.images[0]?.url || product.value?.image?.url || undefined,
)

useSeoPage({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  image: () => ogImage.value,
})

// Schema.org Product structured data
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () =>
        product.value
          ? JSON.stringify(buildProductJsonLd(product.value, requestUrl.href))
          : '',
    },
  ],
})

useJsonLd('ld-breadcrumb', () => {
  const current = product.value
  if (!current) return null
  const prefix = locale.value === 'en' ? '/en' : ''
  const items: BreadcrumbItem[] = [
    { name: t('store.listing.breadcrumb.home'), path: prefix || '/' },
  ]
  if (current.category.parent) {
    items.push({ name: current.category.parent.name, path: `${prefix}/c/${current.category.parent.slug}` })
  }
  items.push({ name: current.category.name, path: `${prefix}/c/${current.category.slug}` })
  items.push({ name: current.name, path: `${prefix}/p/${current.slug}` })
  return buildBreadcrumbList(items, siteUrl)
})

// Breadcrumbs: Home (automatic) › parent category › category › product
const breadcrumbItems = computed(() => {
  if (!product.value) return []
  const items: { label: string; to?: string }[] = []
  if (product.value.category.parent) {
    items.push({
      label: product.value.category.parent.name,
      to: `/c/${product.value.category.parent.slug}`,
    })
  }
  items.push({
    label: product.value.category.name,
    to: `/c/${product.value.category.slug}`,
  })
  items.push({
    label: product.value.name,
  })
  return items
})

onMounted(() => {
  if (product.value) {
    useAnalytics().track('product_view', { slug: product.value.slug, price: product.value.price })
  }
})

const summaryRef = ref<{ addToCartButton: HTMLElement | null } | null>(null)

// In-page section nav items (specs, warranty, delivery, reviews)
const sectionNavItems = computed(() => {
  if (!product.value) return []
  const items: { id: string; labelKey: string }[] = []
  if (product.value.specs && product.value.specs.length > 0) {
    items.push({ id: 'specs-section', labelKey: 'store.productPage.sectionNav.specs' })
  }
  if (
    product.value.warranty?.trim() ||
    product.value.warrantyActivation?.trim() ||
    product.value.origin?.trim()
  ) {
    items.push({ id: 'warranty-section', labelKey: 'store.productPage.sectionNav.warranty' })
  }
  items.push({ id: 'delivery-section', labelKey: 'store.productPage.sectionNav.delivery' })
  items.push({ id: 'reviews-section', labelKey: 'store.productPage.sectionNav.reviews' })
  return items
})

// Related products rise in as they scroll into view
const relatedRef = ref<HTMLElement | null>(null)
useRevealOnScroll(relatedRef, ':scope > article', () => product.value?.related)
</script>

<template>
  <main
    v-if="product"
    class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 pb-32 md:pb-28 lg:pb-16"
  >
    <!-- Breadcrumb -->
    <StoreListingBreadcrumb :items="breadcrumbItems" />

    <!-- Gallery and details on the start side; the buy box stays in view beside both on lg -->
    <div class="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-8">
      <div class="lg:col-span-7 lg:row-start-1">
        <StoreProductPageGallery
          :images="product.images"
          :product-name="product.name"
          :category-slug="product.category.slug"
        />
      </div>

      <div class="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-28 lg:self-start">
        <StoreProductPageSummary
          ref="summaryRef"
          :product="product"
          @flash-ended="refreshNuxtData(`product:${slug}`)"
        />
      </div>

      <!-- Product Details: Specs, Set Contents, Warranty, Delivery -->
      <div class="scroll-reveal flex flex-col gap-6 lg:col-span-7 lg:row-start-2">
        <StoreProductPageSectionNav
          v-if="sectionNavItems.length > 0"
          :items="sectionNavItems"
          class="hidden lg:block sticky top-20 z-20"
        />
        <LazyStoreProductPageSpecs id="specs-section" hydrate-never :specs="product.specs" />
        <LazyStoreProductPageSetContents hydrate-never :set-contents="product.setContents" />
        <LazyStoreProductPageWarranty
          id="warranty-section"
          hydrate-never
          :warranty="product.warranty"
          :warranty-activation="product.warrantyActivation"
          :origin="product.origin"
        />
        <LazyStoreProductPageDelivery id="delivery-section" hydrate-never />
      </div>
    </div>

    <!-- Product Reviews -->
    <StoreProductPageReviews id="reviews-section" :product="product" class="scroll-reveal" />

    <!-- Related Products -->
    <section
      v-if="product.related && product.related.length > 0"
      class="scroll-reveal mt-14 border-t border-border/80 pt-8 sm:mt-16 sm:pt-10 lg:mt-20"
      :aria-label="t('store.productPage.related.title')"
    >
      <div class="mb-6 flex items-center justify-between">
        <h2 class="font-display text-2xl text-foreground sm:text-3xl lg:text-4xl">
          <CommonMadText :text="t('store.productPage.related.title')" size="lg" />
        </h2>
      </div>

      <div
        ref="relatedRef"
        class="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 sm:overflow-visible sm:pb-0"
      >
        <StoreProductCard
          v-for="rel in product.related"
          :key="rel.id"
          :product="rel"
          class="w-[260px] shrink-0 snap-start sm:w-auto"
        />
      </div>
    </section>

    <!-- Mobile Sticky Buy Bar (shows after main buy button scrolls out of view) -->
    <StoreProductPageStickyBar
      :product="product"
      :target-ref="summaryRef?.addToCartButton"
    />
  </main>
</template>
