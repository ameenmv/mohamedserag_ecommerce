<script setup lang="ts">
import type { Component } from 'vue'
import type { AdminNavGroup, AdminNavShortcut } from '~/utils/shortcuts'
import { LayoutDashboard } from '@lucide/vue'

defineProps<{
  group: AdminNavGroup
  items: readonly AdminNavShortcut[]
  iconByKey: Record<string, Component>
  isActive: (to: string) => boolean
  badges?: Record<string, number>
}>()

const emit = defineEmits<{
  navigate: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="px-3.5 pt-2 pb-1 text-xs font-semibold text-sidebar-foreground/70">
      {{ t(`admin.nav.groups.${group}`) }}
    </div>
    <AdminSidebarNavItem
      v-for="item in items"
      :key="item.to"
      :item="item"
      :is-active="isActive(item.to)"
      :icon="iconByKey[item.key] ?? LayoutDashboard"
      :badge="badges?.[item.key]"
      @navigate="emit('navigate')"
    />
  </div>
</template>
