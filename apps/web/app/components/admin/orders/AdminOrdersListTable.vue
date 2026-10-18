<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
import type {
  AdminOrderRow,
} from '@serag/shared'
import { ArrowLeft } from '@lucide/vue'
import { bridalStatusBadgeClass, statusBadgeClass } from '~/utils/admin-orders'

defineProps<{
  items: AdminOrderRow[]
}>()

const { t, locale } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()

</script>

<template>
  <div class="flex flex-col gap-4 min-w-0">
    <!-- Desktop Table (md and up) -->
    <div class="hidden md:block overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
      <table class="w-full text-start text-xs text-foreground">
        <thead class="border-b border-border/80 bg-muted/40 font-bold text-muted-foreground">
          <tr>
            <th class="px-4 py-3.5 text-start font-bold">{{ t('admin.orders.table.orderNo') }}</th>
            <th class="px-4 py-3.5 text-start font-bold">{{ t('admin.orders.table.date') }}</th>
            <th class="px-4 py-3.5 text-start font-bold">{{ t('admin.orders.table.customer') }}</th>
            <th class="px-4 py-3.5 text-start font-bold">{{ t('admin.orders.table.phone') }}</th>
            <th class="px-4 py-3.5 text-center font-bold">{{ t('admin.orders.table.items') }}</th>
            <th class="px-4 py-3.5 text-start font-bold">{{ t('admin.orders.table.total') }}</th>
            <th class="px-4 py-3.5 text-start font-bold">{{ t('admin.orders.table.paid') }}</th>
            <th class="px-4 py-3.5 text-start font-bold">{{ t('admin.orders.table.method') }}</th>
            <th class="px-4 py-3.5 text-start font-bold">{{ t('admin.orders.table.status') }}</th>
            <th class="px-4 py-3.5 text-end font-bold">{{ t('admin.orders.table.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr
            v-for="order in items"
            :key="order.id"
            class="transition-colors hover:bg-muted/30"
          >
            <td class="px-4 py-3 font-mono font-bold text-foreground whitespace-nowrap">
              <div class="flex items-center gap-2">
                <NuxtLink
                  :to="localePath(`/admin/orders/${order.id}`)"
                  class="hover:underline text-serag-night dark:text-serag-gold"
                >
                  {{ order.no }}
                </NuxtLink>
                <span
                  v-if="order.type === 'bridal'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-serag-night/20 bg-serag-night/5 text-serag-night dark:border-serag-gold/30 dark:bg-serag-gold/10 dark:text-serag-gold"
                >
                  {{ t('admin.orders.types.bridal') }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-muted-foreground whitespace-nowrap">
              {{ formatDate(order.createdAt, locale) }}
            </td>
            <td class="px-4 py-3 font-semibold text-foreground">
              {{ order.customerName }}
              <div class="text-[11px] text-muted-foreground font-normal">
                {{ order.governorate }} - {{ order.city }}
              </div>
            </td>
            <td class="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
              {{ order.customerPhone }}
            </td>
            <td class="px-4 py-3 text-center num font-bold">
              {{ order.itemCount }}
            </td>
            <td class="px-4 py-3 num font-bold text-foreground whitespace-nowrap">
              {{ money(order.total) }}
            </td>
            <td class="px-4 py-3 num font-bold text-muted-foreground whitespace-nowrap">
              {{ money(order.paidAmount) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-xs">
              {{ t(`admin.orders.paymentMethods.${order.paymentMethod}`) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <div class="flex flex-col gap-1 items-start">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                  :class="statusBadgeClass(order.status)"
                >
                  {{ t(`admin.orders.status.${order.status}`) }}
                </span>
                <template v-if="order.type === 'bridal'">
                  <span
                    v-if="order.bridalStatus"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    :class="bridalStatusBadgeClass(order.bridalStatus)"
                  >
                    {{ t(`admin.bridal.status.${order.bridalStatus}`) }}
                  </span>
                  <span
                    v-if="order.lockExpired"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-destructive/10 text-destructive border border-destructive/20"
                  >
                    {{ t('admin.orders.bridal.lockExpired') }}
                  </span>
                  <span
                    v-else-if="order.lockDaysLeft !== null && order.lockDaysLeft !== undefined"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground bg-muted"
                  >
                    {{ t('admin.orders.bridal.daysLeft', { n: order.lockDaysLeft }) }}
                  </span>
                </template>
              </div>
            </td>
            <td class="px-4 py-3 text-end whitespace-nowrap">
              <NuxtLink
                :to="localePath(`/admin/orders/${order.id}`)"
                class="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{{ t('admin.orders.table.view') }}</span>
                <ArrowLeft class="size-3 rtl:rotate-0 rotate-180" aria-hidden="true" />
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards View (< md) -->
    <div class="flex flex-col gap-3 md:hidden min-w-0">
      <div
        v-for="order in items"
        :key="order.id"
        class="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs min-w-0"
      >
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="localePath(`/admin/orders/${order.id}`)"
              class="font-mono text-sm font-bold text-serag-night dark:text-serag-gold hover:underline"
            >
              {{ order.no }}
            </NuxtLink>
            <span
              v-if="order.type === 'bridal'"
              class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-serag-night/20 bg-serag-night/5 text-serag-night dark:border-serag-gold/30 dark:bg-serag-gold/10 dark:text-serag-gold"
            >
              {{ t('admin.orders.types.bridal') }}
            </span>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
              :class="statusBadgeClass(order.status)"
            >
              {{ t(`admin.orders.status.${order.status}`) }}
            </span>
            <span
              v-if="order.type === 'bridal' && order.bridalStatus"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              :class="bridalStatusBadgeClass(order.bridalStatus)"
            >
              {{ t(`admin.bridal.status.${order.bridalStatus}`) }}
            </span>
            <span
              v-if="order.type === 'bridal' && order.lockExpired"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-destructive/10 text-destructive border border-destructive/20"
            >
              {{ t('admin.orders.bridal.lockExpired') }}
            </span>
            <span
              v-else-if="order.type === 'bridal' && order.lockDaysLeft !== null && order.lockDaysLeft !== undefined"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground bg-muted"
            >
              {{ t('admin.orders.bridal.daysLeft', { n: order.lockDaysLeft }) }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-2">
          <span class="font-semibold text-foreground">{{ order.customerName }}</span>
          <span>{{ formatDate(order.createdAt, locale) }}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-muted-foreground">{{ t('admin.orders.table.phone') }}:</span>
            <span class="font-mono font-medium ms-1">{{ order.customerPhone }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">{{ t('admin.orders.table.items') }}:</span>
            <span class="num font-bold ms-1">{{ order.itemCount }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">{{ t('admin.orders.table.total') }}:</span>
            <span class="num font-bold text-foreground ms-1">{{ money(order.total) }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">{{ t('admin.orders.table.paid') }}:</span>
            <span class="num font-bold text-muted-foreground ms-1">{{ money(order.paidAmount) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1 border-t border-border/60">
          <span class="text-xs text-muted-foreground">
            {{ t(`admin.orders.paymentMethods.${order.paymentMethod}`) }}
          </span>
          <NuxtLink
            :to="localePath(`/admin/orders/${order.id}`)"
            class="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-input bg-background px-3 text-xs font-bold text-foreground hover:bg-muted"
          >
            <span>{{ t('admin.orders.table.view') }}</span>
            <ArrowLeft class="size-3 rtl:rotate-0 rotate-180" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
