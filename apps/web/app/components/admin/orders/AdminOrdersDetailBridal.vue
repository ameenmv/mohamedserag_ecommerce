<script setup lang="ts">
import { ref } from 'vue'
import {
  cairoToday,
  formatEgpWithUnit,
  type AdminOrderBridalDetail,
  type AdminOrderCustomer,
  type BridalRepriceResult,
  type OrderStockShortage,
  type WhatsAppTemplateKey,
} from '@serag/shared'
import { Calendar, Clock, ExternalLink, RefreshCw, Sparkles } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bridalStatusBadgeClass } from '~/utils/admin-orders'
import { cairoTomorrow } from '~/utils/admin-bridal'
import { formatDate } from '~/utils/date-format'

const props = defineProps<{
  bridal: AdminOrderBridalDetail
  orderId: string
  orderNo: string
  customer: AdminOrderCustomer
  actionPending?: boolean
  agreeDeliveryDate: (date: string) => Promise<{ shortages: OrderStockShortage[] } | null>
  extendLock: (until: string) => Promise<{ lockedUntil: Date } | null>
  reprice: () => Promise<BridalRepriceResult | null>
  logWhatsapp: (
    templateKey: WhatsAppTemplateKey,
    variables: Record<string, string | number>,
  ) => Promise<string | null>
}>()

const { t, locale } = useI18n()
const { money } = usePrice()
const notify = useNotify()
const localePath = useLocalePath()

// Delivery Date Dialog State
const deliveryDateDialogOpen = ref(false)
const deliveryDateInput = ref('')
const deliveryDateError = ref<string | null>(null)
const deliveryShortages = ref<OrderStockShortage[]>([])
const isDeliverySubmitting = ref(false)

function openDeliveryDateDialog() {
  deliveryDateInput.value = cairoToday()
  deliveryDateError.value = null
  deliveryDateDialogOpen.value = true
}

async function handleDeliveryDateSubmit() {
  if (!deliveryDateInput.value || deliveryDateInput.value < cairoToday()) {
    deliveryDateError.value = t('admin.bridal.errors.deliveryDateInvalid')
    return
  }
  deliveryDateError.value = null
  isDeliverySubmitting.value = true
  try {
    const res = await props.agreeDeliveryDate(deliveryDateInput.value)
    if (res) {
      if (res.shortages && res.shortages.length > 0) {
        deliveryShortages.value = res.shortages
      }
      notify.success(t('admin.bridal.actions.deliveryDateSuccess'))
      deliveryDateDialogOpen.value = false
    }
  } finally {
    isDeliverySubmitting.value = false
  }
}

// Extend Lock Dialog State
const extendLockDialogOpen = ref(false)
const extendLockInput = ref('')
const extendLockError = ref<string | null>(null)
const isExtendSubmitting = ref(false)

function openExtendLockDialog() {
  extendLockInput.value = cairoTomorrow()
  extendLockError.value = null
  extendLockDialogOpen.value = true
}

async function handleExtendLockSubmit() {
  if (!extendLockInput.value || extendLockInput.value <= cairoToday()) {
    extendLockError.value = t('admin.bridal.errors.extendDateInvalid')
    return
  }
  extendLockError.value = null
  isExtendSubmitting.value = true
  try {
    const res = await props.extendLock(extendLockInput.value)
    if (res) {
      notify.success(t('admin.bridal.actions.extendLockSuccess'))
      extendLockDialogOpen.value = false
    }
  } finally {
    isExtendSubmitting.value = false
  }
}

// Reprice Dialog State
const repriceDialogOpen = ref(false)
const isRepriceSubmitting = ref(false)
const repriceResult = ref<BridalRepriceResult | null>(null)

function openRepriceDialog() {
  repriceResult.value = null
  repriceDialogOpen.value = true
}

async function handleRepriceSubmit() {
  isRepriceSubmitting.value = true
  try {
    const res = await props.reprice()
    if (res) {
      repriceResult.value = res
      notify.success(t('admin.bridal.actions.repriceSuccess'))
    }
  } finally {
    isRepriceSubmitting.value = false
  }
}

