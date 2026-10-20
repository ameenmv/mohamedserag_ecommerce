<script setup lang="ts">
import type {
  AdminNotifyMarkSentResponse,
  AdminNotifyProductRow,
} from '@serag/shared'
import {
  AlertCircle,
  BellOff,
  ChevronRight,
  MessageCircle,
  RefreshCw,
  Search,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { parseAdminApiError } from '~/utils/admin-api-errors'
import { formatDateTime } from '~/utils/date-format'

const { t, locale } = useI18n()
const notifyApi = useAdminNotify()

const rows = ref<AdminNotifyProductRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')

const selectedProductId = ref<string | null>(null)
const sheetOpen = ref(false)

async function fetchList(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    rows.value = await notifyApi.list()
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    error.value = parsed.message
  } finally {
    loading.value = false
  }
}

void fetchList()

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(
    (r) =>
      r.product.name.toLowerCase().includes(q) ||
      r.product.modelCode.toLowerCase().includes(q),
  )
})

function openDetail(productId: string): void {
  selectedProductId.value = productId
  sheetOpen.value = true
}

function handleEntrySent(_payload: AdminNotifyMarkSentResponse): void {
  // Refresh list to recalculate waiting and sent totals accurately
  void fetchList()
}
</script>

<template>
  <div class="flex flex-col gap-4 min-w-0">
    <!-- Search Bar & Actions -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full max-w-sm">
        <Search class="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
        <Input
          v-model="searchQuery"
          type="search"
          :placeholder="t('admin.notify.searchPlaceholder')"
          class="h-11 rounded-xl bg-card ps-9 text-sm"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        class="min-h-11 self-start sm:self-auto"
        @click="fetchList"
      >
        <RefreshCw class="size-4 me-1.5" :class="{ 'animate-spin': loading }" aria-hidden="true" />
        <span>{{ t('admin.notify.refresh') }}</span>
      </Button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="flex flex-col gap-3">
      <Skeleton v-for="i in 4" :key="i" class="h-20 w-full rounded-2xl" />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      role="alert"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center my-4"
    >
      <AlertCircle class="size-9 text-destructive" aria-hidden="true" />
      <p class="text-sm font-semibold text-destructive">
        {{ error }}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="min-h-10 mt-1"
        @click="fetchList"
      >
        <RefreshCw class="size-4 me-1.5" aria-hidden="true" />
        <span>{{ t('admin.notify.retry') }}</span>
      </Button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredRows.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-card/60 p-12 text-center my-6"
    >
      <div class="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        <BellOff class="size-7" aria-hidden="true" />
      </div>
      <div class="flex flex-col gap-1 max-w-sm">
        <h3 class="font-bold text-foreground text-base">
          {{ t('admin.notify.empty') }}
        </h3>
      </div>
    </div>

    <!-- Product Rows -->
    <template v-else>
      <!-- Desktop Table -->
      <div class="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <table class="w-full text-start text-xs">
          <thead class="border-b border-border bg-muted/40 font-bold text-muted-foreground">
            <tr>
              <th class="py-3.5 ps-5 pe-2 text-start">{{ t('admin.notify.table.product') }}</th>
              <th class="py-3.5 px-3 text-start">{{ t('admin.notify.table.modelCode') }}</th>
              <th class="py-3.5 px-3 text-start">{{ t('admin.notify.table.stock') }}</th>
              <th class="py-3.5 px-3 text-start">{{ t('admin.notify.table.availability') }}</th>
              <th class="py-3.5 px-3 text-start">{{ t('admin.notify.table.waiting') }}</th>
              <th class="py-3.5 px-3 text-start">{{ t('admin.notify.table.sent') }}</th>
              <th class="py-3.5 px-3 text-start">{{ t('admin.notify.table.lastRequest') }}</th>
              <th class="py-3.5 ps-2 pe-5 text-end">{{ t('admin.notify.table.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="row in filteredRows"
              :key="row.product.id"
              class="transition-colors hover:bg-muted/30 cursor-pointer"
              :class="{
                'bg-emerald-500/5 hover:bg-emerald-500/10': row.product.available && row.waiting > 0,
              }"
              @click="openDetail(row.product.id)"
            >
              <td class="py-4 ps-5 pe-2 font-bold text-foreground">
                <div class="flex items-center gap-2">
                  <span
                    v-if="row.product.available && row.waiting > 0"
                    class="size-2 rounded-full bg-emerald-500 shrink-0"
                    :title="t('admin.notify.badge.ready')"
                  />
                  <span>{{ row.product.name }}</span>
                </div>
              </td>
              <td class="py-4 px-3 font-mono text-muted-foreground num">
                {{ row.product.modelCode }}
              </td>
              <td class="py-4 px-3 font-bold text-foreground num">
                {{ row.product.stock }}
              </td>
              <td class="py-4 px-3">
                <Badge
                  variant="outline"
                  :class="
                    row.product.available
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-bold'
                      : 'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400 font-bold'
                  "
                >
                  {{ row.product.available ? t('admin.notify.badge.available') : t('admin.notify.badge.outOfStock') }}
                </Badge>
              </td>
              <td class="py-4 px-3">
                <span
                  class="num font-bold text-sm"
                  :class="row.waiting > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'"
                >
                  {{ row.waiting }}
                </span>
              </td>
              <td class="py-4 px-3">
                <span class="num font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  {{ row.sent }}
                </span>
              </td>
              <td class="py-4 px-3 text-muted-foreground num">
                {{ formatDateTime(row.lastRequestAt, locale) }}
              </td>
              <td class="py-4 ps-2 pe-5 text-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="font-bold text-xs hover:bg-serag-night/10 dark:hover:bg-serag-gold/20"
                  @click.stop="openDetail(row.product.id)"
                >
                  <MessageCircle class="size-3.5 me-1 text-serag-gold" aria-hidden="true" />
                  <span>{{ t('admin.notify.detail.openRequests', { count: row.waiting + row.sent }) }}</span>
                  <ChevronRight class="size-3.5 ms-1 rtl:-scale-x-100" aria-hidden="true" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="flex flex-col gap-3 md:hidden">
        <div
          v-for="row in filteredRows"
          :key="row.product.id"
          class="rounded-2xl border bg-card p-4 flex flex-col gap-3 shadow-xs cursor-pointer transition-colors"
          :class="
            row.product.available && row.waiting > 0
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-border'
          "
          @click="openDetail(row.product.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="num text-[11px] font-mono text-muted-foreground">
                {{ row.product.modelCode }}
              </span>
              <h3 class="font-bold text-foreground text-sm">
                {{ row.product.name }}
              </h3>
            </div>
            <Badge
              variant="outline"
              :class="
                row.product.available
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-bold'
                  : 'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400 font-bold'
              "
            >
              {{ row.product.available ? t('admin.notify.badge.available') : t('admin.notify.badge.outOfStock') }}
            </Badge>
          </div>

          <div class="grid grid-cols-3 gap-2 border-y border-border/60 py-2.5 text-center text-xs">
            <div class="flex flex-col">
              <span class="text-muted-foreground text-[11px]">{{ t('admin.notify.table.stock') }}</span>
              <strong class="num font-bold text-foreground">{{ row.product.stock }}</strong>
            </div>
            <div class="flex flex-col">
              <span class="text-muted-foreground text-[11px]">{{ t('admin.notify.table.waiting') }}</span>
              <strong
                class="num font-bold"
                :class="row.waiting > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'"
              >
                {{ row.waiting }}
              </strong>
            </div>
            <div class="flex flex-col">
              <span class="text-muted-foreground text-[11px]">{{ t('admin.notify.table.sent') }}</span>
              <strong class="num font-bold text-emerald-700 dark:text-emerald-400">{{ row.sent }}</strong>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>{{ t('admin.notify.table.lastRequest') }}:</span>
            <span class="num">{{ formatDateTime(row.lastRequestAt, locale) }}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            class="w-full min-h-11 font-bold text-xs mt-1"
            @click.stop="openDetail(row.product.id)"
          >
            <MessageCircle class="size-4 me-1.5 text-serag-gold" aria-hidden="true" />
            <span>{{ t('admin.notify.detail.openRequests', { count: row.waiting + row.sent }) }}</span>
          </Button>
        </div>
      </div>
    </template>

    <!-- Detail Sheet -->
    <AdminNotifyDetailSheet
      v-model:open="sheetOpen"
      :product-id="selectedProductId"
      @sent="handleEntrySent"
    />
  </div>
</template>
