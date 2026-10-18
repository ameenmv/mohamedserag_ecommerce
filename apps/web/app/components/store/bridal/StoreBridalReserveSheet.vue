<script setup lang="ts">
import { toRef } from 'vue'
import { Calendar, CheckCircle2, Info, Loader2, ShieldCheck, Tag } from '@lucide/vue'
import Sheet from '~/components/ui/sheet/Sheet.vue'
import SheetContent from '~/components/ui/sheet/SheetContent.vue'
import SheetHeader from '~/components/ui/sheet/SheetHeader.vue'
import SheetTitle from '~/components/ui/sheet/SheetTitle.vue'
import StoreCheckoutCustomerForm from '~/components/store/checkout/StoreCheckoutCustomerForm.vue'
import StoreCheckoutPaymentMethods from '~/components/store/checkout/StoreCheckoutPaymentMethods.vue'
import { useBridalReserve } from '~/composables/useBridalReserve'

const props = defineProps<{
  open: boolean
  token: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  refreshList: []
}>()

const tokenRef = toRef(props, 'token')

const { t } = useI18n()
const { money } = usePrice()

const {
  form,
  preferredDate,
  minPreferredDate,
  errors,
  submitting,
  hydrated,
  canSubmit,
  quote,
  quotePending,
  governorates,
  citySuggestions,
  paymentMethods,
  submit,
} = useBridalReserve(tokenRef, {
  onRefreshList: () => {
    emit('refreshList')
  },
  onInvalidated: () => {
    emit('update:open', false)
  },
})

async function handleSubmit(): Promise<void> {
  await submit()
}
</script>

