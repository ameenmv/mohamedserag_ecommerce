<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

export interface BreadcrumbItem {
  label: string
  to?: string
}

const props = defineProps<{
  items: readonly BreadcrumbItem[] | BreadcrumbItem[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const allItems = computed<BreadcrumbItem[]>(() => [
  { label: t('store.listing.breadcrumb.home'), to: '/' },
  ...props.items,
])
</script>

<template>
  <nav :aria-label="t('store.listing.breadcrumb.label')">
    <ol class="mb-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:text-sm">
      <li
        v-for="(item, idx) in allItems"
        :key="idx"
        class="inline-flex items-center gap-1.5"
      >
        <span v-if="idx > 0" aria-hidden="true" class="flex items-center">
          <ChevronRight class="size-3.5 text-muted-foreground/60 rtl:-scale-x-100" aria-hidden="true" />
        </span>

        <!-- Non-leaf link -->
        <NuxtLink
          v-if="item.to && idx < allItems.length - 1"
          :to="localePath(item.to)"
          class="transition-colors hover:text-foreground"
        >
          {{ item.label }}
        </NuxtLink>

        <!-- Current leaf item -->
        <span
          v-else
          aria-current="page"
          class="font-bold text-foreground"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
