<script setup lang="ts">
import type { CartLine } from '~/utils/cart'
import type { CartQuoteLine } from '@serag/shared'
import { Minus, Package, Plus, Trash2 } from '@lucide/vue'
import type { PriceChange } from '~/utils/cart-quote'

const props = defineProps<{
  line: CartLine
  quoteLine?: CartQuoteLine | null
  priceChange?: PriceChange | null
}>()

const emit = defineEmits<{
  'update:qty': [qty: number]
  remove: []
  'dismiss-price-change': []
}>()

const { t } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()

const effectiveMaxQty = computed(() => props.quoteLine?.availability.maxQty ?? props.line.maxQty)

const isOutOfStock = computed(
  () =>
    props.quoteLine?.issues.includes('unavailable') ||
    props.quoteLine?.issues.includes('not_found') ||
    props.line.qty === 0,
)

const isQtyCapped = computed(() => props.quoteLine?.issues.includes('qty_capped'))

const hasPriceChange = computed(
  () =>
    Boolean(props.priceChange) ||
    Boolean(props.quoteLine?.issues.includes('price_changed') && props.quoteLine.previousPrice !== null),
)

const priceChangeData = computed(() => {
  if (props.priceChange) return props.priceChange
  if (props.quoteLine?.previousPrice !== null && props.quoteLine?.previousPrice !== undefined) {
    return {
      from: props.quoteLine.previousPrice,
      to: props.quoteLine.unitPrice,
    }
  }
  return null
})

function decrease(): void {
  if (props.line.qty > 1) {
    emit('update:qty', props.line.qty - 1)
  }
}

function increase(): void {
  if (effectiveMaxQty.value === null || props.line.qty < effectiveMaxQty.value) {
    emit('update:qty', props.line.qty + 1)
  }
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card p-3 sm:p-4">
    <div class="flex items-start gap-3">
      <!-- Product Image -->
      <NuxtLink
        :to="localePath(`/p/${line.slug}`)"
        :aria-label="line.name"
        class="relative size-18 shrink-0 overflow-hidden rounded-xl bg-serag-cream border border-border sm:size-20"
      >
        <img
          v-if="line.image"
          :src="line.image"
          :alt="line.name"
          class="size-full object-contain p-1"
          loading="lazy"
        >
        <div v-else class="flex size-full items-center justify-center bg-serag-cream text-serag-green" aria-hidden="true">
          <Package class="size-8" stroke-width="1.4" />
        </div>
      </NuxtLink>

      <!-- Details -->
      <div class="flex flex-1 flex-col justify-between gap-1.5 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <NuxtLink
            :to="localePath(`/p/${line.slug}`)"
            class="line-clamp-2 text-sm font-bold text-foreground transition-colors hover:text-serag-gold focus-visible:outline-none focus-visible:underline"
          >
            {{ line.name }}
          </NuxtLink>

          <!-- Remove Button -->
          <button
            type="button"
            class="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :aria-label="t('store.cart.removeLine')"
            @click="emit('remove')"
          >
            <Trash2 class="size-4.5" aria-hidden="true" />
          </button>
        </div>

        <!-- Unit Price -->
        <div class="flex items-baseline gap-1 text-xs text-muted-foreground">
          <span>{{ t('store.cart.unitPrice') }}:</span>
          <span class="num font-semibold text-foreground">{{ money(line.price) }}</span>
        </div>

        <!-- Lead time if on-request -->
        <div v-if="quoteLine?.leadTimeText" class="text-xs text-amber-700 dark:text-amber-400">
          {{ quoteLine.leadTimeText }}
        </div>

        <!-- Quantity Stepper & Line Total -->
        <div class="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            :aria-label="t('store.cart.quantity')"
            class="inline-flex h-11 items-center rounded-xl border border-input bg-background p-0.5"
          >
            <button
              type="button"
              class="flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              :disabled="line.qty <= 1"
              :aria-label="t('store.cart.decreaseQty')"
              @click="decrease"
            >
              <Minus class="size-4" aria-hidden="true" />
            </button>

            <span class="num min-w-8 text-center text-sm font-bold">
              {{ line.qty }}
            </span>

            <button
              type="button"
              class="flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              :disabled="effectiveMaxQty !== null && line.qty >= effectiveMaxQty"
              :aria-label="t('store.cart.increaseQty')"
              @click="increase"
            >
              <Plus class="size-4" aria-hidden="true" />
            </button>
          </div>

          <!-- Total for Line -->
          <div class="text-end">
            <span class="num text-base font-extrabold text-serag-night dark:text-serag-gold">
              {{ money(line.price * line.qty) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Issue Badges -->
    <div v-if="isOutOfStock || isQtyCapped || (hasPriceChange && priceChangeData)" class="flex flex-col gap-1.5 pt-1">
      <!-- Out of Stock -->
      <div
        v-if="isOutOfStock"
        class="flex items-center justify-between rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive"
      >
        <span>{{ t('store.cart.issues.outOfStock') }}</span>
      </div>

      <!-- Quantity Capped -->
      <div
        v-else-if="isQtyCapped"
        class="rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400"
      >
        {{ t('store.cart.issues.qtyCapped', { count: effectiveMaxQty ?? line.qty }) }}
      </div>

      <!-- Price Changed -->
      <div
        v-if="hasPriceChange && priceChangeData"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-900 dark:text-blue-300"
      >
        <span>
          {{
            t('store.cart.issues.priceChanged', {
              from: money(priceChangeData.from),
              to: money(priceChangeData.to),
            })
          }}
        </span>
        <button
          type="button"
          class="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="emit('dismiss-price-change')"
        >
          {{ t('store.cart.acknowledgePriceChange') }}
        </button>
      </div>
    </div>
  </div>
</template>
