import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  watch,
  type Ref,
} from 'vue'
import type {
  AvailabilityMode,
  BridalAlternative,
  BridalListView,
  BridalRoomKey,
  BridalRooms,
  ProductCard,
} from '@serag/shared'
import {
  BRIDAL_ROOM_KEYS,
  addItemToRooms,
} from '@serag/shared'
import { apiFetch } from '../utils/api'
import {
  applyQty as pureApplyQty,
  estimateTotals,
  removeItem as pureRemoveItem,
  swapItem as pureSwapItem,
  toRooms,
  type PriceIndex,
} from '../utils/bridal'

export interface DisplayItem {
  productId: string
  slug: string
  name: string
  modelCode: string
  imageUrl: string | null
  categorySlug: string
  qty: number
  unitPrice: number
  lineTotal: number
  available: boolean
  availabilityMode: AvailabilityMode
  leadTimeText: string | null
}

export interface DisplayRoom {
  key: BridalRoomKey
  subtotal: number
  items: DisplayItem[]
}

export interface ProductMetaRecord {
  productId: string
  slug: string
  name: string
  modelCode: string
  imageUrl: string | null
  categorySlug: string
  unitPrice: number
  available: boolean
  availabilityMode: AvailabilityMode
  leadTimeText: string | null
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Main bridal list composable.
 * Supports SSR hydration, optimistic local mutations, debounced saving with keepalive flush,
 * and view-mode read-only enforcement.
 *
 * NOTE: All lifecycle hooks (onMounted, onScopeDispose) and initial refs are registered
 * synchronously at the top BEFORE any `await` so Vue's active component instance is retained.
 */
export async function useBridalList(token: Ref<string>) {
  const bridalDevice = useBridalDevice()

  // 1. Core reactive state created synchronously
  const lastServerView = ref<BridalListView | null>(null)
  const rooms = ref<BridalRooms>([])
  const productMeta = ref<Record<string, ProductMetaRecord>>({})
  const saveState = ref<SaveState>('idle')
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let currentSeq = 0
  let hasPendingEdits = false

  const mode = computed(() => lastServerView.value?.mode ?? 'view')
  const status = computed(() => lastServerView.value?.status ?? 'draft')
  const hasReservation = computed(() => Boolean(lastServerView.value?.reservation))
  const isEditable = computed(
    () => mode.value === 'edit' && status.value === 'draft' && !hasReservation.value,
  )
  const isReadOnly = computed(() => !isEditable.value)

  function syncMetaFromView(view: BridalListView): void {
    const next = { ...productMeta.value }
    for (const r of view.rooms) {
      for (const item of r.items) {
        next[item.productId] = {
          productId: item.productId,
          slug: item.slug,
          name: item.name,
          modelCode: item.modelCode,
          imageUrl: item.imageUrl,
          categorySlug: item.categorySlug,
          unitPrice: item.unitPrice,
          available: item.available,
          availabilityMode: item.availabilityMode,
          leadTimeText: item.leadTimeText,
        }
      }
    }
    productMeta.value = next
  }

  async function flushPendingSave(): Promise<boolean> {
    if (!isEditable.value || !hasPendingEdits) return true
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    const seq = ++currentSeq
    await triggerSave(seq)
    return saveState.value !== 'error'
  }

  // 2. Lifecycle hooks registered BEFORE any await to preserve component instance
  if (import.meta.client) {
    onMounted(() => {
      if (isEditable.value && token.value) {
        bridalDevice.remember(token.value)
      }
    })

    const handleBeforeUnload = () => {
      flushPendingSave()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    onScopeDispose(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      flushPendingSave()
    })
  }

  // 3. Price index & estimation computed properties
  const priceIndex = computed<PriceIndex>(() => {
    const idx: PriceIndex = {}
    for (const [id, meta] of Object.entries(productMeta.value)) {
      idx[id] = {
        unitPrice: meta.unitPrice,
        available: meta.available,
      }
    }
    return idx
  })

  const estimated = computed(() => estimateTotals(rooms.value, priceIndex.value))

  // 4. Save orchestration
  async function triggerSave(seq: number): Promise<void> {
    if (!isEditable.value) return
    try {
      const res = await apiFetch<BridalListView>(
        `/bridal/lists/${encodeURIComponent(token.value)}`,
        {
          method: 'PATCH',
          body: { rooms: rooms.value },
        },
      )
      if (seq === currentSeq) {
        lastServerView.value = res
        hasPendingEdits = false
        saveState.value = 'saved'
        syncMetaFromView(res)
      }
    } catch {
      if (seq === currentSeq) {
        saveState.value = 'error'
      }
    }
  }

  function scheduleSave(): void {
    if (!isEditable.value) return
    hasPendingEdits = true
    saveState.value = 'saving'
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    const seq = ++currentSeq
    saveTimer = setTimeout(() => {
      void triggerSave(seq)
    }, 600)
  }

  // 5. Optimistic mutations
  function applyQty(roomKey: BridalRoomKey, productId: string, qty: number): void {
    if (!isEditable.value) return
    rooms.value = pureApplyQty(rooms.value, roomKey, productId, qty)
    scheduleSave()
  }

  function removeItem(roomKey: BridalRoomKey, productId: string): void {
    if (!isEditable.value) return
    rooms.value = pureRemoveItem(rooms.value, roomKey, productId)
    scheduleSave()
  }

  function swapItem(
    roomKey: BridalRoomKey,
    fromId: string,
    alt: BridalAlternative,
  ): void {
    if (!isEditable.value) return
    productMeta.value[alt.productId] = {
      productId: alt.productId,
      slug: alt.slug,
      name: alt.name,
      modelCode: '',
      imageUrl: alt.imageUrl,
      categorySlug: '',
      unitPrice: alt.price,
      available: alt.available,
      availabilityMode: 'auto',
      leadTimeText: null,
    }
    rooms.value = pureSwapItem(rooms.value, roomKey, fromId, alt.productId)
    scheduleSave()
  }

  function addItem(roomKey: BridalRoomKey, product: ProductCard): void {
    if (!isEditable.value) return
    const id = product.id

    productMeta.value[id] = {
      productId: id,
      slug: product.slug,
      name: product.name,
      modelCode: product.modelCode,
      imageUrl: product.image?.url ?? null,
      categorySlug: product.category.slug,
      unitPrice: product.price,
      available: product.availability.orderable,
      availabilityMode: product.availability.state === 'on_request' ? 'on_request' : 'auto',
      leadTimeText: product.availability.leadTimeText,
    }

    rooms.value = addItemToRooms(rooms.value, roomKey, id, 1)
    scheduleSave()
  }

  // 6. Display rooms (only non-empty rooms in BRIDAL_ROOM_KEYS order)
  const displayRooms = computed<DisplayRoom[]>(() => {
    const list: DisplayRoom[] = []

    for (const key of BRIDAL_ROOM_KEYS) {
      const localRoom = rooms.value.find((r) => r.key === key)
      if (!localRoom || localRoom.items.length === 0) {
        continue
      }

      const displayItems: DisplayItem[] = []
      let roomSubtotal = 0

      for (const item of localRoom.items) {
        const meta = productMeta.value[item.productId]
        const unitPrice = meta?.unitPrice ?? 0
        const available = meta?.available ?? true
        const lineTotal = unitPrice * item.qty

        if (available) {
          roomSubtotal += lineTotal
        }

        displayItems.push({
          productId: item.productId,
          slug: meta?.slug ?? '',
          name: meta?.name ?? '',
          modelCode: meta?.modelCode ?? '',
          imageUrl: meta?.imageUrl ?? null,
          categorySlug: meta?.categorySlug ?? '',
          qty: item.qty,
          unitPrice,
          lineTotal,
          available,
          availabilityMode: meta?.availabilityMode ?? 'auto',
          leadTimeText: meta?.leadTimeText ?? null,
        })
      }

      if (displayItems.length > 0) {
        list.push({
          key,
          subtotal:
            saveState.value === 'saving'
              ? (estimated.value.roomSubtotals[key] ?? roomSubtotal)
              : roomSubtotal,
          items: displayItems,
        })
      }
    }

    return list
  })

  const isEmpty = computed(() => displayRooms.value.length === 0)

  // 7. Display totals
  const displayTotal = computed(() => {
    if (saveState.value === 'saving') {
      return estimated.value.total
    }
    return lastServerView.value?.total ?? estimated.value.total
  })

  const displayItemCount = computed(() => {
    if (saveState.value === 'saving') {
      return estimated.value.itemCount
    }
    return lastServerView.value?.itemCount ?? estimated.value.itemCount
  })

  const displayTierDifference = computed<number | null>(() => {
    const tierTotal = lastServerView.value?.tier?.total
    if (tierTotal === undefined || tierTotal === null) {
      return null
    }
    return displayTotal.value - tierTotal
  })

  const hasUnavailableItems = computed(() => {
    if (saveState.value === 'saving') {
      return estimated.value.unavailable > 0
    }
    return (lastServerView.value?.issues.unavailable ?? 0) > 0
  })

  // 8. Fetch data asynchronously AFTER all hooks and refs are in place
  const {
    data: initialView,
    pending,
    error,
    refresh,
  } = await useAsyncData<BridalListView>(
    () => `bridal:list:${token.value}`,
    () =>
      apiFetch<BridalListView>(`/bridal/lists/${encodeURIComponent(token.value)}`, {
        method: 'GET',
      }),
  )

  const notFound = computed(() => {
    if (error.value) {
      const statusCode = (error.value as { statusCode?: number }).statusCode
      return statusCode === 404 || !initialView.value
    }
    return !initialView.value
  })

  if (initialView.value) {
    lastServerView.value = initialView.value
    rooms.value = toRooms(initialView.value)
    syncMetaFromView(initialView.value)
  }

  watch(initialView, (newVal) => {
    if (newVal) {
      lastServerView.value = newVal
      syncMetaFromView(newVal)
      if (!hasPendingEdits) {
        rooms.value = toRooms(newVal)
      }
    }
  })

  return {
    view: lastServerView,
    pending,
    error,
    refresh,
    notFound,
    mode,
    status,
    isEditable,
    isReadOnly,
    saveState,
    rooms,
    displayRooms,
    isEmpty,
    displayTotal,
    displayItemCount,
    displayTierDifference,
    hasUnavailableItems,
    priceIndex,
    applyQty,
    removeItem,
    swapItem,
    addItem,
    flushPendingSave,
  }
}
