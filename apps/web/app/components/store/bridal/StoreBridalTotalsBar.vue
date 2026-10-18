<script setup lang="ts">
import { computed } from 'vue'
import { MessageCircle, ShieldCheck } from '@lucide/vue'
import { waLink } from '@serag/shared'
import { classifyDiff } from '~/utils/bridal'

const props = defineProps<{
  total: number
  itemCount: number
  tierDifference?: number | null
  editable?: boolean
  canReserve?: boolean
  reserveDisabledReason?: string | null
}>()

const emit = defineEmits<{
  reserve: []
}>()

const { t } = useI18n()
const { money } = usePrice()
const storeSettings = useStoreSettings()

const diffType = computed(() => {
  if (props.tierDifference === null || props.tierDifference === undefined) return null
  return classifyDiff(props.tierDifference)
})

const contactWhatsAppLink = computed(() => {
  const message = t('store.bridal.view.contactMessage', {
    total: money(props.total),
  })
  return waLink(storeSettings.whatsapp, message)
})
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] z-30 flex items-center justify-between gap-2.5 border-t border-border/80 bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur-md sm:px-4 sm:py-3 lg:static lg:inset-auto lg:z-auto lg:flex-col lg:items-stretch lg:gap-4 lg:rounded-3xl lg:border lg:border-border/80 lg:bg-card lg:p-6 lg:shadow-xs lg:backdrop-blur-none"
  >
    <!-- Card Title (desktop only) -->
    <h3 class="hidden text-lg font-bold text-foreground lg:block">
      {{ t('store.bridal.totals.title') }}
    </h3>

    <!-- Totals & Difference details -->
    <div class="flex min-w-0 flex-1 flex-col justify-center lg:gap-2.5 lg:border-b lg:border-border/60 lg:pb-4">
      <!-- Total Row -->
      <div class="flex items-baseline justify-between gap-2">
        <span class="hidden text-xs font-semibold text-muted-foreground lg:inline">
          {{ t('store.bridal.totals.total') }}
        </span>
        <span
          data-bridal-total
          class="num text-base font-extrabold text-serag-night dark:text-serag-gold whitespace-nowrap leading-tight truncate sm:text-lg lg:text-2xl"
        >
          {{ money(total) }}
        </span>
      </div>

      <!-- Mobile Difference / Item Count Line -->
      <div class="mt-0.5 text-[11px] leading-tight text-muted-foreground truncate lg:hidden">
        <template v-if="tierDifference !== null && tierDifference !== undefined">
          <span
            v-if="diffType === 'more'"
            class="num font-bold text-amber-700 dark:text-amber-400"
          >
            {{ t('store.bridal.totals.tierDiffMore', { amount: money(Math.abs(tierDifference)) }) }}
          </span>
          <span
            v-else-if="diffType === 'less'"
            class="num font-bold text-emerald-700 dark:text-emerald-400"
          >
            {{ t('store.bridal.totals.tierDiffLess', { amount: money(Math.abs(tierDifference)) }) }}
          </span>
          <span
            v-else
            class="font-semibold text-muted-foreground"
          >
            {{ t('store.bridal.totals.tierDiffSame') }}
          </span>
        </template>
        <template v-else>
          <span>{{ t('store.bridal.totals.itemsFormat', { count: itemCount }) }}</span>
        </template>
      </div>

      <!-- Desktop Item Count Row -->
      <div class="hidden items-center justify-between gap-2 text-xs lg:flex">
        <span class="text-muted-foreground">
          {{ t('store.bridal.totals.itemCount') }}
        </span>
        <span class="font-bold text-foreground whitespace-nowrap">
          {{ t('store.bridal.totals.itemsFormat', { count: itemCount }) }}
        </span>
      </div>

      <!-- Desktop Tier Difference Row -->
      <div
        v-if="tierDifference !== null && tierDifference !== undefined"
        class="hidden items-center justify-between gap-2 text-xs lg:flex"
      >
        <span class="text-muted-foreground">
          {{ t('store.bridal.totals.tierDifference') }}
        </span>
        <span
          v-if="diffType === 'more'"
          class="num font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap"
        >
          {{ t('store.bridal.totals.tierDiffMore', { amount: money(Math.abs(tierDifference)) }) }}
        </span>
        <span
          v-else-if="diffType === 'less'"
          class="num font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
        >
          {{ t('store.bridal.totals.tierDiffLess', { amount: money(Math.abs(tierDifference)) }) }}
        </span>
        <span
          v-else
          class="font-semibold text-muted-foreground whitespace-nowrap"
        >
          {{ t('store.bridal.totals.tierDiffSame') }}
        </span>
      </div>
    </div>

    <!-- Primary Action Button -->
    <div class="shrink-0 lg:w-full">
      <!-- Edit Mode: Reserve button -->
      <button
        v-if="editable"
        id="bridal-reserve-button"
        type="button"
        :disabled="!canReserve"
        :aria-describedby="!canReserve && reserveDisabledReason ? 'bridal-reserve-reason' : undefined"
        :class="[
          'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-serag-gold px-3 text-xs font-bold text-serag-night shadow-xs transition-colors sm:px-4 sm:text-sm lg:w-full',
          canReserve
            ? 'hover:bg-serag-gold-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer'
            : 'opacity-50 cursor-not-allowed',
        ]"
        @click="emit('reserve')"
      >
        <ShieldCheck class="size-4 shrink-0" aria-hidden="true" />
        <span>{{ t('store.bridal.totals.reserveButton') }}</span>
      </button>

      <!-- View Mode: Contact WhatsApp button -->
      <a
        v-else
        :href="contactWhatsAppLink"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-serag-green px-3 text-xs font-bold text-white shadow-xs transition-colors hover:bg-serag-green-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-sm lg:w-full"
      >
        <MessageCircle class="size-4 shrink-0" aria-hidden="true" />
        <span>{{ t('store.bridal.view.contactShowroom') }}</span>
      </a>
    </div>
  </div>
</template>
