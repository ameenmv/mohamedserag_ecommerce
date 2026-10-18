<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AlertCircle,
  Check,
  Eye,
  Loader2,
  Plus,
} from '@lucide/vue'
import type { BridalAlternative, BridalRoomKey, ProductCard } from '@serag/shared'
import { useBridalList, type DisplayItem } from '~/composables/useBridalList'
import StoreBridalRoom from '~/components/store/bridal/StoreBridalRoom.vue'
import StoreBridalTotalsBar from '~/components/store/bridal/StoreBridalTotalsBar.vue'
import StoreBridalActionsCard from '~/components/store/bridal/StoreBridalActionsCard.vue'
import StoreBridalSwapSheet from '~/components/store/bridal/StoreBridalSwapSheet.vue'
import StoreBridalAddSheet from '~/components/store/bridal/StoreBridalAddSheet.vue'
import StoreBridalStatusBanner from '~/components/store/bridal/StoreBridalStatusBanner.vue'
import StoreBridalNotFound from '~/components/store/bridal/StoreBridalNotFound.vue'
import StoreBridalReserveSheet from '~/components/store/bridal/StoreBridalReserveSheet.vue'

const { t } = useI18n()
const route = useRoute()

const tokenParam = computed(() => String(route.params.token ?? ''))

const {
  view,
  notFound,
  isEditable,
  isReadOnly,
  saveState,
  displayRooms,
  isEmpty,
  displayTotal,
  displayItemCount,
  displayTierDifference,
  hasUnavailableItems,
  applyQty,
  removeItem,
  swapItem,
  addItem,
  refresh,
  flushPendingSave,
} = await useBridalList(tokenParam)

useSeoMeta({
  title: () =>
    view.value?.tier?.name
      ? `${view.value.tier.name} — ${t('store.bridal.listPageTitle')}`
      : t('store.bridal.listPageTitle'),
  robots: 'noindex, nofollow',
})

// Swap Sheet state
const swapSheetOpen = ref(false)
const swapCurrentItem = ref<DisplayItem | null>(null)
const swapCurrentRoomKey = ref<BridalRoomKey | null>(null)

function handleOpenSwap(roomKey: BridalRoomKey, item: DisplayItem): void {
  swapCurrentRoomKey.value = roomKey
  swapCurrentItem.value = item
  swapSheetOpen.value = true
}

function handleApplySwap(alt: BridalAlternative): void {
  if (swapCurrentRoomKey.value && swapCurrentItem.value) {
    swapItem(swapCurrentRoomKey.value, swapCurrentItem.value.productId, alt)
  }
}

// Add Sheet state
const addSheetOpen = ref(false)
const addPreselectedRoom = ref<BridalRoomKey>('kitchen')

function handleOpenAdd(roomKey?: BridalRoomKey): void {
  if (roomKey) {
    addPreselectedRoom.value = roomKey
  }
  addSheetOpen.value = true
}

function handleApplyAdd(roomKey: BridalRoomKey, product: ProductCard): void {
  addItem(roomKey, product)
}

// Reserve Sheet state
const reserveSheetOpen = ref(false)

const canReserve = computed(() => {
  return (
    isEditable.value &&
    displayItemCount.value > 0 &&
    !hasUnavailableItems.value &&
    saveState.value !== 'error'
  )
})

async function handleOpenReserve(): Promise<void> {
  if (!canReserve.value) return
  const ok = await flushPendingSave()
  if (ok) {
    reserveSheetOpen.value = true
  }
}
</script>

