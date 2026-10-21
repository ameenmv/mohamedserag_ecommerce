<script setup lang="ts">
import { BookOpen } from '@lucide/vue'

const { t } = useI18n()

useSeoPage({
  title: () => t('store.guides.seoTitle'),
  description: () => t('store.guides.subtitle'),
})

const { items, page, pageSize, total, pending, loadError, isEmpty, paginationFilters, refresh } =
  await useGuidesList()
</script>

<template>
  <main class="w-full min-w-0">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb :items="[{ label: t('store.guides.heading') }]" />
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <!-- Page Heading & Intro -->
      <div class="mb-6 flex flex-col gap-1.5 sm:mb-8">
        <h1 class="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
          {{ t('store.guides.heading') }}
        </h1>
        <p class="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {{ t('store.guides.subtitle') }}
        </p>
      </div>

      <!-- Loading -->
      <div
        v-if="pending"
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="h-80 animate-pulse rounded-[var(--radius-card)] border border-border bg-muted/40"
        />
      </div>

      <!-- Error -->
      <div
        v-else-if="loadError"
        class="flex flex-col items-center justify-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-16 text-center"
      >
        <p class="text-sm font-semibold text-destructive">{{ t('store.guides.loadError') }}</p>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground transition-colors hover:border-serag-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="refresh()"
        >
          {{ t('common.retry') }}
        </button>
      </div>

      <!-- Empty -->
      <div
        v-else-if="isEmpty"
        class="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/80 bg-card/60 px-4 py-16 text-center sm:py-20"
      >
        <div
          class="flex size-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <BookOpen class="size-10" />
        </div>
        <div class="max-w-md space-y-2">
          <h2 class="text-xl font-bold text-foreground sm:text-2xl">
            {{ t('store.guides.emptyTitle') }}
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ t('store.guides.emptyDescription') }}
          </p>
        </div>
      </div>

      <!-- Grid & Pagination -->
      <template v-else>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StoreGuidesCard
            v-for="guide in items"
            :key="guide.slug"
            :guide="guide"
            :heading-level="2"
          />
        </div>

        <StoreListingPagination
          v-if="total > 0"
          :page="page"
          :page-size="pageSize"
          :total="total"
          :filters="paginationFilters"
        />
      </template>
    </div>
  </main>
</template>
