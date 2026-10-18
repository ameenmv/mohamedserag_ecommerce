<script setup lang="ts">
import { ShoppingCart } from '@lucide/vue'

defineProps<{
  count: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { open: openDrawer } = useCartDrawer()

const isMounted = ref(false)
if (import.meta.client) {
  onMounted(() => {
    isMounted.value = true
  })
}

function handleClick(event: MouseEvent): void {
  if (isMounted.value) {
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
      class="relative inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-3 font-bold text-accent-foreground transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4 motion-reduce:transition-none"
      @click="handleClick"
    >
    <ShoppingCart class="size-5" aria-hidden="true" />
    <span class="sr-only">{{ t('store.header.cartCount', { count }) }}</span>
    <span class="hidden text-sm sm:inline" aria-hidden="true">{{ t('store.header.cart') }}</span>
    <span
      v-if="count > 0"
      aria-hidden="true"
      class="num inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-serag-ink px-1.5 text-xs font-extrabold text-serag-gold-hi"
    >
      {{ count }}
    </span>
    </a>
  </NuxtLink>
</template>
