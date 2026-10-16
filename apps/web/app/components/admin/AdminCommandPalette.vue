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
  navigateTo(to)
}

function handleToggleTheme(): void {
  toggleTheme()
  open.value = false
}

function handleOpenStorefront(): void {
  open.value = false
  if (import.meta.client) {
    window.open('/', '_blank', 'noopener,noreferrer')
  }
}
</script>

<template>
  <CommandDialog
    v-model:open="open"
    title="البحث والأوامر"
    description="ابحث عن صفحة أو أمر في لوحة تحكم معرض محمد سراج"
  >
    <CommandInput placeholder="ابحث عن صفحة أو أمر…" />
    <CommandList>
      <CommandEmpty>مفيش نتايج مطابقة للبحث.</CommandEmpty>

      <CommandGroup heading="الصفحات">
        <CommandItem
          v-for="page in ADMIN_NAV_SHORTCUTS"
          :key="page.to"
          :value="`${page.label} ${page.group} ${page.paletteHint} ${page.hint}`"
          class="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2"
          @select="handleNavigate(page.to)"
        >
          <div class="flex items-center gap-2.5">
            <component
              :is="iconByKey[page.key] ?? LayoutDashboard"
              class="size-4 text-primary"
              aria-hidden="true"
            />
            <span class="font-semibold">{{ page.label }}</span>
            <span class="text-xs text-muted-foreground">({{ page.group }})</span>
          </div>
          <CommandShortcut class="ms-auto me-0 font-sans text-xs text-muted-foreground">
            {{ page.paletteHint }}
          </CommandShortcut>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup heading="الأوامر">
        <CommandItem
          value="تبديل الوضع الليلي الوضع الفاتح المظهر"
          class="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2"
          @select="handleToggleTheme"
        >
          <div class="flex items-center gap-2.5">
            <Sun v-if="isDark" class="size-4 text-serag-gold-hi" aria-hidden="true" />
            <Moon v-else class="size-4 text-primary" aria-hidden="true" />
            <span class="font-semibold">تبديل الوضع الليلي</span>
          </div>
          <span class="text-xs text-muted-foreground">
            {{ isDark ? 'الوضع الفاتح' : 'الوضع الليلي' }}
          </span>
        </CommandItem>

        <CommandItem
          value="افتح الموقع المتجر الرئيسي تاب جديد"
          class="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2"
          @select="handleOpenStorefront"
        >
          <div class="flex items-center gap-2.5">
            <ExternalLink class="size-4 text-primary" aria-hidden="true" />
            <span class="font-semibold">افتح الموقع</span>
          </div>
          <span class="text-xs text-muted-foreground">في تاب جديد</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
