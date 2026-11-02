<script setup lang="ts">
import { ShoppingBag, ArrowRight, ArrowLeft } from '@lucide/vue'
import Sheet from '~/components/ui/sheet/Sheet.vue'
import SheetContent from '~/components/ui/sheet/SheetContent.vue'
import SheetHeader from '~/components/ui/sheet/SheetHeader.vue'
import SheetTitle from '~/components/ui/sheet/SheetTitle.vue'
import SheetDescription from '~/components/ui/sheet/SheetDescription.vue'

const { t, locale } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()
const { lines, count, subtotal, setQty, remove } = useCart()
const { quote, priceChanges, dismissPriceChange } = useCartQuote()
const { isOpen, close } = useCartDrawer()

// Physical side matching logical 'end'
const sheetSide = computed(() => (locale.value === 'ar' ? 'left' : 'right'))

function handleBrowseShop(): void {
  close()
  navigateTo(localePath('/shop'))
}
</script>

<template>
  <Sheet :open="isOpen" @update:open="(val) => (isOpen = val)">
    <SheetContent
      :side="sheetSide"
      class="flex h-full w-full flex-col gap-0 border-border/70 p-0 sm:max-w-[26rem]"
    >
      <!-- Header (pe-16 keeps clear of the close button) -->
      <SheetHeader class="flex-row items-center gap-3 border-b border-border/70 py-4 ps-5 pe-16">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-serag-gold/15 text-serag-gold-ink" aria-hidden="true">
          <ShoppingBag class="size-5" />
        </span>
        <div class="min-w-0 text-start">
          <SheetTitle class="text-lg leading-tight font-bold">
            {{ t('store.cart.drawerTitle') }}
          </SheetTitle>
          <SheetDescription class="mt-0.5 text-xs text-muted-foreground">
            <template v-if="count > 0">{{ t('store.cart.itemCount', { count }, count) }}</template>
            <template v-else>{{ t('store.cart.drawerDescription') }}</template>
          </SheetDescription>
        </div>
      </SheetHeader>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto bg-muted/35 px-4 py-4 sm:px-5 dark:bg-transparent">
        <!-- Empty State -->
        <div
          v-if="lines.length === 0"
          class="flex h-full flex-col items-center justify-center gap-5 py-12 text-center"
        >
          <div class="relative flex size-20 items-center justify-center rounded-full bg-serag-gold/15 text-serag-gold-ink">
            <span class="absolute inset-0 animate-ping-soft rounded-full bg-serag-gold/15" aria-hidden="true" />
            <ShoppingBag class="size-9" stroke-width="1.5" aria-hidden="true" />
          </div>
          <div class="space-y-1.5">
            <h3 class="text-base font-bold text-foreground">
              {{ t('store.cart.emptyTitle') }}
            </h3>
            <p class="mx-auto max-w-xs text-sm text-muted-foreground">
              {{ t('store.cart.emptyDescription') }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-full bg-serag-night px-7 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="handleBrowseShop"
          >
            {{ t('store.cart.browseProducts') }}
          </button>
        </div>

        <!-- Cart Lines -->
        <TransitionGroup v-else tag="ul" name="cart-line" class="relative flex flex-col gap-3">
          <li
            v-for="(line, index) in lines"
            :key="line.productId"
            class="cart-line-enter"
            :style="{ animationDelay: `${120 + Math.min(index, 6) * 55}ms` }"
          >
            <StoreCartLine
              :line="line"
              :quote-line="quote?.lines.find((ql) => ql.productId === line.productId)"
              :price-change="priceChanges[line.productId]"
              @update:qty="(q) => setQty(line.productId, q)"
              @remove="remove(line.productId)"
              @dismiss-price-change="dismissPriceChange(line.productId)"
            />
          </li>
        </TransitionGroup>
      </div>

      <!-- Footer -->
      <div
        v-if="lines.length > 0"
        class="flex flex-col gap-4 border-t border-border/70 bg-card p-4 shadow-[0_-12px_32px_-20px_rgba(15,26,20,0.25)] sm:p-5"
      >
        <dl class="flex flex-col gap-1.5 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-muted-foreground">{{ t('store.cart.deliveryFee') }}</dt>
            <dd class="text-xs text-muted-foreground">{{ t('store.cart.deliveryFeeNextStep') }}</dd>
          </div>
          <div class="flex items-baseline justify-between">
            <dt class="font-bold text-foreground">{{ t('store.cart.subtotal') }}</dt>
            <dd class="num text-xl font-extrabold text-serag-night dark:text-serag-gold">
              {{ money(quote?.subtotal ?? subtotal) }}
            </dd>
          </div>
        </dl>

        <div class="flex flex-col gap-2">
          <NuxtLink
            :to="localePath('/checkout')"
            class="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-serag-gold px-5 text-base font-bold text-serag-night shadow-[0_8px_20px_-8px_rgba(181,164,92,0.8)] transition-[background-color,transform] hover:bg-serag-gold-hi active:scale-[.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="close"
          >
            <span>{{ t('store.cart.checkout') }}</span>
            <component
              :is="locale === 'ar' ? ArrowLeft : ArrowRight"
              class="size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
          </NuxtLink>

          <NuxtLink
            :to="localePath('/cart')"
            class="inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-bold text-foreground underline-offset-4 transition-colors hover:bg-muted hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="close"
          >
            {{ t('store.cart.viewCart') }}
          </NuxtLink>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
