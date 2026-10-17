<script setup lang="ts">
import { buildProductJsonLd } from '~/utils/product-jsonld'

const { t } = useI18n()
const route = useRoute()
const storeApi = useStoreApi()
const requestUrl = useRequestURL()

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
const pageTitle = computed(
  () => product.value?.seoTitle || product.value?.name || '',
)
const pageDescription = computed(
  () =>
    product.value?.seoDescription ||
    (product.value
      ? t('store.productPage.meta.fallbackDescription', {
          name: product.value.name,
          brand: product.value.brand.name,
        })
      : ''),
)
const ogImage = computed(
  () => product.value?.images[0]?.url || product.value?.image?.url || undefined,
)

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  ogTitle: () => pageTitle.value,
  ogDescription: () => pageDescription.value,
  ogImage: () => ogImage.value,
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
</script>

<template>
  <main
    v-if="product"
    class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 pb-32 md:pb-28 lg:pb-16"
  >
    <!-- Breadcrumb -->
    <StoreListingBreadcrumb :items="breadcrumbItems" />

    <!-- Top section: Gallery (start side) + Buy box (end side, sticky top on lg) -->
    <div class="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-start">
      <div class="lg:col-span-7">
        <StoreProductPageGallery
          :images="product.images"
          :product-name="product.name"
        />
      </div>

      <div class="lg:col-span-5 lg:sticky lg:top-24">
        <StoreProductPageSummary
          ref="summaryRef"
          :product="product"
        />
      </div>
    </div>

    <!-- Product Details: Specs, Set Contents, Warranty, Delivery -->
    <div class="mt-10 flex max-w-4xl flex-col gap-6 lg:mt-12">
      <StoreProductPageSpecs :specs="product.specs" />
      <StoreProductPageSetContents :set-contents="product.setContents" />
      <StoreProductPageWarranty
        :warranty="product.warranty"
        :warranty-activation="product.warrantyActivation"
        :origin="product.origin"
      />
      <StoreProductPageDelivery />
    </div>

    <!-- Related Products -->
    <section
      v-if="product.related && product.related.length > 0"
      class="mt-14 border-t border-border/80 pt-8 sm:mt-16 sm:pt-10 lg:mt-20"
      :aria-label="t('store.productPage.related.title')"
    >
      <div class="mb-6 flex items-center justify-between">
        <h2 class="font-display text-2xl text-foreground sm:text-3xl lg:text-4xl">
          {{ t('store.productPage.related.title') }}
        </h2>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        <StoreProductCard
          v-for="rel in product.related"
          :key="rel.id"
          :product="rel"
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
