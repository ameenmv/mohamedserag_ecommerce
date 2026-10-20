<script setup lang="ts">
import { Check, Loader2, UploadCloud } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { HomeSaveStatus } from '~/composables/useAdminHomeEditor'

const props = defineProps<{
  changes: number
  status: HomeSaveStatus
  hydrated: boolean
  publishing: boolean
}>()

const emit = defineEmits<{
  (e: 'publish', label?: string): void
  (e: 'discard'): void
}>()

const { t } = useI18n()

const dialogOpen = ref(false)
const label = ref('')
const statusRef = ref<HTMLElement | null>(null)

const canPublish = computed(() => props.changes > 0 && !props.publishing)

const statusKey = computed(() => {
  switch (props.status) {
    case 'saving':
      return 'admin.content.publishBar.saving'
    case 'saved':
      return 'admin.content.publishBar.saved'
    case 'error':
      return 'admin.content.publishBar.error'
    default:
      return 'admin.content.publishBar.idle'
  }
})

function openDialog(): void {
  if (!canPublish.value) return
  label.value = ''
  dialogOpen.value = true
}

function confirmPublish(): void {
  if (!canPublish.value) return
  emit('publish', label.value.trim() || undefined)
  dialogOpen.value = false
}

function focusStatus(): void {
  statusRef.value?.focus()
}

defineExpose({ focusStatus })

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    openDialog()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    class="sticky bottom-0 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur"
    :aria-label="t('admin.content.publishBar.label')"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <b class="text-sm text-foreground">{{ t('admin.content.publishBar.pageName') }}</b>
    </div>

    <span
      v-if="changes > 0"
      class="num rounded-full bg-serag-gold/20 px-3 py-1.5 text-xs font-bold text-serag-green dark:text-serag-gold"
    >
      {{ t('admin.content.publishBar.pending', { count: changes }) }}
    </span>
    <span
      v-else
      class="num rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"
    >
      {{ t('admin.content.publishBar.allPublished') }}
    </span>

    <span
      ref="statusRef"
      tabindex="-1"
      role="status"
      aria-live="polite"
      class="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Loader2 v-if="status === 'saving'" class="size-4 animate-spin" aria-hidden="true" />
      <Check v-else-if="status === 'saved'" class="size-4 text-emerald-600" aria-hidden="true" />
      <span>{{ t(statusKey) }}</span>
    </span>

    <Button
      type="button"
      variant="outline"
      :disabled="!hydrated || changes === 0"
      class="min-h-11"
      @click="emit('discard')"
    >
      {{ t('admin.content.publishBar.discard') }}
    </Button>

    <Button
      type="button"
      :disabled="!hydrated || !canPublish"
      class="min-h-11 bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi"
      @click="openDialog"
    >
      <UploadCloud class="size-4" aria-hidden="true" />
      <span>{{ t('admin.content.publishBar.publish') }}</span>
    </Button>

    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent class="w-full max-w-[calc(100vw-2rem)] rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-lg font-bold text-foreground">
            {{ t('admin.content.publishDialog.title') }}
          </DialogTitle>
          <DialogDescription class="pt-1 text-xs text-muted-foreground">
            {{ t('admin.content.publishDialog.description') }}
          </DialogDescription>
        </DialogHeader>

        <form class="flex flex-col gap-3 py-2" @submit.prevent="confirmPublish">
          <div class="flex flex-col gap-1.5">
            <label for="publish-label" class="text-xs font-bold text-foreground">
              {{ t('admin.content.publishDialog.labelLabel') }}
            </label>
            <Input
              id="publish-label"
              v-model="label"
              :disabled="!hydrated || publishing"
              maxlength="80"
              :placeholder="t('admin.content.publishDialog.labelPlaceholder')"
            />
          </div>

          <DialogFooter class="flex flex-col-reverse gap-2 pt-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              :disabled="publishing"
              class="min-h-12 w-full font-medium sm:w-auto"
              @click="dialogOpen = false"
            >
              {{ t('common.cancel') }}
            </Button>
            <Button
              type="submit"
              :disabled="!hydrated || publishing"
              class="min-h-12 w-full bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi sm:w-auto"
            >
              <Loader2 v-if="publishing" class="size-4 animate-spin" aria-hidden="true" />
              <span>{{ publishing ? t('admin.content.publishDialog.publishing') : t('admin.content.publishDialog.confirm') }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
