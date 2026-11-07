<script setup lang="ts">
import { PERMISSIONS } from '@serag/shared'

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
const { money } = usePrice()

useSeoMeta({ title: () => t('admin.delivery.pageTitle') })
useAdminPageTitle('admin.nav.delivery')

const { loadAll, loading, loadError, anyDirty, discardAll } = useAdminSettings()
const { draft: zonesDraft } = useAdminSettingsSection('zones')

await loadAll()

const exampleZone = computed(() => {
  const zones = zonesDraft.value ?? []
  return zones.find((zone) => zone.name.includes('المنصورة')) ?? zones[0] ?? null
})

const exampleAmount = computed(() => exampleZone.value?.fees.large ?? 0)
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <div class="flex flex-col gap-1">
      <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {{ t('admin.delivery.pageTitle') }}
      </h1>
      <p class="max-w-3xl text-sm text-muted-foreground">
        {{ t('admin.delivery.intro') }}
      </p>
    </div>

    <p
      v-if="loadError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive"
    >
      {{ loadError }}
    </p>

    <p v-else-if="loading" class="py-10 text-center text-sm text-muted-foreground">
      {{ t('admin.delivery.loading') }}
    </p>

    <template v-else>
      <section class="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
        <div>
          <h2 class="font-display text-lg font-bold text-foreground">
            {{ t('admin.delivery.feesTitle') }}
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">{{ t('admin.delivery.feesIntro') }}</p>
        </div>
        <AdminDeliveryZonesSection />
      </section>

      <section class="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
        <div>
          <h2 class="font-display text-lg font-bold text-foreground">
            {{ t('admin.delivery.categoryClasses.title') }}
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ t('admin.delivery.categoryClasses.intro') }}
          </p>
        </div>
        <AdminDeliveryCategoryClassesSection />
      </section>

      <section class="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
        <div>
          <h2 class="font-display text-lg font-bold text-foreground">
            {{ t('admin.delivery.offersTitle') }}
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">{{ t('admin.delivery.offersIntro') }}</p>
        </div>
        <AdminDeliveryOffersSection />
      </section>

      <section class="rounded-3xl border border-serag-gold/40 bg-serag-gold/10 p-5 shadow-xs sm:p-6">
        <h2 class="font-display text-lg font-bold text-foreground">
          {{ t('admin.delivery.example.title') }}
        </h2>
        <p class="mt-1 text-sm font-semibold text-foreground" data-testid="delivery-example">
          {{
            t('admin.delivery.example.line', {
              zone: exampleZone?.name ?? t('admin.delivery.example.noZone'),
              amount: money(exampleAmount),
            })
          }}
        </p>
        <p class="mt-1 text-xs text-muted-foreground">{{ t('admin.delivery.example.hint') }}</p>
      </section>

      <p v-if="anyDirty" class="text-xs font-semibold text-serag-gold-ink dark:text-serag-gold-hi">
        <button
          type="button"
          class="underline underline-offset-2"
          @click="discardAll"
        >
          {{ t('admin.delivery.discardAll') }}
        </button>
      </p>
    </template>
  </div>
</template>
