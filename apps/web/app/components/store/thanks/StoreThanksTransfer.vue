<script setup lang="ts">
import { MessageCircle, Copy, Check, Smartphone } from '@lucide/vue'
import {
  DEFAULT_TEMPLATES,
  formatEgpWithUnit,
  renderTemplate,
  waLink,
  type OrderThanksDeposit,
  type OrderThanksPayment,
} from '@serag/shared'

const props = defineProps<{
  no: string
  payment: OrderThanksPayment
  deposit: OrderThanksDeposit | null
  total: number
  confirmToken: string | null
}>()

const { t } = useI18n()
const { money } = usePrice()
const storeSettings = useStoreSettings()
const copiedAccount = ref(false)

const amountToTransfer = computed(() => {
  return props.deposit ? props.deposit.amount : props.total
})

const whatsappProofUrl = computed(() => {
  if (!props.confirmToken || !storeSettings.whatsapp) return ''
  const origin = useRequestURL().origin
  const confirmUrl = `${origin}/admin/confirm/${props.confirmToken}`
  const text = renderTemplate(DEFAULT_TEMPLATES.payment_proof, {
    amount: formatEgpWithUnit(amountToTransfer.value),
    method: props.payment.name,
    orderNo: props.no,
    confirmUrl,
  })
  return waLink(storeSettings.whatsapp, text)
})

async function copyAccount(): Promise<void> {
  if (!props.payment.account) return
  try {
    await navigator.clipboard.writeText(props.payment.account)
    copiedAccount.value = true
    setTimeout(() => {
      copiedAccount.value = false
    }, 2000)
  } catch {
    // Clipboard API might fail or be restricted
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 rounded-3xl border border-serag-gold/40 bg-serag-gold/5 p-5 sm:p-6 dark:bg-serag-gold/10 shadow-xs">
    <div class="flex items-center gap-2.5">
      <Smartphone class="size-5 text-serag-gold shrink-0" aria-hidden="true" />
      <h2 class="text-base font-bold text-foreground sm:text-lg">
        {{ deposit ? t('store.thanks.depositNextStep', { method: payment.name }) : t('store.thanks.transferNextStep', { method: payment.name }) }}
      </h2>
    </div>

    <!-- Instructions -->
    <p class="text-sm text-foreground">
      {{
        t('store.thanks.transferInstruction', {
          amount: money(amountToTransfer),
        })
      }}
    </p>

    <!-- Account Details -->
    <div
      v-if="payment.account"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background p-4"
    >
      <div class="flex flex-col">
        <span class="text-xs text-muted-foreground">{{ t('store.thanks.accountLabel') }}</span>
        <span class="num text-lg font-extrabold text-foreground tracking-wide">
          {{ payment.account }}
        </span>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-input bg-card px-3.5 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        @click="copyAccount"
      >
        <Check v-if="copiedAccount" class="size-4 text-emerald-600" aria-hidden="true" />
        <Copy v-else class="size-4" aria-hidden="true" />
        <span>{{ copiedAccount ? t('store.thanks.copied') : t('store.thanks.copyOrderNo') }}</span>
      </button>
    </div>

    <p v-if="payment.hint" class="text-xs text-muted-foreground">
      {{ payment.hint }}
    </p>

    <!-- WhatsApp Proof Button (Hidden when confirmToken is null) -->
    <div v-if="confirmToken && whatsappProofUrl" class="pt-2">
      <a
        :href="whatsappProofUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#20ba5a] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <MessageCircle class="size-5" aria-hidden="true" />
        <span>{{ t('store.thanks.sendWhatsappProof') }}</span>
      </a>
    </div>
  </div>
</template>
