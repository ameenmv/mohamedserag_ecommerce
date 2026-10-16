<script setup lang="ts">
import {
  ChevronDown,
  ExternalLink,
  Keyboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
} from '@lucide/vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdminPageTitle } from '@/composables/useAdminPageTitle'
import { useAdminTheme } from '@/composables/useAdminTheme'
import { useAdminUser } from '@/composables/useAdminUser'

const emit = defineEmits<{
  openMobileNav: []
  openCommandPalette: []
  openShortcutsHelp: []
  logout: []
}>()

const pageTitle = useAdminPageTitle()
const { isDark, toggleTheme } = useAdminTheme()
const adminUser = useAdminUser()

async function handleLogout(): Promise<void> {
  await adminUser.logout()
  emit('logout')
}
</script>

<template>
  <header class="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/90 px-4 py-3.5 backdrop-blur-md sm:px-8 sm:py-4">
    <!-- Mobile sidebar trigger -->
    <button
      type="button"
      aria-label="افتح القائمة"
      class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden motion-reduce:transition-none"
      @click="emit('openMobileNav')"
    >
      <Menu class="size-5" aria-hidden="true" />
    </button>

    <!-- Page title slot -->
    <div class="min-w-0 flex-1">
      <div class="text-xs text-muted-foreground">
        لوحة التحكم · معرض محمد سراج
      </div>
      <h1 class="font-display truncate text-2xl leading-tight text-primary sm:text-3xl">
        <slot name="title">
          {{ pageTitle }}
        </slot>
      </h1>
    </div>

    <!-- Command palette trigger -->
    <button
      type="button"
      aria-haspopup="dialog"
      class="order-5 flex min-h-11 w-full items-center gap-2.5 rounded-full border border-border bg-card px-4 text-start text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:order-none md:w-72 lg:w-80 motion-reduce:transition-none"
      @click="emit('openCommandPalette')"
    >
      <Search class="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span class="flex-1 truncate">ابحث عن صفحة أو أمر…</span>
      <kbd class="num hidden rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground sm:inline-block">
        Ctrl K
      </kbd>
    </button>

    <!-- Actions: Shortcuts help, Theme toggle, Open storefront, Admin user dropdown -->
    <div class="flex items-center gap-2">
      <!-- Shortcuts help button -->
      <button
        type="button"
        aria-label="اختصارات لوحة المفاتيح"
        title="اختصارات لوحة المفاتيح (?)"
        class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        @click="emit('openShortcutsHelp')"
      >
        <Keyboard class="size-5" aria-hidden="true" />
      </button>

      <!-- Theme toggle -->
      <button
        type="button"
        :aria-label="isDark ? 'الوضع الفاتح' : 'الوضع الليلي'"
        class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        @click="toggleTheme()"
      >
        <Sun v-if="isDark" class="size-5 text-serag-gold-hi" aria-hidden="true" />
        <Moon v-else class="size-5" aria-hidden="true" />
      </button>

      <!-- Open storefront in a new tab -->
      <NuxtLink
        to="/"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-bold text-primary transition-colors hover:border-accent hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
      >
        <span class="hidden sm:inline">افتح الموقع</span>
        <ExternalLink class="size-4 shrink-0" aria-hidden="true" />
      </NuxtLink>

      <!-- User menu DropdownMenu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            aria-label="قائمة حساب المدير"
            class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card ps-1.5 pe-3 text-start transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
          >
            <span
              class="font-display inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary pb-0.5 text-lg text-serag-gold-hi"
              aria-hidden="true"
            >
              م
            </span>
            <span class="hidden text-sm font-bold text-foreground sm:inline">
              {{ adminUser.name }}
            </span>
            <ChevronDown class="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuLabel class="flex flex-col gap-0.5 text-start">
            <span class="font-bold">{{ adminUser.name }}</span>
            <span class="text-xs font-normal text-muted-foreground">صلاحية كاملة</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="flex min-h-10 cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
            @select="handleLogout"
          >
            <LogOut class="size-4" aria-hidden="true" />
            <span>تسجيل الخروج</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
