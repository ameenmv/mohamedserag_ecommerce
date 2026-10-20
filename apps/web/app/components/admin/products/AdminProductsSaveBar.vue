<script setup lang="ts">
import { AlertCircle, Check, Loader2 } from '@lucide/vue'

defineProps<{
  isDirty: boolean
  saving: boolean
  hydrated: boolean
  isEditMode: boolean
  serverError?: string
}>()

const emit = defineEmits<{
  save: []
  cancel: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="sticky bottom-0 z-30 -mx-4 -mb-16 mt-6 border-t border-border bg-background/95 px-4 py-3.5 backdrop-blur-md sm:-mx-8 sm:px-8"
  >
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
      <!-- Error or Status hint -->
      <div class="flex items-center gap-2 text-xs sm:text-sm">
        <div v-if="serverError" class="flex items-center gap-1.5 text-destructive font-semibold">
          <AlertCircle class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ serverError }}</span>
        </div>
        <div v-else-if="isDirty" class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
          <span class="size-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          <span>{{ t('admin.products.editor.unsavedBadge') }}</span>
        </div>
        <div v-else-if="isEditMode" class="flex items-center gap-1.5 text-muted-foreground">
          <Check class="size-4 text-serag-green dark:text-serag-gold" aria-hidden="true" />
          <span>{{ t('admin.products.editor.allSaved') }}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-3 ms-auto">
        <Button
          type="button"
          variant="outline"
          size="default"
          :disabled="saving || !hydrated"
          class="h-11 rounded-xl px-5 text-sm font-semibold"
          @click="emit('cancel')"
        >
          {{ t('admin.products.editor.cancel') }}
        </Button>

        <Button
          type="button"
          size="default"
          :disabled="!isDirty || saving || !hydrated"
          class="h-11 rounded-xl bg-serag-gold text-serag-ink font-bold px-6 text-sm hover:bg-serag-gold-hi transition-all shadow-xs"
          @click="emit('save')"
        >
          <Loader2 v-if="saving" class="size-4 animate-spin me-1.5" aria-hidden="true" />
          <span>
            {{
              saving
                ? t('admin.products.editor.saving')
                : isEditMode
                  ? t('admin.products.editor.save')
                  : t('admin.products.editor.create')
            }}
          </span>
          <kbd class="num ms-2 hidden rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-bold sm:inline-block">
            Ctrl+S
          </kbd>
        </Button>
      </div>
    </div>
  </div>
</template>
