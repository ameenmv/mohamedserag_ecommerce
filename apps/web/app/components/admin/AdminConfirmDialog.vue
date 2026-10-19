<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const { t } = useI18n()
const { state, settle } = useConfirmDialog()

const options = computed(() => state.value.options)
const destructive = computed(() => options.value?.tone === 'destructive')

function onOpenChange(open: boolean) {
  // Esc and overlay click close the dialog: treat them as cancel.
  if (!open) settle(false)
}
</script>

<template>
  <Dialog :open="state.open" @update:open="onOpenChange">
    <DialogContent
      role="alertdialog"
      :show-close-button="false"
      class="gap-6 rounded-3xl border-border p-6 sm:max-w-md sm:p-7"
    >
      <DialogHeader class="flex-row items-start gap-4 text-start">
        <span
          :class="[
            'flex size-12 shrink-0 items-center justify-center rounded-2xl',
            destructive ? 'bg-destructive/10 text-destructive' : 'bg-serag-gold/15 text-serag-gold',
          ]"
          aria-hidden="true"
        >
          <TriangleAlert class="size-6" aria-hidden="true" />
        </span>
        <div class="flex min-w-0 flex-col gap-1.5 pt-0.5">
          <DialogTitle class="font-display text-xl leading-snug text-foreground">
            {{ options?.title }}
          </DialogTitle>
          <DialogDescription
            :class="options?.description ? 'text-sm leading-relaxed text-muted-foreground' : 'sr-only'"
          >
            {{ options?.description ?? options?.title }}
          </DialogDescription>
        </div>
      </DialogHeader>

      <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          class="min-h-11 w-full rounded-xl px-5 font-bold sm:w-auto"
          @click="settle(false)"
        >
          {{ options?.cancelLabel ?? t('common.cancel') }}
        </Button>
        <Button
          type="button"
          :variant="destructive ? 'destructive' : 'default'"
          class="min-h-11 w-full rounded-xl px-5 font-bold sm:w-auto"
          @click="settle(true)"
        >
          {{ options?.confirmLabel ?? t('common.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