<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent
      side="bottom"
      class="flex h-[90vh] w-full flex-col p-0 sm:h-full sm:max-w-lg sm:inset-y-0 sm:top-0 sm:bottom-0 sm:border-t-0 rtl:sm:inset-x-auto rtl:sm:left-0 rtl:sm:right-auto rtl:sm:border-r ltr:sm:inset-x-auto ltr:sm:right-0 ltr:sm:left-auto ltr:sm:border-l"
    >
      <!-- Header -->
      <SheetHeader class="border-b border-border/80 px-5 py-4">
        <SheetTitle class="flex items-center gap-2 text-base font-bold sm:text-lg">
          <ShieldCheck class="size-5 text-serag-gold shrink-0" aria-hidden="true" />
          <span>{{ t('store.bridal.reserveSheet.title') }}</span>
        </SheetTitle>
        <p class="text-xs text-muted-foreground">
          {{ t('store.bridal.reserveSheet.description') }}
        </p>
      </SheetHeader>

      <!-- Scrollable Form Body -->
      <div class="flex-1 overflow-y-auto px-4 py-5 sm:px-6 flex flex-col gap-6">
        <!-- 1. Customer Form Reused -->
        <StoreCheckoutCustomerForm
          v-model="form"
          :errors="errors"
          :governorates="governorates"
          :city-suggestions="citySuggestions"
          :disabled="submitting"
          :hydrated="hydrated"
        />

        <!-- 2. Preferred Delivery Date (Optional) -->
        <div class="flex flex-col gap-3 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
          <div class="flex items-center gap-2">
            <Calendar class="size-4 text-serag-gold shrink-0" aria-hidden="true" />
            <h2 class="text-sm font-bold text-foreground">
              {{ t('store.bridal.reserveSheet.preferredDate') }}
            </h2>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="bridal-preferred-date" class="sr-only">
              {{ t('store.bridal.reserveSheet.preferredDate') }}
            </label>
            <input
              id="bridal-preferred-date"
              v-model="preferredDate"
              type="date"
              :min="minPreferredDate"
              :disabled="submitting || !hydrated"
              aria-describedby="bridal-preferred-date-hint"
              class="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
            <p
              id="bridal-preferred-date-hint"
              class="text-xs text-muted-foreground"
            >
              {{ t('store.bridal.reserveSheet.preferredDateHint') }}
            </p>
            <p
              v-if="errors.preferredDate"
              id="bridal-preferred-date-error"
              class="text-xs font-semibold text-destructive"
            >
              {{ errors.preferredDate }}
            </p>
          </div>
        </div>

        <!-- 3. Payment Methods Reused (Filtered non-COD) -->
        <StoreCheckoutPaymentMethods
          v-model="form.paymentMethod"
          :methods="paymentMethods"
          :disabled="submitting"
          :hydrated="hydrated"
        />

        <!-- 4. Live Quote & Deposit Breakdown Card -->
        <div class="flex flex-col gap-3.5 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
          <h2 class="text-sm font-bold text-foreground">
            {{ t('store.bridal.totals.title') }}
          </h2>

          <!-- Updating Quote Loader -->
          <div
            v-if="quotePending"
            class="flex items-center gap-2.5 rounded-2xl bg-muted/60 p-4 text-xs font-medium text-muted-foreground"
          >
            <Loader2 class="size-4 animate-spin text-serag-gold shrink-0" aria-hidden="true" />
            <span>{{ t('store.bridal.reserveSheet.updatingQuote') }}</span>
          </div>

          <!-- Active Live Quote -->
          <template v-else-if="quote">
            <div class="flex flex-col divide-y divide-border/60 text-xs">
              <!-- Subtotal -->
              <div class="flex items-center justify-between py-2.5">
                <span class="text-muted-foreground">{{ t('store.bridal.reserveSheet.subtotal') }}</span>
                <span class="num font-bold text-foreground whitespace-nowrap">{{ money(quote.subtotal) }}</span>
              </div>

              <!-- Delivery Fee -->
              <div class="flex items-center justify-between py-2.5">
                <span class="text-muted-foreground">{{ t('store.bridal.reserveSheet.deliveryFee') }}</span>
                <span class="num font-bold text-foreground whitespace-nowrap">
                  {{ quote.deliveryFee > 0 ? money(quote.deliveryFee) : t('store.cart.freeDelivery') }}
                </span>
              </div>

              <!-- Locked Total -->
              <div class="flex items-baseline justify-between py-3 bg-muted/30 -mx-3 px-3 rounded-xl sm:-mx-4 sm:px-4">
                <span class="text-sm font-bold text-foreground">{{ t('store.bridal.reserveSheet.lockedTotal') }}</span>
                <span class="num text-base font-extrabold text-serag-night dark:text-serag-gold whitespace-nowrap">
                  {{ money(quote.total) }}
                </span>
              </div>

              <!-- Deposit Highlight Banner -->
              <div class="flex items-center justify-between py-3 text-amber-900 dark:text-amber-300 font-bold bg-amber-500/10 -mx-3 px-3 rounded-xl sm:-mx-4 sm:px-4 mt-2">
                <span>{{ t('store.bridal.reserveSheet.depositAmount', { pct: quote.depositPct, amount: '' }).trim() }}</span>
                <span class="num text-base font-black whitespace-nowrap">{{ money(quote.depositAmount) }}</span>
              </div>
            </div>

            <!-- Lock Period Notice -->
            <div class="flex items-center gap-2 rounded-2xl border border-serag-gold/40 bg-serag-gold/10 p-3 text-xs font-bold text-serag-night dark:text-serag-gold">
              <CheckCircle2 class="size-4 shrink-0 text-serag-gold" aria-hidden="true" />
              <span>{{ t('store.bridal.reserveSheet.lockNotice', { lockDays: quote.lockDays }) }}</span>
            </div>

            <!-- Coupons Notice -->
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <Tag class="size-3.5 shrink-0" aria-hidden="true" />
              <span>{{ t('store.bridal.reserveSheet.noCouponsNotice') }}</span>
            </div>

            <!-- Showroom Installments Notice -->
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <Info class="size-3.5 shrink-0" aria-hidden="true" />
              <span>{{ t('store.bridal.reserveSheet.installmentsNotice') }}</span>
            </div>
          </template>

          <!-- Prompt to pick location -->
          <div
            v-else
            class="flex items-center gap-2 rounded-2xl bg-muted/40 p-4 text-xs font-medium text-muted-foreground"
          >
            <Info class="size-4 text-serag-gold shrink-0" aria-hidden="true" />
            <span>{{ t('store.bridal.reserveSheet.chooseLocationHint') }}</span>
          </div>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="border-t border-border/80 bg-background/95 p-4 sm:px-6 backdrop-blur-md flex flex-col gap-2">
        <button
          id="bridal-reserve-submit-button"
          data-bridal-reserve-submit
          type="button"
          :disabled="!canSubmit"
          class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-serag-gold px-6 text-sm font-bold text-serag-night shadow-sm transition-colors hover:bg-serag-gold-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSubmit"
        >
          <Loader2 v-if="submitting" class="size-4.5 animate-spin" aria-hidden="true" />
          <ShieldCheck v-else class="size-4.5" aria-hidden="true" />
          <span>{{ submitting ? t('store.bridal.reserveSheet.submitting') : t('store.bridal.reserveSheet.submitButton') }}</span>
        </button>

        <p
          v-if="!quote && !quotePending"
          class="text-center text-[11px] text-muted-foreground"
        >
          {{ t('store.bridal.reserveSheet.quoteRequiredHint') }}
        </p>
      </div>
    </SheetContent>
  </Sheet>
</template>
