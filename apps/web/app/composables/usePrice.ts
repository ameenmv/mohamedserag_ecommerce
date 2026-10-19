import { formatPrice, type FormattedPrice } from '../utils/price'

/**
 * Price formatting composable binding localized digits and currency unit.
 */
export function usePrice() {
  function format(piastres: number): FormattedPrice {
    const t = useNuxtApp().$i18n.t
    return formatPrice(piastres, t)
  }

  /** Display string with the unit in the current locale («28,900 ج.م» / «28,900 EGP»). */
  function money(piastres: number): string {
    return format(piastres).formatted
  }

  return {
    format,
    money,
  }
}
