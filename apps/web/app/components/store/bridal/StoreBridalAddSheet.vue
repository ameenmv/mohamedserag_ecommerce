<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Search, ShoppingBag } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import { BRIDAL_ROOM_KEYS, type BridalRoomKey, type ProductCard } from '@serag/shared'
import Sheet from '~/components/ui/sheet/Sheet.vue'
import SheetContent from '~/components/ui/sheet/SheetContent.vue'
import SheetHeader from '~/components/ui/sheet/SheetHeader.vue'
import SheetTitle from '~/components/ui/sheet/SheetTitle.vue'

const props = defineProps<{
  open: boolean
  preselectedRoom?: BridalRoomKey
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  add: [roomKey: BridalRoomKey, product: ProductCard]
}>()

const { t, locale } = useI18n()
const { money } = usePrice()
const notify = useNotify()
const isSm = useMediaQuery('(min-width: 640px)')

const sheetSide = computed(() => {
  if (!isSm.value) return 'bottom'
  return locale.value === 'ar' ? 'left' : 'right'
})

const selectedRoom = ref<BridalRoomKey>(props.preselectedRoom ?? 'kitchen')

watch(
  () => props.preselectedRoom,
  (newRoom) => {
    if (newRoom) {
      selectedRoom.value = newRoom
    }
  },
  { immediate: true },
)

const searchQuery = ref('')
const { results, pending } = useLiveSearch(searchQuery)

const searchProducts = computed<ProductCard[]>(() => results.value?.items ?? [])

function handleAdd(product: ProductCard): void {
  emit('add', selectedRoom.value, product)
  notify.success(
    t('store.bridal.addSheet.addedSuccess', {
      name: product.name,
      room: t(`store.bridal.rooms.${selectedRoom.value}`),
    }),
  )
}
</script>

<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent
      :side="sheetSide"
      class="flex h-[88vh] w-full flex-col p-0 sm:h-full sm:max-w-md"
    >
      <!-- Header -->
      <SheetHeader class="border-b border-border/80 px-5 py-4">
        <SheetTitle class="flex items-center gap-2 text-base font-bold sm:text-lg">
          <Plus class="size-5 text-serag-gold" aria-hidden="true" />
          <span>{{ t('store.bridal.addSheet.title') }}</span>
        </SheetTitle>
        <p class="text-xs text-muted-foreground">
          {{ t('store.bridal.addSheet.description') }}
        </p>
      </SheetHeader>

      <div class="flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5">
        <!-- Room Selector -->
        <div class="mb-4">
          <label class="mb-1.5 block text-xs font-bold text-foreground">
            {{ t('store.bridal.addSheet.chooseRoom') }}
          </label>
          <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <button
              v-for="key in BRIDAL_ROOM_KEYS"
              :key="key"
              type="button"
              :class="[
                'min-h-11 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectedRoom === key
                  ? 'border-serag-gold bg-serag-gold/15 text-serag-night dark:text-serag-gold shadow-xs'
                  : 'border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
              ]"
              @click="selectedRoom = key"
            >
              {{ t(`store.bridal.rooms.${key}`) }}
            </button>
          </div>
        </div>

        <!-- Search Input -->
        <div class="relative mb-4">
          <Search class="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            class="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :placeholder="t('store.bridal.addSheet.searchPlaceholder')"
          >
        </div>

        <!-- Search Results List -->
        <div class="flex-1 overflow-y-auto">
          <!-- Loading -->
          <div v-if="pending" class="flex flex-col gap-3">
            <div v-for="i in 3" :key="i" class="h-20 rounded-2xl bg-muted/40 animate-pulse" />
          </div>

          <!-- Type to search prompt -->
          <div
            v-else-if="searchQuery.trim().length < 2"
            class="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground"
          >
            <Search class="size-6 text-muted-foreground/50" aria-hidden="true" />
            <p>{{ t('store.bridal.addSheet.typeToSearch') }}</p>
          </div>

          <!-- Empty search results -->
          <div
            v-else-if="searchProducts.length === 0"
            class="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground"
          >
            <ShoppingBag class="size-6 text-muted-foreground/50" aria-hidden="true" />
            <p>{{ t('store.bridal.addSheet.noResults') }}</p>
          </div>

          <!-- Products List -->
          <div v-else class="flex flex-col gap-3">
            <div
              v-for="prod in searchProducts"
              :key="prod.id"
              :data-add-product="prod.id"
              class="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-3 transition-colors hover:border-serag-gold/60"
            >
              <!-- Image -->
              <div class="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                <NuxtImg
                  v-if="prod.image?.url"
                  :src="prod.image.url"
                  :alt="prod.name"
                  class="size-full object-contain p-1"
                  loading="lazy"
                />
                <div v-else class="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Serag
                </div>
              </div>

              <!-- Details -->
              <div class="flex flex-1 flex-col gap-0.5 min-w-0">
                <p class="line-clamp-2 text-xs font-bold text-foreground sm:text-sm">
                  {{ prod.name }}
                </p>
                <span class="num text-xs font-extrabold text-serag-night dark:text-serag-gold">
                  {{ money(prod.price) }}
                </span>
              </div>

              <!-- Add button -->
              <div class="shrink-0">
                <button
                  type="button"
                  :disabled="!prod.availability.orderable"
                  class="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-serag-night px-3 text-xs font-bold text-serag-ivory transition-colors hover:bg-serag-green disabled:cursor-not-allowed disabled:opacity-40 dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi"
                  @click="handleAdd(prod)"
                >
                  <Plus class="size-3.5" aria-hidden="true" />
                  <span>{{ t('store.bridal.addSheet.addButton') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
