<script setup lang="ts">
import { AlertCircle, FileText, Loader2, UploadCloud } from '@lucide/vue'

const props = defineProps<{
  loading: boolean
  fileName: string
  fileError: string | null
  disabled: boolean
}>()

const emit = defineEmits<{
  fileSelected: [file: File]
}>()

const { t } = useI18n()
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    emit('fileSelected', file)
  }
  // Reset input value so same file can be selected again if needed
  target.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (props.disabled || props.loading) return
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    emit('fileSelected', file)
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (!props.disabled && !props.loading) {
    isDragging.value = true
  }
}

function onDragLeave() {
  isDragging.value = false
}

function triggerFilePicker() {
  if (props.disabled || props.loading) return
  fileInputRef.value?.click()
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      role="button"
      tabindex="0"
      :aria-disabled="disabled || loading"
      :aria-label="t('admin.products.import.dropzone.ariaLabel')"
      :class="[
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDragging
          ? 'border-serag-gold bg-serag-gold/5 scale-[1.005]'
          : 'border-border bg-card hover:border-serag-gold/60 hover:bg-muted/40',
        disabled || loading ? 'opacity-60 pointer-events-none' : '',
      ]"
      @click="triggerFilePicker"
      @keydown.enter.prevent="triggerFilePicker"
      @keydown.space.prevent="triggerFilePicker"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept=".csv,text/csv,application/vnd.ms-excel"
        class="sr-only"
        tabindex="-1"
        :disabled="disabled || loading"
        @change="onFileChange"
      >

      <!-- Icon & Text -->
      <div class="flex flex-col items-center gap-3">
        <div
          class="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors group-hover:text-foreground"
        >
          <Loader2 v-if="loading" class="size-7 animate-spin text-serag-gold" aria-hidden="true" />
          <UploadCloud v-else class="size-7" aria-hidden="true" />
        </div>

        <div class="space-y-1">
          <p class="font-display font-semibold text-foreground text-base">
            <span v-if="loading">{{ t('admin.products.import.dropzone.reading') }}</span>
            <span v-else>{{ t('admin.products.import.dropzone.prompt') }}</span>
          </p>
          <p class="text-xs text-muted-foreground">
            {{ t('admin.products.import.dropzone.hint') }}
          </p>
        </div>

        <!-- Selected File Indicator -->
        <div
          v-if="fileName && !loading"
          class="inline-flex items-center gap-2 rounded-xl bg-serag-gold/15 px-3 py-1.5 text-xs font-semibold text-serag-night dark:text-serag-gold"
        >
          <FileText class="size-4" aria-hidden="true" />
          <span class="max-w-[260px] truncate">{{ fileName }}</span>
        </div>
      </div>
    </div>

    <!-- Error message if any -->
    <div
      v-if="fileError"
      role="alert"
      class="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive"
    >
      <AlertCircle class="size-4 shrink-0" aria-hidden="true" />
      <span>{{ fileError }}</span>
    </div>
  </div>
</template>
