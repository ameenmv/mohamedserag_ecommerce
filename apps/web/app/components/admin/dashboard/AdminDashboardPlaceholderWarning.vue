<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { PERMISSIONS, settingsPlaceholderWarnings } from '@serag/shared'

const { t } = useI18n()
const localePath = useLocalePath()
const { can } = useAdminAuth()
const storeApi = useStoreApi()

// Same key as the storefront's store info, so the request is shared when both are on the page
const { data } = await useAsyncData('store:info', () => storeApi.storeInfo(), { getCachedData: payloadCache })

/** Store fields that are empty or still hold a `[placeholder]` (shown until real data is saved). */
const missing = computed(() => (data.value ? settingsPlaceholderWarnings(data.value) : []))
const fieldList = computed(() =>
  missing.value.map((field) => t(`admin.settings.store.${field}`)).join(t('admin.dashboard.placeholderWarning.separator')),
)
</script>

<template>
  <div
    v-if="missing.length > 0"
    role="status"
    data-testid="admin-placeholder-warning"
    class="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200"
  >
    <TriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
    <div class="flex min-w-0 flex-col gap-1">
      <p class="font-bold">{{ t('admin.dashboard.placeholderWarning.title') }}</p>
      <p>{{ t('admin.dashboard.placeholderWarning.body', { fields: fieldList }) }}</p>
      <NuxtLink
        v-if="can(PERMISSIONS.settings.manage)"
        :to="localePath('/admin/settings')"
        class="w-fit font-bold underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {{ t('admin.dashboard.placeholderWarning.link') }}
      </NuxtLink>
    </div>
  </div>
</template>
