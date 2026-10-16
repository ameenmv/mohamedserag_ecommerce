<script setup lang="ts">
import { Banknote, Smartphone, Wallet } from '@lucide/vue'

const { t } = useI18n()

const paymentMethods = [
  { labelKey: 'store.footer.cashOnDelivery', icon: Banknote },
  { labelKey: 'store.footer.instapay', icon: Smartphone },
  { labelKey: 'store.footer.vodafoneCash', icon: Wallet },
] as const
</script>

<template>
  <div class="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-serag-ivory/15 pt-6">
    <div class="flex flex-wrap items-center gap-2.5">
      <span class="text-sm font-semibold text-serag-ivory">{{ t('store.footer.availablePaymentMethods') }}</span>
      <span
        v-for="method in paymentMethods"
        :key="method.labelKey"
        class="inline-flex items-center gap-1.5 rounded-full border border-serag-ivory/20 bg-serag-deep px-3.5 py-1.5 text-xs font-semibold text-serag-ivory"
      >
        <component :is="method.icon" class="size-3.5 text-serag-gold-hi" aria-hidden="true" />
        <span>{{ t(method.labelKey) }}</span>
      </span>
    </div>
    <span class="font-display text-xl tracking-wide text-serag-gold-hi">
      {{ t('store.footer.legacyTagline') }} · <span class="num text-base font-bold">SINCE 1972</span>
    </span>
  </div>
</template>
