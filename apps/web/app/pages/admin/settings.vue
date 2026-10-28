<script setup lang="ts">
import { FEATURES } from '~/constants/features'
import type { Component } from 'vue'
import AdminSettingsCodDepositSection from '~/components/admin/settings/AdminSettingsCodDepositSection.vue'
import AdminSettingsLowStockSection from '~/components/admin/settings/AdminSettingsLowStockSection.vue'
import AdminSettingsPaymentsSection from '~/components/admin/settings/AdminSettingsPaymentsSection.vue'
import AdminSettingsStoreSection from '~/components/admin/settings/AdminSettingsStoreSection.vue'
import AdminSettingsSynonymsSection from '~/components/admin/settings/AdminSettingsSynonymsSection.vue'
import AdminSettingsTemplatesSection from '~/components/admin/settings/AdminSettingsTemplatesSection.vue'
import AdminSettingsZonesSection from '~/components/admin/settings/AdminSettingsZonesSection.vue'
import { PERMISSIONS, SETTINGS_SECTIONS, type SettingsSection } from '@serag/shared'
import { onBeforeRouteLeave } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.settings.manage)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

useSeoMeta({ title: () => t('admin.settings.pageTitle') })
useAdminPageTitle('admin.nav.settings')

const {
  sections,
  savedNotice,
  loadAll,
  loading,
  loadError,
  anyDirty,
  isDirty,
  conflict,
  loadLatest,
  cancelConflict,
  discardAll,
} = useAdminSettings()

await loadAll()

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const activeSection = computed<SettingsSection>(() => {
  const tab = route.query.tab
  if (typeof tab === 'string' && isSettingsSection(tab)) {
    return tab
  }
  return 'store'
})

function setSection(section: SettingsSection) {
  void router.replace({
    query: {
      ...route.query,
      tab: section === 'store' ? undefined : section,
    },
  })
}

const sectionComponents: Record<SettingsSection, Component> = {
  store: AdminSettingsStoreSection,
  payments: AdminSettingsPaymentsSection,
  zones: AdminSettingsZonesSection,
  codDeposit: AdminSettingsCodDepositSection,
  lowStock: AdminSettingsLowStockSection,
  searchSynonyms: AdminSettingsSynonymsSection,
  templates: AdminSettingsTemplatesSection,
}

const sectionComponent = computed(() => sectionComponents[activeSection.value])

const shownConflict = computed(() => conflict.value?.section === activeSection.value)

async function handleLoadLatest() {
  await loadLatest(activeSection.value)
}

// --- Unsaved-changes route guard ---
const leaveDialogOpen = ref(false)
let pendingPath: string | null = null

onBeforeRouteLeave((to) => {
  if (!anyDirty.value || to.path === route.path) {
    return true
  }
  pendingPath = to.fullPath
  leaveDialogOpen.value = true
  return false
})

function confirmLeave() {
  discardAll()
  leaveDialogOpen.value = false
  const target = pendingPath
  pendingPath = null
  if (target) {
    void navigateTo(target)
  }
}

function cancelLeave() {
  leaveDialogOpen.value = false
  pendingPath = null
}

function onConflictOpen(value: boolean) {
  if (!value) cancelConflict()
}

function onLeaveOpen(value: boolean) {
  if (!value) cancelLeave()
}

