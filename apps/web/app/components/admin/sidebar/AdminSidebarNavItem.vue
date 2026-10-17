<script setup lang="ts">
import type { Component } from 'vue'
import type { AdminNavShortcut } from '~/utils/shortcuts'

defineProps<{
  item: AdminNavShortcut
  isActive: boolean
  icon: Component
}>()

const emit = defineEmits<{
  navigate: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath(item.to)"
    :aria-current="isActive ? 'page' : undefined"
    :class="[
      'flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none',
      isActive
        ? 'bg-sidebar-primary font-bold text-sidebar-primary-foreground'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    ]"
    @click="emit('navigate')"
  >
    <component
      :is="icon"
      class="size-5 shrink-0"
      aria-hidden="true"
    />
    <span class="flex-1">{{ t(item.labelKey) }}</span>
    <kbd
      :class="[
        'num rounded px-1.5 py-0.5 text-[11px] font-semibold',
        isActive
          ? 'bg-sidebar-primary-foreground/15 text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/60',
      ]"
    >
      {{ item.hint }}
    </kbd>
  </NuxtLink>
</template>
