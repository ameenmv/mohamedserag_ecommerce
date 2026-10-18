import { computed, onMounted, onScopeDispose, ref, watch, type Ref } from 'vue'
import {
  bridalPreferredDateSchema,
  cairoToday,
  orderCustomerSchema,
  type BridalReservePaymentMethod,
  type BridalReserveQuote,
} from '@serag/shared'
import { getApiBaseUrl } from '../utils/api'
import { parseBridalConflict } from '../utils/bridal'
import type { CheckoutFormState } from './useCheckout'

export interface UseBridalReserveOptions {
  onRefreshList?: () => Promise<void> | void
  onPriceChanged?: (quote: BridalReserveQuote) => void
  onInvalidated?: () => void
}

export function useBridalReserve(
  token: Ref<string>,
  options?: UseBridalReserveOptions,
) {
  const baseURL = getApiBaseUrl()
  const notify = useNotify()
  const analytics = useAnalytics()
  const localePath = useLocalePath()
  const { t } = useI18n()

  const {
    settings,
    governorates,
    paymentMethods: allPaymentMethods,
    pending: settingsPending,
  } = useCheckoutSettings()

  const internalHydrated = ref(false)
  if (import.meta.client) {
    onMounted(() => {
      internalHydrated.value = true
    })
  }
  const hydrated = computed(() => internalHydrated.value)

  const form = ref<CheckoutFormState>({
    name: '',
    phone: '',
    governorate: '',
    city: '',
    address: '',
    notes: '',
    paymentMethod: 'instapay',
    couponCode: '',
  })

  const preferredDate = ref('')
  const minPreferredDate = computed(() => cairoToday())

  // Filter out Cash on Delivery — bridal deposits require electronic transfer
  const paymentMethods = computed(() =>
    allPaymentMethods.value.filter((m) => m.method !== 'cod'),
  )

  watch(
    paymentMethods,
    (methods) => {
      const first = methods[0]
      if (
        first &&
        (!form.value.paymentMethod ||
          form.value.paymentMethod === 'cod' ||
          !methods.some((m) => m.method === form.value.paymentMethod))
      ) {
        form.value.paymentMethod = first.method
      }
    },
    { immediate: true },
  )

  const citySuggestions = computed<string[]>(() => {
    if (!settings.value || !form.value.governorate) return []
    return settings.value.citySuggestions[form.value.governorate] ?? []
  })

  // Live quote fetching
  const quote = ref<BridalReserveQuote | null>(null)
  const quotePending = ref(false)
  const quoteError = ref<unknown>(null)
  let quoteTimer: ReturnType<typeof setTimeout> | null = null
  let latestQuoteSeq = 0

  watch(
    [() => form.value.governorate, () => form.value.city],
    ([gov, city]) => {
      if (quoteTimer) {
        clearTimeout(quoteTimer)
        quoteTimer = null
      }

      const trimmedGov = gov?.trim() ?? ''
      const trimmedCity = city?.trim() ?? ''

      if (!trimmedGov || !trimmedCity) {
        quote.value = null
        quotePending.value = false
        quoteError.value = null
        return
      }

      quotePending.value = true
      const currentSeq = ++latestQuoteSeq

      quoteTimer = setTimeout(async () => {
        try {
          const res = await $fetch<BridalReserveQuote>(
            `/bridal/reserve-quote/${encodeURIComponent(token.value)}`,
            {
              baseURL,
              method: 'GET',
              query: {
                governorate: trimmedGov,
                city: trimmedCity,
              },
            },
          )
          if (currentSeq === latestQuoteSeq) {
            quote.value = res
            quoteError.value = null
            quotePending.value = false
          }
        } catch (err) {
          if (currentSeq === latestQuoteSeq) {
            quoteError.value = err
            quote.value = null
            quotePending.value = false
          }
        }
      }, 300)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    if (quoteTimer) {
      clearTimeout(quoteTimer)
      quoteTimer = null
    }
  })

  const errors = ref<Record<string, string>>({})
  const submitting = ref(false)

  const canSubmit = computed<boolean>(() => {
    return (
      hydrated.value &&
      !submitting.value &&
      !quotePending.value &&
      quote.value !== null &&
      paymentMethods.value.some((m) => m.method === form.value.paymentMethod)
    )
  })

  function getSessionStorage(): Storage | null {
    if (import.meta.client && typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage
    }
    return null
  }

  const IDEM_STORAGE_PREFIX = 'serag:bridal:reserve:idem:'
  function getOrCreateIdempotencyKey(): string {
    const storage = getSessionStorage()
    const storageKey = `${IDEM_STORAGE_PREFIX}${token.value}`
    if (storage) {
      try {
        const stored = storage.getItem(storageKey)
        if (stored && /^[A-Za-z0-9_-]{16,64}$/.test(stored)) {
          return stored
        }
        const fresh = crypto.randomUUID()
        storage.setItem(storageKey, fresh)
        return fresh
      } catch {
        // Storage restricted
      }
    }
    return crypto.randomUUID()
  }

  function clearIdempotencyKey(): void {
    const storage = getSessionStorage()
    const storageKey = `${IDEM_STORAGE_PREFIX}${token.value}`
    if (storage) {
      try {
        storage.removeItem(storageKey)
      } catch {
        // Silently ignore
      }
    }
  }

  function validate(): boolean {
    errors.value = {}

    const customerRes = orderCustomerSchema.safeParse({
      name: form.value.name,
      phone: form.value.phone,
      governorate: form.value.governorate,
      city: form.value.city,
      address: form.value.address,
      notes: form.value.notes || undefined,
    })

    if (!customerRes.success) {
      for (const issue of customerRes.error.issues) {
        const fieldName = String(issue.path[0])
        if (!errors.value[fieldName]) {
          errors.value[fieldName] = issue.message
        }
      }
    }

    if (preferredDate.value.trim()) {
      const dateRes = bridalPreferredDateSchema.safeParse(preferredDate.value.trim())
      if (!dateRes.success) {
        errors.value.preferredDate = dateRes.error.issues[0]?.message ?? 'تاريخ غير صالح'
      }
    }

    return Object.keys(errors.value).length === 0
  }

  async function submit(): Promise<boolean> {
    if (!canSubmit.value || !quote.value) {
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

      const payload = {
        customer: {
          name: form.value.name.trim(),
          phone: form.value.phone.trim(),
          governorate: form.value.governorate.trim(),
          city: form.value.city.trim(),
          address: form.value.address.trim(),
          ...(form.value.notes?.trim() ? { notes: form.value.notes.trim() } : {}),
        },
        preferredDate: preferredDate.value.trim() || undefined,
        paymentMethod: form.value.paymentMethod as BridalReservePaymentMethod,
        idempotencyKey,
        expectedTotal,
      }

      const res = await $fetch<{ orderNo: string; publicToken: string }>(
        `/bridal/lists/${encodeURIComponent(token.value)}/reserve`,
        {
          baseURL,
          method: 'POST',
          body: payload,
        },
      )

      clearIdempotencyKey()
      analytics.track('bridal_reserved', {
        total: quote.value.total,
        depositAmount: quote.value.depositAmount,
      })

      await navigateTo(localePath(`/order/${res.orderNo}/thanks`) + `?t=${res.publicToken}`)
      return true
    } catch (err: unknown) {
      const conflict = parseBridalConflict(err)

      if (conflict) {
        if (conflict.code === 'PRICE_CHANGED') {
          if (conflict.quote) {
            quote.value = conflict.quote
            options?.onPriceChanged?.(conflict.quote)
          }
          await options?.onRefreshList?.()
          notify.error(conflict.message || t('store.bridal.reserve.priceChangedNotice'))
        } else if (conflict.code === 'UNAVAILABLE' || conflict.code === 'NOT_DRAFT') {
          notify.error(conflict.message)
          options?.onInvalidated?.()
          await options?.onRefreshList?.()
        } else {
          notify.error(conflict.message || t('common.errors.unexpected'))
        }
      } else {
        let serverMessage: string | null = null
        if (
          err &&
          typeof err === 'object' &&
          'data' in err &&
          err.data &&
          typeof err.data === 'object'
        ) {
          const rawData = err.data as { message?: unknown }
          if (typeof rawData.message === 'string' && rawData.message.trim().length > 0) {
            serverMessage = rawData.message.trim()
          } else if (
            Array.isArray(rawData.message) &&
            rawData.message.length > 0 &&
            typeof rawData.message[0] === 'string'
          ) {
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
    preferredDate,
    minPreferredDate,
    errors,
    submitting,
    hydrated,
    canSubmit,
    quote,
    quotePending,
    quoteError,
    governorates,
    citySuggestions,
    paymentMethods,
    settingsPending,
    validate,
    submit,
  }
}
