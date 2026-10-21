<script setup lang="ts">
import type {
  AdminNotifyEntry,
  AdminNotifyMarkSentResponse,
  AdminNotifyProductDetail,
} from '@serag/shared'
import {
  AlertCircle,
  Clock,
  Loader2,
  MessageCircle,
  RefreshCw,
} from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { parseAdminApiError } from '~/utils/admin-api-errors'
import { formatDateTime } from '~/utils/date-format'

const props = defineProps<{
  open: boolean
  productId: string | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  sent: [payload: AdminNotifyMarkSentResponse]
}>()

const { t, locale, localeProperties } = useI18n()
const notify = useNotify()
const notifyApi = useAdminNotify()

const side = computed<'right' | 'left'>(() =>
  localeProperties.value.dir === 'ltr' ? 'right' : 'left',
)

const detail = ref<AdminNotifyProductDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const sendingId = ref<string | null>(null)

async function fetchDetail(id: string): Promise<void> {
  loading.value = true
  error.value = null
  try {
    detail.value = await notifyApi.detail(id)
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    error.value = parsed.message
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.productId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      void fetchDetail(id)
    } else if (!isOpen) {
      detail.value = null
      error.value = null
    }
  },
  { immediate: true },
)

async function handleSend(entry: AdminNotifyEntry): Promise<void> {
  if (!detail.value?.product.available) return

  // Synchronously open a blank window before async call to avoid popup blocker suppression
  let newTab: Window | null = null
  if (typeof window !== 'undefined') {
    newTab = window.open('', '_blank')
  }

  sendingId.value = entry.id
  try {
    const res = await notifyApi.markSent(entry.id)
    if (newTab) {
      newTab.location.href = res.whatsappUrl
    } else if (typeof window !== 'undefined') {
      window.location.href = res.whatsappUrl
    }

    // Update the entry in place
    const idx = detail.value.entries.findIndex((e) => e.id === entry.id)
    if (idx !== -1) {
      detail.value.entries[idx] = res.entry
    }

    emit('sent', res)
    notify.success(t('admin.notify.detail.sentSuccess'))
  } catch (err: unknown) {
    if (newTab) {
      newTab.close()
    }
    const parsed = parseAdminApiError(err, t)
    notify.error(parsed.message)
  } finally {
    sendingId.value = null
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      :side="side"
      class="w-full max-w-2xl overflow-y-auto p-5 sm:max-w-2xl sm:p-6"
    >
      <SheetHeader class="text-start pb-4 border-b border-border/80">
        <SheetTitle class="font-display text-2xl text-primary flex items-center gap-2">
          <MessageCircle class="size-6 text-serag-gold shrink-0" aria-hidden="true" />
          <span>{{ t('admin.notify.detail.title') }}</span>
        </SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          {{ detail?.product.name }}
        </SheetDescription>
      </SheetHeader>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col gap-4 py-6">
        <Skeleton class="h-24 w-full rounded-2xl" />
        <Skeleton class="h-48 w-full rounded-2xl" />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        role="alert"
        class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center my-6"
      >
        <AlertCircle class="size-8 text-destructive" aria-hidden="true" />
        <p class="text-sm font-semibold text-destructive">
          {{ error }}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="min-h-10"
          @click="props.productId && fetchDetail(props.productId)"
        >
          <RefreshCw class="size-4 me-1.5" aria-hidden="true" />
          <span>{{ t('admin.notify.retry') }}</span>
        </Button>
      </div>

      <!-- Content -->
      <div v-else-if="detail" class="flex flex-col gap-6 py-4">
        <!-- Product Summary Card -->
        <div class="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="flex flex-col gap-1 min-w-0">
              <span class="num text-xs font-mono text-muted-foreground">
                {{ detail.product.modelCode }}
              </span>
              <h3 class="text-base font-bold text-foreground">
                {{ detail.product.name }}
              </h3>
            </div>

            <Badge
              variant="outline"
              :class="
                detail.product.available
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-bold'
                  : 'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400 font-bold'
              "
            >
              {{ detail.product.available ? t('admin.notify.badge.available') : t('admin.notify.badge.outOfStock') }}
            </Badge>
          </div>

          <div class="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/60 pt-3">
            <span>
              {{ t('admin.notify.table.stock') }}:
              <strong class="num font-bold text-foreground">{{ detail.product.stock }}</strong>
            </span>
            <span>
              {{ t('admin.notify.table.waiting') }}:
              <strong class="num font-bold text-amber-700 dark:text-amber-400">
                {{ detail.entries.filter((e) => e.status === 'waiting').length }}
              </strong>
            </span>
            <span>
              {{ t('admin.notify.table.sent') }}:
              <strong class="num font-bold text-emerald-700 dark:text-emerald-400">
                {{ detail.entries.filter((e) => e.status === 'sent').length }}
              </strong>
            </span>
          </div>

          <div
            v-if="!detail.product.available"
            class="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-400"
          >
            {{ t('admin.notify.detail.notAvailableNotice') }}
          </div>
        </div>

        <!-- Entries Section -->
        <div class="flex flex-col gap-3">
          <h4 class="text-sm font-bold text-foreground">
            {{ t('admin.notify.detail.openRequests', { count: detail.entries.length }) }}
          </h4>

          <!-- Empty Requests -->
          <div
            v-if="detail.entries.length === 0"
            class="rounded-2xl border border-dashed border-border p-8 text-center"
          >
            <Clock class="size-8 mx-auto text-muted-foreground mb-2" aria-hidden="true" />
            <p class="text-xs text-muted-foreground">
              {{ t('admin.notify.detail.empty') }}
            </p>
          </div>

          <!-- Desktop Table -->
          <div
            v-else
            class="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
          >
            <table class="w-full text-start text-xs">
              <thead class="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                <tr>
                  <th class="py-3 ps-4 pe-2 text-start">{{ t('admin.notify.detail.customerName') }}</th>
                  <th class="py-3 px-2 text-start">{{ t('admin.notify.detail.phone') }}</th>
                  <th class="py-3 px-2 text-start">{{ t('admin.notify.detail.status') }}</th>
                  <th class="py-3 px-2 text-start">{{ t('admin.notify.detail.requestDate') }}</th>
                  <th class="py-3 px-2 text-start">{{ t('admin.notify.detail.sentDate') }}</th>
                  <th class="py-3 ps-2 pe-4 text-end">{{ t('admin.notify.table.actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="entry in detail.entries"
                  :key="entry.id"
                  class="transition-colors hover:bg-muted/20"
                >
                  <td class="py-3.5 ps-4 pe-2 font-bold text-foreground">
                    {{ entry.name }}
                  </td>
                  <td class="py-3.5 px-2">
                    <span class="num font-mono text-muted-foreground" dir="ltr">
                      {{ entry.phone }}
                    </span>
                  </td>
                  <td class="py-3.5 px-2">
                    <Badge
                      variant="outline"
                      :class="
                        entry.status === 'sent'
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-bold'
                          : 'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400 font-bold'
                      "
                    >
                      {{ entry.status === 'sent' ? t('admin.notify.badge.sent') : t('admin.notify.badge.waiting') }}
                    </Badge>
                  </td>
                  <td class="py-3.5 px-2 text-muted-foreground num">
                    {{ formatDateTime(entry.createdAt, locale) }}
                  </td>
                  <td class="py-3.5 px-2 text-muted-foreground num">
                    {{ entry.sentAt ? formatDateTime(entry.sentAt, locale) : '-' }}
                  </td>
                  <td class="py-3.5 ps-2 pe-4 text-end">
                    <div class="flex flex-col items-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        :disabled="!detail.product.available || sendingId === entry.id"
                        class="min-h-9 font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        @click="handleSend(entry)"
                      >
                        <Loader2 v-if="sendingId === entry.id" class="size-3.5 animate-spin me-1.5" aria-hidden="true" />
                        <MessageCircle v-else class="size-3.5 me-1.5" aria-hidden="true" />
                        <span>
                          {{ entry.status === 'sent' ? t('admin.notify.detail.resendWhatsapp') : t('admin.notify.detail.sendWhatsapp') }}
                        </span>
                      </Button>
                      <span
                        v-if="!detail.product.available"
                        class="text-[11px] text-amber-700 dark:text-amber-400 font-medium"
                      >
                        {{ t('admin.notify.detail.notAvailableHelper') }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div v-if="detail.entries.length > 0" class="flex flex-col gap-3 md:hidden">
            <div
              v-for="entry in detail.entries"
              :key="entry.id"
              class="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 shadow-xs"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold text-foreground text-sm">{{ entry.name }}</span>
                <Badge
                  variant="outline"
                  :class="
                    entry.status === 'sent'
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-bold'
                      : 'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400 font-bold'
                  "
                >
                  {{ entry.status === 'sent' ? t('admin.notify.badge.sent') : t('admin.notify.badge.waiting') }}
                </Badge>
              </div>

              <div class="flex flex-col gap-1 text-xs text-muted-foreground">
                <div class="flex items-center justify-between">
                  <span>{{ t('admin.notify.detail.phone') }}:</span>
                  <span class="num font-mono text-foreground font-semibold" dir="ltr">{{ entry.phone }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>{{ t('admin.notify.detail.requestDate') }}:</span>
                  <span class="num">{{ formatDateTime(entry.createdAt, locale) }}</span>
                </div>
                <div v-if="entry.sentAt" class="flex items-center justify-between">
                  <span>{{ t('admin.notify.detail.sentDate') }}:</span>
                  <span class="num">{{ formatDateTime(entry.sentAt, locale) }}</span>
                </div>
              </div>

              <div class="flex flex-col gap-1 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  :disabled="!detail.product.available || sendingId === entry.id"
                  class="w-full min-h-11 font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  @click="handleSend(entry)"
                >
                  <Loader2 v-if="sendingId === entry.id" class="size-4 animate-spin me-2" aria-hidden="true" />
                  <MessageCircle v-else class="size-4 me-2" aria-hidden="true" />
                  <span>
                    {{ entry.status === 'sent' ? t('admin.notify.detail.resendWhatsapp') : t('admin.notify.detail.sendWhatsapp') }}
                  </span>
                </Button>
                <p
                  v-if="!detail.product.available"
                  class="text-[11px] text-center text-amber-700 dark:text-amber-400 font-medium"
                >
                  {{ t('admin.notify.detail.notAvailableHelper') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
