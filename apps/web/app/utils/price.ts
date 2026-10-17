import { formatEgp } from '@serag/shared'

export interface FormattedPrice {
  digits: string
  unit: string
  formatted: string
}

/**
 * Formats an integer piastre amount into localized digits and currency unit.
 * Digits are formatted via shared `formatEgp` (with en-US thousands groupings),
 * and currency unit is translated via i18n `common.currency` («ج.م» / «EGP»).
 */
export function formatPrice(
  piastres: number,
  t: (key: string) => string,
): FormattedPrice {
  const digits = formatEgp(piastres)
  const unit = t('common.currency')
  return {
    digits,
    unit,
    formatted: `${digits} ${unit}`,
  }
}
