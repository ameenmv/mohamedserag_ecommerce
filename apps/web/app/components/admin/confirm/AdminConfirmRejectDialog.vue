<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { validateRejectReason } from '~/utils/admin-confirm'
import { Loader2, X } from '@lucide/vue'

const props = defineProps<{
  open: boolean
  pending: boolean
  hydrated: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'reject', reason: string): void
}>()

const { t } = useI18n()

const reason = ref('')
const reasonError = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      reason.value = ''
      reasonError.value = ''
    }
  },
)

function onSubmit(): void {
  if (!props.hydrated || props.pending) return

  const validation = validateRejectReason(reason.value)
  if (!validation.success) {
    reasonError.value = t(validation.errorKey)
    return
  }

  reasonError.value = ''
  emit('reject', validation.reason)
}

function onCancel(): void {
  if (props.pending) return
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-6 rounded-3xl">
      <DialogHeader>
        <DialogTitle class="text-lg font-bold text-foreground">
          {{ t('admin.confirm.dialog.title') }}
        </DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground pt-1">
          {{ t('admin.confirm.dialog.description') }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-3 py-2" @submit.prevent="onSubmit">
        <div class="flex flex-col gap-1.5">
          <label for="reject-reason" class="text-xs font-bold text-foreground">
            {{ t('admin.confirm.dialog.reasonLabel') }}
          </label>
          <textarea
            id="reject-reason"
            v-model="reason"
            rows="3"
            :disabled="!hydrated || pending"
            :placeholder="t('admin.confirm.dialog.reasonPlaceholder')"
            :aria-invalid="Boolean(reasonError)"
            :aria-describedby="reasonError ? 'reject-reason-error' : undefined"
            class="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:opacity-50"
            @input="reasonError = ''"
          />
          <span
            v-if="reasonError"
            id="reject-reason-error"
            role="alert"
            class="text-xs font-semibold text-destructive"
          >
            {{ reasonError }}
          </span>
        </div>

        <DialogFooter class="flex flex-col-reverse sm:flex-row gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            :disabled="pending"
            class="min-h-12 w-full sm:w-auto font-medium"
            @click="onCancel"
          >
            {{ t('admin.confirm.dialog.cancel') }}
          </Button>

          <Button
            type="submit"
            variant="destructive"
            :disabled="!hydrated || pending || reason.trim().length < 3"
            class="min-h-12 w-full sm:w-auto font-bold"
          >
            <Loader2 v-if="pending" class="size-4 animate-spin" aria-hidden="true" />
            <X v-else class="size-4" aria-hidden="true" />
            <span>{{ pending ? t('admin.confirm.dialog.rejecting') : t('admin.confirm.dialog.confirmReject') }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
