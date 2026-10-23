<script setup lang="ts">
import { ShoppingCart } from '@lucide/vue'

const props = defineProps<{
  count: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { open: openDrawer } = useCartDrawer()
const hydrated = useHydrated()

const displayCount = computed(() => (hydrated.value ? props.count : 0))

function handleClick(event: MouseEvent): void {
  if (hydrated.value) {
    event.preventDefault()
    openDrawer()
  }
}
</script>

<template>
  <!-- `custom` gives a plain <a>: no-JS follows the href, hydrated clicks open the drawer instead
       (NuxtLink's own router navigation can't be cancelled from a sibling click handler). -->
  <NuxtLink v-slot="{ href }" :to="localePath('/cart')" custom>
    <a
      :href="href ?? undefined"
      class="relative inline-flex h-10 items-center gap-2.5 rounded-xl bg-accent px-2.5 sm:h-[46px] sm:rounded-[14px] text-[15px] font-bold text-accent-foreground transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-5 motion-reduce:transition-none"
      @click="handleClick"
    >
    <ShoppingCart class="size-5" aria-hidden="true" />
    <span class="sr-only">{{ t('store.header.cartCount', { count: displayCount }) }}</span>
    <span class="hidden sm:inline" aria-hidden="true">{{ t('store.header.cart') }}</span>
    <span
      v-if="hydrated && count > 0"
      aria-hidden="true"
      class="num inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-serag-ink px-1.5 text-xs font-extrabold text-serag-gold-hi"
    >
      {{ count }}
    </span>
    </a>
  </NuxtLink>
</template>
