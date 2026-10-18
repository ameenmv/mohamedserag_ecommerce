<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { piastresToEgp, type AdminConfirmSummary } from '@serag/shared'
import { parseConfirmAmountEgp, remainingPiastres } from '~/utils/admin-confirm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Check, Loader2, X } from '@lucide/vue'

const props = defineProps<{
  summary: AdminConfirmSummary
  pending: boolean
  hydrated: boolean
  actionError: string | null
}>()

const emit = defineEmits<{
  (e: 'confirm', amountPiastres: number, note?: string): void
  (e: 'openReject'): void
}>()

const { t } = useI18n()

// Amount initialized in EGP
const initialEgp = piastresToEgp(props.summary.expectedAmount)
const amountInput = ref(String(initialEgp))
const noteInput = ref('')
const amountError = ref('')

// Reset amount when summary changes
watch(
  () => props.summary.expectedAmount,
  (newExpected) => {
    amountInput.value = String(piastresToEgp(newExpected))
    amountError.value = ''
  },
)

const maxPiastres = computed(() => remainingPiastres(props.summary))

function handleConfirm(): void {
  if (!props.hydrated || props.pending) return

  const parsed = parseConfirmAmountEgp(amountInput.value, maxPiastres.value)
  if (!parsed.success) {
    amountError.value = t(parsed.errorKey)
    return
  }

  amountError.value = ''
  emit('confirm', parsed.piastres, noteInput.value.trim() || undefined)
}

function handleReject(): void {
  if (!props.hydrated || props.pending) return
  emit('openReject')
}
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <!-- Server Action Error -->
    <div
      v-if="actionError"
      role="alert"
      class="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm font-semibold text-destructive"
    >
      <AlertCircle class="size-4 shrink-0" aria-hidden="true" />
      <span>{{ t(actionError) }}</span>
    </div>

    <!-- Amount Input -->
    <div class="flex flex-col gap-1.5">
      <label for="confirm-amount" class="text-xs font-bold text-foreground">
        {{ t('admin.confirm.actions.amountLabel') }}
      </label>
      <Input
        id="confirm-amount"
        v-model="amountInput"
        type="text"
        inputmode="decimal"
        dir="ltr"
        :disabled="!hydrated || pending"
        :aria-invalid="Boolean(amountError)"
        :aria-describedby="amountError ? 'confirm-amount-error' : undefined"
        class="h-12 text-base font-mono font-bold tracking-wide"
        :placeholder="t('admin.confirm.actions.amountPlaceholder')"
        @input="amountError = ''"
      />
      <span
        v-if="amountError"
        id="confirm-amount-error"
        role="alert"
        class="text-xs font-semibold text-destructive"
      >
        {{ amountError }}
      </span>
    </div>

    <!-- Optional Note -->
    <div class="flex flex-col gap-1.5">
      <label for="confirm-note" class="text-xs font-medium text-muted-foreground">
        {{ t('admin.confirm.actions.noteLabel') }}
      </label>
      <Input
        id="confirm-note"
        v-model="noteInput"
        type="text"
        :disabled="!hydrated || pending"
        class="h-11 text-sm"
        :placeholder="t('admin.confirm.actions.notePlaceholder')"
      />
    </div>

    <!-- Buttons (Large Tap Targets >= 48px) -->
    <div class="flex flex-col gap-3 pt-2">
      <!-- Primary Confirm Button -->
      <Button
        type="button"
        size="lg"
        :disabled="!hydrated || pending"
        class="min-h-12 w-full text-base font-bold shadow-sm"
        @click="handleConfirm"
      >
        <Loader2 v-if="pending" class="size-5 animate-spin" aria-hidden="true" />
        <Check v-else class="size-5" aria-hidden="true" />
        <span>{{ pending ? t('admin.confirm.actions.confirming') : t('admin.confirm.actions.confirmButton') }}</span>
      </Button>

      <!-- Secondary Reject Button -->
      <Button
        type="button"
        variant="destructive"
        size="lg"
        :disabled="!hydrated || pending"
        class="min-h-12 w-full text-sm font-bold bg-transparent text-destructive border border-destructive/40 hover:bg-destructive/10"
        @click="handleReject"
      >
        <X class="size-4" aria-hidden="true" />
        <span>{{ t('admin.confirm.actions.rejectButton') }}</span>
      </Button>
    </div>
  </div>
</template>
