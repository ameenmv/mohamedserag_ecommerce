<script setup lang="ts">
import type { AdminFlashSaleRow } from '@serag/shared'
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  StopCircle,
  Trash2,
  Zap,
} from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '~/utils/date-format'
import { flashStatusTone } from '~/utils/admin-promotions'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const { t, locale } = useI18n()
const flashSalesApi = useAdminFlashSales()
const notify = useNotify()

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const items = ref<AdminFlashSaleRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const error = ref<string | null>(null)

const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void fetchSales()
  }, 350)
}

async function fetchSales() {
  loading.value = true
  error.value = null
  try {
    const res = await flashSalesApi.list({
      page: page.value,
      pageSize,
      q: searchQuery.value.trim() || undefined,
    })
    items.value = res.items
    total.value = res.total
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    error.value = parsed.message
  } finally {
    loading.value = false
  }
}

void fetchSales()

// Sheet State
const sheetOpen = ref(false)
const selectedSaleId = ref<string | null>(null)

function openCreate() {
  selectedSaleId.value = null
  sheetOpen.value = true
}

function openEdit(sale: AdminFlashSaleRow) {
  selectedSaleId.value = sale.id
  sheetOpen.value = true
}

// End Now Confirm Dialog
const endTarget = ref<AdminFlashSaleRow | null>(null)
const endLoading = ref(false)

function promptEnd(sale: AdminFlashSaleRow) {
  endTarget.value = sale
}

async function executeEnd() {
  if (!endTarget.value) return
  endLoading.value = true
  try {
    await flashSalesApi.end(endTarget.value.id)
    notify.success(t('admin.promotions.flash.endedSuccess'))
    endTarget.value = null
    await fetchSales()
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    notify.error(parsed.message)
  } finally {
    endLoading.value = false
  }
}

// Delete Confirm Dialog
const deleteTarget = ref<AdminFlashSaleRow | null>(null)
const deleteLoading = ref(false)

