<script setup lang="ts">
import type { BridalStatus, OrderStatus } from '@serag/shared'
import { Ban, Check, ShieldAlert, Truck } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  allowedTransitions: OrderStatus[]
  actionPending?: boolean
  isBridal?: boolean
  bridalStatus?: BridalStatus | null
}>()

const emit = defineEmits<{
  'change-status': [to: OrderStatus, reason?: string]
}>()

const { t } = useI18n()

function isTransitionBlocked(to: OrderStatus): boolean {
  if (to === 'out_for_delivery' && props.isBridal && props.bridalStatus !== 'delivery_agreed') {
    return true
  }
  return false
}

const cancelDialogOpen = ref(false)
const cancelReason = ref('')
const cancelError = ref<string | null>(null)

function onTransitionClick(to: OrderStatus) {
  if (to === 'cancelled') {
    cancelReason.value = ''
    cancelError.value = null
    cancelDialogOpen.value = true
  } else {
    emit('change-status', to)
  }
}

function handleCancelSubmit() {
  const reason = cancelReason.value.trim()
  if (reason.length < 3) {
    cancelError.value = t('admin.confirm.errors.reasonRequired')
    return
  }
  if (reason.length > 300) {
    cancelError.value = t('admin.confirm.errors.reasonTooLong')
    return
  }
  cancelError.value = null
  cancelDialogOpen.value = false
  emit('change-status', 'cancelled', reason)
}

function transitionIcon(to: OrderStatus) {
  switch (to) {
    case 'confirmed':
      return Check
    case 'out_for_delivery':
      return Truck
    case 'delivered':
      return Check
    case 'cancelled':
    default:
      return Ban
  }
}

function transitionButtonClass(to: OrderStatus) {
  switch (to) {
    case 'confirmed':
      return 'bg-serag-night text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink'
    case 'out_for_delivery':
      return 'bg-sky-600 text-white hover:bg-sky-700'
    case 'delivered':
      return 'bg-emerald-600 text-white hover:bg-emerald-700'
    case 'cancelled':
      return 'border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
    default:
      return 'border border-input bg-background hover:bg-muted text-foreground'
  }
}
</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4 min-w-0">
    <div class="flex items-center gap-2 border-b border-border/60 pb-3">
      <ShieldAlert class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <h2 class="text-sm font-bold text-foreground">
        {{ t('admin.orders.detail.statusActionsTitle') }}
      </h2>
    </div>

    <div v-if="allowedTransitions.length === 0" class="text-xs text-muted-foreground italic">
      {{ t('admin.orders.detail.noStatusActions') }}
    </div>

    <div v-else class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          v-for="to in allowedTransitions"
          :key="to"
          type="button"
          :disabled="actionPending || isTransitionBlocked(to)"
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="transitionButtonClass(to)"
          @click="onTransitionClick(to)"
        >
          <component :is="transitionIcon(to)" class="size-4" aria-hidden="true" />
          <span>{{ t(`admin.orders.detail.transition.${to}`) }}</span>
        </button>
      </div>
      <p
        v-if="isBridal && bridalStatus !== 'delivery_agreed' && allowedTransitions.includes('out_for_delivery')"
        class="text-xs text-muted-foreground font-medium"
      >
        {{ t('admin.orders.bridal.outForDeliveryBlockedReason') }}
      </p>
    </div>

    <!-- Cancel dialog: shadcn Dialog gives role=dialog, focus trap and Escape to close. -->
    <Dialog v-model:open="cancelDialogOpen">
      <DialogContent class="w-full max-w-[calc(100vw-2rem)] rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-lg font-bold text-foreground">
            {{ t('admin.orders.dialogs.cancelTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-1 text-xs text-muted-foreground">
            {{ t('admin.orders.dialogs.cancelDescription') }}
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-col gap-1.5">
          <label for="cancel-reason" class="text-xs font-bold text-foreground">
            {{ t('admin.orders.dialogs.cancelReasonLabel') }}
          </label>
          <textarea
            id="cancel-reason"
            v-model="cancelReason"
            rows="3"
            maxlength="300"
            :placeholder="t('admin.orders.dialogs.cancelReasonPlaceholder')"
            :aria-invalid="cancelError ? 'true' : undefined"
            :aria-describedby="cancelError ? 'cancel-reason-error' : undefined"
            class="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="cancelError" id="cancel-reason-error" class="text-xs font-semibold text-destructive">
            {{ cancelError }}
          </p>
        </div>

        <DialogFooter class="gap-2 sm:gap-2">
          <Button variant="outline" class="min-h-11" @click="cancelDialogOpen = false">
            {{ t('common.cancel') }}
          </Button>
          <Button variant="destructive" class="min-h-11" @click="handleCancelSubmit">
            {{ t('admin.orders.dialogs.confirmCancel') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
