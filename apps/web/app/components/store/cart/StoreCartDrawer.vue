<script setup lang="ts">
import { ShoppingBag, ArrowRight, ArrowLeft } from '@lucide/vue'
import { formatEgpWithUnit } from '@serag/shared'
import Sheet from '~/components/ui/sheet/Sheet.vue'
import SheetContent from '~/components/ui/sheet/SheetContent.vue'
import SheetHeader from '~/components/ui/sheet/SheetHeader.vue'
import SheetTitle from '~/components/ui/sheet/SheetTitle.vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { lines, count, subtotal, setQty, remove } = useCart()
const { quote, priceChanges, dismissPriceChange } = useCartQuote()
const { isOpen, close } = useCartDrawer()

// Physical side matching logical 'end'
const sheetSide = computed(() => (locale.value === 'ar' ? 'left' : 'right'))

function handleCheckout(): void {
  close()
  navigateTo(localePath('/checkout'))
}

function handleViewCart(): void {
  close()
  navigateTo(localePath('/cart'))
}

function handleBrowseShop(): void {
  close()
  navigateTo(localePath('/shop'))
}
</script>

<template>
  <Sheet :open="isOpen" @update:open="(val) => (isOpen = val)">
    <SheetContent
      :side="sheetSide"
      class="flex h-full w-full flex-col p-0 sm:max-w-md"
    >
      <!-- Header -->
      <SheetHeader class="border-b border-border/80 px-5 py-4">
        <SheetTitle class="flex items-center gap-2 text-lg font-bold">
          <ShoppingBag class="size-5 text-serag-gold" aria-hidden="true" />
          <span>{{ t('store.cart.drawerTitle') }}</span>
          <span
            v-if="count > 0"
            class="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-serag-night px-1.5 text-xs font-bold text-serag-gold-hi"
          >
            {{ count }}
          </span>
        </SheetTitle>
      </SheetHeader>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <!-- Empty State -->
        <div
          v-if="lines.length === 0"
          class="flex h-full flex-col items-center justify-center gap-4 text-center py-12"
        >
          <div class="flex size-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag class="size-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-bold text-foreground">
              {{ t('store.cart.emptyTitle') }}
            </h3>
            <p class="text-xs text-muted-foreground max-w-xs">
              {{ t('store.cart.emptyDescription') }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-serag-night px-6 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="handleBrowseShop"
          >
            {{ t('store.cart.browseProducts') }}
          </button>
        </div>

        <!-- Cart Lines -->
        <div v-else class="flex flex-col gap-3">
          <StoreCartLine
            v-for="line in lines"
            :key="line.productId"
            :line="line"
            :quote-line="quote?.lines.find((ql) => ql.productId === line.productId)"
            :price-change="priceChanges[line.productId]"
            @update:qty="(q) => setQty(line.productId, q)"
            @remove="remove(line.productId)"
            @dismiss-price-change="dismissPriceChange(line.productId)"
          />
        </div>
      </div>

      <!-- Footer -->
      <div v-if="lines.length > 0" class="border-t border-border/80 bg-card p-4 sm:p-5 flex flex-col gap-3">
        <!-- Subtotal -->
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium text-muted-foreground">{{ t('store.cart.subtotal') }}</span>
          <span class="num text-lg font-extrabold text-serag-night dark:text-serag-gold">
            {{ formatEgpWithUnit(quote?.subtotal ?? subtotal) }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2">
          <button
            type="button"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-serag-gold px-4 text-base font-bold text-serag-night shadow-sm transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="handleCheckout"
          >
            <span>{{ t('store.cart.checkout') }}</span>
            <component
              :is="locale === 'ar' ? ArrowLeft : ArrowRight"
              class="size-4"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="handleViewCart"
          >
            {{ t('store.cart.viewCart') }}
          </button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
