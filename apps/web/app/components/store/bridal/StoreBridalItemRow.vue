<script setup lang="ts">
import { ArrowLeftRight, Minus, Plus, Trash2 } from '@lucide/vue'
import type { DisplayItem } from '~/composables/useBridalList'

const props = defineProps<{
  item: DisplayItem
  editable?: boolean
}>()

const emit = defineEmits<{
  'update:qty': [qty: number]
  remove: []
  swap: []
}>()

const { t } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()

function decrease(): void {
  if (props.item.qty > 1) {
    emit('update:qty', props.item.qty - 1)
  }
}

function increase(): void {
  if (props.item.qty < 10) {
    emit('update:qty', props.item.qty + 1)
  }
}
</script>

<template>
  <div
    :data-product-id="item.productId"
    :class="[
      'flex flex-col gap-3 rounded-2xl border bg-card p-3.5 transition-colors sm:p-4',
      !item.available ? 'border-destructive/40 bg-destructive/5' : 'border-border/80',
    ]"
  >
    <div class="flex items-start gap-3">
      <!-- Product Image -->
      <NuxtLink
        :to="localePath(`/p/${item.slug}`)"
        class="relative size-18 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30 sm:size-20"
      >
        <NuxtImg
          v-if="item.imageUrl"
          :src="item.imageUrl"
          :alt="item.name"
          class="size-full object-contain p-1"
          loading="lazy"
        />
        <div v-else class="flex size-full items-center justify-center text-xs text-muted-foreground">
          Serag
        </div>
      </NuxtLink>

      <!-- Details -->
      <div class="flex flex-1 flex-col justify-between gap-1.5 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <NuxtLink
            :to="localePath(`/p/${item.slug}`)"
            class="line-clamp-2 text-sm font-bold text-foreground transition-colors hover:text-serag-gold focus-visible:outline-none focus-visible:underline"
          >
            {{ item.name }}
          </NuxtLink>
        </div>

        <!-- Out of stock badge -->
        <div v-if="!item.available">
          <span class="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
            {{ t('store.bridal.items.outOfStockBadge') }}
          </span>
        </div>

        <!-- On-request lead time -->
        <div v-else-if="item.leadTimeText" class="text-xs font-medium text-amber-700 dark:text-amber-400">
          <span>{{ t('store.bridal.items.leadTimePrefix') }} {{ item.leadTimeText }}</span>
        </div>

        <!-- Unit Price -->
        <div class="flex items-baseline gap-1 text-xs text-muted-foreground">
          <span>{{ t('store.bridal.items.unitPrice') }}</span>
          <span
            :class="[
              'num font-semibold text-foreground whitespace-nowrap',
              !item.available && 'line-through opacity-60 text-muted-foreground',
            ]"
          >
            {{ money(item.unitPrice) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Quantity, line total and actions span the full card width so narrow screens never overflow -->
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <!-- Quantity control or Read-only quantity -->
      <div class="flex items-center gap-4">
        <!-- Edit Mode: Stepper -->
        <div
          v-if="editable"
          role="group"
          :aria-label="t('store.bridal.items.qty')"
          class="inline-flex h-11 items-center rounded-xl border border-input bg-background p-0.5"
        >
          <button
            type="button"
            class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :disabled="item.qty <= 1"
            :aria-label="t('store.bridal.items.decreaseQtyAria', { name: item.name })"
            @click="decrease"
          >
            <Minus class="size-4" aria-hidden="true" />
          </button>

          <span class="num min-w-8 text-center text-sm font-bold">
            {{ item.qty }}
          </span>

          <button
            type="button"
            class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :disabled="item.qty >= 10"
            :aria-label="t('store.bridal.items.increaseQtyAria', { name: item.name })"
            @click="increase"
          >
            <Plus class="size-4" aria-hidden="true" />
          </button>
        </div>

        <!-- Read-only Mode: Qty text -->
        <div v-else class="text-xs font-semibold text-muted-foreground">
          <span>{{ t('store.bridal.items.qty') }}</span>
          <span class="num font-bold text-foreground ms-1">{{ item.qty }}</span>
        </div>

        <!-- Line Total -->
        <div class="text-end">
          <span
            :class="[
              'num text-base font-extrabold whitespace-nowrap',
              !item.available
                ? 'line-through text-muted-foreground opacity-60'
                : 'text-serag-night dark:text-serag-gold',
            ]"
          >
            {{ money(item.lineTotal) }}
          </span>
        </div>
      </div>

      <!-- Edit mode actions: Swap & Remove -->
      <div v-if="editable" class="flex items-center gap-1 ms-auto">
        <button
          type="button"
          class="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-serag-gold/15 hover:text-serag-night dark:hover:text-serag-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :aria-label="t('store.bridal.items.swapAria', { name: item.name })"
          @click="emit('swap')"
        >
          <ArrowLeftRight class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ t('store.bridal.items.swap') }}</span>
        </button>

        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :aria-label="t('store.bridal.items.removeAria', { name: item.name })"
          @click="emit('remove')"
        >
          <Trash2 class="size-4.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
