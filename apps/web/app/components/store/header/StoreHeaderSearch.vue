<script setup lang="ts">
import { Search } from '@lucide/vue'

const open = defineModel<boolean>('open', { default: false })
const searchQuery = ref('')
const localePath = useLocalePath()
const { t } = useI18n()

function handleSearch(): void {
  open.value = false
  navigateTo({
    path: localePath('/shop'),
    query: searchQuery.value.trim() ? { q: searchQuery.value.trim() } : undefined,
  })
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <button
        type="button"
        :aria-label="t('store.header.searchProduct')"
        class="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3.5 motion-reduce:transition-none"
      >
        <Search class="size-5 text-primary" aria-hidden="true" />
        <span class="hidden sm:inline">{{ t('store.header.searchProductEllipsis') }}</span>
      </button>
    </SheetTrigger>
    <SheetContent side="top" class="mx-auto max-w-3xl rounded-b-3xl bg-background p-6">
      <SheetHeader class="text-start">
        <SheetTitle class="font-display text-2xl text-primary">
          {{ t('store.header.searchTitle') }}
        </SheetTitle>
        <SheetDescription>
          {{ t('store.header.searchDescription') }}
        </SheetDescription>
      </SheetHeader>
      <form
        class="mt-2 flex items-center gap-2"
        @submit.prevent="handleSearch"
      >
        <label for="store-header-search-input" class="sr-only">{{ t('store.header.searchProduct') }}</label>
        <Input
          id="store-header-search-input"
          v-model="searchQuery"
          type="search"
          :placeholder="t('store.header.searchPlaceholder')"
          class="min-h-12 flex-1 rounded-full px-5 text-base"
        />
        <button
          type="submit"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        >
          <Search class="size-4" aria-hidden="true" />
          <span>{{ t('common.search') }}</span>
        </button>
      </form>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{{ t('store.header.quickCategories') }}</span>
        <SheetClose as-child>
          <NuxtLink
            :to="localePath('/shop')"
            class="inline-flex min-h-9 items-center rounded-full bg-secondary px-3 font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {{ t('store.header.allProducts') }}
          </NuxtLink>
        </SheetClose>
        <SheetClose as-child>
          <NuxtLink
            :to="localePath('/bridal')"
            class="inline-flex min-h-9 items-center rounded-full bg-secondary px-3 font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {{ t('store.header.bridal') }}
          </NuxtLink>
        </SheetClose>
        <SheetClose as-child>
          <NuxtLink
            :to="localePath('/offers')"
            class="inline-flex min-h-9 items-center rounded-full bg-secondary px-3 font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {{ t('store.header.offers') }}
          </NuxtLink>
        </SheetClose>
      </div>
    </SheetContent>
  </Sheet>
</template>