<template>
  <main class="w-full min-w-0 pb-48 lg:pb-16">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb
          :items="[
            { label: t('store.bridal.pageTitle'), to: '/bridal' },
            { label: view?.tier?.name || t('store.bridal.listPageTitle') },
          ]"
        />
      </div>
    </div>

    <!-- 404 Not Found State -->
    <div v-if="notFound" class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <StoreBridalNotFound />
    </div>

    <!-- Main List Content -->
    <div v-else class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <!-- Status Banner if reservation exists -->
      <StoreBridalStatusBanner
        v-if="view?.reservation"
        :reservation="view.reservation"
      />

      <!-- List Header & Actions -->
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {{ view?.tier?.name ? `${view.tier.name}` : t('store.bridal.listPageTitle') }}
            </h1>

            <!-- View-only badge -->
            <span
              v-if="isReadOnly"
              class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
            >
              <Eye class="size-3" aria-hidden="true" />
              <span>{{ t('store.bridal.view.badge') }}</span>
            </span>
          </div>

          <p class="mt-1 text-xs text-muted-foreground sm:text-sm">
            {{ t('store.bridal.totals.itemsFormat', { count: displayItemCount }) }}
          </p>
        </div>

        <!-- Edit controls & Save State Indicator -->
        <div v-if="isEditable" class="flex items-center gap-3">
          <!-- Subtle Save State Indicator -->
          <div class="text-xs font-medium">
            <span
              v-if="saveState === 'saving'"
              class="inline-flex items-center gap-1.5 text-muted-foreground"
            >
              <Loader2 class="size-3.5 animate-spin" aria-hidden="true" />
              <span>{{ t('store.bridal.saveState.saving') }}</span>
            </span>
            <span
              v-else-if="saveState === 'saved'"
              class="inline-flex items-center gap-1 text-serag-green dark:text-serag-gold"
            >
              <Check class="size-3.5" aria-hidden="true" />
              <span>{{ t('store.bridal.saveState.saved') }}</span>
            </span>
            <span
              v-else-if="saveState === 'error'"
              class="inline-flex items-center gap-1 text-destructive"
            >
              <AlertCircle class="size-3.5" aria-hidden="true" />
              <span>{{ t('store.bridal.saveState.error') }}</span>
            </span>
          </div>

          <!-- Add to room top action -->
          <button
            type="button"
            data-open-add
            class="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-serag-night px-4 text-xs font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi"
            @click="handleOpenAdd()"
          >
            <Plus class="size-4" aria-hidden="true" />
            <span>{{ t('store.bridal.rooms.addRoomItem') }}</span>
          </button>
        </div>
      </div>

      <!-- Main Grid Layout: rooms + aside -->
      <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <!-- Rooms Column (Main) -->
        <div class="flex flex-col gap-6">
          <!-- Empty list state -->
          <div
            v-if="isEmpty"
            class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/20 py-16 text-center px-4"
          >
            <h3 class="text-lg font-bold text-foreground">
              {{ t('store.bridal.empty.title') }}
            </h3>
            <p class="mt-1 max-w-sm text-xs text-muted-foreground">
              {{ t('store.bridal.empty.description') }}
            </p>
            <button
              v-if="isEditable"
              type="button"
              class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-serag-night px-5 text-xs font-bold text-serag-ivory transition-colors hover:bg-serag-green dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi"
              @click="handleOpenAdd()"
            >
              <Plus class="size-4" aria-hidden="true" />
              <span>{{ t('store.bridal.empty.addAppliance') }}</span>
            </button>
          </div>

          <!-- Rooms list -->
          <template v-else>
            <StoreBridalRoom
              v-for="room in displayRooms"
              :key="room.key"
              :room="room"
              :editable="isEditable"
              @update:qty="(pId, q) => applyQty(room.key, pId, q)"
              @remove="(pId) => removeItem(room.key, pId)"
              @swap="(item) => handleOpenSwap(room.key, item)"
              @add="(k) => handleOpenAdd(k)"
            />
          </template>
        </div>

        <!-- Aside Column: TotalsBar + ActionsCard -->
        <aside class="flex flex-col gap-6 lg:sticky lg:top-24">
          <StoreBridalTotalsBar
            :total="displayTotal"
            :item-count="displayItemCount"
            :tier-difference="displayTierDifference"
            :editable="isEditable"
            :can-reserve="canReserve"
            @reserve="handleOpenReserve"
          />

          <StoreBridalActionsCard
            :share-token="view?.shareToken ?? ''"
            :tier-name="view?.tier?.name"
            :item-count="displayItemCount"
            :total="displayTotal"
            :has-unavailable-items="hasUnavailableItems"
            :is-empty="isEmpty"
            :editable="isEditable"
            :can-reserve="canReserve"
          />
        </aside>
      </div>
    </div>

    <!-- Swap Sheet -->
    <StoreBridalSwapSheet
      :open="swapSheetOpen"
      :item="swapCurrentItem"
      @update:open="(val) => (swapSheetOpen = val)"
      @swap="handleApplySwap"
    />

    <!-- Add Sheet -->
    <StoreBridalAddSheet
      :open="addSheetOpen"
      :preselected-room="addPreselectedRoom"
      @update:open="(val) => (addSheetOpen = val)"
      @add="handleApplyAdd"
    />

    <!-- Reserve Sheet -->
    <StoreBridalReserveSheet
      :open="reserveSheetOpen"
      :token="tokenParam"
      @update:open="(val) => (reserveSheetOpen = val)"
      @refresh-list="() => refresh()"
    />
  </main>
</template>
