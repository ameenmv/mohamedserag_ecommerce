<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  BRIDAL_MAX_QTY,
  BRIDAL_ROOM_KEYS,
  type AdminBridalTier,
  type BridalRoomKey,
  type BridalTierUpdateInput,
} from '@serag/shared'
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  Save,
  Trash2,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  addHighlight,
  addProductToRoom,
  cloneTier,
  computeTierTotal,
  isTierDirty,
  removeHighlight,
  removeProductFromRoom,
  toTierUpdateInput,
  updateHighlight,
  updateItemQty,
} from '~/utils/admin-bridal'

const props = defineProps<{
  tier: AdminBridalTier
  saving?: boolean
  apiError?: string | null
}>()

const emit = defineEmits<{
  save: [input: BridalTierUpdateInput]
}>()

const { t } = useI18n()
const { money } = usePrice()

// Local editable copy of the tier
const currentTier = ref<AdminBridalTier>(cloneTier(props.tier))

watch(
  () => props.tier,
  (newTier) => {
    currentTier.value = cloneTier(newTier)
  },
  { deep: true },
)

const dirty = computed(() => isTierDirty(props.tier, currentTier.value))
const total = computed(() => computeTierTotal(currentTier.value.rooms))

// Product Picker Dialog State
const pickerOpen = ref(false)
const targetRoomKey = ref<BridalRoomKey>('kitchen')

function openPicker(key: BridalRoomKey) {
  targetRoomKey.value = key
  pickerOpen.value = true
}

function handleProductPicked(product: {
  id: string
  name: string
  modelCode: string
  price: number
  flagged: boolean
}) {
  currentTier.value.rooms = addProductToRoom(
    currentTier.value.rooms,
    targetRoomKey.value,
    product,
  )
}

function handleRemoveProduct(roomKey: BridalRoomKey, productId: string) {
  currentTier.value.rooms = removeProductFromRoom(
    currentTier.value.rooms,
    roomKey,
    productId,
  )
}

function handleQtyChange(roomKey: BridalRoomKey, productId: string, delta: number) {
  const room = currentTier.value.rooms.find((r) => r.key === roomKey)
  const item = room?.items.find((i) => i.productId === productId)
  if (!item) return
  const nextQty = item.qty + delta
  if (nextQty <= 0) {
    handleRemoveProduct(roomKey, productId)
  } else {
    currentTier.value.rooms = updateItemQty(
      currentTier.value.rooms,
      roomKey,
      productId,
      nextQty,
    )
  }
}

function handleAddHighlight() {
  currentTier.value.highlights = addHighlight(currentTier.value.highlights, '')
}

function handleUpdateHighlight(index: number, val: string) {
  currentTier.value.highlights = updateHighlight(
    currentTier.value.highlights,
    index,
    val,
  )
}

function handleRemoveHighlight(index: number) {
  currentTier.value.highlights = removeHighlight(
    currentTier.value.highlights,
    index,
  )
}

function handleSave() {
  emit('save', toTierUpdateInput(currentTier.value))
}

