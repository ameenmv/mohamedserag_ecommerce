<script setup lang="ts">
import { ArrowRight, Zap } from '@lucide/vue'
import type { HomeContent, ProductCard } from '@serag/shared'

defineProps<{
  content: HomeContent['flash']
  products: ProductCard[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const headingId = useId()
</script>

<template>
  <section
    class="bg-serag-cream"
    :aria-labelledby="headingId"
  >
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div class="mb-10 flex flex-wrap items-center justify-between gap-5">
        <div class="flex items-center gap-4">
          <span
            class="flex size-14 flex-none items-center justify-center rounded-2xl bg-serag-hot text-white"
            aria-hidden="true"
          >
            <Zap class="size-7 fill-current" />
          </span>
          <div>
            <h2
              :id="headingId"
              class="font-display text-3xl leading-none text-serag-ink sm:text-4xl"
            >
              {{ content.title }}
            </h2>
            <p class="mt-1.5 text-sm text-muted-foreground">{{ content.subtitle }}</p>
          </div>
        </div>

        <NuxtLink
          :to="localePath('/offers')"
          class="inline-flex min-h-11 items-center gap-2.5 rounded-full bg-serag-hot px-6 font-bold text-white transition-colors hover:bg-serag-hot/90 focus-visible:ring-2 focus-visible:ring-serag-hot focus-visible:outline-none"
        >
          {{ t('store.home.allOffers') }}
          <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>

      <!-- Horizontal scroll row on mobile, grid on desktop -->
      <div
        class="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0"
      >
        <div
          v-for="product in products"
          :key="product.id"
          class="w-64 flex-none snap-start sm:w-72 lg:w-auto"
        >
          <StoreProductCard :product="product" />
        </div>
      </div>
    </div>
  </section>
</template>
