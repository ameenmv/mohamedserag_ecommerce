<script setup lang="ts">
import { Info } from '@lucide/vue'
import { SHIPPING_CLASSES, type DeliveryOffersSetting, type ShippingClass } from '@serag/shared'
import { egpInputToPiastres, piastresToEgpInput } from '~/utils/admin-money'

const { t } = useI18n()
const {
  draft,
  loaded,
  saving,
  fieldErrors,
  formError,
  dirty,
  save,
  discard,
} = useAdminSettingsSection('deliveryOffers')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const amountInput = ref('')
const amountError = ref('')

watch(
  [loaded, draft],
  () => {
    if (!loaded.value) return
    amountInput.value = piastresToEgpInput(draft.value.freeAbove.amount)
    amountError.value = ''
  },
  { immediate: true },
)

function onAmountInput(value: string) {
  amountInput.value = value
  const piastres = egpInputToPiastres(value)
  if (piastres === null) {
    amountError.value = t('admin.delivery.offers.amountInvalid')
    return
  }
  draft.value.freeAbove.amount = piastres
  amountError.value = piastres <= 0 ? t('admin.delivery.offers.amountInvalid') : ''
}

function toggleClass(
  offer: DeliveryOffersSetting['freeAbove'] | DeliveryOffersSetting['firstOrderFree'],
  shippingClass: ShippingClass,
  checked: boolean,
) {
  const next = new Set(offer.classes)
  if (checked) {
    next.add(shippingClass)
  } else {
    next.delete(shippingClass)
  }
  offer.classes = SHIPPING_CLASSES.filter((candidate) => next.has(candidate))
}

async function handleSave() {
  await save()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.delivery.offers.hint') }}</span>
    </p>

    <p
      v-if="formError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ formError }}
    </p>

    <div v-if="loaded" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section class="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-foreground">{{ t('admin.delivery.offers.freeAboveTitle') }}</h3>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ t('admin.delivery.offers.freeAboveDescription') }}</p>
          </div>
          <AdminFormSwitch v-model="draft.freeAbove.enabled" :disabled="saving" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="delivery-offer-amount" class="text-xs font-semibold text-foreground">
            {{ t('admin.delivery.offers.amount') }}
          </label>
          <Input
            id="delivery-offer-amount"
            :model-value="amountInput"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            dir="ltr"
            :disabled="saving || !draft.freeAbove.enabled"
            :aria-invalid="Boolean(amountError || fieldErrors['freeAbove.amount'])"
            class="num h-10 rounded-xl"
            @update:model-value="onAmountInput(String($event))"
          />
          <p v-if="amountError" class="text-[11px] font-semibold text-destructive">{{ amountError }}</p>
          <p v-else-if="fieldErrors['freeAbove.amount']" class="text-[11px] font-semibold text-destructive">
            {{ fieldErrors['freeAbove.amount'] }}
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-foreground">{{ t('admin.delivery.offers.classes') }}</span>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="shippingClass in SHIPPING_CLASSES"
              :key="shippingClass"
              class="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-xs font-semibold text-foreground"
            >
              <input
                type="checkbox"
                :checked="draft.freeAbove.classes.includes(shippingClass)"
                :disabled="saving || !draft.freeAbove.enabled"
                class="size-4 rounded border-border"
                @change="
                  toggleClass(
                    draft.freeAbove,
                    shippingClass,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              >
              <span>{{ t(`admin.delivery.classes.${shippingClass}`) }}</span>
            </label>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-foreground">{{ t('admin.delivery.offers.firstOrderTitle') }}</h3>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ t('admin.delivery.offers.firstOrderDescription') }}</p>
          </div>
          <AdminFormSwitch v-model="draft.firstOrderFree.enabled" :disabled="saving" />
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-foreground">{{ t('admin.delivery.offers.classes') }}</span>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="shippingClass in SHIPPING_CLASSES"
              :key="shippingClass"
              class="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-xs font-semibold text-foreground"
            >
              <input
                type="checkbox"
                :checked="draft.firstOrderFree.classes.includes(shippingClass)"
                :disabled="saving || !draft.firstOrderFree.enabled"
                class="size-4 rounded border-border"
                @change="
                  toggleClass(
                    draft.firstOrderFree,
                    shippingClass,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              >
              <span>{{ t(`admin.delivery.classes.${shippingClass}`) }}</span>
            </label>
          </div>
        </div>
      </section>
    </div>

    <AdminSettingsSaveBar
      :saving="saving"
      :dirty="dirty"
      :hydrated="hydrated"
      @save="handleSave"
      @discard="discard"
    />
  </div>
</template>