useEventListener('beforeunload', (event: BeforeUnloadEvent) => {
  if (!anyDirty.value) return
  event.preventDefault()
  event.returnValue = ''
})
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {{ t('admin.settings.pageTitle') }}
      </h1>
      <p class="max-w-2xl text-sm text-muted-foreground">
        {{ t('admin.settings.intro') }}
      </p>
    </div>

    <!-- Load error -->
    <Card v-if="loadError" class="min-w-0 border-destructive/30 shadow-xs">
      <CardContent class="pt-6">
        <p role="alert" class="text-sm font-semibold text-destructive">
          {{ loadError }}
        </p>
      </CardContent>
    </Card>

    <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-[14rem_1fr] lg:items-start">
      <!-- Section navigation -->
      <nav
        :aria-label="t('admin.settings.sectionNavLabel')"
        class="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:pb-0"
      >
        <button
          v-for="section in SETTINGS_SECTIONS"
          :key="section"
          type="button"
          :aria-current="activeSection === section ? 'true' : undefined"
          class="group flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-start text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:w-full"
          :class="
            activeSection === section
              ? 'bg-serag-night text-serag-ivory dark:bg-serag-gold dark:text-serag-ink'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          "
          @click="setSection(section)"
        >
          <span class="whitespace-nowrap">{{ t(`admin.settings.sections.${section}`) }}</span>
          <span
            v-if="isDirty(section)"
            class="ms-auto size-2 shrink-0 rounded-full bg-serag-gold"
            :class="activeSection === section ? 'bg-serag-gold-hi dark:bg-serag-ink' : ''"
            aria-hidden="true"
          />
          <span v-if="isDirty(section)" class="sr-only">{{ t('admin.settings.dirty') }}</span>
        </button>
      </nav>

      <!-- Active section editor -->
      <Card class="min-w-0 shadow-xs border-border/80">
        <CardContent class="pt-6">
          <div v-if="loading" class="py-10 text-center text-sm text-muted-foreground">
            {{ t('admin.settings.loading') }}
          </div>
          <p
            v-else-if="!sections[activeSection].loaded"
            role="alert"
            class="py-10 text-center text-sm font-semibold text-destructive"
          >
            {{ sections[activeSection].formError || t('admin.settings.sectionLoadError') }}
          </p>
          <component :is="sectionComponent" v-else :key="activeSection" />
          <p
            role="status"
            class="mt-3 min-h-5 text-sm font-semibold text-serag-green dark:text-serag-gold"
            data-testid="admin-settings-saved"
          >
            {{ savedNotice === activeSection ? t('admin.settings.saved') : '' }}
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Related links -->
    <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <NuxtLink
        :to="localePath('/admin/content?tab=quiz')"
        class="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {{ t('admin.content.tabs.quiz') }}
      </NuxtLink>
      <NuxtLink
        v-if="FEATURES.bridal"
        :to="localePath('/admin/bridal')"
        class="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {{ t('admin.nav.bridal') }}
      </NuxtLink>
    </div>

    <!-- 409 conflict dialog -->
    <Dialog :open="shownConflict" @update:open="onConflictOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-lg">
            {{ t('admin.settings.conflict.title') }}
          </DialogTitle>
          <DialogDescription class="pt-1 text-xs text-muted-foreground">
            {{ t('admin.settings.conflict.description') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            class="min-h-11 sm:min-h-9 text-xs"
            @click="cancelConflict"
          >
            {{ t('admin.settings.conflict.cancel') }}
          </Button>
          <Button
            type="button"
            class="min-h-11 sm:min-h-9 text-xs font-bold bg-serag-night text-serag-ivory hover:bg-serag-green dark:bg-serag-gold dark:text-serag-ink"
            @click="handleLoadLatest"
          >
            {{ t('admin.settings.conflict.loadLatest') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Unsaved-changes leave dialog -->
    <Dialog :open="leaveDialogOpen" @update:open="onLeaveOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-lg">
            {{ t('admin.settings.leave.title') }}
          </DialogTitle>
          <DialogDescription class="pt-1 text-xs text-muted-foreground">
            {{ t('admin.settings.leave.description') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            class="min-h-11 sm:min-h-9 text-xs"
            @click="cancelLeave"
          >
            {{ t('admin.settings.leave.stay') }}
          </Button>
          <Button
            type="button"
            class="min-h-11 sm:min-h-9 text-xs font-bold bg-destructive text-white hover:bg-destructive/90"
            :disabled="!hydrated"
            @click="confirmLeave"
          >
            {{ t('admin.settings.leave.leave') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
