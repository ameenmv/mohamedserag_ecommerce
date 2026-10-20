<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Loader2 } from '@lucide/vue'

defineProps<{
  open: boolean
  count: number
  applying: boolean
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader class="text-start">
        <DialogTitle class="font-display text-xl text-foreground">
          {{ t('admin.products.import.confirmDialog.title') }}
        </DialogTitle>
        <DialogDescription class="pt-2 text-sm text-muted-foreground leading-relaxed">
          {{ t('admin.products.import.confirmDialog.description', { count }) }}
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4">
        <Button
          type="button"
          variant="outline"
          :disabled="applying"
          class="rounded-xl h-11"
          @click="emit('update:open', false)"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          type="button"
          :disabled="applying"
          class="rounded-xl h-11 gap-2 bg-serag-night text-serag-gold hover:bg-serag-green font-bold"
          @click="emit('confirm')"
        >
          <Loader2 v-if="applying" class="size-4 animate-spin" aria-hidden="true" />
          <Check v-else class="size-4 stroke-[2.5]" aria-hidden="true" />
          <span>{{ t('admin.products.import.confirmDialog.confirmAction', { count }) }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
