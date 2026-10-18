<script setup lang="ts">
import type { OrderStatus } from '@serag/shared'
import { useAdminOrder } from '~/composables/useAdminOrder'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const orderId = String(route.params.id)

const { t } = useI18n()
const notify = useNotify()

const {
  detail,
  loading,
  actionPending,
  load,
  changeStatus,
  confirmPayment,
  rejectPayment,
  saveNotes,
  sendWhatsapp,
} = useAdminOrder(orderId)

await load()

useSeoMeta({
  title: () => (detail.value ? `${detail.value.no} — ${t('admin.orders.title')}` : t('admin.orders.title')),
})
useAdminPageTitle('admin.nav.orders')

async function handleStatusChange(to: OrderStatus, reason?: string) {
  const ok = await changeStatus(to, reason)
  if (ok && detail.value) {
    notify.success(t('admin.orders.detail.statusChanged', { status: detail.value.statusLabel }))
  }
}

async function handlePaymentConfirm(amount: number, note?: string) {
  const ok = await confirmPayment(amount, note)
  if (ok) {
    notify.success(t('admin.orders.detail.paymentConfirmed'))
  }
}

async function handlePaymentReject(reason: string) {
  const ok = await rejectPayment(reason)
  if (ok) {
    notify.success(t('admin.orders.detail.paymentRejected'))
  }
}

async function handleNotesSave(notes: string) {
  const ok = await saveNotes(notes)
  if (ok) {
    notify.success(t('admin.orders.detail.notesSaved'))
  }
}
</script>

<template>
  <div v-if="loading && !detail" class="flex flex-col gap-4">
    <div class="h-12 w-full rounded-2xl bg-muted/50 animate-pulse" />
    <div class="h-64 w-full rounded-2xl bg-muted/50 animate-pulse" />
  </div>

  <div v-else-if="detail" class="flex flex-col gap-6 min-w-0">
    <!-- Header -->
    <AdminOrdersDetailHeader
      :detail="detail"
      :action-pending="actionPending"
      @send-whatsapp="sendWhatsapp"
    />

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
      <!-- Left/Main Column: Customer, Items, Payments, Status Actions -->
      <div class="lg:col-span-2 flex flex-col gap-6 min-w-0">
        <!-- Customer Details -->
        <AdminOrdersDetailCustomer :customer="detail.customer" />

        <!-- Line Items & Financials -->
        <AdminOrdersDetailItems
          :items="detail.items"
          :subtotal="detail.subtotal"
          :discount="detail.discount"
          :delivery-fee="detail.deliveryFee"
          :total="detail.total"
          :deposit="detail.deposit"
          :paid-amount="detail.paidAmount"
          :remaining="detail.remaining"
        />

        <!-- Status Transitions Actions -->
        <AdminOrdersDetailStatusActions
          :allowed-transitions="detail.allowedTransitions"
          :action-pending="actionPending"
          @change-status="handleStatusChange"
        />

        <!-- Payments Management -->
        <AdminOrdersDetailPayments
          :payments="detail.payments"
          :can-confirm-payment="detail.canConfirmPayment"
          :can-reject-payment="detail.canRejectPayment"
          :default-confirm-amount="detail.defaultConfirmAmount"
          :shortages="detail.shortages"
          :action-pending="actionPending"
          @confirm="handlePaymentConfirm"
          @reject="handlePaymentReject"
        />
      </div>

      <!-- Right Column: Notes, History, WhatsApp Log -->
      <div class="flex flex-col gap-6 min-w-0">
        <!-- Internal Admin Notes -->
        <AdminOrdersDetailNotes
          :initial-notes="detail.internalNotes"
          :action-pending="actionPending"
          @save="handleNotesSave"
        />

        <!-- Status & Decision History Timeline -->
        <AdminOrdersDetailHistory :events="detail.events" />

        <!-- WhatsApp Messages Log -->
        <AdminOrdersDetailWhatsApp :messages="detail.whatsappMessages" />
      </div>
    </div>
  </div>
</template>
