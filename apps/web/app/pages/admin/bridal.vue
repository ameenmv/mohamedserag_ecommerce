<script setup lang="ts">
import { ref, computed } from 'vue'
import { PERMISSIONS, type BridalSettings, type BridalTierUpdateInput } from '@serag/shared'
import { Sparkles } from '@lucide/vue'
import { useAdminBridalTiers } from '~/composables/useAdminBridalTiers'
import { useAdminBridalSettings } from '~/composables/useAdminBridalSettings'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.bridal.manage)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

const { t } = useI18n()
const notify = useNotify()

useSeoMeta({ title: () => t('admin.bridal.pageTitle') })
useAdminPageTitle('admin.nav.bridal')

const {
  tiers,
  loading: tiersLoading,
  saving: tiersSaving,
  error: tiersError,
  fetchTiers,
  saveTier,
} = useAdminBridalTiers()

const {
  settings,
  loading: settingsLoading,
  saving: settingsSaving,
  error: settingsError,
  fetchSettings,
  saveSettings,
} = useAdminBridalSettings()

await Promise.all([fetchTiers(), fetchSettings()])

const selectedTierId = ref(tiers.value[0]?.id ?? '')

const selectedTier = computed(() =>
  tiers.value.find((t) => t.id === selectedTierId.value) ?? tiers.value[0],
)

async function handleTierSave(input: BridalTierUpdateInput) {
  if (!selectedTier.value) return
  const updated = await saveTier(selectedTier.value.id, input)
  if (updated) {
    notify.success(t('admin.bridal.editor.tierSavedSuccess'))
  }
}

async function handleSettingsSave(input: BridalSettings) {
  const updated = await saveSettings(input)
  if (updated) {
    notify.success(t('admin.bridal.settings.savedSuccess'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <Sparkles class="size-6 text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {{ t('admin.bridal.pageTitle') }}
        </h1>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="tiersLoading || settingsLoading" class="flex flex-col gap-4">
      <div class="h-12 w-full rounded-2xl bg-muted/50 animate-pulse" />
      <div class="h-64 w-full rounded-2xl bg-muted/50 animate-pulse" />
    </div>

    <template v-else>
      <!-- Tier Tabs -->
      <nav
        class="flex items-center gap-2 overflow-x-auto border-b border-border/80 pb-2 text-sm font-medium whitespace-nowrap scrollbar-none"
        :aria-label="t('admin.bridal.tiersTabsAria')"
      >
        <button
          v-for="tier in tiers"
          :key="tier.id"
          type="button"
          class="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="
            selectedTier?.id === tier.id
              ? 'bg-serag-night text-white shadow-xs dark:bg-serag-gold dark:text-serag-ink'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60'
          "
          :aria-current="selectedTier?.id === tier.id ? 'page' : undefined"
          @click="selectedTierId = tier.id"
        >
          <span>{{ tier.name }}</span>
        </button>
      </nav>

      <!-- Active Tier Editor -->
      <AdminBridalTierEditor
        v-if="selectedTier"
        :tier="selectedTier"
        :saving="Boolean(tiersSaving[selectedTier.id])"
        :api-error="tiersError"
        @save="handleTierSave"
      />

      <!-- Settings Card -->
      <AdminBridalSettingsCard
        v-if="settings"
        :settings="settings"
        :saving="settingsSaving"
        :api-error="settingsError"
        @save="handleSettingsSave"
      />
    </template>
  </div>
</template>
