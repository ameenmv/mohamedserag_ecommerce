<script setup lang="ts">
import type { AdminProductImage } from '@serag/shared'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ImagePlus,
  Loader2,
  Trash2,
} from '@lucide/vue'

const props = defineProps<{
  isEditMode: boolean
  images: AdminProductImage[]
  disabled: boolean
  uploading: boolean
}>()

const emit = defineEmits<{
  uploadFile: [file: File]
  patchImage: [imageId: string, patch: { alt?: string; isReal?: boolean }]
  moveImage: [fromIndex: number, toIndex: number]
  removeImage: [imageId: string]
}>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function openFilePicker() {
  if (props.disabled || props.uploading || !props.isEditMode) return
  fileInput.value?.click()
}

async function handleFiles(files: FileList | null) {
  if (!files || files.length === 0) return
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file) {
      emit('uploadFile', file)
    }
  }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (props.disabled || props.uploading || !props.isEditMode) return
  handleFiles(e.dataTransfer?.files ?? null)
}

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  handleFiles(target.files)
}

function onAltBlur(img: AdminProductImage, event: Event) {
  const input = event.target as HTMLInputElement
  const newAlt = input.value.trim()
  if (newAlt !== img.alt) {
    emit('patchImage', img.id, { alt: newAlt })
  }
}

function onRealToggle(img: AdminProductImage, newVal: boolean) {
  emit('patchImage', img.id, { isReal: newVal })
}
</script>

<template>
  <Card class="rounded-2xl border border-border bg-card p-6 shadow-xs">
    <CardHeader class="p-0 pb-4">
      <CardTitle class="font-display text-xl text-primary">
        {{ t('admin.products.editor.images.title') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="p-0 flex flex-col gap-5">
      <!-- If new product, show prompt to save first -->
      <div
        v-if="!isEditMode"
        class="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground"
      >
        <Camera class="mx-auto size-8 opacity-40 mb-2" aria-hidden="true" />
        <p class="font-medium text-foreground">
          {{ t('admin.products.editor.images.saveFirst') }}
        </p>
      </div>

      <!-- Upload Zone in edit mode -->
      <div v-else class="flex flex-col gap-4">
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          :aria-label="t('admin.products.editor.images.dragDrop')"
          class="sr-only"
          @change="handleFileInputChange"
        >

        <div
          class="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer"
          :class="[
            isDragging
              ? 'border-serag-gold bg-serag-gold/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/10',
            disabled || uploading ? 'opacity-60 cursor-not-allowed' : '',
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="openFilePicker"
        >
          <Loader2 v-if="uploading" class="size-8 animate-spin text-primary" aria-hidden="true" />
          <ImagePlus v-else class="size-8 text-muted-foreground mb-2" aria-hidden="true" />

          <p class="text-sm font-semibold text-foreground">
            {{ uploading ? t('admin.products.editor.images.uploading') : t('admin.products.editor.images.dragDrop') }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ t('admin.products.editor.images.allowedTypes') }}
          </p>
        </div>

        <!-- Thumbnails Grid -->
        <div v-if="images.length > 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(img, idx) in images"
            :key="img.id"
            class="relative flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-2xs"
          >
            <!-- Image preview -->
            <div class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-serag-ivory/60 dark:bg-muted/30">
              <img
                :src="img.url"
                :alt="img.alt"
                class="size-full object-contain p-2"
              >

              <!-- Primary image badge -->
              <span
                v-if="idx === 0"
                class="absolute top-2 start-2 rounded-md bg-serag-night px-2 py-0.5 text-[10px] font-bold text-serag-gold-hi shadow-xs"
              >
                {{ t('admin.products.editor.images.primary') }}
              </span>

              <!-- Real photo chip if checked -->
              <span
                v-if="img.isReal"
                class="absolute bottom-2 start-2 rounded-md bg-serag-green px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs"
              >
                {{ t('admin.products.editor.images.realPhoto') }}
              </span>
            </div>

            <!-- Controls row -->
            <div class="flex items-center justify-between gap-1 pt-1">
              <!-- Reorder buttons -->
              <div class="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  :disabled="disabled || idx === 0"
                  class="size-8 rounded-md"
                  :aria-label="t('admin.products.editor.images.moveStartN', { n: idx + 1 })"
                  @click="emit('moveImage', idx, idx - 1)"
                >
                  <ArrowRight class="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  :disabled="disabled || idx === images.length - 1"
                  class="size-8 rounded-md"
                  :aria-label="t('admin.products.editor.images.moveEndN', { n: idx + 1 })"
                  @click="emit('moveImage', idx, idx + 1)"
                >
                  <ArrowLeft class="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                </Button>
              </div>

              <!-- Real photo toggle -->
              <div class="flex items-center gap-1.5">
                <AdminFormCheckbox
                  :id="`is-real-${img.id}`"
                  :model-value="img.isReal"
                  :disabled="disabled"
                  :label="t('admin.products.editor.images.realPhoto')"
                  :aria-label="t('admin.products.editor.images.realPhotoN', { n: idx + 1 })"
                  class="text-xs"
                  @update:model-value="onRealToggle(img, Boolean($event))"
                />
              </div>

              <!-- Delete image button -->
              <Button
                type="button"
                variant="ghost"
                size="icon"
                :disabled="disabled"
                class="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                :aria-label="t('admin.products.editor.images.deleteN', { n: idx + 1 })"
                @click="emit('removeImage', img.id)"
              >
                <Trash2 class="size-4" aria-hidden="true" />
              </Button>
            </div>

            <!-- Alt text input -->
            <div class="mt-1">
              <Input
                :value="img.alt"
                type="text"
                :placeholder="t('admin.products.editor.images.altPlaceholder')"
                :disabled="disabled"
                class="h-8 rounded-md text-xs"
                :aria-label="t('admin.products.editor.images.altN', { n: idx + 1 })"
                @blur="onAltBlur(img, $event)"
                @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
              />
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
