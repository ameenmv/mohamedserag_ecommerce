<script setup lang="ts">
import {
  ExternalLink,
  Keyboard,
  Menu,
  Moon,
  Search,
  Sun,
} from '@lucide/vue'

const emit = defineEmits<{
  openMobileNav: []
  openCommandPalette: []
  openShortcutsHelp: []
  logout: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const pageTitle = useAdminPageTitle()
const { isDark, toggleTheme } = useAdminTheme()
const adminUser = useAdminUser()
const hydrated = useHydrated()

const showDark = computed(() => hydrated.value && isDark.value)

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
      :aria-label="t('common.openMenu')"
      class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden motion-reduce:transition-none"
      @click="emit('openMobileNav')"
    >
      <Menu class="size-5" aria-hidden="true" />
    </button>

    <!-- Page title slot -->
    <div class="min-w-0 flex-1">
      <div class="text-xs text-muted-foreground">
        {{ t('admin.topbar.portalSubtitle') }}
      </div>
      <h1 class="font-display truncate text-2xl leading-tight text-primary sm:text-3xl">
        <slot name="title">
          {{ t(pageTitle) }}
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
      <span class="flex-1 truncate">{{ t('admin.commandPalette.placeholder') }}</span>
      <kbd class="num hidden rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground sm:inline-block">
        Ctrl K
      </kbd>
    </button>

    <!-- Actions: Locale switcher, Shortcuts help, Theme toggle, Open storefront, Admin user dropdown.
         Below sm this row gets its own line (288px at 320px): the shortcuts help and the menu chevron
         are hidden there, and flex-wrap keeps any longer label from widening the page. -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Locale Switcher -->
      <CommonLocaleSwitcher variant="pill" />

      <!-- Shortcuts help button -->
      <button
        type="button"
        :aria-label="t('admin.shortcuts.title')"
        :title="t('admin.topbar.shortcutsTitle')"
        class="hidden size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:inline-flex motion-reduce:transition-none"
        @click="emit('openShortcutsHelp')"
      >
        <Keyboard class="size-5" aria-hidden="true" />
      </button>

      <!-- Theme toggle -->
      <button
        type="button"
        :aria-label="showDark ? t('admin.commandPalette.lightMode') : t('admin.commandPalette.darkMode')"
        class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        @click="toggleTheme()"
      >
        <Sun v-if="showDark" class="size-5 text-serag-gold-hi" aria-hidden="true" />
        <Moon v-else class="size-5" aria-hidden="true" />
      </button>

      <!-- Open storefront in a new tab -->
      <NuxtLink
        :to="localePath('/')"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-bold text-primary transition-colors hover:border-accent hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
      >
        <span class="hidden sm:inline">{{ t('admin.nav.openStore') }}</span>
        <ExternalLink class="size-4 shrink-0" aria-hidden="true" />
      </NuxtLink>

      <!-- User menu DropdownMenu -->
      <AdminTopbarUserMenu
        :name="adminUser.name"
        @logout="handleLogout"
      />
    </div>
  </header>
</template>