async function handleSendRepriceWhatsapp() {
  if (!repriceResult.value) return
  const firstName = props.customer.name.trim().split(/\s+/)[0] || props.customer.name
  const variables = {
    customerName: firstName,
    orderNo: props.orderNo,
    oldTotal: formatEgpWithUnit(repriceResult.value.oldTotal),
    newTotal: formatEgpWithUnit(repriceResult.value.newTotal),
    lockedUntil: cairoToday(new Date(repriceResult.value.lockedUntil)),
  }
  await props.logWhatsapp('bridal_repriced', variables)
  if (typeof window !== 'undefined') {
    window.open(repriceResult.value.whatsappUrl, '_blank', 'noopener')
  }
  repriceDialogOpen.value = false
}
</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4 min-w-0">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3 border-b border-border/60 pb-3 flex-wrap">
      <div class="flex items-center gap-2">
        <Sparkles class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <h2 class="text-sm font-bold text-foreground">
          {{ t('admin.bridal.panelTitle') }}
        </h2>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <span
          v-if="bridal.status"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
          :class="bridalStatusBadgeClass(bridal.status)"
        >
          {{ t(`admin.bridal.status.${bridal.status}`) }}
        </span>
        <span
          v-if="bridal.lockExpired"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20"
        >
          {{ t('admin.orders.bridal.lockExpired') }}
        </span>
        <span
          v-else-if="bridal.lockDaysLeft !== null && bridal.lockDaysLeft !== undefined"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted"
        >
          {{ t('admin.orders.bridal.daysLeft', { n: bridal.lockDaysLeft }) }}
        </span>
      </div>
    </div>

    <!-- Shortages warning banner if agreeDeliveryDate encountered inventory shortage -->
    <div
      v-if="deliveryShortages.length > 0"
      class="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200"
    >
      <div class="font-bold mb-1.5 flex items-center gap-1.5">
        <span>{{ t('admin.orders.detail.shortagesWarning') }}</span>
      </div>
      <ul class="list-disc list-inside space-y-1">
        <li v-for="item in deliveryShortages" :key="item.productId">
          {{ t('admin.orders.detail.shortageItem', { name: item.name, requested: item.requested, taken: item.taken }) }}
        </li>
      </ul>
    </div>

    <!-- Info Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
      <!-- Lock End Date -->
      <div class="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/40">
        <span class="text-muted-foreground font-medium">{{ t('admin.bridal.detail.lockEndDate') }}</span>
        <span class="font-bold text-foreground">
          {{ bridal.lockedUntil ? formatDate(bridal.lockedUntil, locale) : '-' }}
        </span>
      </div>

      <!-- Lock Days -->
      <div class="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/40">
        <span class="text-muted-foreground font-medium">{{ t('admin.bridal.detail.lockDays') }}</span>
        <span class="font-bold text-foreground num">
          {{ bridal.lockDays ? t('admin.bridal.daysCount', { days: bridal.lockDays }) : '-' }}
        </span>
      </div>

      <!-- Preferred Delivery Date -->
      <div class="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/40">
        <span class="text-muted-foreground font-medium">{{ t('admin.bridal.detail.preferredDate') }}</span>
        <span class="font-bold text-foreground">
          {{ bridal.preferredDate ? formatDate(bridal.preferredDate, locale) : '-' }}
        </span>
      </div>

      <!-- Agreed Delivery Date -->
      <div class="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/40">
        <span class="text-muted-foreground font-medium">{{ t('admin.bridal.detail.agreedDeliveryDate') }}</span>
        <span class="font-bold text-foreground">
          {{ bridal.agreedDeliveryDate ? formatDate(bridal.agreedDeliveryDate, locale) : '-' }}
        </span>
      </div>

      <!-- Bride's read-only list link -->
      <div class="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/40 sm:col-span-2">
        <span class="text-muted-foreground font-medium">{{ t('admin.bridal.detail.listLink') }}</span>
        <a
          v-if="bridal.listShareToken"
          :href="localePath(`/bridal/${bridal.listShareToken}`)"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 font-bold text-serag-night dark:text-serag-gold hover:underline"
        >
          <span>{{ t('admin.bridal.detail.openBrideList') }}</span>
          <ExternalLink class="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
        </a>
        <span v-else class="text-muted-foreground">-</span>
      </div>
    </div>

    <!-- Bridal Actions (Available when bridal.status === 'locked') -->
    <div
      v-if="bridal.status === 'locked'"
      class="pt-3 border-t border-border/60 flex flex-wrap items-center gap-2.5"
    >
      <!-- Set Delivery Date Button -->
      <Button
        type="button"
        variant="outline"
        :disabled="actionPending"
        class="min-h-10 text-xs font-bold gap-2"
        @click="openDeliveryDateDialog"
      >
        <Calendar class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <span>{{ t('admin.bridal.actions.setDeliveryDate') }}</span>
      </Button>

      <!-- Extend Lock Button -->
      <Button
        type="button"
        variant="outline"
        :disabled="actionPending"
        class="min-h-10 text-xs font-bold gap-2"
        @click="openExtendLockDialog"
      >
        <Clock class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <span>{{ t('admin.bridal.actions.extendLock') }}</span>
      </Button>

      <!-- Reprice Button -->
      <Button
        type="button"
        variant="outline"
        :disabled="actionPending"
        class="min-h-10 text-xs font-bold gap-2"
        @click="openRepriceDialog"
      >
        <RefreshCw class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <span>{{ t('admin.bridal.actions.reprice') }}</span>
      </Button>
    </div>

    <!-- Dialog 1: Set Delivery Date -->
    <Dialog v-model:open="deliveryDateDialogOpen">
      <DialogContent class="w-full max-w-[calc(100vw-2rem)] rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-lg font-bold text-foreground">
            {{ t('admin.bridal.actions.setDeliveryDate') }}
          </DialogTitle>
          <DialogDescription class="pt-1 text-xs text-muted-foreground">
            {{ t('admin.bridal.actions.setDeliveryDateNotice') }}
          </DialogDescription>
        </DialogHeader>

        <form class="flex flex-col gap-3" @submit.prevent="handleDeliveryDateSubmit">
          <div class="flex flex-col gap-1.5">
            <label for="bridal-delivery-date" class="text-xs font-bold text-foreground">
              {{ t('admin.bridal.actions.deliveryDateLabel') }}
            </label>
            <input
              id="bridal-delivery-date"
              v-model="deliveryDateInput"
              type="date"
              :min="cairoToday()"
              required
              class="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-invalid="deliveryDateError ? 'true' : undefined"
              :aria-describedby="deliveryDateError ? 'bridal-delivery-date-error' : undefined"
            >
            <p v-if="deliveryDateError" id="bridal-delivery-date-error" class="text-xs font-semibold text-destructive">
              {{ deliveryDateError }}
            </p>
          </div>

          <DialogFooter class="gap-2 sm:gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              class="min-h-11"
              @click="deliveryDateDialogOpen = false"
            >
              {{ t('common.cancel') }}
            </Button>
            <Button
              type="submit"
              :disabled="isDeliverySubmitting"
              class="min-h-11 bg-serag-night text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink font-bold"
            >
              {{ isDeliverySubmitting ? t('common.save') : t('common.confirm') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog 2: Extend Lock -->
    <Dialog v-model:open="extendLockDialogOpen">
      <DialogContent class="w-full max-w-[calc(100vw-2rem)] rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-lg font-bold text-foreground">
            {{ t('admin.bridal.actions.extendLock') }}
          </DialogTitle>
          <DialogDescription class="pt-1 text-xs text-muted-foreground">
            {{ t('admin.bridal.actions.extendLockNotice') }}
          </DialogDescription>
        </DialogHeader>

        <form class="flex flex-col gap-3" @submit.prevent="handleExtendLockSubmit">
          <div class="flex flex-col gap-1.5">
            <label for="bridal-extend-until" class="text-xs font-bold text-foreground">
              {{ t('admin.bridal.actions.extendLockUntilLabel') }}
            </label>
            <input
              id="bridal-extend-until"
              v-model="extendLockInput"
              type="date"
              :min="cairoTomorrow()"
              required
              class="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-invalid="extendLockError ? 'true' : undefined"
              :aria-describedby="extendLockError ? 'bridal-extend-until-error' : undefined"
            >
            <p v-if="extendLockError" id="bridal-extend-until-error" class="text-xs font-semibold text-destructive">
              {{ extendLockError }}
            </p>
          </div>

          <DialogFooter class="gap-2 sm:gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              class="min-h-11"
              @click="extendLockDialogOpen = false"
            >
              {{ t('common.cancel') }}
            </Button>
            <Button
              type="submit"
              :disabled="isExtendSubmitting"
              class="min-h-11 bg-serag-night text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink font-bold"
            >
              {{ isExtendSubmitting ? t('common.save') : t('common.confirm') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog 3: Reprice -->
    <Dialog v-model:open="repriceDialogOpen">
      <DialogContent class="w-full max-w-[calc(100vw-2rem)] rounded-3xl p-6 sm:max-w-md">
        <!-- Result State after Repricing -->
        <template v-if="repriceResult">
          <DialogHeader>
            <DialogTitle class="text-lg font-bold text-foreground">
              {{ t('admin.bridal.reprice.resultTitle') }}
            </DialogTitle>
            <DialogDescription class="pt-1 text-xs text-muted-foreground">
              {{ t('admin.bridal.reprice.resultDescription') }}
            </DialogDescription>
          </DialogHeader>

          <div class="flex flex-col gap-3 py-2 text-xs">
            <div class="flex justify-between items-center py-2 border-b border-border/60">
              <span class="text-muted-foreground">{{ t('admin.bridal.reprice.oldTotal') }}:</span>
              <span class="font-bold num text-foreground">{{ money(repriceResult.oldTotal) }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-border/60">
              <span class="text-muted-foreground">{{ t('admin.bridal.reprice.newTotal') }}:</span>
              <span class="font-bold num text-foreground">{{ money(repriceResult.newTotal) }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-border/60">
              <span class="text-muted-foreground">{{ t('admin.bridal.reprice.difference') }}:</span>
              <span class="font-bold text-foreground">
                <template v-if="repriceResult.difference > 0">
                  {{ t('admin.bridal.reprice.increased', { amount: money(repriceResult.difference) }) }}
                </template>
                <template v-else-if="repriceResult.difference < 0">
                  {{ t('admin.bridal.reprice.decreased', { amount: money(Math.abs(repriceResult.difference)) }) }}
                </template>
                <template v-else>
                  {{ t('admin.bridal.reprice.noDifference') }}
                </template>
              </span>
            </div>
          </div>

          <DialogFooter class="gap-2 sm:gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              class="min-h-11"
              @click="repriceDialogOpen = false"
            >
              {{ t('common.close') }}
            </Button>
            <Button
              type="button"
              class="min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              @click="handleSendRepriceWhatsapp"
            >
              {{ t('admin.bridal.reprice.sendWhatsapp') }}
            </Button>
          </DialogFooter>
        </template>

        <!-- Initial Confirmation State -->
        <template v-else>
          <DialogHeader>
            <DialogTitle class="text-lg font-bold text-foreground">
              {{ t('admin.bridal.actions.reprice') }}
            </DialogTitle>
            <DialogDescription class="pt-1 text-xs text-muted-foreground leading-relaxed">
              {{ t('admin.bridal.actions.repriceConfirmNotice') }}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter class="gap-2 sm:gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              class="min-h-11"
              @click="repriceDialogOpen = false"
            >
              {{ t('common.cancel') }}
            </Button>
            <Button
              type="button"
              :disabled="isRepriceSubmitting"
              class="min-h-11 bg-serag-night text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink font-bold"
              @click="handleRepriceSubmit"
            >
              {{ isRepriceSubmitting ? t('common.save') : t('admin.bridal.actions.confirmReprice') }}
            </Button>
          </DialogFooter>
        </template>
      </DialogContent>
    </Dialog>
  </div>
</template>
