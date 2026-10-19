export interface SpecFieldDef {
  key: string
  label: string
  type: 'number' | 'text' | 'choice' | 'boolean'
  unit?: string
  options?: string[]
  filterable: boolean
  comparable: boolean
}

export interface SetContentPiece {
  item: string
  size?: string
  qty: number
}

export type ParsedSpecs = Record<string, string | number | boolean>

const TURKISH_AND_LATIN_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
}

/**
 * Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits into ASCII 0-9.
 */
function toAsciiDigits(text: string): string {
  return text
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}

/**
 * Converts a string into a lowercase URL-safe ASCII slug.
 */
export function slugify(input: string): string {
  const mapped = toAsciiDigits(input)
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TURKISH_AND_LATIN_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return mapped
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/**
 * Splits a catalog brand string like `"Samsung · سامسونج"` into English name,
 * Arabic display name, and ASCII slug (`"samsung"`).
 */
export function splitBrand(rawBrand: string): { enName: string; name: string; slug: string } {
  const parts = rawBrand
    .split('·')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const enName = parts[0] ?? rawBrand.trim()
  const name = parts[1] ?? enName
  const slug = slugify(enName)

  return { enName, name, slug }
}

/**
 * Builds the canonical store model code (`SR-S1`, `SR-F1`, `SR-C1`) from a catalog item ID.
 */
export function buildModelCode(id: string): string {
  return `SR-${id.trim().toUpperCase()}`
}

const CATEGORY_SLUG_WORDS: Record<string, string> = {
  refrigerators: 'fridge',
  washers: 'washer',
  tvs: 'tv',
  acs: 'ac',
  cookers: 'cooker',
  cookware: 'cookware',
}

/**
 * Builds an ASCII product slug from brand, category, capacity string, and product ID
 * (e.g. `samsung-fridge-450l-s1`).
 */
export function buildProductSlug(
  brandSlug: string,
  categorySlug: string,
  cap: string,
  id: string,
): string {
  const asciiCap = toAsciiDigits(cap)
  const categoryWord = CATEGORY_SLUG_WORDS[categorySlug] ?? slugify(categorySlug)

  let specToken = ''
  const litersMatch = /(\d+(?:\.\d+)?)\s*لتر/.exec(asciiCap)
  const feetMatch = /(\d+(?:\.\d+)?)\s*قدم/.exec(asciiCap)
  const kgMatch = /(\d+(?:\.\d+)?)\s*(?:كجم|كيلو)/.exec(asciiCap)
  const inchMatch = /(\d+(?:\.\d+)?)\s*بوصة/.exec(asciiCap)
  const hpMatch = /(\d+(?:\.\d+)?)\s*حصان/.exec(asciiCap)
  const burnersMatch = /(\d+)\s*شعلة/.exec(asciiCap)
  const widthMatch = /(\d+)\s*[×x*]\s*\d+\s*سم/i.exec(asciiCap)
  const piecesMatch = /(\d+)\s*(?:قطعة|قطع)/.exec(asciiCap)

  if (litersMatch?.[1]) {
    specToken = `${litersMatch[1]}l`
  } else if (feetMatch?.[1]) {
    specToken = `${feetMatch[1]}ft`
  } else if (kgMatch?.[1]) {
    specToken = `${kgMatch[1]}kg`
  } else if (inchMatch?.[1]) {
    specToken = `${inchMatch[1]}in`
  } else if (hpMatch?.[1]) {
    specToken = `${hpMatch[1].replace('.', '-')}hp`
  } else if (burnersMatch?.[1]) {
    specToken = `${burnersMatch[1]}b`
  } else if (widthMatch?.[1]) {
    specToken = `${widthMatch[1]}cm`
  } else if (piecesMatch?.[1]) {
    specToken = `${piecesMatch[1]}pc`
  }

  return slugify([brandSlug, categoryWord, specToken, id].filter((part) => part.length > 0).join('-'))
}

/**
 * Parses human-readable `cap` and `tech` strings into structured category template keys.
 */
export function parseSpecs(cap: string, tech: string, categorySlug: string): ParsedSpecs {
  const combined = toAsciiDigits(`${cap} ${tech}`)
  const specs: ParsedSpecs = {}

  switch (categorySlug) {
    case 'refrigerators': {
      const litersMatch = /(\d+(?:\.\d+)?)\s*لتر/.exec(combined)
      if (litersMatch?.[1]) {
        specs.capacity_l = Number(litersMatch[1])
      }

      const feetMatch = /(\d+(?:\.\d+)?)\s*قدم/.exec(combined)
      if (feetMatch?.[1]) {
        specs.capacity_ft = Number(feetMatch[1])
      }

      if (/ديفروست|defrost|تبريد هجين|عزل حراري/i.test(combined)) {
        specs.cooling = 'ديفروست'
      } else if (/نوفروست|no\s*frost|twin cooling|linear cooling|ديجيتال/i.test(combined)) {
        specs.cooling = 'نوفروست'
      }

      const isInverter = /انفرتر|إنفرتر|inverter/i.test(combined)
      specs.inverter = isInverter
      specs.doors = /3\s*أبواب|3\s*باب/.test(combined) ? 3 : 2
      specs.energy_class = isInverter ? 'A+' : 'A'
      return specs
    }

    case 'washers': {
      const kgMatch = /(\d+(?:\.\d+)?)\s*(?:كجم|كيلو)/.exec(combined)
      if (kgMatch?.[1]) {
        specs.capacity_kg = Number(kgMatch[1])
      }

      const rpmMatch = /(\d+)\s*لفة/.exec(combined)
      if (rpmMatch?.[1]) {
        specs.rpm = Number(rpmMatch[1])
      }

      if (/حوضين|نصف أوتوماتيك/.test(combined)) {
        specs.loading = 'حوضين'
      } else if (/علوي|فوق أوتوماتيك|top\s*load/i.test(combined)) {
        specs.loading = 'علوي'
      } else {
        specs.loading = 'أمامي'
      }

      specs.inverter = /انفرتر|إنفرتر|inverter/i.test(combined)
      specs.steam = /بخار|steam/i.test(combined)
      return specs
    }

    case 'tvs': {
      const inchMatch = /(\d+(?:\.\d+)?)\s*بوصة/.exec(combined)
      if (inchMatch?.[1]) {
        specs.size_in = Number(inchMatch[1])
      }

      if (/qled/i.test(combined)) {
        specs.resolution = 'QLED'
      } else if (/4k|uhd/i.test(combined)) {
        specs.resolution = '4K'
      } else if (/fhd|full\s*hd/i.test(combined)) {
        specs.resolution = 'FHD'
      } else if (/\bhd\b/i.test(combined)) {
        specs.resolution = 'HD'
      }

      specs.smart = /سمارت|smart|webos|thinq|crystal\s*4k/i.test(combined)
      specs.receiver = /ريسيفر|رسيفر|receiver/i.test(combined)
      return specs
    }

    case 'acs': {
      const hpMatch = /(\d+(?:\.\d+)?)\s*حصان/.exec(combined)
      if (hpMatch?.[1]) {
        specs.hp = Number(hpMatch[1])
      }

      specs.mode = /بارد\s*ساخن/.test(combined) ? 'بارد ساخن' : 'بارد'
      specs.inverter = /انفرتر|إنفرتر|inverter/i.test(combined)

      const covMatch = /(\d+(?:\.\d+)?)\s*م(?:²|2)/.exec(combined)
      if (covMatch?.[1]) {
        specs.coverage_m2 = Number(covMatch[1])
      }
      return specs
    }

    case 'cookers': {
      const burnersMatch = /(\d+)\s*شعلة/.exec(combined)
      const widthMatch = /(\d+)\s*[×x*]\s*\d+\s*سم/i.exec(combined) ?? /(\d+)\s*سم/.exec(combined)

      if (widthMatch?.[1]) {
        specs.width_cm = Number(widthMatch[1])
      }

      if (burnersMatch?.[1]) {
        specs.burners = Number(burnersMatch[1])
      } else if (specs.width_cm === 90) {
        specs.burners = 5
      } else if (specs.width_cm === 60) {
        specs.burners = 4
      }

      specs.fan = /مروحة|fan/i.test(combined)
      specs.auto_ignition = /إشعال|اشعال|ignition/i.test(combined)
      return specs
    }

    case 'cookware': {
      const piecesMatch = /(\d+)\s*(?:قطعة|قطع)/.exec(combined)
      if (piecesMatch?.[1]) {
        specs.pieces = Number(piecesMatch[1])
      }

      if (/جرانيت|granite/i.test(combined)) {
        specs.material = 'جرانيت'
      } else if (/ستانلس|استانلس|stainless/i.test(combined)) {
        specs.material = 'ستانلس'
      } else if (/سيراميك|ceramic/i.test(combined)) {
        specs.material = 'سيراميك'
      } else if (/تيفال|tefal|ptfe/i.test(combined)) {
        specs.material = 'تيفال'
      }

      specs.induction = /(?:ال)?حث (?:ال)?حراري|اندكشن|انداكشن|induction/i.test(combined)
      specs.dishwasher_safe = /غسالة الأطباق|غسالة اطباق|dishwasher/i.test(combined)
      return specs
    }

    default:
      return specs
  }
}
