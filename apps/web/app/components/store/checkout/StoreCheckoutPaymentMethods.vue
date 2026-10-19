<script setup lang="ts">
import type { CheckoutPaymentMethod, PaymentMethod } from '@serag/shared'
import { Banknote, Smartphone, CreditCard, Building2 } from '@lucide/vue'

defineProps<{
  methods: CheckoutPaymentMethod[]
  modelValue: PaymentMethod
  disabled?: boolean
  hydrated: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [method: PaymentMethod]
}>()

const { t } = useI18n()

function getIcon(method: PaymentMethod) {
  switch (method) {
    case 'cod':
      return Banknote
    case 'instapay':
      return Smartphone
    case 'vodafone_cash':
      return Smartphone
    case 'fawry':
      return CreditCard
    default:
      return Building2
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
    <h2 class="text-lg font-bold text-foreground">
      {{ t('store.checkout.paymentSection') }}
    </h2>

    <div
      role="radiogroup"
      :aria-label="t('store.checkout.paymentMethod')"
      class="flex flex-col gap-3"
    >
      <label
        v-for="item in methods"
        :key="item.method"
        :class="[
          'relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-all focus-within:ring-2 focus-within:ring-ring',
          modelValue === item.method
            ? 'border-serag-gold bg-serag-gold/5 shadow-xs dark:bg-serag-gold/10'
            : 'border-border/70 bg-background/50 hover:border-border',
          (disabled || !hydrated) && 'pointer-events-none opacity-60',
        ]"
      >
        <input
          type="radio"
          name="paymentMethod"
          :value="item.method"
          :checked="modelValue === item.method"
          :disabled="disabled || !hydrated"
          class="sr-only"
          @change="emit('update:modelValue', item.method)"
        >

        <!-- Radio Circle Indicator -->
        <div
          class="flex size-5 shrink-0 items-center justify-center rounded-full border mt-0.5"
          :class="
            modelValue === item.method
              ? 'border-serag-gold bg-serag-gold text-serag-night'
              : 'border-muted-foreground/40 bg-transparent'
          "
          aria-hidden="true"
        >
          <div
            v-if="modelValue === item.method"
            class="size-2 rounded-full bg-serag-night"
          />
        </div>

        <!-- Method Info -->
        <div class="flex flex-1 flex-col gap-1 min-w-0">
          <div class="flex items-center gap-2">
            <component
              :is="getIcon(item.method)"
              class="size-4.5 text-serag-gold shrink-0"
              aria-hidden="true"
            />
            <span class="text-sm font-bold text-foreground">{{ item.name }}</span>
          </div>

          <p v-if="item.hint" class="text-xs text-muted-foreground">
            {{ item.hint }}
          </p>

          <!-- Account number for transfers -->
          <div
            v-if="item.account"
            class="mt-1.5 flex items-baseline gap-1.5 rounded-xl bg-muted/60 px-3 py-1.5 text-xs text-foreground"
          >
            <span class="text-muted-foreground">{{ t('store.thanks.accountLabel') }}</span>
            <span class="num font-bold text-serag-night dark:text-serag-gold">{{ item.account }}</span>
          </div>
        </div>
      </label>
    </div>
  </div>
</template>
