<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate, formatDateTime } from '~/utils/date-format'
import {
  piastresToEgp,
  type AdminOrderDeposit,
  type AdminOrderEvent,
  type AdminOrderPayment,
  type OrderStockShortage,
} from '@serag/shared'
import { AlertTriangle, Calendar, CheckCircle, CreditCard, MessageCircle, XCircle } from '@lucide/vue'
import { parseConfirmAmountEgp } from '~/utils/admin-confirm'

const props = defineProps<{
  payments: AdminOrderPayment[]
  canConfirmPayment: boolean
  canRejectPayment: boolean
  defaultConfirmAmount: number
  shortages?: OrderStockShortage[]
  actionPending?: boolean
  deposit?: AdminOrderDeposit | null
  paidAmount?: number
  depositRemaining?: number
  events?: AdminOrderEvent[]
  customerPhone?: string
  customerName?: string
  orderNo?: string
}>()

const emit = defineEmits<{
  confirm: [amountPiastres: number, note?: string]
  reject: [reason: string]
  sendBridalLockedWhatsapp: []
}>()

const { t, locale } = useI18n()
const { money } = usePrice()

const confirmDialogOpen = ref(false)
const confirmAmountInput = ref('')
const confirmNoteInput = ref('')
const confirmError = ref<string | null>(null)
const lastConfirmedAmount = ref<number | null>(null)

const rejectDialogOpen = ref(false)
const rejectReasonInput = ref('')
const rejectError = ref<string | null>(null)

const depositPaid = computed(() => {
  if (!props.deposit) return 0
  return Math.max(0, props.deposit.amount - (props.depositRemaining ?? 0))
})

const bridalLockedEvent = computed(() => {
  return props.events?.find((e) => e.status === 'bridal_locked')
})

function openConfirmDialog() {
  confirmAmountInput.value = String(piastresToEgp(props.defaultConfirmAmount))
  confirmNoteInput.value = ''
  confirmError.value = null
  confirmDialogOpen.value = true
}

function handleConfirmSubmit() {
  const parsed = parseConfirmAmountEgp(confirmAmountInput.value)
  if (!parsed.success) {
    confirmError.value = t(parsed.errorKey)
    return
  }
  confirmError.value = null
  confirmDialogOpen.value = false
  lastConfirmedAmount.value = parsed.piastres
  emit('confirm', parsed.piastres, confirmNoteInput.value.trim() || undefined)
}

function openRejectDialog() {
  rejectReasonInput.value = ''
  rejectError.value = null
  rejectDialogOpen.value = true
}

