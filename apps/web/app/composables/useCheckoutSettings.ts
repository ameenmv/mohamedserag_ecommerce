import type { CheckoutPaymentMethod, CheckoutSettings } from '@serag/shared'
import { getApiBaseUrl } from '../utils/api'

/**
 * Public checkout settings composable.
 * Loads enabled payment methods, COD deposit threshold & percentage,
 * the 27 Egyptian governorates, and zone city suggestions.
 */
export function useCheckoutSettings() {
  const baseURL = getApiBaseUrl()
  const asyncData = useAsyncData<CheckoutSettings>('checkout-settings', () =>
    $fetch<CheckoutSettings>('/settings/checkout', {
      baseURL,
      method: 'GET',
    }),
  )

  const settings = asyncData.data
  const pending = asyncData.pending
  const error = asyncData.error
  const refresh = asyncData.refresh

  const governorates = computed<readonly string[]>(() => settings.value?.governorates ?? [])
  const paymentMethods = computed<CheckoutPaymentMethod[]>(() => settings.value?.paymentMethods ?? [])

  return {
    ...asyncData,
    settings,
    governorates,
    paymentMethods,
    pending,
    error,
    refresh,
  }
}
