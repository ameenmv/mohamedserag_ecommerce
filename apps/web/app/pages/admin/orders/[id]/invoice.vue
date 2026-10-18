<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
import {
  formatEgpWithUnit,
  type AdminOrderDetail,
} from '@serag/shared'
import { ArrowRight, Printer } from '@lucide/vue'

definePageMeta({ layout: false, middleware: 'admin-auth' })

const route = useRoute()
const orderId = String(route.params.id)

const { t, locale } = useI18n()
const localePath = useLocalePath()

const detail = ref<AdminOrderDetail | null>(null)
const loading = ref(true)

try {
  detail.value = await adminFetch<AdminOrderDetail>(
    `/admin/orders/${encodeURIComponent(orderId)}`,
  )
} finally {
  loading.value = false
}

useSeoMeta({
  title: () => (detail.value ? `${detail.value.no} — ${t('admin.orders.invoice.title')}` : t('admin.orders.invoice.title')),
})


function handlePrint() {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
</script>

<template>
  <div class="min-h-screen bg-muted/30 p-4 sm:p-8 print:p-0 print:bg-white text-foreground">
    <!-- Non-print Action Bar -->
    <div class="mx-auto max-w-4xl mb-6 flex items-center justify-between print:hidden">
      <NuxtLink
        :to="localePath(`/admin/orders/${orderId}`)"
        class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-input bg-background px-4 text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-xs"
      >
        <ArrowRight class="size-4 rtl:rotate-0 rotate-180" aria-hidden="true" />
        <span>{{ t('admin.orders.invoice.back') }}</span>
      </NuxtLink>

      <button
        type="button"
        class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-serag-night px-5 text-xs font-bold text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink dark:hover:bg-serag-gold-hi transition-colors shadow-xs"
        @click="handlePrint"
      >
        <Printer class="size-4" aria-hidden="true" />
        <span>{{ t('admin.orders.invoice.print') }}</span>
      </button>
    </div>

    <!-- Invoice Sheet (A4 Proportion) -->
    <main
      v-if="detail"
      class="mx-auto max-w-4xl rounded-2xl border border-border/80 bg-card p-8 sm:p-12 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 text-xs sm:text-sm text-foreground"
    >
      <!-- Invoice Header -->
      <div class="flex items-start justify-between border-b-2 border-border pb-6 gap-6">
        <div class="flex flex-col gap-1.5">
          <div class="font-display text-2xl sm:text-3xl font-bold text-serag-night dark:text-serag-gold print:text-black">
            {{ t('brand.storeName') }}
          </div>
          <div class="text-xs text-muted-foreground print:text-gray-600">
            {{ t('admin.orders.invoice.showroomAddressPlaceholder') }}
          </div>
          <div class="text-xs text-muted-foreground print:text-gray-600">
            {{ t('admin.orders.invoice.whatsappLabel') }}: {{ t('admin.orders.invoice.whatsappPlaceholder') }}
          </div>
        </div>

        <div class="flex flex-col items-end gap-1 text-end">
          <div class="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-foreground print:border print:border-gray-400">
            {{ t('admin.orders.invoice.title') }}
          </div>
          <div class="font-mono text-base sm:text-lg font-bold text-foreground print:text-black">
            {{ detail.no }}
          </div>
          <div class="text-xs text-muted-foreground print:text-gray-600">
            {{ formatDate(detail.createdAt, locale) }}
          </div>
        </div>
      </div>

      <!-- Customer & Destination Details -->
      <div class="grid grid-cols-2 gap-6 py-6 border-b border-border/60 text-xs sm:text-sm">
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground font-semibold print:text-gray-600">
            {{ t('admin.orders.invoice.customerInfo') }}:
          </span>
          <span class="font-bold text-foreground print:text-black">{{ detail.customer.name }}</span>
          <span class="font-mono" dir="ltr">{{ detail.customer.phone }}</span>
        </div>

        <div class="flex flex-col gap-1 text-end">
          <span class="text-muted-foreground font-semibold print:text-gray-600">
            {{ t('admin.orders.detail.address') }}:
          </span>
          <span class="font-medium text-foreground print:text-black">
            {{ detail.customer.governorate }} — {{ detail.customer.city }}
          </span>
          <span class="text-muted-foreground print:text-gray-600">{{ detail.customer.address }}</span>
        </div>
      </div>

      <!-- Line Items Table -->
      <div class="py-6 overflow-x-auto">
        <table class="w-full text-start text-xs sm:text-sm">
          <thead class="border-b-2 border-border font-bold text-muted-foreground print:text-black">
            <tr>
              <th class="py-2.5 text-start">{{ t('admin.orders.detail.item') }}</th>
              <th class="py-2.5 text-start">{{ t('admin.orders.detail.modelCode') }}</th>
              <th class="py-2.5 text-center">{{ t('admin.orders.detail.qty') }}</th>
              <th class="py-2.5 text-start">{{ t('admin.orders.detail.unitPrice') }}</th>
              <th class="py-2.5 text-end">{{ t('admin.orders.detail.lineTotal') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/40">
            <tr v-for="(it, idx) in detail.items" :key="idx">
              <td class="py-3 font-semibold text-foreground print:text-black pe-3">{{ it.name }}</td>
              <td class="py-3 font-mono text-muted-foreground print:text-gray-600 pe-3">{{ it.modelCode }}</td>
              <td class="py-3 text-center num font-bold px-2">{{ it.qty }}</td>
              <td class="py-3 num whitespace-nowrap text-muted-foreground print:text-gray-600 pe-3">
                {{ formatEgpWithUnit(it.unitPrice) }}
              </td>
              <td class="py-3 num font-bold text-foreground print:text-black text-end whitespace-nowrap">
                {{ formatEgpWithUnit(it.lineTotal) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Financial Totals -->
      <div class="border-t-2 border-border pt-4 flex flex-col gap-2 max-w-xs ms-auto w-full text-xs sm:text-sm">
        <div class="flex justify-between items-center text-muted-foreground print:text-gray-600">
          <span>{{ t('admin.orders.detail.subtotal') }}:</span>
          <span class="num font-semibold">{{ formatEgpWithUnit(detail.subtotal) }}</span>
        </div>

        <div v-if="detail.discount > 0" class="flex justify-between items-center text-emerald-700">
          <span>{{ t('admin.orders.detail.discount') }}:</span>
          <span class="num font-semibold">-{{ formatEgpWithUnit(detail.discount) }}</span>
        </div>

        <div class="flex justify-between items-center text-muted-foreground print:text-gray-600">
          <span>{{ t('admin.orders.detail.deliveryFee') }}:</span>
          <span class="num font-semibold">{{ formatEgpWithUnit(detail.deliveryFee) }}</span>
        </div>

        <div class="flex justify-between items-center font-bold text-foreground print:text-black border-t border-border pt-2 text-base">
          <div>
            <span>{{ t('admin.orders.detail.total') }}</span>
            <div class="text-[10px] font-normal text-muted-foreground print:text-gray-600">
              {{ t('admin.orders.invoice.vatNotice') }}
            </div>
          </div>
          <span class="num font-bold text-serag-night dark:text-serag-gold print:text-black">
            {{ formatEgpWithUnit(detail.total) }}
          </span>
        </div>

        <div class="flex justify-between items-center text-muted-foreground print:text-gray-600 pt-1">
          <span>{{ t('admin.orders.detail.paid') }}:</span>
          <span class="num font-bold">{{ formatEgpWithUnit(detail.paidAmount) }}</span>
        </div>

        <div class="flex justify-between items-center font-bold border-t border-dashed border-border pt-1">
          <span>{{ t('admin.orders.detail.remaining') }}:</span>
          <span class="num font-bold text-base" :class="detail.remaining > 0 ? 'text-destructive print:text-black' : 'text-emerald-700 print:text-black'">
            {{ formatEgpWithUnit(detail.remaining) }}
          </span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: A4;
    margin: 12mm;
  }
}
</style>