function handleRejectSubmit() {
  const reason = rejectReasonInput.value.trim()
  if (reason.length < 3) {
    rejectError.value = t('admin.confirm.errors.reasonRequired')
    return
  }
  if (reason.length > 300) {
    rejectError.value = t('admin.confirm.errors.reasonTooLong')
    return
  }
  rejectError.value = null
  rejectDialogOpen.value = false
  emit('reject', reason)
}
</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-5 min-w-0">
    <div class="flex items-center justify-between gap-3 border-b border-border/60 pb-3 flex-wrap">
      <div class="flex items-center gap-2">
        <CreditCard class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <h2 class="text-sm font-bold text-foreground">
          {{ t('admin.orders.detail.paymentsTitle') }}
        </h2>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="canConfirmPayment"
          type="button"
          :disabled="actionPending"
          class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-serag-gold px-3.5 text-xs font-bold text-serag-ink hover:bg-serag-gold-hi transition-colors disabled:opacity-50 shadow-xs"
          @click="openConfirmDialog"
        >
          <CheckCircle class="size-3.5" aria-hidden="true" />
          <span>{{ t('admin.orders.detail.confirmPayment') }}</span>
        </button>

        <button
          v-if="canRejectPayment"
          type="button"
          :disabled="actionPending"
          class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
          @click="openRejectDialog"
        >
          <XCircle class="size-3.5" aria-hidden="true" />
          <span>{{ t('admin.orders.detail.rejectPayment') }}</span>
        </button>
      </div>
    </div>

    <!-- Deposit Breakdown (if deposit order) -->
    <div
      v-if="deposit"
      class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-serag-gold/30 bg-serag-gold/5 p-3.5 text-xs"
    >
      <div class="flex flex-col gap-0.5">
        <span class="text-muted-foreground">{{ t('admin.confirm.summary.depositRequired') }}</span>
        <span class="num text-sm font-bold text-foreground">{{ money(deposit.amount) }}</span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-muted-foreground">{{ t('admin.confirm.summary.depositPaid') }}</span>
        <span class="num text-sm font-bold text-foreground">{{ money(depositPaid) }}</span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-muted-foreground">{{ t('admin.confirm.summary.depositRemaining') }}</span>
        <span class="num text-sm font-bold text-foreground">{{ money(depositRemaining ?? 0) }}</span>
      </div>
    </div>

    <!-- Partial Deposit Alert -->
    <div
      v-if="deposit && (depositRemaining ?? 0) > 0 && lastConfirmedAmount"
      role="alert"
      class="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-900 dark:text-amber-200"
    >
      <AlertTriangle class="size-4 shrink-0 text-amber-600" aria-hidden="true" />
      <span>
        {{
          t('admin.confirm.partialDepositRecorded', {
            amount: money(lastConfirmedAmount),
            remaining: money(depositRemaining ?? 0),
          })
        }}
      </span>
    </div>

    <!-- Bridal Lock Notice -->
    <div
      v-if="bridalLockedEvent"
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-serag-gold/40 bg-serag-gold/10 p-3.5 text-xs text-foreground"
    >
      <div class="flex items-center gap-2 font-bold">
        <Calendar class="size-4 shrink-0 text-serag-gold" aria-hidden="true" />
        <span>{{ t('admin.confirm.result.bridalLockedNotice', { date: formatDate(bridalLockedEvent.note ?? '', locale) }) }}</span>
      </div>
      <button
        type="button"
        :disabled="actionPending"
        class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 text-xs font-bold text-white hover:bg-[#20ba5a] transition-colors disabled:opacity-50 shadow-xs"
        @click="emit('sendBridalLockedWhatsapp')"
      >
        <MessageCircle class="size-3.5" aria-hidden="true" />
        <span>{{ t('admin.confirm.result.sendBridalLockedWhatsapp') }}</span>
      </button>
    </div>

    <div
      v-if="shortages && shortages.length > 0"
      class="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-3.5 text-xs text-amber-900 dark:text-amber-200"
      role="alert"
    >
      <div class="flex items-center gap-2 font-bold mb-1">
        <AlertTriangle class="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span>{{ t('admin.orders.detail.shortagesWarning') }}</span>
      </div>
      <ul class="list-disc list-inside space-y-0.5">
        <li v-for="sh in shortages" :key="sh.productId">
          {{ t('admin.orders.detail.shortageItem', { name: sh.name, requested: sh.requested, taken: sh.taken }) }}
        </li>
      </ul>
    </div>

    <div v-if="payments.length === 0" class="text-xs text-muted-foreground italic py-2">
      {{ t('admin.orders.detail.noPayments') }}
    </div>

    <div v-else class="flex flex-col divide-y divide-border/60">
      <div v-for="p in payments" :key="p.id" class="py-3 flex flex-col gap-1 text-xs">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="num font-bold text-sm text-foreground">{{ money(p.amount) }}</span>
            <span class="text-muted-foreground">({{ t(`admin.orders.paymentMethods.${p.method}`) }})</span>
          </div>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
            :class="p.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-destructive/15 text-destructive'"
          >
            {{ p.status === 'confirmed' ? t('admin.confirm.result.confirmedTitle') : t('admin.confirm.result.rejectedTitle') }}
          </span>
        </div>
        <div v-if="p.rejectReason" class="text-destructive font-medium">
          {{ t('admin.confirm.dialog.reasonLabel') }}: {{ p.rejectReason }}
        </div>
        <div class="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span>{{ p.adminName ? p.adminName : '' }}</span>
          <span>{{ formatDateTime(p.at, locale) }}</span>
        </div>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <div v-if="confirmDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="bg-card w-full max-w-sm rounded-2xl border border-border p-5 flex flex-col gap-4 shadow-xl">
        <h3 class="font-bold text-sm text-foreground">{{ t('admin.orders.dialogs.confirmPaymentTitle') }}</h3>
        <p class="text-xs text-muted-foreground">{{ t('admin.orders.dialogs.confirmPaymentDescription') }}</p>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-foreground">{{ t('admin.orders.dialogs.amountLabel') }}</label>
          <input v-model="confirmAmountInput" type="text" class="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm font-mono shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" >
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-foreground">{{ t('admin.orders.dialogs.noteLabel') }}</label>
          <input v-model="confirmNoteInput" type="text" class="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" >
        </div>
        <p v-if="confirmError" class="text-xs text-destructive font-semibold">{{ confirmError }}</p>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button type="button" class="min-h-9 px-3 rounded-xl border border-input text-xs font-bold text-foreground hover:bg-muted" @click="confirmDialogOpen = false">{{ t('common.cancel') }}</button>
          <button type="button" class="min-h-9 px-4 rounded-xl bg-serag-gold text-xs font-bold text-serag-ink hover:bg-serag-gold-hi shadow-xs" @click="handleConfirmSubmit">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- Reject Dialog -->
    <div v-if="rejectDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="bg-card w-full max-w-sm rounded-2xl border border-border p-5 flex flex-col gap-4 shadow-xl">
        <h3 class="font-bold text-sm text-foreground">{{ t('admin.orders.dialogs.rejectTitle') }}</h3>
        <p class="text-xs text-muted-foreground">{{ t('admin.orders.dialogs.rejectDescription') }}</p>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-foreground">{{ t('admin.orders.dialogs.reasonLabel') }}</label>
          <textarea v-model="rejectReasonInput" rows="3" class="border-input bg-background w-full rounded-xl border p-3 text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <p v-if="rejectError" class="text-xs text-destructive font-semibold">{{ rejectError }}</p>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button type="button" class="min-h-9 px-3 rounded-xl border border-input text-xs font-bold text-foreground hover:bg-muted" @click="rejectDialogOpen = false">{{ t('common.cancel') }}</button>
          <button type="button" class="min-h-9 px-4 rounded-xl bg-destructive text-xs font-bold text-white hover:bg-destructive/90 shadow-xs" @click="handleRejectSubmit">{{ t('admin.confirm.dialog.confirmReject') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