function promptDelete(sale: AdminFlashSaleRow) {
  deleteTarget.value = sale
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await flashSalesApi.remove(deleteTarget.value.id)
    notify.success(t('admin.promotions.flash.deleted'))
    deleteTarget.value = null
    await fetchSales()
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    notify.error(parsed.message)
  } finally {
    deleteLoading.value = false
  }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  void fetchSales()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header Controls -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- Search Input -->
      <div class="relative w-full sm:w-72">
        <Search
          class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          :value="searchQuery"
          type="search"
          :placeholder="t('admin.promotions.flash.searchPlaceholder')"
          :aria-label="t('admin.promotions.flash.searchPlaceholder')"
          class="border-input bg-card h-10 w-full rounded-xl border ps-9 pe-4 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          @input="onSearchInput(($event.target as HTMLInputElement).value)"
        >
      </div>

      <!-- Action Button -->
      <Button
        type="button"
        size="sm"
        class="gap-1.5 rounded-xl bg-serag-gold text-serag-ink font-bold hover:bg-serag-gold-hi shadow-xs min-h-11 sm:min-h-9"
        @click="openCreate"
      >
        <Plus class="size-4 stroke-[2.5]" aria-hidden="true" />
        <span>{{ t('admin.promotions.flash.new') }}</span>
      </Button>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"
    >
      <AlertCircle class="size-8 text-destructive" aria-hidden="true" />
      <p class="text-sm font-semibold text-destructive">{{ error }}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="gap-1.5 rounded-xl text-xs"
        @click="fetchSales"
      >
        <RefreshCw class="size-3.5" aria-hidden="true" />
        <span>{{ t('common.retry') }}</span>
      </Button>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="i in 5" :key="i" class="h-16 w-full rounded-xl" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="items.length === 0"
      class="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-3"
    >
      <Zap class="size-10 text-muted-foreground/30" aria-hidden="true" />
      <p class="font-medium">{{ t('admin.promotions.flash.empty') }}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="rounded-xl min-h-10 sm:min-h-9"
        @click="openCreate"
      >
        {{ t('admin.promotions.flash.new') }}
      </Button>
    </div>

    <!-- Data List -->
    <template v-else>
      <!-- Desktop Table (md+) -->
      <div class="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <table class="w-full text-start text-sm">
          <thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="py-3.5 ps-4 pe-3 text-start font-bold">
                {{ t('admin.promotions.flash.table.name') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.flash.table.status') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.flash.table.startsAt') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.flash.table.endsAt') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.flash.table.itemCount') }}
              </th>
              <th scope="col" class="py-3.5 ps-3 pe-4 text-end font-bold">
                {{ t('admin.promotions.flash.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr
              v-for="sale in items"
              :key="sale.id"
              class="transition-colors hover:bg-muted/15"
            >
              <td class="py-3.5 ps-4 pe-3 font-bold text-foreground">
                {{ sale.name }}
              </td>
              <td class="px-3 py-3.5">
                <Badge :variant="flashStatusTone(sale.status)">
                  {{ t(`admin.promotions.flash.status.${sale.status}`) }}
                </Badge>
              </td>
              <td class="num px-3 py-3.5 text-xs text-muted-foreground">
                {{ formatDateTime(sale.startsAt, locale) }}
              </td>
              <td class="num px-3 py-3.5 text-xs text-muted-foreground">
                {{ formatDateTime(sale.endsAt, locale) }}
              </td>
              <td class="px-3 py-3.5 text-xs">
                <span class="num font-bold text-foreground">{{ sale.itemCount }}</span>
              </td>
              <td class="py-3.5 ps-3 pe-4 text-end">
                <div class="inline-flex items-center gap-1">
                  <!-- End Now Action (running only) -->
                  <Button
                    v-if="sale.status === 'running'"
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-8 rounded-lg text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700/50 dark:hover:bg-amber-950/30"
                    @click="promptEnd(sale)"
                  >
                    <StopCircle class="size-3.5" aria-hidden="true" />
                    <span>{{ t('admin.promotions.flash.endNow') }}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                    :aria-label="t('admin.promotions.flash.edit')"
                    @click="openEdit(sale)"
                  >
                    <Edit class="size-4" aria-hidden="true" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    :aria-label="t('admin.promotions.flash.confirmDeleteTitle')"
                    @click="promptDelete(sale)"
                  >
                    <Trash2 class="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Stacked Cards (< md) -->
      <div class="grid grid-cols-1 gap-3 md:hidden">
        <div
          v-for="sale in items"
          :key="sale.id"
          class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-col min-w-0">
              <span class="font-bold text-sm text-foreground truncate">
                {{ sale.name }}
              </span>
              <span class="text-xs text-muted-foreground mt-0.5">
                {{ t('admin.promotions.flash.itemsCount', { count: sale.itemCount }) }}
              </span>
            </div>

            <Badge :variant="flashStatusTone(sale.status)">
              {{ t(`admin.promotions.flash.status.${sale.status}`) }}
            </Badge>
          </div>

          <div class="flex flex-col gap-1 text-xs text-muted-foreground pt-2 border-t border-border/60">
            <div class="flex items-center gap-1">
              <Calendar class="size-3.5 shrink-0" aria-hidden="true" />
              <span>{{ t('admin.promotions.flash.table.startsAt') }}:</span>
              <span class="num text-foreground font-medium">{{ formatDateTime(sale.startsAt, locale) }}</span>
            </div>
            <div class="flex items-center gap-1">
              <Calendar class="size-3.5 shrink-0" aria-hidden="true" />
              <span>{{ t('admin.promotions.flash.table.endsAt') }}:</span>
              <span class="num text-foreground font-medium">{{ formatDateTime(sale.endsAt, locale) }}</span>
            </div>
          </div>

          <!-- Mobile Actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/60 flex-wrap">
            <Button
              v-if="sale.status === 'running'"
              type="button"
              variant="outline"
              size="sm"
              class="min-h-11 rounded-xl text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700/50"
              @click="promptEnd(sale)"
            >
              <StopCircle class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.promotions.flash.endNow') }}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              class="min-h-11 rounded-xl text-xs gap-1"
              @click="openEdit(sale)"
            >
              <Edit class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.promotions.flash.edit') }}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              @click="promptDelete(sale)"
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="total > pageSize"
        class="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"
      >
        <span class="num">
          {{ page }} / {{ totalPages }} ({{ total }})
        </span>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="page <= 1"
            class="h-8 rounded-lg px-2 text-xs"
            @click="goToPage(page - 1)"
          >
            <ChevronLeft class="size-4 rtl:-scale-x-100" aria-hidden="true" />
            <span>{{ t('common.previous') }}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="page >= totalPages"
            class="h-8 rounded-lg px-2 text-xs"
            @click="goToPage(page + 1)"
          >
            <span>{{ t('common.next') }}</span>
            <ChevronRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </template>

    <!-- Create / Edit Sheet -->
    <AdminPromotionsFlashSheet
      v-model:open="sheetOpen"
      :sale-id="selectedSaleId"
      @saved="fetchSales"
    />

    <!-- End Now Confirm Dialog -->
    <Dialog :open="Boolean(endTarget)" @update:open="endTarget = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-amber-800 dark:text-amber-400">
            {{ t('admin.promotions.flash.confirmEndTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-foreground">
            {{ t('admin.promotions.flash.confirmEnd') }}
            <span class="block text-xs text-muted-foreground mt-1">
              {{ t('admin.promotions.flash.confirmEndDesc') }}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-3">
          <Button
            type="button"
            variant="outline"
            :disabled="endLoading"
            class="min-h-11 sm:min-h-9"
            @click="endTarget = null"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="button"
            class="bg-amber-600 hover:bg-amber-700 text-white font-bold min-h-11 sm:min-h-9"
            :disabled="endLoading"
            @click="executeEnd"
          >
            <Loader2 v-if="endLoading" class="size-4 animate-spin me-1.5" aria-hidden="true" />
            <span>{{ t('admin.promotions.flash.endNow') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirm Dialog -->
    <Dialog :open="Boolean(deleteTarget)" @update:open="deleteTarget = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ t('admin.promotions.flash.confirmDeleteTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-foreground">
            {{ t('admin.promotions.flash.confirmDelete', { name: deleteTarget?.name || '' }) }}
            <span class="block text-xs text-muted-foreground mt-1">
              {{ t('admin.promotions.flash.confirmDeleteDesc') }}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-3">
          <Button
            type="button"
            variant="outline"
            :disabled="deleteLoading"
            class="min-h-11 sm:min-h-9"
            @click="deleteTarget = null"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="deleteLoading"
            class="min-h-11 sm:min-h-9 font-bold"
            @click="executeDelete"
          >
            <Loader2 v-if="deleteLoading" class="size-4 animate-spin me-1.5" aria-hidden="true" />
            <span>{{ t('common.delete') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
