<script setup lang="ts">
import { computed } from 'vue'
import type {
  AdminConfirmSummary,
  OrderStockShortage,
} from '@serag/shared'
import { remainingPiastres } from '~/utils/admin-confirm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  MessageCircle,
  XCircle,
} from '@lucide/vue'

const props = defineProps<{
  state: 'confirmed' | 'rejected'
  summary: AdminConfirmSummary
  shortages: OrderStockShortage[]
  rejectWhatsappUrl: string | null
}>()

const { t } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()

const remaining = computed(() => remainingPiastres(props.summary))
</script>

<template>
  <div class="flex flex-col gap-6 w-full">
    <!-- Confirmed Success State -->
    <template v-if="state === 'confirmed'">
      <Card class="border-emerald-500/30 bg-emerald-500/5 text-center p-6 rounded-3xl shadow-xs">
        <CardContent class="flex flex-col items-center gap-3 p-0">
          <div class="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 class="size-8" aria-hidden="true" />
          </div>

          <h2 class="text-xl font-extrabold text-foreground sm:text-2xl">
            {{ t('admin.confirm.result.confirmedTitle') }}
          </h2>

          <div class="flex items-center gap-2 pt-1">
            <span class="text-xs text-muted-foreground">{{ t('admin.confirm.result.statusLabel') }}</span>
            <Badge variant="outline" class="font-bold border-emerald-500/40 text-emerald-700 bg-emerald-500/10">
              {{ t(`admin.orders.status.${summary.status}`) }}
            </Badge>
          </div>

          <!-- Financial summary -->
          <div class="mt-3 flex w-full flex-wrap justify-around gap-4 rounded-2xl border border-border/80 bg-background/80 p-4 text-xs">
            <div class="flex flex-col gap-0.5">
              <span class="text-muted-foreground">{{ t('admin.confirm.result.paidAmount') }}</span>
              <span class="num text-sm font-extrabold text-foreground">
                {{ money(summary.paidAmount) }}
              </span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-muted-foreground">{{ t('admin.confirm.result.remainingAmount') }}</span>
              <span class="num text-sm font-extrabold text-foreground">
                {{ money(remaining) }}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Shortages Warning (Analysis G2) -->
      <div
        v-if="shortages.length > 0"
        role="alert"
        class="flex flex-col gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200"
      >
        <div class="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle class="size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{{ t('admin.confirm.result.shortageWarning') }}</span>
        </div>
        <ul class="flex flex-col gap-1 list-disc ps-5">
          <li v-for="item in shortages" :key="item.productId" class="font-medium">
            {{
              t('admin.confirm.result.shortageItem', {
                name: item.name,
                requested: item.requested,
                taken: item.taken,
              })
            }}
          </li>
        </ul>
      </div>

      <!-- Action Navigation Links -->
      <div class="flex flex-col gap-3 pt-2">
        <NuxtLink
          :to="localePath(`/admin/orders/${summary.orderId}`)"
          class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink class="size-4" aria-hidden="true" />
          <span>{{ t('admin.confirm.result.openOrder') }}</span>
        </NuxtLink>

        <NuxtLink
          :to="localePath('/admin')"
          class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LayoutDashboard class="size-4" aria-hidden="true" />
          <span>{{ t('admin.confirm.backToDashboard') }}</span>
        </NuxtLink>
      </div>
    </template>

    <!-- Rejected State -->
    <template v-else-if="state === 'rejected'">
      <Card class="border-destructive/30 bg-destructive/5 text-center p-6 rounded-3xl shadow-xs">
        <CardContent class="flex flex-col items-center gap-3 p-0">
          <div class="flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <XCircle class="size-8" aria-hidden="true" />
          </div>

          <h2 class="text-xl font-extrabold text-foreground sm:text-2xl">
            {{ t('admin.confirm.result.rejectedTitle') }}
          </h2>

          <div class="flex items-center gap-2 pt-1">
            <span class="text-xs text-muted-foreground">{{ t('admin.confirm.result.statusLabel') }}</span>
            <Badge variant="destructive" class="font-bold">
              {{ t(`admin.orders.status.${summary.status}`) }}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <!-- Big WhatsApp Button -->
      <div v-if="rejectWhatsappUrl" class="flex flex-col gap-3 pt-2">
        <a
          :href="rejectWhatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#20ba5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageCircle class="size-5" aria-hidden="true" />
          <span>{{ t('admin.confirm.result.sendWhatsapp') }}</span>
        </a>

        <NuxtLink
          :to="localePath('/admin')"
          class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LayoutDashboard class="size-4" aria-hidden="true" />
          <span>{{ t('admin.confirm.backToDashboard') }}</span>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
