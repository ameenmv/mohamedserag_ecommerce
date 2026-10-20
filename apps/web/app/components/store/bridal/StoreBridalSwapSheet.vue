<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeftRight, Check } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import type { BridalAlternative } from '@serag/shared'
import type { DisplayItem } from '~/composables/useBridalList'
import Sheet from '~/components/ui/sheet/Sheet.vue'
import SheetContent from '~/components/ui/sheet/SheetContent.vue'
import SheetHeader from '~/components/ui/sheet/SheetHeader.vue'
import SheetTitle from '~/components/ui/sheet/SheetTitle.vue'
import { apiFetch } from '~/utils/api'
import { classifyDiff } from '~/utils/bridal'

const props = defineProps<{
  open: boolean
  item: DisplayItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  swap: [alternative: BridalAlternative]
}>()

const { t, locale } = useI18n()
const { money } = usePrice()
const isSm = useMediaQuery('(min-width: 640px)')

const sheetSide = computed(() => {
  if (!isSm.value) return 'bottom'
  return locale.value === 'ar' ? 'left' : 'right'
})

const alternatives = ref<BridalAlternative[]>([])
const pending = ref(false)
const error = ref<unknown>(null)

watch(
  () => props.item?.productId,
  async (newId) => {
    if (!newId || !props.open) {
      alternatives.value = []
      return
    }

    pending.value = true
    error.value = null
    try {
      const res = await apiFetch<{ items: BridalAlternative[] }>('/bridal/alternatives', {
        method: 'GET',
        query: { productId: newId },
      })
      alternatives.value = res.items
    } catch (err) {
      error.value = err
      alternatives.value = []
    } finally {
      pending.value = false
    }
  },
  { immediate: true },
)

function handleSelect(alt: BridalAlternative): void {
  if (!alt.available) return
  emit('swap', alt)
  emit('update:open', false)
}
</script>

<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent
      :side="sheetSide"
      class="flex h-[85vh] w-full flex-col p-0 sm:h-full sm:max-w-md"
    >
      <SheetHeader class="border-b border-border/80 px-5 py-4">
        <SheetTitle class="flex items-center gap-2 text-base font-bold sm:text-lg">
          <ArrowLeftRight class="size-5 text-serag-gold" aria-hidden="true" />
          <span>{{ t('store.bridal.swapSheet.title', { name: item?.name ?? '' }) }}</span>
        </SheetTitle>
        <p class="text-xs text-muted-foreground">
          {{ t('store.bridal.swapSheet.description') }}
        </p>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <!-- Loading -->
        <div v-if="pending" class="flex flex-col gap-3">
          <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-muted/40 animate-pulse" />
        </div>

        <!-- Empty State -->
        <div
          v-else-if="alternatives.length === 0"
          class="flex h-full flex-col items-center justify-center gap-2 py-12 text-center"
        >
          <div class="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ArrowLeftRight class="size-6" aria-hidden="true" />
          </div>
          <p class="text-sm font-semibold text-foreground">
            {{ t('store.bridal.swapSheet.empty') }}
          </p>
        </div>

        <!-- Alternatives list -->
        <div v-else class="flex flex-col gap-3">
          <div
            v-for="alt in alternatives"
            :key="alt.productId"
            :data-swap-product="alt.productId"
            :class="[
              'flex items-center gap-3 rounded-2xl border p-3 transition-colors',
              alt.productId === item?.productId
                ? 'border-serag-gold bg-serag-gold/10'
                : 'border-border/80 bg-card hover:border-serag-gold/60',
              !alt.available && 'opacity-60 bg-muted/20',
            ]"
          >
            <!-- Image -->
            <div class="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
              <NuxtImg
                v-if="alt.imageUrl"
                :src="alt.imageUrl"
                :alt="alt.name"
                class="size-full object-contain p-1"
                loading="lazy"
              />
              <div v-else class="flex size-full items-center justify-center text-xs text-muted-foreground">
                Serag
              </div>
            </div>

            <!-- Details -->
            <div class="flex flex-1 flex-col gap-1 min-w-0">
              <p class="line-clamp-2 text-xs font-bold text-foreground sm:text-sm">
                {{ alt.name }}
              </p>

              <div class="flex flex-wrap items-baseline gap-2">
                <span class="num text-sm font-extrabold text-serag-night dark:text-serag-gold whitespace-nowrap">
                  {{ money(alt.price) }}
                </span>

                <!-- Price Difference in words without +/- sign -->
                <template v-if="item && alt.productId !== item.productId">
                  <span
                    v-if="classifyDiff(alt.price - item.unitPrice) === 'more'"
                    class="num text-[11px] font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap"
                  >
                    {{ t('store.bridal.swapSheet.priceDiffMore', { amount: money(Math.abs(alt.price - item.unitPrice)) }) }}
                  </span>
                  <span
                    v-else-if="classifyDiff(alt.price - item.unitPrice) === 'less'"
                    class="num text-[11px] font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
                  >
                    {{ t('store.bridal.swapSheet.priceDiffLess', { amount: money(Math.abs(alt.price - item.unitPrice)) }) }}
                  </span>
                  <span
                    v-else
                    class="text-[11px] font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {{ t('store.bridal.swapSheet.priceDiffSame') }}
                  </span>
                </template>
              </div>
            </div>

            <!-- Choose / Current button -->
            <div class="shrink-0">
              <span
                v-if="alt.productId === item?.productId"
                class="inline-flex size-9 items-center justify-center rounded-xl bg-serag-gold/20 text-serag-night dark:text-serag-gold"
                title="المنتج الحالي"
              >
                <Check class="size-4" aria-hidden="true" />
              </span>
              <button
                v-else
                type="button"
                :disabled="!alt.available"
                class="inline-flex min-h-11 items-center justify-center rounded-xl bg-serag-night px-3 text-xs font-bold text-serag-ivory transition-colors hover:bg-serag-green disabled:cursor-not-allowed disabled:opacity-40 dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi"
                @click="handleSelect(alt)"
              >
                <span>{{ alt.available ? t('store.bridal.swapSheet.choose') : t('store.bridal.swapSheet.outOfStock') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
