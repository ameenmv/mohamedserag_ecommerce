<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    icon: Component
    title: string
    description: string
    ctaLabel: string
    ctaTo?: string
    headingTag?: 'h1' | 'h2'
  }>(),
  {
    ctaTo: '/shop',
    headingTag: 'h2',
  },
)

const { t } = useI18n()
const localePath = useLocalePath()
// Already in the payload (header and footer use it), so no extra request
const categories = await useNavCategories()
const shortcuts = computed(() => categories.value.slice(0, 6))
</script>

<template>
  <div
    class="flex flex-col items-center rounded-[28px] border border-border bg-card px-5 py-12 text-center sm:px-8 sm:py-16"
  >
    <div
      class="mb-5 flex size-20 items-center justify-center rounded-full bg-serag-cream text-serag-green ring-8 ring-serag-cream/50 dark:bg-muted/30 dark:ring-muted/15"
      aria-hidden="true"
    >
      <component :is="icon" class="size-9" stroke-width="1.6" />
    </div>
    <component :is="headingTag" class="font-display text-2xl text-foreground sm:text-3xl">
      {{ title }}
    </component>
    <p class="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
      {{ description }}
    </p>
    <NuxtLink
      :to="localePath(ctaTo)"
      class="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-serag-green px-7 text-sm font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-night focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-base"
    >
      {{ ctaLabel }}
    </NuxtLink>

    <template v-if="shortcuts.length">
      <p class="mt-8 text-xs font-bold text-muted-foreground">
        {{ t('store.empty.browseCategories') }}
      </p>
      <ul class="mt-3 flex max-w-xl flex-wrap justify-center gap-2">
        <li v-for="cat in shortcuts" :key="cat.id">
          <NuxtLink
            :to="localePath(`/c/${cat.slug}`)"
            class="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-xs font-bold text-foreground transition-colors hover:border-serag-gold hover:bg-serag-cream focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
          >
            <StoreCategoryIcon :slug="cat.slug" class="size-4 text-serag-green" stroke-width="2" aria-hidden="true" />
            {{ cat.name }}
          </NuxtLink>
        </li>
      </ul>
    </template>
  </div>
</template>
