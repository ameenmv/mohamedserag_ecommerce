<script setup lang="ts">
import type { AdminReviewRow, ReviewStatus } from '@serag/shared'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Loader2,
  MessageSquare,
  MessageSquareOff,
  MessageSquareQuote,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
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
import { parseAdminApiError } from '~/utils/admin-api-errors'
import { formatDateTime } from '~/utils/date-format'

const props = withDefaults(
  defineProps<{
    status?: ReviewStatus
  }>(),
  {
    status: 'pending',
  },
)

const emit = defineEmits<{
  countsChange: [counts: { pending: number; approved: number; rejected: number }]
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const reviewsApi = useAdminReviews()
const notify = useNotify()
const pendingReviewsCount = useAdminPendingReviewsCount()

const items = ref<AdminReviewRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const error = ref<string | null>(null)
const actionLoadingId = ref<string | null>(null)

const searchQuery = ref('')
const selectedStars = ref<number | ''>('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const counts = ref<{ pending: number; approved: number; rejected: number }>({
  pending: 0,
  approved: 0,
  rejected: 0,
})

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function fetchReviews() {
  loading.value = true
  error.value = null
  try {
    const res = await reviewsApi.list({
      status: props.status,
      q: searchQuery.value.trim() || undefined,
      stars: selectedStars.value !== '' ? selectedStars.value : undefined,
      page: page.value,
      pageSize,
    })
    if (res.items.length === 0 && page.value > 1 && res.total > 0) {
      page.value = Math.ceil(res.total / pageSize)
      await fetchReviews()
      return
    }
    items.value = res.items
    total.value = res.total
    counts.value = res.counts
    if (!searchQuery.value.trim() && selectedStars.value === '') {
      pendingReviewsCount.value = res.counts.pending
    }
    emit('countsChange', res.counts)
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    error.value = parsed.message
  } finally {
    loading.value = false
  }
}

watch(
  () => props.status,
  () => {
    page.value = 1
    void fetchReviews()
  },
)

onMounted(() => {
  void fetchReviews()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

function onSearchInput(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void fetchReviews()
  }, 350)
}

function onStarsChange() {
  page.value = 1
  void fetchReviews()
}

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  void fetchReviews()
}

// Approve / Reject actions
async function handleApprove(row: AdminReviewRow) {
  actionLoadingId.value = row.id
  try {
    await reviewsApi.approve(row.id)
    notify.success(t('admin.reviews.notifications.approved'))
    await fetchReviews()
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    notify.error(parsed.message)
  } finally {
    actionLoadingId.value = null
  }
}

async function handleReject(row: AdminReviewRow) {
  actionLoadingId.value = row.id
  try {
    await reviewsApi.reject(row.id)
    notify.info(t('admin.reviews.notifications.rejected'))
    await fetchReviews()
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    notify.error(parsed.message)
  } finally {
    actionLoadingId.value = null
  }
}

// Reply Dialog
const replyDialogOpen = ref(false)
const selectedReviewForReply = ref<AdminReviewRow | null>(null)

function openReply(row: AdminReviewRow) {
  selectedReviewForReply.value = row
  replyDialogOpen.value = true
}

function handleReplySaved(updated: AdminReviewRow) {
  const index = items.value.findIndex((r) => r.id === updated.id)
  if (index !== -1) {
    items.value[index] = updated
  }
  void fetchReviews()
}

// Delete Confirmation Dialog
const deleteTarget = ref<AdminReviewRow | null>(null)
const deleteLoading = ref(false)

