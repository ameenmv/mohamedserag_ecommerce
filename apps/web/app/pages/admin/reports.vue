<script setup lang="ts">
import type { Component } from 'vue'
import type { BestSellerRow, CouponReportRow, FlashSaleReportRow, ReportKind } from '@serag/shared'
import { PERMISSIONS, REPORT_KINDS } from '@serag/shared'
import { Award, BarChart3, Layers, Percent, Sparkles, Star, Zap } from '@lucide/vue'
import { useAdminReports } from '~/composables/useAdminReports'
import { REPORT_TAB_LABEL_KEYS } from '~/utils/admin-reports'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.reports.read)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

const { t } = useI18n()

useSeoMeta({ title: () => t('admin.reports.pageTitle') })
useAdminPageTitle('admin.nav.reports')

const {
  state,
  payload,
  loading,
  fetchError,
  periodError,
  draftFrom,
  draftTo,
  load,
  retry,
  setTab,
  setPreset,
  applyCustom,
  setGroupBy,
  exportHref,
} = useAdminReports()

await load()

const kinds = REPORT_KINDS

const tabIcons: Record<ReportKind, Component> = {
  revenue: BarChart3,
  splits: Layers,
  'best-sellers': Award,
  coupons: Percent,
  'flash-sales': Zap,
  'bridal-funnel': Sparkles,
  'repeat-customers': Star,
}

// Narrow the payload per tab so every panel gets a fully typed prop.
const revenueReport = computed(() => {
  const p = payload.value
  return p?.kind === 'revenue' ? p.data : null
})
const splitsReport = computed(() => {
  const p = payload.value
  return p?.kind === 'splits' ? p.data : null
})
const bestSellerItems = computed<BestSellerRow[] | null>(() => {
  const p = payload.value
  return p?.kind === 'best-sellers' ? p.data.items : null
})
const couponItems = computed<CouponReportRow[] | null>(() => {
  const p = payload.value
  return p?.kind === 'coupons' ? p.data.items : null
})
const flashSaleItems = computed<FlashSaleReportRow[] | null>(() => {
  const p = payload.value
  return p?.kind === 'flash-sales' ? p.data.items : null
})
const funnelReport = computed(() => {
  const p = payload.value
  return p?.kind === 'bridal-funnel' ? p.data : null
})
const repeatReport = computed(() => {
  const p = payload.value
  return p?.kind === 'repeat-customers' ? p.data : null
})

const panelEmpty = computed(() => {
  switch (state.value.tab) {
    case 'revenue':
      // Buckets are dense (zero-filled), so emptiness means no delivered orders at all
      return (revenueReport.value?.totals.orders ?? 0) === 0
    case 'splits': {
      const report = splitsReport.value
      if (!report) return true
      return (
        report.byCategory.length === 0 &&
        report.byBrand.length === 0 &&
        report.byPaymentMethod.length === 0 &&
        report.byZone.length === 0 &&
        report.byType.length === 0
      )
    }
    case 'best-sellers':
      return (bestSellerItems.value?.length ?? 0) === 0
    case 'coupons':
      return (couponItems.value?.length ?? 0) === 0
    case 'flash-sales':
      return (flashSaleItems.value?.length ?? 0) === 0
    case 'bridal-funnel': {
      const report = funnelReport.value
      return !report || (report.listsCreated === 0 && report.reservationsPaid === 0 && report.delivered === 0)
    }
    case 'repeat-customers': {
      const report = repeatReport.value
      return !report || (report.customers === 0 && report.periodCustomers === 0)
    }
    default:
      return true
  }
})
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <!-- Header -->
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {{ t('admin.reports.pageTitle') }}
      </h1>
    </div>

    <!-- Period toolbar -->
    <AdminReportsPeriodToolbar
      :preset="state.preset"
      :from="draftFrom"
      :to="draftTo"
      :group-by="state.groupBy"
      :show-group-by="state.tab === 'revenue'"
      :error="periodError"
      :export-href="exportHref()"
      @set-preset="setPreset"
      @update:from="draftFrom = $event"
      @update:to="draftTo = $event"
      @apply="applyCustom"
      @set-group-by="setGroupBy"
    />

    <!-- Report tabs -->
    <div class="border-b border-border">
      <div
        role="tablist"
        :aria-label="t('admin.reports.tabsLabel')"
        class="flex items-center gap-2 -mb-px overflow-x-auto"
      >
        <button
          v-for="kind in kinds"
          :id="`report-tab-${kind}`"
          :key="kind"
          type="button"
          role="tab"
          :aria-selected="state.tab === kind"
          aria-controls="report-panel"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            state.tab === kind
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab(kind)"
        >
          <component :is="tabIcons[kind]" class="size-4" aria-hidden="true" />
          <span>{{ t(REPORT_TAB_LABEL_KEYS[kind]) }}</span>
        </button>
      </div>
    </div>

    <!-- Report panel -->
    <div
      id="report-panel"
      role="tabpanel"
      :aria-labelledby="`report-tab-${state.tab}`"
      class="min-w-0"
    >
      <AdminReportsState
        :loading="loading"
        :error="fetchError"
        :empty="panelEmpty"
        @retry="retry"
      >
        <AdminReportsRevenue v-if="state.tab === 'revenue'" :report="revenueReport" />
        <AdminReportsSplits v-else-if="state.tab === 'splits'" :report="splitsReport" />
        <AdminReportsBestSellers v-else-if="state.tab === 'best-sellers'" :items="bestSellerItems" />
        <AdminReportsCoupons v-else-if="state.tab === 'coupons'" :items="couponItems" />
        <AdminReportsFlashSales v-else-if="state.tab === 'flash-sales'" :items="flashSaleItems" />
        <AdminReportsBridalFunnel v-else-if="state.tab === 'bridal-funnel'" :report="funnelReport" />
        <AdminReportsRepeatCustomers v-else-if="state.tab === 'repeat-customers'" :report="repeatReport" />
      </AdminReportsState>
    </div>
  </div>
</template>
