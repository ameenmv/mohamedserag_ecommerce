<script setup lang="ts">
import { Percent } from '@lucide/vue'

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('store.offers.seoTitle'),
  description: () => t('store.offers.subtitle'),
})

const { flash, discounted, isEmpty, refresh } = await useOffers()
</script>

<template>
  <main class="w-full min-w-0">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb :items="[{ label: t('store.offers.title') }]" />
      </div>
    </div>

    <!-- Page Content Composition -->
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <!-- Page Heading & Intro -->
      <div class="mb-6 flex flex-col gap-1.5 sm:mb-8">
        <h1 class="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
          {{ t('store.offers.heading') }}
        </h1>
        <p class="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {{ t('store.offers.subtitle') }}
        </p>
      </div>

      <!-- Empty State -->
      <div
        v-if="isEmpty"
        class="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/80 bg-card/60 px-4 py-16 text-center sm:py-20"
      >
        <div
          class="flex size-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <Percent class="size-10" />
        </div>
        <div class="max-w-md space-y-2">
          <h2 class="text-xl font-bold text-foreground sm:text-2xl">
            {{ t('store.offers.emptyTitle') }}
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ t('store.offers.emptyDescription') }}
          </p>
        </div>
        <NuxtLink
          :to="localePath('/shop')"
          class="inline-flex min-h-11 items-center justify-center rounded-xl bg-serag-night px-6 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night"
        >
          {{ t('store.offers.browseShop') }}
        </NuxtLink>
      </div>

      <!-- Offers Content -->
      <div v-else class="space-y-8 sm:space-y-10 lg:space-y-12">
        <!-- Running Flash Sales -->
        <StoreOffersFlashSection
          v-for="sale in flash"
          :key="sale.id"
          :group="sale"
          @ended="refresh"
        />

        <!-- Standard Discounted Products -->
        <StoreOffersDiscountedSection
          v-if="discounted.length > 0"
          :products="discounted"
        />
      </div>
    </div>
  </main>
</template>