function promptDelete(row: AdminReviewRow) {
  deleteTarget.value = row
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await reviewsApi.remove(deleteTarget.value.id)
    notify.success(t('admin.reviews.notifications.deleted'))
    deleteTarget.value = null
    await fetchReviews()
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    notify.error(parsed.message)
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 min-w-0">
    <!-- Toolbar Filters -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <!-- Debounced Product Search -->
        <div class="relative w-full sm:w-72">
          <Search
            class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            :value="searchQuery"
            type="search"
            :placeholder="t('admin.reviews.searchPlaceholder')"
            :aria-label="t('admin.reviews.searchPlaceholder')"
            class="border-input bg-card h-10 w-full rounded-xl border ps-9 pe-4 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring text-start"
            @input="onSearchInput(($event.target as HTMLInputElement).value)"
          >
        </div>

        <!-- Stars Select -->
        <div class="w-full sm:w-auto">
          <select
            v-model="selectedStars"
            class="border-input bg-card h-10 w-full sm:w-auto rounded-xl border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring text-start min-w-40 cursor-pointer"
            :aria-label="t('admin.reviews.starsSelectLabel')"
            @change="onStarsChange"
          >
            <option value="">{{ t('admin.reviews.starsAll') }}</option>
            <option :value="5">{{ t('admin.reviews.starsFilter', { stars: 5 }) }}</option>
            <option :value="4">{{ t('admin.reviews.starsFilter', { stars: 4 }) }}</option>
            <option :value="3">{{ t('admin.reviews.starsFilter', { stars: 3 }) }}</option>
            <option :value="2">{{ t('admin.reviews.starsFilter', { stars: 2 }) }}</option>
            <option :value="1">{{ t('admin.reviews.starsFilter', { stars: 1 }) }}</option>
          </select>
        </div>
      </div>

      <!-- Refresh Button -->
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="min-h-11 sm:min-h-9 rounded-xl self-start sm:self-auto gap-1.5"
        @click="fetchReviews"
      >
        <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" aria-hidden="true" />
        <span>{{ t('admin.reviews.refresh') }}</span>
      </Button>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      role="alert"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center my-2"
    >
      <AlertCircle class="size-8 text-destructive" aria-hidden="true" />
      <p class="text-sm font-semibold text-destructive">{{ error }}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="gap-1.5 rounded-xl text-xs"
        @click="fetchReviews"
      >
        <RefreshCw class="size-3.5" aria-hidden="true" />
        <span>{{ t('common.retry') }}</span>
      </Button>
    </div>

    <!-- Loading Skeleton -->
    <div v-else-if="loading" class="flex flex-col gap-3">
      <Skeleton v-for="i in 5" :key="i" class="h-24 w-full rounded-2xl" />
    </div>

    <!-- Empty State per tab -->
    <div
      v-else-if="items.length === 0"
      class="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-3 my-2"
    >
      <div class="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
        <MessageSquareOff class="size-7" aria-hidden="true" />
      </div>
      <p class="font-medium text-foreground">
        {{
          status === 'pending'
            ? t('admin.reviews.empty.pending')
            : status === 'approved'
              ? t('admin.reviews.empty.approved')
              : t('admin.reviews.empty.rejected')
        }}
      </p>
    </div>

    <!-- Data List -->
    <template v-else>
      <!-- Desktop Table (md+) -->
      <div class="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <table class="w-full text-start text-sm">
          <thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="py-3.5 ps-5 pe-3 text-start font-bold">
                {{ t('admin.reviews.table.product') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.reviews.table.rating') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.reviews.table.text') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.reviews.table.reviewer') }}
              </th>
              <th scope="col" class="px-3 py-3.5 text-start font-bold">
                {{ t('admin.reviews.table.date') }}
              </th>
              <th scope="col" class="py-3.5 ps-3 pe-5 text-end font-bold">
                {{ t('admin.reviews.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr
              v-for="row in items"
              :key="row.id"
              class="transition-colors hover:bg-muted/15"
            >
              <!-- Product -->
              <td class="py-4 ps-5 pe-3 font-bold text-foreground align-top min-w-44 max-w-56">
                <NuxtLink
                  :to="localePath(`/p/${row.product.slug}`)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-bold text-foreground hover:underline inline-flex items-center gap-1.5 group text-sm"
                >
                  <span class="line-clamp-2">{{ row.product.name }}</span>
                  <ExternalLink class="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground rtl:-scale-x-100" aria-hidden="true" />
                </NuxtLink>
              </td>

              <!-- Rating -->
              <td class="px-3 py-4 align-top shrink-0">
                <div class="flex items-center gap-1 text-serag-gold">
                  <Star
                    v-for="s in 5"
                    :key="s"
                    class="size-4"
                    :class="s <= row.stars ? 'fill-serag-gold text-serag-gold' : 'text-muted-foreground/30'"
                    aria-hidden="true"
                  />
                  <span class="sr-only">{{ t('admin.reviews.starsSr', { stars: row.stars, total: 5 }) }}</span>
                </div>
              </td>

              <!-- Text & Store reply -->
              <td class="px-3 py-4 align-top max-w-md">
                <div class="flex flex-col gap-2">
                  <p class="whitespace-pre-line break-words text-sm text-foreground/90 leading-relaxed">
                    {{ row.text }}
                  </p>

                  <!-- Store Reply Preview -->
                  <div
                    v-if="row.reply"
                    class="rounded-xl border border-border/80 bg-muted/40 p-2.5 text-xs flex flex-col gap-1"
                  >
                    <div class="flex items-center gap-1.5 font-bold text-serag-night dark:text-serag-gold">
                      <MessageSquareQuote class="size-3.5" aria-hidden="true" />
                      <span>{{ t('admin.reviews.replyTitle') }}</span>
                    </div>
                    <p class="whitespace-pre-line break-words text-muted-foreground leading-relaxed">
                      {{ row.reply }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Reviewer Info -->
              <td class="px-3 py-4 align-top min-w-36">
                <div class="flex flex-col gap-1 text-xs">
                  <span class="font-bold text-foreground">{{ row.name }}</span>
                  <span dir="ltr" class="num font-mono text-muted-foreground text-start">
                    {{ row.phone }}
                  </span>
                  <div v-if="row.verifiedBuyer" class="pt-0.5">
                    <Badge
                      variant="outline"
                      class="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-bold gap-1 text-[10px] px-1.5 py-0"
                    >
                      <CheckCircle2 class="size-2.5" aria-hidden="true" />
                      <span>{{ t('admin.reviews.verifiedBuyer') }}</span>
                    </Badge>
                  </div>
                </div>
              </td>

              <!-- Date -->
              <td class="px-3 py-4 text-xs text-muted-foreground num align-top whitespace-nowrap">
                {{ formatDateTime(row.createdAt, locale) }}
              </td>

              <!-- Actions -->
              <td class="py-4 ps-3 pe-5 text-end align-top">
                <div class="inline-flex items-center gap-1.5 justify-end flex-wrap">
                  <!-- Approve (pending or rejected) -->
                  <Button
                    v-if="status === 'pending' || status === 'rejected'"
                    type="button"
                    size="sm"
                    class="h-8 rounded-lg bg-serag-green text-serag-ivory hover:bg-serag-night dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi font-bold text-xs gap-1"
                    :disabled="actionLoadingId === row.id"
                    @click="handleApprove(row)"
                  >
                    <Check class="size-3.5" aria-hidden="true" />
                    <span>{{ t('admin.reviews.approve') }}</span>
                  </Button>

                  <!-- Reject (pending) -->
                  <Button
                    v-if="status === 'pending'"
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-8 rounded-lg text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                    :disabled="actionLoadingId === row.id"
                    @click="handleReject(row)"
                  >
                    <X class="size-3.5" aria-hidden="true" />
                    <span>{{ t('admin.reviews.reject') }}</span>
                  </Button>

                  <!-- Hide (approved) -->
                  <Button
                    v-if="status === 'approved'"
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-8 rounded-lg text-xs text-amber-800 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                    :disabled="actionLoadingId === row.id"
                    @click="handleReject(row)"
                  >
                    <EyeOff class="size-3.5" aria-hidden="true" />
                    <span>{{ t('admin.reviews.hide') }}</span>
                  </Button>

                  <!-- Reply (all statuses) -->
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-8 rounded-lg text-xs gap-1"
                    :disabled="actionLoadingId === row.id"
                    @click="openReply(row)"
                  >
                    <MessageSquare class="size-3.5" aria-hidden="true" />
                    <span>{{ row.reply ? t('admin.reviews.editReply') : t('admin.reviews.replyAction') }}</span>
                  </Button>

                  <!-- Delete (all statuses) -->
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    :aria-label="t('admin.reviews.delete')"
                    :disabled="actionLoadingId === row.id"
                    @click="promptDelete(row)"
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
          v-for="row in items"
          :key="row.id"
          class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
        >
          <!-- Product and Rating Header -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-col gap-1 min-w-0">
              <NuxtLink
                :to="localePath(`/p/${row.product.slug}`)"
                target="_blank"
                rel="noopener noreferrer"
                class="font-bold text-foreground hover:underline inline-flex items-center gap-1.5 text-sm"
              >
                <span class="line-clamp-2">{{ row.product.name }}</span>
                <ExternalLink class="size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
              </NuxtLink>

              <div class="flex items-center gap-2 pt-0.5">
                <div class="flex items-center gap-0.5 text-serag-gold">
                  <Star
                    v-for="s in 5"
                    :key="s"
                    class="size-3.5"
                    :class="s <= row.stars ? 'fill-serag-gold text-serag-gold' : 'text-muted-foreground/30'"
                    aria-hidden="true"
                  />
                  <span class="sr-only">{{ t('admin.reviews.starsSr', { stars: row.stars, total: 5 }) }}</span>
                </div>
                <span class="text-[11px] text-muted-foreground num">
                  {{ formatDateTime(row.createdAt, locale) }}
                </span>
              </div>
            </div>

            <Badge
              v-if="row.verifiedBuyer"
              variant="outline"
              class="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] shrink-0"
            >
              {{ t('admin.reviews.verifiedBuyer') }}
            </Badge>
          </div>

          <!-- Review Text -->
          <div class="pt-1 border-t border-border/60">
            <p class="whitespace-pre-line break-words text-sm text-foreground/90 leading-relaxed">
              {{ row.text }}
            </p>
          </div>

          <!-- Store Reply Preview -->
          <div
            v-if="row.reply"
            class="rounded-xl border border-border/80 bg-muted/40 p-2.5 text-xs flex flex-col gap-1"
          >
            <div class="flex items-center gap-1.5 font-bold text-serag-night dark:text-serag-gold">
              <MessageSquareQuote class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.reviews.replyTitle') }}</span>
            </div>
            <p class="whitespace-pre-line break-words text-muted-foreground leading-relaxed">
              {{ row.reply }}
            </p>
          </div>

          <!-- Customer details -->
          <div class="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
            <span class="font-bold text-foreground">{{ row.name }}</span>
            <span dir="ltr" class="num font-mono">{{ row.phone }}</span>
          </div>

          <!-- Mobile Actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/60 flex-wrap">
            <!-- Approve -->
            <Button
              v-if="status === 'pending' || status === 'rejected'"
              type="button"
              size="sm"
              class="min-h-11 rounded-xl bg-serag-green text-serag-ivory hover:bg-serag-night dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi font-bold text-xs gap-1"
              :disabled="actionLoadingId === row.id"
              @click="handleApprove(row)"
            >
              <Check class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.reviews.approve') }}</span>
            </Button>

            <!-- Reject -->
            <Button
              v-if="status === 'pending'"
              type="button"
              variant="outline"
              size="sm"
              class="min-h-11 rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
              :disabled="actionLoadingId === row.id"
              @click="handleReject(row)"
            >
              <X class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.reviews.reject') }}</span>
            </Button>

            <!-- Hide -->
            <Button
              v-if="status === 'approved'"
              type="button"
              variant="outline"
              size="sm"
              class="min-h-11 rounded-xl text-xs text-amber-800 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1"
              :disabled="actionLoadingId === row.id"
              @click="handleReject(row)"
            >
              <EyeOff class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.reviews.hide') }}</span>
            </Button>

            <!-- Reply -->
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="min-h-11 rounded-xl text-xs gap-1"
              :disabled="actionLoadingId === row.id"
              @click="openReply(row)"
            >
              <MessageSquare class="size-3.5" aria-hidden="true" />
              <span>{{ row.reply ? t('admin.reviews.editReply') : t('admin.reviews.replyAction') }}</span>
            </Button>

            <!-- Delete -->
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              :aria-label="t('admin.reviews.delete')"
              :disabled="actionLoadingId === row.id"
              @click="promptDelete(row)"
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

    <!-- Reply Dialog -->
    <AdminReviewsReplyDialog
      v-model:open="replyDialogOpen"
      :review="selectedReviewForReply"
      @saved="handleReplySaved"
    />

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="Boolean(deleteTarget)" @update:open="(open) => { if (!open && !deleteLoading) deleteTarget = null }">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ t('admin.reviews.confirmDeleteTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-foreground">
            {{
              t('admin.reviews.confirmDeleteDesc', {
                name: deleteTarget?.name || '',
                product: deleteTarget?.product.name || '',
              })
            }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-3">
          <Button
            type="button"
            variant="outline"
            :disabled="deleteLoading"
            class="min-h-11 sm:min-h-9 text-xs"
            @click="deleteTarget = null"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="deleteLoading"
            class="min-h-11 sm:min-h-9 font-bold text-xs"
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
