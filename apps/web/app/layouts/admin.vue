<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import AdminCommandPalette from '@/components/admin/AdminCommandPalette.vue'
import AdminShortcutsDialog from '@/components/admin/AdminShortcutsDialog.vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAdminPageTitle } from '@/composables/useAdminPageTitle'
import {
  ADMIN_NAV_SHORTCUTS,
  createShortcutTracker,
  isEditableTarget,
} from '@/utils/shortcuts'

const route = useRoute()
const pageTitle = useAdminPageTitle()

const mobileNavOpen = ref(false)
const commandPaletteOpen = ref(false)
const shortcutsDialogOpen = ref(false)

// Sync default page title from current route when navigating between admin sections
watch(
  () => route.path,
  (newPath) => {
    mobileNavOpen.value = false
    const matched =
      ADMIN_NAV_SHORTCUTS.find((item) => item.to !== '/admin' && (newPath === item.to || newPath.startsWith(`${item.to}/`)))
      ?? ADMIN_NAV_SHORTCUTS.find((item) => item.to === newPath)
    if (matched) {
      pageTitle.value = matched.label
    }
  },
  { immediate: true },
)

const shortcutTracker = createShortcutTracker()

function handleKeydown(event: KeyboardEvent): void {
  const isDialogActive = commandPaletteOpen.value || shortcutsDialogOpen.value || mobileNavOpen.value
  const action = shortcutTracker.handleKey({
    key: event.key,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    isEditable: isEditableTarget(event.target),
    disabled: isDialogActive && !(event.ctrlKey || event.metaKey),
  })

  if (action.type === 'toggle-palette') {
    event.preventDefault()
    commandPaletteOpen.value = !commandPaletteOpen.value
    return
  }

  if (action.type === 'open-help') {
    event.preventDefault()
    shortcutsDialogOpen.value = true
    return
  }

  if (action.type === 'navigate') {
    event.preventDefault()
    navigateTo(action.to)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="flex min-h-dvh bg-background text-foreground">
    <!-- Accessible skip link -->
    <a
      href="#admin-main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:font-bold focus:text-accent-foreground focus:shadow-lg"
    >
      انتقل للمحتوى
    </a>

    <!-- Desktop Sidebar (lg+) -->
    <aside
      aria-label="القائمة الرئيسية"
      class="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-e lg:border-sidebar-border"
    >
      <AdminSidebar />
    </aside>

    <!-- Mobile Off-Canvas Sidebar Sheet (below lg) -->
    <Sheet v-model:open="mobileNavOpen">
      <SheetContent
        side="right"
        class="w-72 border-s border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader class="sr-only">
          <SheetTitle>قائمة لوحة التحكم</SheetTitle>
          <SheetDescription>تنقل بين أقسام لوحة تحكم معرض محمد سراج</SheetDescription>
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
            {{ pageTitle }}
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
  </div>
</template>
