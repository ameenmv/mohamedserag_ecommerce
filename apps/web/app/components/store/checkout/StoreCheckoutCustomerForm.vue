<script setup lang="ts">
import { MessageCircle } from '@lucide/vue'
import { waLink } from '@serag/shared'
import type { CheckoutFormState } from '~/composables/useCheckout'

const form = defineModel<CheckoutFormState>({ required: true })

defineProps<{
  errors: Record<string, string>
  governorates: readonly string[]
  citySuggestions: string[]
  disabled?: boolean
  hydrated: boolean
}>()

const { t } = useI18n()
const storeSettings = useStoreSettings()

const whatsappDateUrl = computed(() => {
  if (!storeSettings.whatsapp) return ''
  return waLink(
    storeSettings.whatsapp,
    t('store.checkout.specialDateHelp'),
  )
})

const name = computed({
  get: () => form.value.name,
  set: (val: string) => {
    form.value = { ...form.value, name: val }
  },
})

const phone = computed({
  get: () => form.value.phone,
  set: (val: string) => {
    form.value = { ...form.value, phone: val }
  },
})

const governorate = computed({
  get: () => form.value.governorate,
  set: (val: string) => {
    form.value = { ...form.value, governorate: val }
  },
})

const city = computed({
  get: () => form.value.city,
  set: (val: string) => {
    form.value = { ...form.value, city: val }
  },
})

const address = computed({
  get: () => form.value.address,
  set: (val: string) => {
    form.value = { ...form.value, address: val }
  },
})

const notes = computed({
  get: () => form.value.notes,
  set: (val: string) => {
    form.value = { ...form.value, notes: val }
  },
})
</script>

<template>
  <div class="flex flex-col gap-5 rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
    <h2 class="text-lg font-bold text-foreground">
      {{ t('store.checkout.customerSection') }}
    </h2>

    <div class="flex flex-col gap-4">
      <!-- Full Name -->
      <div class="flex flex-col gap-1.5">
        <label for="checkout-name" class="text-sm font-semibold text-foreground">
          {{ t('store.checkout.fullName') }} <span class="text-destructive">*</span>
        </label>
        <input
          id="checkout-name"
          v-model="name"
          type="text"
          name="name"
          autocomplete="name"
          :placeholder="t('store.checkout.fullNamePlaceholder')"
          :disabled="disabled || !hydrated"
          :aria-invalid="Boolean(errors.name)"
          :aria-describedby="errors.name ? 'checkout-name-error' : undefined"
          class="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
        <p
          v-if="errors.name"
          id="checkout-name-error"
          class="text-xs font-semibold text-destructive"
        >
          {{ errors.name }}
        </p>
      </div>

      <!-- Phone Number -->
      <div class="flex flex-col gap-1.5">
        <label for="checkout-phone" class="text-sm font-semibold text-foreground">
          {{ t('store.checkout.phone') }} <span class="text-destructive">*</span>
        </label>
        <input
          id="checkout-phone"
          v-model="phone"
          type="tel"
          name="tel"
          inputmode="tel"
          dir="ltr"
          autocomplete="tel"
          :placeholder="t('store.checkout.phonePlaceholder')"
          :disabled="disabled || !hydrated"
          :aria-invalid="Boolean(errors.phone)"
          :aria-describedby="errors.phone ? 'checkout-phone-error' : 'checkout-phone-hint'"
          class="num flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-start text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
        <p
          v-if="errors.phone"
          id="checkout-phone-error"
          class="text-xs font-semibold text-destructive"
        >
          {{ errors.phone }}
        </p>
        <p
          v-else
          id="checkout-phone-hint"
          class="text-xs text-muted-foreground"
        >
          {{ t('store.checkout.phoneHint') }}
        </p>
      </div>

      <!-- Governorate & City (2 cols on sm) -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Governorate -->
        <div class="flex flex-col gap-1.5">
          <label for="checkout-governorate" class="text-sm font-semibold text-foreground">
            {{ t('store.checkout.governorate') }} <span class="text-destructive">*</span>
          </label>
          <div class="relative">
            <select
              id="checkout-governorate"
              v-model="governorate"
              name="governorate"
              :disabled="disabled || !hydrated"
              :aria-invalid="Boolean(errors.governorate)"
              :aria-describedby="errors.governorate ? 'checkout-gov-error' : undefined"
              class="flex h-12 w-full appearance-none rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled selected>
                {{ t('store.checkout.governoratePlaceholder') }}
              </option>
              <option
                v-for="gov in governorates"
                :key="gov"
                :value="gov"
              >
                {{ gov }}
              </option>
            </select>
          </div>
          <p
            v-if="errors.governorate"
            id="checkout-gov-error"
            class="text-xs font-semibold text-destructive"
          >
            {{ errors.governorate }}
          </p>
        </div>

        <!-- City / Markaz with datalist suggestions -->
        <div class="flex flex-col gap-1.5">
          <label for="checkout-city" class="text-sm font-semibold text-foreground">
            {{ t('store.checkout.city') }} <span class="text-destructive">*</span>
          </label>
          <input
            id="checkout-city"
            v-model="city"
            type="text"
            name="city"
            list="city-suggestions"
            :placeholder="t('store.checkout.cityPlaceholder')"
            :disabled="disabled || !hydrated"
            :aria-invalid="Boolean(errors.city)"
            :aria-describedby="errors.city ? 'checkout-city-error' : undefined"
            class="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
          <datalist id="city-suggestions">
            <option
              v-for="cityName in citySuggestions"
              :key="cityName"
              :value="cityName"
            />
          </datalist>
          <p
            v-if="errors.city"
            id="checkout-city-error"
            class="text-xs font-semibold text-destructive"
          >
            {{ errors.city }}
          </p>
        </div>
      </div>

      <!-- Detailed Address -->
      <div class="flex flex-col gap-1.5">
        <label for="checkout-address" class="text-sm font-semibold text-foreground">
          {{ t('store.checkout.address') }} <span class="text-destructive">*</span>
        </label>
        <textarea
          id="checkout-address"
          v-model="address"
          name="address"
          rows="3"
          :placeholder="t('store.checkout.addressPlaceholder')"
          :disabled="disabled || !hydrated"
          :aria-invalid="Boolean(errors.address)"
          :aria-describedby="errors.address ? 'checkout-address-error' : undefined"
          class="flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p
          v-if="errors.address"
          id="checkout-address-error"
          class="text-xs font-semibold text-destructive"
        >
          {{ errors.address }}
        </p>
      </div>

      <!-- Notes (Optional) -->
      <div class="flex flex-col gap-1.5">
        <label for="checkout-notes" class="text-sm font-semibold text-foreground">
          {{ t('store.checkout.notes') }}
        </label>
        <textarea
          id="checkout-notes"
          v-model="notes"
          name="notes"
          rows="2"
          :placeholder="t('store.checkout.notesPlaceholder')"
          :disabled="disabled || !hydrated"
          class="flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <!-- Special Date WhatsApp Notice -->
      <div
        v-if="whatsappDateUrl"
        class="flex items-center gap-2 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground"
      >
        <MessageCircle class="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span>
          <a
            :href="whatsappDateUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-bold text-foreground underline underline-offset-4 hover:text-serag-gold focus-visible:outline-none"
          >
            {{ t('store.checkout.specialDateHelp') }}
          </a>
        </span>
      </div>
    </div>
  </div>
</template>
