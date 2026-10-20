<script setup lang="ts">
import type { AdminCouponRow } from '@serag/shared'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
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
import { couponStatusTone } from '~/utils/admin-promotions'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const { t } = useI18n()
const { money } = usePrice()
const couponsApi = useAdminCoupons()
const notify = useNotify()

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const items = ref<AdminCouponRow[]>([])
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
    void fetchCoupons()
  }, 350)
}

async function fetchCoupons() {
  loading.value = true
  error.value = null
  try {
    const res = await couponsApi.list({
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

void fetchCoupons()

// Sheet State
const sheetOpen = ref(false)
const selectedCoupon = ref<AdminCouponRow | null>(null)

function openCreate() {
  selectedCoupon.value = null
  sheetOpen.value = true
}

function openEdit(c: AdminCouponRow) {
  selectedCoupon.value = c
  sheetOpen.value = true
}

// Delete Confirm Dialog
const deleteTarget = ref<AdminCouponRow | null>(null)
const deleteLoading = ref(false)

function promptDelete(c: AdminCouponRow) {
  deleteTarget.value = c
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await couponsApi.remove(deleteTarget.value.id)
    if ('deactivated' in res && res.deactivated) {
      notify.info(t('admin.promotions.coupons.deactivated'))
    } else {
      notify.success(t('admin.promotions.coupons.deleted'))
    }
    deleteTarget.value = null
    await fetchCoupons()
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
  void fetchCoupons()
}

function formatCouponValue(c: AdminCouponRow): string {
  if (c.type === 'percent') {
    return t('admin.promotions.coupons.percentValue', { value: c.value })
  }
  return money(c.value)
}

function formatUsage(c: AdminCouponRow): string {
  const maxStr = c.maxUses !== null ? String(c.maxUses) : t('admin.promotions.coupons.unlimited')
  return t('admin.promotions.coupons.usageDisplay', {
    active: c.activeUses,
    max: maxStr,
  })
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
          dir="ltr"
          :placeholder="t('admin.promotions.coupons.searchPlaceholder')"
          :aria-label="t('admin.promotions.coupons.searchPlaceholder')"
          class="border-input bg-card h-10 w-full rounded-xl border ps-9 pe-4 text-sm font-mono placeholder:font-sans shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring text-start uppercase"
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
        <span>{{ t('admin.promotions.coupons.new') }}</span>
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
        @click="fetchCoupons"
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
      <Tag class="size-10 text-muted-foreground/30" aria-hidden="true" />
      <p class="font-medium">{{ t('admin.promotions.coupons.empty') }}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="rounded-xl min-h-10 sm:min-h-9"
        @click="openCreate"
      >
        {{ t('admin.promotions.coupons.new') }}
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
                {{ t('admin.promotions.coupons.table.code') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.coupons.table.value') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.coupons.table.minOrder') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.coupons.table.status') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.coupons.table.usage') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.promotions.coupons.table.totalDiscount') }}
              </th>
              <th scope="col" class="py-3.5 ps-3 pe-4 text-end font-bold">
                {{ t('admin.promotions.coupons.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr
              v-for="c in items"
              :key="c.id"
              class="transition-colors hover:bg-muted/15"
            >
              <td class="py-3.5 ps-4 pe-3 font-mono font-bold text-foreground tracking-wide">
                {{ c.code }}
              </td>
              <td class="num px-3 py-3.5 font-bold text-serag-green dark:text-serag-gold">
                {{ formatCouponValue(c) }}
              </td>
              <td class="num px-3 py-3.5 text-xs text-muted-foreground">
                {{ c.minOrder > 0 ? money(c.minOrder) : t('admin.promotions.coupons.noMinOrder') }}
              </td>
              <td class="px-3 py-3.5">
                <Badge :variant="couponStatusTone(c.status)">
                  {{ t(`admin.promotions.coupons.status.${c.status}`) }}
                </Badge>
              </td>
              <td class="num px-3 py-3.5 text-xs font-semibold text-foreground">
                {{ formatUsage(c) }}
              </td>
              <td class="num px-3 py-3.5 text-xs font-bold text-foreground">
                {{ money(c.totalDiscount) }}
              </td>
              <td class="py-3.5 ps-3 pe-4 text-end">
                <div class="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                    :aria-label="t('admin.promotions.coupons.edit')"
                    @click="openEdit(c)"
                  >
                    <Edit class="size-4" aria-hidden="true" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    :aria-label="t('admin.promotions.coupons.confirmDeleteTitle')"
                    @click="promptDelete(c)"
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
          v-for="c in items"
          :key="c.id"
          class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-col min-w-0">
              <span class="font-mono font-bold text-base text-foreground tracking-wide truncate">
                {{ c.code }}
              </span>
              <span class="num text-xs font-bold text-serag-green dark:text-serag-gold mt-0.5">
                {{ formatCouponValue(c) }}
              </span>
            </div>

            <Badge :variant="couponStatusTone(c.status)">
              {{ t(`admin.promotions.coupons.status.${c.status}`) }}
            </Badge>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
            <div>
              <span>{{ t('admin.promotions.coupons.table.minOrder') }}:</span>
              <span class="num font-semibold text-foreground ms-1">
                {{ c.minOrder > 0 ? money(c.minOrder) : t('admin.promotions.coupons.noMinOrder') }}
              </span>
            </div>
            <div>
              <span>{{ t('admin.promotions.coupons.table.usage') }}:</span>
              <span class="num font-semibold text-foreground ms-1">
                {{ formatUsage(c) }}
              </span>
            </div>
            <div class="col-span-2">
              <span>{{ t('admin.promotions.coupons.table.totalDiscount') }}:</span>
              <span class="num font-bold text-foreground ms-1">
                {{ money(c.totalDiscount) }}
              </span>
            </div>
          </div>

          <!-- Mobile Actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="min-h-11 rounded-xl text-xs gap-1"
              @click="openEdit(c)"
            >
              <Edit class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.promotions.coupons.edit') }}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              @click="promptDelete(c)"
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
    <AdminPromotionsCouponSheet
      v-model:open="sheetOpen"
      :coupon="selectedCoupon"
      @saved="fetchCoupons"
    />

    <!-- Delete Confirm Dialog -->
    <Dialog :open="Boolean(deleteTarget)" @update:open="deleteTarget = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ t('admin.promotions.coupons.confirmDeleteTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-foreground">
            {{ t('admin.promotions.coupons.confirmDelete', { code: deleteTarget?.code || '' }) }}
            <span class="block text-xs text-muted-foreground mt-1">
              {{ t('admin.promotions.coupons.confirmDeleteDesc') }}
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
