<script setup lang="ts">
const { t, localeProperties } = useI18n()

const mobileNavOpen = ref(false)
const commandPaletteOpen = ref(false)
const shortcutsDialogOpen = ref(false)

const { pageTitle } = useAdminRouteTitleSync(() => {
  mobileNavOpen.value = false
})

useAdminShortcuts({
  commandPaletteOpen,
  shortcutsDialogOpen,
  mobileNavOpen,
})

const side = computed<'right' | 'left'>(() => (localeProperties.value.dir === 'ltr' ? 'left' : 'right'))
</script>

<template>
  <div class="flex min-h-dvh bg-background text-foreground">
    <!-- Accessible skip link -->
    <a
      href="#admin-main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:font-bold focus:text-accent-foreground focus:shadow-lg"
    >
      {{ t('common.skipToContent') }}
    </a>

    <!-- Desktop Sidebar (lg+) -->
    <aside
      :aria-label="t('common.mainNav')"
      class="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-e lg:border-sidebar-border"
    >
      <AdminSidebar />
    </aside>

    <!-- Mobile Off-Canvas Sidebar Sheet (below lg) -->
    <Sheet v-model:open="mobileNavOpen">
      <SheetContent
        :side="side"
        class="w-72 border-s border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader class="sr-only">
          <SheetTitle>{{ t('admin.nav.sheetTitle') }}</SheetTitle>
          <SheetDescription>{{ t('admin.nav.sheetDescription') }}</SheetDescription>
        </SheetHeader>
        <AdminSidebar @navigate="mobileNavOpen = false" />
      </SheetContent>
    </Sheet>

    <!-- Main Column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <AdminTopbar
        @open-mobile-nav="mobileNavOpen = true"
        @open-command-palette="commandPaletteOpen = true"
        @open-shortcuts-help="shortcutsDialogOpen = true"
      >
        <template #title>
          <slot name="title">
            {{ t(pageTitle) }}
          </slot>
        </template>
      </AdminTopbar>

      <main
        id="admin-main-content"
        tabindex="-1"
        class="flex flex-1 flex-col gap-6 px-4 pt-6 pb-16 outline-none sm:px-8"
      >
        <slot />
      </main>
    </div>

    <!-- Command Palette (Ctrl/⌘+K) -->
    <AdminCommandPalette v-model:open="commandPaletteOpen" />

    <!-- Keyboard Shortcuts Help Dialog (?) -->
    <AdminShortcutsDialog v-model:open="shortcutsDialogOpen" />

    <!-- App-wide confirm dialog driven by useConfirmDialog() -->
    <AdminConfirmDialog />
  </div>
</template>
