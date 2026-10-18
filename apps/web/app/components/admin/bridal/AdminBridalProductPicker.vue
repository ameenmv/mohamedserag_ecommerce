<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AdminProductListItem } from '@serag/shared'
import { Check, Loader2, Package, Search } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAdminProducts } from '~/composables/useAdminProducts'

const props = defineProps<{
  open: boolean
  roomName: string
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  select: [
    product: {
      id: string
      name: string
      modelCode: string
      price: number
      flagged: boolean
    },
  ]
}>()

const { t } = useI18n()
const { money } = usePrice()
const productsApi = useAdminProducts()

const searchQuery = ref('')
const items = ref<AdminProductListItem[]>([])
const loading = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void doSearch()
  }, 300)
}

async function doSearch() {
  loading.value = true
  try {
    const res = await productsApi.list({
      q: searchQuery.value.trim() || undefined,
      pageSize: 12,
    })
    items.value = res.items
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      searchQuery.value = ''
      void doSearch()
    }
  },
)

function pickProduct(p: AdminProductListItem) {
  const isAvailable = p.visible && !p.archived && p.stock > 0
  emit('select', {
    id: p.id,
    name: p.name,
    modelCode: p.modelCode,
    price: p.price,
    flagged: !isAvailable,
  })
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="w-full max-w-[calc(100vw-2rem)] rounded-3xl p-6 sm:max-w-xl max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle class="text-lg font-bold text-foreground">
          {{ t('admin.bridal.editor.addProductTitle', { room: roomName }) }}
        </DialogTitle>
        <DialogDescription class="pt-1 text-xs text-muted-foreground">
          {{ t('admin.bridal.editor.addProductDescription') }}
        </DialogDescription>
      </DialogHeader>

      <!-- Search Input -->
      <div class="relative my-3">
        <Search
          class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          :value="searchQuery"
          type="search"
          :placeholder="t('admin.bridal.editor.searchPlaceholder')"
          class="border-input bg-background h-11 w-full rounded-xl border ps-9 pe-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          :aria-label="t('admin.bridal.editor.searchPlaceholder')"
          @input="onSearchInput(($event.target as HTMLInputElement).value)"
        >
      </div>

      <!-- Results List -->
      <div class="flex-1 overflow-y-auto divide-y divide-border/60 min-h-[220px] max-h-[360px] pe-1">
        <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 class="size-6 animate-spin text-serag-night dark:text-serag-gold" />
          <span class="text-xs">{{ t('common.save') }}...</span>
        </div>

        <div v-else-if="items.length === 0" class="py-12 text-center text-xs text-muted-foreground">
          {{ t('admin.bridal.editor.noProductsFound') }}
        </div>

        <button
          v-for="p in items"
          v-else
          :key="p.id"
          type="button"
          class="w-full flex items-center justify-between gap-3 p-3 text-start transition-colors hover:bg-muted/50 rounded-xl"
          @click="pickProduct(p)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              <img
                v-if="p.thumbnail"
                :src="p.thumbnail"
                :alt="p.name"
                class="size-full object-cover"
              >
              <Package v-else class="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-foreground truncate">{{ p.name }}</span>
              <span class="font-mono text-[11px] text-muted-foreground">{{ p.modelCode }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <span class="font-bold text-xs num text-foreground">{{ money(p.price) }}</span>
            <span class="inline-flex size-7 items-center justify-center rounded-lg bg-serag-night/10 dark:bg-serag-gold/20 text-serag-night dark:text-serag-gold">
              <Check class="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </button>
      </div>

      <div class="pt-3 border-t border-border/60 flex justify-end">
        <Button variant="outline" class="min-h-10 text-xs" @click="emit('update:open', false)">
          {{ t('common.close') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
