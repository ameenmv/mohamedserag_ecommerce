import type { Ref } from 'vue'
import type { CreateOrderResult } from '@serag/shared'
import { createOrderInputSchema } from '@serag/shared'
import { getApiBaseUrl } from '../utils/api'
import {
  buildCreateOrderPayload,
  orderPlacedEvent,
  parseOrderConflict,
  placeOrderBlockReason,
  type CheckoutFormInput,
} from '../utils/checkout'
import { clearKey, readOrCreateKey } from '../utils/idempotency'

export type CheckoutFormState = CheckoutFormInput

export function useCheckout(options?: { hydrated?: Ref<boolean> }) {
  const { lines, subtotal, clear: clearCart } = useCart()
  const {
    quote,
    pending: quotePending,
    applyQuoteToCart,
    setQuoteContext,
    resetQuoteContext,
    refreshNow: refreshQuote,
  } = useCartQuote()
  const {
    settings,
    governorates,
    paymentMethods,
    pending: settingsPending,
    error: settingsError,
    refresh: refreshSettings,
  } = useCheckoutSettings()

  const notify = useNotify()
  const analytics = useAnalytics()
  const localePath = useLocalePath()
  const { t } = useI18n()

  const internalHydrated = ref(false)
  if (import.meta.client) {
    onMounted(() => {
      internalHydrated.value = true
    })
  }
  const hydrated = options?.hydrated ?? internalHydrated

  const form = ref<CheckoutFormState>({
    name: '',
    phone: '',
    governorate: '',
    city: '',
    address: '',
    notes: '',
    paymentMethod: 'cod',
    couponCode: '',
  })

  // Synchronize payment method selection when settings load
  watch(
    paymentMethods,
    (methods) => {
      const first = methods[0]
      if (first && !methods.some((m) => m.method === form.value.paymentMethod)) {
        form.value.paymentMethod = first.method
      }
    },
    { immediate: true },
  )

  // City suggestions for the selected governorate
  const citySuggestions = computed<string[]>(() => {
    if (!settings.value || !form.value.governorate) return []
    return settings.value.citySuggestions[form.value.governorate] ?? []
  })

  // Sync form fields into quote context so delivery fee & coupon are included
  watch(
    [
      () => form.value.governorate,
      () => form.value.city,
      () => form.value.paymentMethod,
      () => form.value.couponCode,
    ],
    ([gov, city, method, coupon]) => {
      setQuoteContext({
        governorate: gov,
        city,
        paymentMethod: method,
        couponCode: coupon,
      })
    },
    { immediate: true },
  )

  // Reset quote context when navigating away from checkout
  onBeforeUnmount(() => {
    resetQuoteContext()
  })

  const errors = ref<Record<string, string>>({})
  const submitting = ref(false)
  let checkoutStartTracked = false

  // Place-order guard computed via pure utility placeOrderBlockReason
  const blockReason = computed(() =>
    placeOrderBlockReason({
      hydrated: hydrated.value,
      pending: quotePending.value,
      quote: quote.value,
      submitting: submitting.value,
    }),
  )

  const canPlaceOrder = computed<boolean>(() => lines.value.length > 0 && blockReason.value === null)

  // Short hint under place order button explaining why it's disabled
  const placeOrderHint = computed<string | null>(() => {
    if (!hydrated.value || lines.value.length === 0 || submitting.value) return null
    switch (blockReason.value) {
      case 'pending':
      case 'noQuote':
        return t('store.checkout.hints.updatingPrices')
      case 'noZone':
        return t('store.checkout.hints.selectGovernorateFirst')
      case 'blocking':
        return t('store.checkout.hints.reviewCartFirst')
      default:
        return null
    }
  })

  const displayTotal = computed<number>(() => quote.value?.total ?? subtotal.value)

  function getSessionStorage(): Storage | null {
    if (import.meta.client && typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage
    }
    return null
  }

  function getOrCreateIdempotencyKey(): string {
    return readOrCreateKey(getSessionStorage())
  }

  function clearIdempotencyKey(): void {
    clearKey(getSessionStorage())
  }

  function validate(): boolean {
    errors.value = {}
    const customerSchema = createOrderInputSchema.shape.customer
    const res = customerSchema.safeParse({
      name: form.value.name,
      phone: form.value.phone,
      governorate: form.value.governorate,
      city: form.value.city,
      address: form.value.address,
      notes: form.value.notes || undefined,
    })

    if (!res.success) {
      for (const issue of res.error.issues) {
        const fieldName = String(issue.path[0])
        if (!errors.value[fieldName]) {
          errors.value[fieldName] = issue.message
        }
      }
      return false
    }

    return true
  }

  function trackCheckoutStart(): void {
    if (!checkoutStartTracked && lines.value.length > 0) {
      analytics.track('checkout_start')
      checkoutStartTracked = true
    }
  }

  async function placeOrder(): Promise<boolean> {
    if (submitting.value) {
      return false
    }

    if (!hydrated.value || lines.value.length === 0) {
      notify.error(t('store.checkout.emptyCartError'))
      return false
    }

    if (blockReason.value !== null || !quote.value) {
      return false
    }

    if (!validate()) {
      if (import.meta.client) {
        const firstKey = Object.keys(errors.value)[0]
        if (firstKey) {
          const el = document.getElementById(`checkout-${firstKey}`)
          el?.focus()
        }
      }
      return false
    }

    submitting.value = true

    try {
      const idempotencyKey = getOrCreateIdempotencyKey()
      const expectedTotal = quote.value.total

      const payload = buildCreateOrderPayload(
        lines.value,
        form.value,
        idempotencyKey,
        expectedTotal,
      )

      const baseURL = getApiBaseUrl()
      const res = await $fetch<CreateOrderResult>('/orders', {
        baseURL,
        method: 'POST',
        body: payload,
      })

      clearIdempotencyKey()
      analytics.track('order_placed', orderPlacedEvent(res, lines.value))
      clearCart()

      await navigateTo(localePath(`/order/${res.no}/thanks`) + `?t=${res.publicToken}`)
      return true
    } catch (err: unknown) {
      const conflict = parseOrderConflict(err)

      if (conflict) {
        quote.value = conflict.quote
        applyQuoteToCart(conflict.quote)
        const msg = conflict.message.trim()
        notify.error(msg.length > 0 ? msg : t('store.checkout.cartChangedError'))
      } else {
        let serverMessage: string | null = null
        if (err && typeof err === 'object' && 'data' in err && err.data && typeof err.data === 'object') {
          const rawData = err.data as { message?: unknown }
          if (typeof rawData.message === 'string' && rawData.message.trim().length > 0) {
            serverMessage = rawData.message.trim()
          } else if (Array.isArray(rawData.message) && rawData.message.length > 0 && typeof rawData.message[0] === 'string') {
            serverMessage = rawData.message[0].trim()
          }
        }
        notify.error(serverMessage ?? t('common.errors.unexpected'))
      }
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    errors,
    submitting,
    hydrated,
    canPlaceOrder,
    placeOrderHint,
    displayTotal,
    quote,
    governorates,
    citySuggestions,
    paymentMethods,
    settingsPending,
    settingsError,
    refreshSettings,
    refreshQuote,
    validate,
    placeOrder,
    trackCheckoutStart,
    getOrCreateIdempotencyKey,
    clearIdempotencyKey,
  }
}
