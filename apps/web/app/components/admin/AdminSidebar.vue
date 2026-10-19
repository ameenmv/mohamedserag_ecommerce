<script setup lang="ts">
import type { Component } from 'vue'
import type { AdminNavGroup } from '~/utils/shortcuts'
import {
  BarChart3,
  BellRing,
  FilePenLine,
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
} from '@lucide/vue'
import { ADMIN_NAV_SHORTCUTS } from '~/utils/shortcuts'
import { PERMISSIONS } from '@serag/shared'

const emit = defineEmits<{
  navigate: []
}>()

const { t } = useI18n()
const { isActive } = useNavActive('/admin')

const iconByKey: Record<string, Component> = {
  h: LayoutDashboard,
  o: ShoppingBag,
  p: Package,
  c: FolderTree,
  b: Sparkles,
  m: Tag,
  n: BellRing,
  r: Star,
  e: FilePenLine,
  t: BarChart3,
  s: Settings,
}

const { can } = useAdminAuth()
const reviewsApi = useAdminReviews()
const pendingReviewsCount = useAdminPendingReviewsCount()

onMounted(async () => {
  if (can(PERMISSIONS.reviews.moderate)) {
    try {
      const res = await reviewsApi.pendingCount()
      pendingReviewsCount.value = res.count
    } catch {
      // Failure -> no badge, no error UI
    }
  }
})

const badges = computed<Record<string, number>>(() => ({
  r: pendingReviewsCount.value,
}))

const groupsOrder: readonly AdminNavGroup[] = ['main', 'store', 'content', 'system']

const groupedNav = computed(() =>
  groupsOrder.map((group) => ({
    group,
    items: ADMIN_NAV_SHORTCUTS.filter((item) => {
      if (item.group !== group) return false
      if (item.permission && !can(item.permission)) return false
      return true
    }),
  })),
)
</script>

<template>
  <div class="flex h-full flex-col justify-between gap-6 bg-sidebar px-4 py-6 text-sidebar-foreground">
    <div class="flex flex-col gap-5">
      <!-- Brand header -->
      <AdminSidebarBrand />

      <!-- Grouped Navigation -->
      <nav :aria-label="t('admin.nav.ariaLabel')" class="flex flex-col gap-4">
        <AdminSidebarNavGroup
          v-for="section in groupedNav"
          :key="section.group"
          :group="section.group"
          :items="section.items"
          :icon-by-key="iconByKey"
          :is-active="isActive"
          :badges="badges"
          @navigate="emit('navigate')"
        />
      </nav>
    </div>

    <!-- Store status footer card -->
    <AdminSidebarStatusCard />
  </div>
</template>
