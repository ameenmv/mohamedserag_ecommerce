<script setup lang="ts">
import type { Component } from 'vue'
import type { AdminNavGroup, AdminNavShortcut } from '@/utils/shortcuts'
import {
  BarChart3,
  ExternalLink,
  FilePenLine,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
} from '@lucide/vue'
import { computed } from 'vue'
import { ADMIN_NAV_SHORTCUTS } from '@/utils/shortcuts'

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()

const iconByKey: Record<string, Component> = {
  h: LayoutDashboard,
  o: ShoppingBag,
  p: Package,
  b: Sparkles,
  m: Tag,
  r: Star,
  e: FilePenLine,
  t: BarChart3,
  s: Settings,
}

const groupsOrder: readonly AdminNavGroup[] = ['الرئيسية', 'المتجر', 'المحتوى', 'النظام']

const groupedNav = computed(() =>
  groupsOrder.map((group) => ({
    group,
    items: ADMIN_NAV_SHORTCUTS.filter((item) => item.group === group),
  })),
)

function isActive(item: AdminNavShortcut): boolean {
  if (item.to === '/admin') {
    return route.path === '/admin'
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}
</script>

<template>
  <div class="flex h-full flex-col justify-between gap-6 bg-sidebar px-4 py-6 text-sidebar-foreground">
    <div class="flex flex-col gap-5">
      <!-- Brand header -->
      <div class="flex items-center gap-3 px-2">
        <div
          class="font-display flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary pb-1 text-3xl leading-none text-sidebar-primary-foreground"
          aria-hidden="true"
        >
          س
        </div>
        <div class="leading-none">
          <div class="font-display text-2xl text-sidebar-accent-foreground">
            محمد سراج
          </div>
          <div class="num mt-1 text-[11px] font-semibold tracking-widest text-sidebar-primary">
            ADMIN · SINCE 1972
          </div>
        </div>
      </div>

      <!-- Grouped Navigation -->
      <nav aria-label="القائمة الرئيسية للوحة التحكم" class="flex flex-col gap-4">
        <div v-for="section in groupedNav" :key="section.group" class="flex flex-col gap-1">
          <div class="px-3.5 pt-2 pb-1 text-xs font-semibold text-sidebar-foreground/70">
            {{ section.group }}
          </div>
          <NuxtLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            :aria-current="isActive(item) ? 'page' : undefined"
            :class="[
              'flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none',
              isActive(item)
                ? 'bg-sidebar-primary font-bold text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            ]"
            @click="emit('navigate')"
          >
            <component
              :is="iconByKey[item.key] ?? LayoutDashboard"
              class="size-5 shrink-0"
              aria-hidden="true"
            />
            <span class="flex-1">{{ item.label }}</span>
            <kbd
              :class="[
                'num rounded px-1.5 py-0.5 text-[11px] font-semibold',
                isActive(item)
                  ? 'bg-sidebar-primary-foreground/15 text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/60',
              ]"
            >
              {{ item.hint }}
            </kbd>
          </NuxtLink>
        </div>
      </nav>
    </div>

    <!-- Store status footer card -->
    <div class="flex flex-col gap-2.5 rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-4">
      <div class="flex items-center gap-2 text-sm font-bold text-sidebar-accent-foreground">
        <span class="size-2.5 shrink-0 rounded-full bg-chart-5" aria-hidden="true" />
        <span>الموقع منشور وشغال</span>
      </div>
      <p class="text-xs leading-relaxed text-sidebar-foreground/80">
        تقدر تراجع شكل المتجر للعملاء في أي وقت من تاب جديد.
      </p>
      <NuxtLink
        to="/"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 text-sm font-bold text-sidebar-primary-foreground transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
      >
        <span>افتح الموقع</span>
        <ExternalLink class="size-4" aria-hidden="true" />
      </NuxtLink>
    </div>
  </div>
</template>
