import { normalizeArabic } from './arabic.js'

export interface ZonePlace {
  governorate: string
  city?: string
}

export interface Zone {
  id: string
  name: string
  /** Delivery fee in integer piastres */
  fee: number
  places: ZonePlace[]
}

/**
 * Default delivery zones from `prototype/config.js` with fees in integer piastres:
 * 1. المنصورة (100 EGP = 10,000 piastres) — الدقهلية/المنصورة and الدقهلية/طلخا
 * 2. مراكز الدقهلية (150 EGP = 15,000 piastres) — الدقهلية (any other city)
 * 3. باقي الدلتا (250 EGP = 25,000 piastres) — الغربية، دمياط، الشرقية، كفر الشيخ، المنوفية، القليوبية، البحيرة
 * 4. باقي مصر (400 EGP = 40,000 piastres) — everything else
 */
export const DEFAULT_ZONES: Zone[] = [
  {
    id: 'mansoura',
    name: 'المنصورة',
    fee: 10000,
    places: [
      { governorate: 'الدقهلية', city: 'المنصورة' },
      { governorate: 'الدقهلية', city: 'طلخا' },
    ],
  },
  {
    id: 'dakahlia',
    name: 'مراكز الدقهلية',
    fee: 15000,
    places: [{ governorate: 'الدقهلية' }],
  },
  {
    id: 'delta',
    name: 'باقي الدلتا',
    fee: 25000,
    places: [
      { governorate: 'الغربية' },
      { governorate: 'دمياط' },
      { governorate: 'الشرقية' },
      { governorate: 'كفر الشيخ' },
      { governorate: 'المنوفية' },
      { governorate: 'القليوبية' },
      { governorate: 'البحيرة' },
    ],
  },
  {
    id: 'egypt',
    name: 'باقي مصر',
    fee: 40000,
    places: [],
  },
]

/**
 * Resolves the matching delivery zone for a governorate and optional city:
 * 1. Exact `governorate + city` match
 * 2. `governorate`-only match (or city match when `governorate` itself is a city name like `'المنصورة'` and `city` is omitted)
 * 3. Fallback to the zone with an empty `places` list, or the last zone in `zones`
 */
export function findZone(zones: readonly Zone[], governorate: string, city?: string): Zone {
  const normGov = normalizeArabic(governorate)
  const normCity = city ? normalizeArabic(city) : ''

  if (normCity) {
    for (const zone of zones) {
      const hasExactMatch = zone.places.some(
        (place) =>
          place.city !== undefined &&
          normalizeArabic(place.governorate) === normGov &&
          normalizeArabic(place.city) === normCity,
      )
      if (hasExactMatch) {
        return zone
      }
    }
  }

  for (const zone of zones) {
    const hasGovernorateMatch = zone.places.some(
      (place) => place.city === undefined && normalizeArabic(place.governorate) === normGov,
    )
    if (hasGovernorateMatch) {
      return zone
    }
  }

  if (!normCity && normGov) {
    for (const zone of zones) {
      const hasCityAsInputMatch = zone.places.some(
        (place) => place.city !== undefined && normalizeArabic(place.city) === normGov,
      )
      if (hasCityAsInputMatch) {
        return zone
      }
    }
  }

  const emptyPlacesZone = zones.find((zone) => zone.places.length === 0)
  if (emptyPlacesZone !== undefined) {
    return emptyPlacesZone
  }

  const lastZone = zones[zones.length - 1]
  if (lastZone !== undefined) {
    return lastZone
  }

  return {
    id: 'egypt',
    name: 'باقي مصر',
    fee: 40000,
    places: [],
  }
}
