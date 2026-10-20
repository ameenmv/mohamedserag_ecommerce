<script setup lang="ts">
import { ArrowLeftRight, Plus, X } from '@lucide/vue'
import type { ProductDetail } from '@serag/shared'
import { toProductCard } from '~/utils/product-card-mapper'

defineProps<{
  products: readonly ProductDetail[]
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div>
    <!-- 0-item Empty State -->
    <div
      v-if="products.length === 0"
      class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 px-6 py-16 text-center"
    >
      <div
        class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"
        aria-hidden="true"
      >
        <ArrowLeftRight class="size-8" />
      </div>
      <h1 class="font-display text-2xl sm:text-3xl text-foreground">
        {{ t('store.compare.emptyTitle') }}
      </h1>
      <p class="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
        {{ t('store.compare.emptyDescription') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          :to="localePath('/shop')"
          class="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {{ t('store.compare.browseProducts') }}
        </NuxtLink>
      </div>
    </div>

    <!-- 1-item State: hint to add one more product + product card -->
    <div v-else-if="products.length === 1" class="space-y-6">
      <div>
        <h1 class="font-display text-3xl sm:text-4xl text-foreground">
          {{ t('store.compare.title') }}
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          {{ t('store.compare.subtitle') }}
        </p>
      </div>

      <!-- Single item hint banner -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-serag-gold/50 bg-serag-gold/10 p-4 text-serag-ink dark:text-serag-gold-hi"
      >
        <div class="flex items-center gap-2.5">
          <Plus class="size-5 shrink-0 text-serag-gold" aria-hidden="true" />
          <p class="text-xs sm:text-sm font-bold">
            {{ t('store.compare.singleItemHint') }}
          </p>
        </div>
        <NuxtLink
          :to="localePath('/shop')"
          class="inline-flex min-h-10 items-center justify-center rounded-xl bg-serag-night px-4 text-xs font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night"
        >
          {{ t('store.compare.browseProducts') }}
        </NuxtLink>
      </div>

      <!-- Single Product Card + Add Placeholder -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
        <div
          v-for="p in products"
          :key="p.id"
          class="flex flex-col justify-between rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs"
        >
          <div class="flex flex-col gap-3">
            <div
              class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-serag-ivory/60 p-2 dark:bg-muted/30"
            >
              <NuxtImg
                v-if="p.image?.url"
                :src="p.image.url"
                :alt="p.image.alt || p.name"
                width="200"
                height="200"
                class="size-full object-contain"
              />
              <button
                type="button"
                class="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                :aria-label="t('store.compare.removeAria', { name: p.name })"
                @click="emit('remove', p.id)"
              >
                <X class="size-4" aria-hidden="true" />
              </button>
            </div>

            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-serag-gold sm:text-[11px]">
                {{ p.brand.name }}
              </span>
              <h2 class="mt-0.5 line-clamp-2 text-xs font-bold leading-snug sm:text-sm">
                <NuxtLink
                  :to="localePath(`/p/${p.slug}`)"
                  class="text-foreground transition-colors hover:text-serag-night dark:hover:text-serag-gold-hi"
                >
                  {{ p.name }}
                </NuxtLink>
              </h2>
            </div>

            <StoreProductPrice
              :price="p.price"
              :old-price="p.oldPrice"
              :discount-percent="p.discountPercent"
            />
          </div>

          <div class="mt-3">
            <StoreProductAddToCart :product="toProductCard(p)" />
          </div>
        </div>

        <!-- Placeholder card encouraging a 2nd product -->
        <NuxtLink
          :to="localePath('/shop')"
          class="flex flex-col items-center justify-center min-h-[260px] rounded-2xl border-2 border-dashed border-border/80 p-6 text-center transition-colors hover:border-serag-gold hover:bg-secondary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div
            class="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground"
            aria-hidden="true"
          >
            <Plus class="size-6 text-serag-gold" />
          </div>
          <span class="font-bold text-sm text-foreground">
            {{ t('store.compare.browseProducts') }}
          </span>
          <span class="mt-1 text-xs text-muted-foreground">
            {{ t('store.compare.singleItemHint') }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
