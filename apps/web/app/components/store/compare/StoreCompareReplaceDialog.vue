<script setup lang="ts">
import { ArrowLeftRight, Package } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'

const pending = useState<ProductCard | null>('compare-pending', () => null)
const { entries, replace } = useCompare()
const storeApi = useStoreApi()
const notify = useNotify()
const { t } = useI18n()

const loading = ref(false)
const currentCards = ref<ProductCard[]>([])

const isOpen = computed({
  get: () => pending.value !== null,
  set: (val: boolean) => {
    if (!val) {
      pending.value = null
    }
  },
})

watch(
  () => pending.value,
  async (item) => {
    if (item && entries.value.length > 0) {
      loading.value = true
      try {
        const ids = entries.value.map((e) => e.productId)
        currentCards.value = await storeApi.productsByIds(ids)
      } catch {
        currentCards.value = []
      } finally {
        loading.value = false
      }
    }
  },
  { immediate: true },
)

function handleReplace(oldId: string): void {
  if (pending.value) {
    replace(oldId, pending.value)
    notify.success(t('store.compare.replacedNotice'))
    pending.value = null
  }
}

function handleCancel(): void {
  pending.value = null
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-lg rounded-3xl bg-background p-6">
      <DialogHeader class="text-start">
        <DialogTitle class="font-display text-2xl text-primary">
          {{ t('store.compare.replaceDialog.title') }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          {{ t('store.compare.replaceDialog.description', { name: pending?.name ?? '' }) }}
        </DialogDescription>
      </DialogHeader>

      <!-- Current Compare Products List -->
      <div class="mt-4 space-y-2.5">
        <!-- Skeleton loading rows -->
        <div v-if="loading" class="space-y-2.5" aria-busy="true">
          <div
            v-for="i in 3"
            :key="i"
            class="flex items-center gap-3 rounded-2xl border border-border p-3"
          >
            <Skeleton class="size-12 shrink-0 rounded-xl" />
            <div class="flex-1 space-y-2">
              <Skeleton class="h-4 w-3/4 rounded-md" />
              <Skeleton class="h-3 w-1/4 rounded-md" />
            </div>
            <Skeleton class="h-9 w-20 shrink-0 rounded-xl" />
          </div>
        </div>

        <!-- Real Cards -->
        <div v-else class="space-y-2.5">
          <button
            v-for="card in currentCards"
            :key="card.id"
            type="button"
            class="group flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-start transition-all hover:border-serag-gold hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :aria-label="t('store.compare.replaceDialog.replaceButtonAria', { name: card.name })"
            @click="handleReplace(card.id)"
          >
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <NuxtImg
                v-if="card.image?.url"
                :src="card.image.url"
                :alt="card.image.alt || card.name"
                width="48"
                height="48"
                class="size-12 shrink-0 rounded-xl border border-border/80 bg-serag-ivory/60 object-contain p-1 dark:bg-muted/30"
              />
              <div
                v-else
                class="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-serag-ivory/60 text-muted-foreground/40 dark:bg-muted/30"
                aria-hidden="true"
              >
                <Package class="size-6 stroke-[1.2]" />
              </div>

              <div class="min-w-0 flex-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-serag-gold">
                  {{ card.brand.name }}
                </span>
                <p class="truncate text-xs font-bold text-foreground sm:text-sm">
                  {{ card.name }}
                </p>
                <StoreProductPrice
                  :price="card.price"
                  :old-price="card.oldPrice"
                  :discount-percent="card.discountPercent"
                />
              </div>
            </div>

            <!-- Replace badge button -->
            <div class="shrink-0">
              <span
                class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground transition-colors group-hover:border-serag-gold group-hover:bg-primary group-hover:text-primary-foreground"
              >
                <ArrowLeftRight class="size-3.5 shrink-0" aria-hidden="true" />
                <span>{{ t('store.compare.replaceDialog.replaceButton') }}</span>
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Footer with Cancel button -->
      <DialogFooter class="mt-4 flex flex-row justify-end gap-2">
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="handleCancel"
        >
          {{ t('store.compare.replaceDialog.cancel') }}
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