function getRoomItems(key: BridalRoomKey) {
  return currentTier.value.rooms.find((r) => r.key === key)?.items ?? []
}
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <!-- Top Action Bar with Total & Save Button -->
    <div class="flex items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex-wrap">
      <div class="flex items-center gap-3">
        <div>
          <span class="text-xs text-muted-foreground">{{ t('admin.bridal.editor.totalLabel') }}</span>
          <div class="font-display text-xl font-bold num text-foreground">
            {{ money(total) }}
          </div>
        </div>

        <!-- Dirty Indicator Badge -->
        <span
          v-if="dirty"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
        >
          <span class="size-1.5 rounded-full bg-amber-600 animate-pulse" />
          <span>{{ t('admin.bridal.editor.dirtyBadge') }}</span>
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800"
        >
          <CheckCircle2 class="size-3 text-emerald-600" aria-hidden="true" />
          <span>{{ t('admin.bridal.editor.cleanBadge') }}</span>
        </span>
      </div>

      <Button
        type="button"
        :disabled="saving || !dirty"
        class="min-h-11 px-5 bg-serag-night text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink font-bold gap-2"
        @click="handleSave"
      >
        <Save class="size-4" aria-hidden="true" />
        <span>{{ saving ? t('common.save') + '...' : t('admin.bridal.editor.saveTier') }}</span>
      </Button>
    </div>

    <!-- API Validation Error Notice -->
    <div
      v-if="apiError"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive font-medium flex items-center gap-2"
    >
      <AlertTriangle class="size-4 shrink-0" aria-hidden="true" />
      <span>{{ apiError }}</span>
    </div>

    <!-- Basic Tier Info: Name & Highlights -->
    <Card class="min-w-0 shadow-xs border-border/80">
      <CardHeader class="pb-3 border-b border-border/60">
        <CardTitle class="text-base font-bold text-foreground">
          {{ t('admin.bridal.editor.basicsTitle') }}
        </CardTitle>
      </CardHeader>
      <CardContent class="pt-4 flex flex-col gap-4">
        <!-- Tier Name -->
        <div class="flex flex-col gap-1.5 max-w-md">
          <label for="tier-name" class="text-xs font-bold text-foreground">
            {{ t('admin.bridal.editor.nameLabel') }}
          </label>
          <input
            id="tier-name"
            v-model="currentTier.name"
            type="text"
            maxlength="40"
            required
            class="border-input bg-background h-10 w-full rounded-xl border px-3 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          >
        </div>

        <!-- Highlights (up to 4) -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-foreground">
              {{ t('admin.bridal.editor.highlightsLabel') }} ({{ currentTier.highlights.length }}/4)
            </span>
            <Button
              v-if="currentTier.highlights.length < 4"
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-xs gap-1"
              @click="handleAddHighlight"
            >
              <Plus class="size-3" aria-hidden="true" />
              <span>{{ t('admin.bridal.editor.addHighlight') }}</span>
            </Button>
          </div>

          <div
            v-for="(hl, index) in currentTier.highlights"
            :key="index"
            class="flex items-center gap-2 max-w-xl"
          >
            <input
              :value="hl"
              type="text"
              maxlength="60"
              :placeholder="t('admin.bridal.editor.highlightPlaceholder', { n: index + 1 })"
              class="border-input bg-background h-9 flex-1 rounded-xl border px-3 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              @input="handleUpdateHighlight(index, ($event.target as HTMLInputElement).value)"
            >
            <button
              type="button"
              class="size-8 inline-flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              :aria-label="t('common.delete')"
              @click="handleRemoveHighlight(index)"
            >
              <Trash2 class="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Rooms and Products Editor -->
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg font-bold text-foreground">
          {{ t('admin.bridal.editor.roomsTitle') }}
        </h2>
      </div>

      <Card
        v-for="roomKey in BRIDAL_ROOM_KEYS"
        :key="roomKey"
        class="min-w-0 shadow-xs border-border/80"
      >
        <CardHeader class="pb-3 border-b border-border/60">
          <div class="flex items-center justify-between gap-3">
            <CardTitle class="text-sm font-bold text-foreground flex items-center gap-2">
              <span>{{ t(`store.bridal.rooms.${roomKey}`) }}</span>
              <span class="num text-xs font-semibold text-muted-foreground">
                ({{ getRoomItems(roomKey).length }})
              </span>
            </CardTitle>

            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-xs font-bold gap-1"
              @click="openPicker(roomKey)"
            >
              <Plus class="size-3" aria-hidden="true" />
              <span>{{ t('admin.bridal.editor.addProduct') }}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent class="pt-3">
          <!-- Room Empty State -->
          <div
            v-if="getRoomItems(roomKey).length === 0"
            class="py-6 text-center text-xs text-muted-foreground italic"
          >
            {{ t('admin.bridal.editor.roomEmpty') }}
          </div>

          <!-- Room Product Items -->
          <div v-else class="divide-y divide-border/60">
            <div
              v-for="item in getRoomItems(roomKey)"
              :key="item.productId"
              class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <!-- Name & Model code & Warning -->
              <div class="flex flex-col min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-bold text-foreground truncate">
                    {{ item.name || item.productId }}
                  </span>
                  <!-- Flagged Warning Badge -->
                  <span
                    v-if="item.flagged"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
                  >
                    <AlertTriangle class="size-2.5" aria-hidden="true" />
                    <span>{{ t('admin.bridal.editor.flaggedBadge') }}</span>
                  </span>
                </div>
                <div class="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                  <span>{{ item.modelCode || '-' }}</span>
                  <span class="num font-bold text-foreground">{{ money(item.price) }}</span>
                </div>
              </div>

              <!-- Qty Stepper & Remove -->
              <div class="flex items-center gap-3 shrink-0">
                <div class="inline-flex items-center rounded-lg border border-input bg-background p-0.5">
                  <button
                    type="button"
                    class="size-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground disabled:opacity-40"
                    :disabled="item.qty <= 1"
                    :aria-label="t('common.delete')"
                    @click="handleQtyChange(roomKey, item.productId, -1)"
                  >
                    <Minus class="size-3" aria-hidden="true" />
                  </button>
                  <span class="num font-bold text-xs px-2 min-w-6 text-center">
                    {{ item.qty }}
                  </span>
                  <button
                    type="button"
                    class="size-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground disabled:opacity-40"
                    :disabled="item.qty >= BRIDAL_MAX_QTY"
                    :aria-label="t('admin.bridal.editor.addHighlight')"
                    @click="handleQtyChange(roomKey, item.productId, 1)"
                  >
                    <Plus class="size-3" aria-hidden="true" />
                  </button>
                </div>

                <button
                  type="button"
                  class="size-8 inline-flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  :aria-label="t('common.delete')"
                  @click="handleRemoveProduct(roomKey, item.productId)"
                >
                  <Trash2 class="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Product Picker Dialog -->
    <AdminBridalProductPicker
      :open="pickerOpen"
      :room-name="t(`store.bridal.rooms.${targetRoomKey}`)"
      @update:open="pickerOpen = $event"
      @select="handleProductPicked"
    />
  </div>
</template>
