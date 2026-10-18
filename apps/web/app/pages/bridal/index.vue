<script setup lang="ts">
import type { BridalTierSummary } from '@serag/shared'
import { AlertCircle, RefreshCw } from '@lucide/vue'
import { getApiBaseUrl } from '~/utils/api'
import StoreBridalHero from '~/components/store/bridal/StoreBridalHero.vue'
import StoreBridalContinueBanner from '~/components/store/bridal/StoreBridalContinueBanner.vue'
import StoreBridalTiers from '~/components/store/bridal/StoreBridalTiers.vue'
import StoreBridalStartScratch from '~/components/store/bridal/StoreBridalStartScratch.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const hydrated = useHydrated()
const notify = useNotify()
const analytics = useAnalytics()
const bridalDevice = useBridalDevice()

useSeoMeta({
  title: () => t('store.bridal.pageTitle'),
  description: () => t('store.bridal.metaDescription'),
})

const creating = ref(false)

const {
  data: tiersData,
  pending: tiersPending,
  error: tiersError,
  refresh: refreshTiers,
} = await useAsyncData<{ tiers: BridalTierSummary[] }>('store:bridal:tiers', () =>
  $fetch<{ tiers: BridalTierSummary[] }>('/bridal/tiers', {
    baseURL: getApiBaseUrl(),
  }),
)

const tiers = computed<BridalTierSummary[]>(() => tiersData.value?.tiers ?? [])

async function handleCreateList(tierId?: string): Promise<void> {
  if (creating.value || !hydrated.value) return

  creating.value = true
  try {
    const res = await $fetch<{ editToken: string }>('/bridal/lists', {
      baseURL: getApiBaseUrl(),
      method: 'POST',
      body: tierId ? { tierId } : {},
    })

    bridalDevice.remember(res.editToken)
    analytics.track('bridal_list_created')
    await navigateTo(localePath(`/bridal/${res.editToken}`))
  } catch {
    notify.error(t('common.errors.unexpected'))
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <main class="w-full min-w-0 pb-16">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb :items="[{ label: t('store.bridal.pageTitle') }]" />
      </div>
    </div>

    <!-- Page Content Container -->
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <!-- Hero -->
      <StoreBridalHero class="mb-8" />

      <!-- Continue Banner if device remembers a list -->
      <StoreBridalContinueBanner />

      <!-- Section Heading -->
      <div class="mb-8 text-center sm:text-start">
        <h2 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {{ t('store.bridal.tiers.title') }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t('store.bridal.tiers.subtitle') }}
        </p>
      </div>

      <!-- Error State -->
      <div
        v-if="tiersError"
        class="mx-auto max-w-md rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center"
      >
        <AlertCircle class="mx-auto mb-3 size-10 text-destructive" aria-hidden="true" />
        <p class="mb-4 text-sm font-semibold text-foreground">
          {{ t('store.bridal.tiers.errorLoading') }}
        </p>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-serag-night px-5 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi"
          @click="refreshTiers()"
        >
          <RefreshCw class="size-4" aria-hidden="true" />
          <span>{{ t('store.bridal.tiers.retry') }}</span>
        </button>
      </div>

      <!-- Loading Skeleton -->
      <div
        v-else-if="tiersPending && tiers.length === 0"
        class="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        <div v-for="i in 3" :key="i" class="h-96 rounded-3xl bg-muted/40 animate-pulse" />
      </div>

      <!-- Tiers Grid -->
      <StoreBridalTiers
        v-else
        :tiers="tiers"
        :pending="creating"
        :hydrated="hydrated"
        @select="(tier) => handleCreateList(tier.id)"
      />

      <!-- Start from scratch secondary card -->
      <StoreBridalStartScratch
        :pending="creating"
        :hydrated="hydrated"
        @start="() => handleCreateList()"
      />
    </div>
  </main>
</template>
