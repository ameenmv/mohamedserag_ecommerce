<script setup lang="ts">
import type { HomeVersionRow } from '@serag/shared'
import { History, Loader2, RotateCcw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  versions: HomeVersionRow[]
  open: boolean
  restoringId: string | null
  hydrated: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'restore', id: string): void
}>()

const { t, locale } = useI18n()

const sheetSide = computed<'left' | 'right'>(() => (locale.value === 'ar' ? 'left' : 'right'))

const confirmId = ref<string | null>(null)

const confirmTarget = computed(() =>
  props.versions.find((version) => version.id === confirmId.value) ?? null,
)

const formatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
)

function formatDate(value: string): string {
  return formatter.value.format(new Date(value))
}

function askRestore(id: string): void {
  confirmId.value = id
}

function confirmRestore(): void {
  if (!confirmId.value) return
  emit('restore', confirmId.value)
  confirmId.value = null
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent :side="sheetSide" class="w-full gap-4 overflow-y-auto p-5 sm:max-w-sm">
      <SheetHeader class="text-start">
        <SheetTitle class="flex items-center gap-2 font-display text-lg font-bold">
          <History class="size-5" aria-hidden="true" />
          <span>{{ t('admin.content.versions.title') }}</span>
        </SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          {{ t('admin.content.versions.description') }}
        </SheetDescription>
      </SheetHeader>

      <p v-if="!versions.length" class="py-6 text-center text-sm text-muted-foreground">
        {{ t('admin.content.versions.empty') }}
      </p>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="version in versions"
          :key="version.id"
          class="flex flex-col gap-2 rounded-xl border border-border p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 flex-col gap-0.5">
              <b class="truncate text-sm text-foreground">
                {{ version.label || t('admin.content.versions.untitled') }}
              </b>
              <small class="num text-xs text-muted-foreground">
                {{ formatDate(version.publishedAt) }}
              </small>
            </div>
            <span
              v-if="version.current"
              class="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
            >
              {{ t('admin.content.versions.current') }}
            </span>
          </div>

          <span class="text-xs text-muted-foreground">
            {{ version.author?.name || t('admin.content.versions.unknownAuthor') }}
          </span>

          <Button
            v-if="!version.current"
            type="button"
            variant="outline"
            :disabled="!hydrated || restoringId !== null"
            class="min-h-11 w-full"
            @click="askRestore(version.id)"
          >
            <Loader2 v-if="restoringId === version.id" class="size-4 animate-spin" aria-hidden="true" />
            <RotateCcw v-else class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.versions.restore') }}</span>
          </Button>
        </li>
      </ul>

      <Dialog :open="confirmId !== null" @update:open="confirmId = null">
        <DialogContent class="w-full max-w-[calc(100vw-2rem)] rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="text-lg font-bold text-foreground">
              {{ t('admin.content.versions.confirmTitle') }}
            </DialogTitle>
            <DialogDescription class="pt-1 text-xs text-muted-foreground">
              {{
                t('admin.content.versions.confirmDescription', {
                  label: confirmTarget?.label || t('admin.content.versions.untitled'),
                })
              }}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="flex flex-col-reverse gap-2 pt-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              class="min-h-12 w-full font-medium sm:w-auto"
              @click="confirmId = null"
            >
              {{ t('common.cancel') }}
            </Button>
            <Button
              type="button"
              class="min-h-12 w-full bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi sm:w-auto"
              @click="confirmRestore"
            >
              {{ t('admin.content.versions.confirmAction') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SheetContent>
  </Sheet>
</template>
