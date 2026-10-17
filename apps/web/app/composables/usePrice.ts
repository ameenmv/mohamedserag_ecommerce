import { formatPrice, type FormattedPrice } from '../utils/price'

/**
 * Price formatting composable binding localized digits and currency unit.
 */
export function usePrice() {
  function format(piastres: number): FormattedPrice {
    const t = useNuxtApp().$i18n.t
    return formatPrice(piastres, t)
  }

  return {
    format,
  }
}
