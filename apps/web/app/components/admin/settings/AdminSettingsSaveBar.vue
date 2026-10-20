<script setup lang="ts">
import { RotateCcw, Save } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  saving: boolean
  dirty: boolean
  hydrated: boolean
}>()

const emit = defineEmits<{
  save: []
  discard: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="props.dirty || props.saving"
    class="sticky bottom-0 z-20 -mx-6 mt-2 flex flex-col-reverse gap-2 border-t border-border/80 bg-card/95 px-6 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
  >
    <span class="text-xs font-semibold text-muted-foreground">
      {{ t('admin.settings.saveBar.unsaved') }}
    </span>
    <div class="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        :disabled="props.saving || !props.hydrated"
        class="min-h-11 sm:min-h-9 text-xs"
        @click="emit('discard')"
      >
        <RotateCcw class="size-3.5 me-1.5" aria-hidden="true" />
        <span>{{ t('admin.settings.saveBar.discard') }}</span>
      </Button>
      <Button
        type="button"
        :disabled="props.saving || !props.hydrated"
        class="min-h-11 sm:min-h-9 text-xs font-bold bg-serag-night text-serag-ivory hover:bg-serag-green dark:bg-serag-gold dark:text-serag-ink"
        @click="emit('save')"
      >
        <Save class="size-3.5 me-1.5" aria-hidden="true" />
        <span>
          {{ props.saving ? t('admin.settings.saveBar.saving') : t('admin.settings.saveBar.save') }}
        </span>
      </Button>
    </div>
  </div>
</template>
