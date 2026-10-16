<script setup lang="ts">
import type { Component } from 'vue'
import {
  BarChart3,
  ExternalLink,
  FilePenLine,
  LayoutDashboard,
  Moon,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Tag,
} from '@lucide/vue'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useAdminTheme } from '@/composables/useAdminTheme'
import { ADMIN_NAV_SHORTCUTS } from '@/utils/shortcuts'

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const localePath = useLocalePath()
const { isDark, toggleTheme } = useAdminTheme()

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

function handleNavigate(to: string): void {
  open.value = false
  navigateTo(localePath(to))
}

function handleToggleTheme(): void {
  toggleTheme()
  open.value = false
}

function handleOpenStorefront(): void {
  open.value = false
  if (import.meta.client) {
    window.open(localePath('/'), '_blank', 'noopener,noreferrer')
  }
}
</script>

<template>
  <CommandDialog
    v-model:open="open"
    :title="t('admin.commandPalette.title')"
    :description="t('admin.commandPalette.description')"
  >
    <CommandInput :placeholder="t('admin.commandPalette.placeholder')" />
    <CommandList>
      <CommandEmpty>{{ t('admin.commandPalette.noResults') }}</CommandEmpty>

      <CommandGroup :heading="t('admin.commandPalette.pages')">
        <CommandItem
          v-for="page in ADMIN_NAV_SHORTCUTS"
          :key="page.to"
          :value="`${t(page.labelKey)} ${t(`admin.nav.groups.${page.group}`)} ${page.hint}`"
          class="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2"
          @select="handleNavigate(page.to)"
        >
          <div class="flex items-center gap-2.5">
            <component
              :is="iconByKey[page.key] ?? LayoutDashboard"
              class="size-4 text-primary"
              aria-hidden="true"
            />
            <span class="font-semibold">{{ t(page.labelKey) }}</span>
            <span class="text-xs text-muted-foreground">({{ t(`admin.nav.groups.${page.group}`) }})</span>
          </div>
          <CommandShortcut class="ms-auto me-0 font-sans text-xs text-muted-foreground">
            {{ t('admin.shortcuts.gThen', { key: page.key.toUpperCase() }) }}
          </CommandShortcut>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup :heading="t('admin.commandPalette.commands')">
        <CommandItem
          :value="t('admin.commandPalette.toggleThemeSearch')"
          class="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2"
          @select="handleToggleTheme"
        >
          <div class="flex items-center gap-2.5">
            <Sun v-if="isDark" class="size-4 text-serag-gold-hi" aria-hidden="true" />
            <Moon v-else class="size-4 text-primary" aria-hidden="true" />
            <span class="font-semibold">{{ t('admin.commandPalette.toggleTheme') }}</span>
          </div>
          <span class="text-xs text-muted-foreground">
            {{ isDark ? t('admin.commandPalette.lightMode') : t('admin.commandPalette.darkMode') }}
          </span>
        </CommandItem>

        <CommandItem
          :value="t('admin.commandPalette.openStoreSearch')"
          class="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2"
          @select="handleOpenStorefront"
        >
          <div class="flex items-center gap-2.5">
            <ExternalLink class="size-4 text-primary" aria-hidden="true" />
            <span class="font-semibold">{{ t('admin.commandPalette.openStore') }}</span>
          </div>
          <span class="text-xs text-muted-foreground">{{ t('admin.commandPalette.inNewTab') }}</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
