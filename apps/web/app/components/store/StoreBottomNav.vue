<script setup lang="ts">
import { Home, LayoutGrid, ShoppingCart, Sparkles, User } from '@lucide/vue'
import type { Component } from 'vue'
import { useHeaderBadges } from '@/composables/useHeaderBadges'

const route = useRoute()
const { cart } = useHeaderBadges()

const items: { label: string; to: string; icon: Component; showCartBadge?: boolean }[] = [
  { label: 'الرئيسية', to: '/', icon: Home },
  { label: 'الأقسام', to: '/shop', icon: LayoutGrid },
  { label: 'العروسة', to: '/bridal', icon: Sparkles },
  { label: 'السلة', to: '/cart', icon: ShoppingCart, showCartBadge: true },
  { label: 'حسابي', to: '/wishlist', icon: User },
]

function isActive(to: string): boolean {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav
    aria-label="تنقل سريع للموبايل"
    class="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-serag-gold/30 bg-serag-night/95 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-sidebar-foreground shadow-lg backdrop-blur-lg md:hidden"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      :class="[
        'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none',
        isActive(item.to)
          ? 'font-bold text-serag-gold-hi'
          : 'text-sidebar-foreground hover:text-serag-ivory',
      ]"
    >
      <div class="relative flex items-center justify-center">
        <component :is="item.icon" class="size-5" aria-hidden="true" />
        <span
          v-if="item.showCartBadge"
          class="num absolute -top-1.5 -start-2.5 inline-flex min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-accent-foreground"
        >
          {{ cart }}
        </span>
      </div>
      <span>{{ item.label }}</span>
      <span
        v-if="isActive(item.to)"
        class="mt-0.5 h-0.5 w-4 rounded-full bg-serag-gold-hi"
        aria-hidden="true"
      />
    </NuxtLink>
  </nav>
</template>
