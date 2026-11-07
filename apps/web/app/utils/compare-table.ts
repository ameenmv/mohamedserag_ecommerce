import type { CategoryDetail, ProductDetail, SpecTemplateField } from '@serag/shared'

export interface CompareTableRow {
  key: string
  label: string
  type: 'price' | 'brand' | 'spec' | 'warranty' | 'origin'
  unit?: string | null
  values: (string | number | boolean | null)[]
  different: boolean
  bestIndexes?: number[]
  field?: SpecTemplateField | null
}

export interface CompareTableResult {
  rows: CompareTableRow[]
  isMixed: boolean
  hasDifferences: boolean
}

export interface CompareRowGroup {
  id: 'price_warranty' | 'dimensions' | 'features' | 'other'
  titleKey: string
  rows: CompareTableRow[]
}

/**
 * Checks whether an array of values has differences.
 * Returns true strictly when not all values are equal.
 */
export function areValuesDifferent(
  values: readonly (string | number | boolean | null)[],
): boolean {
  if (values.length <= 1) {
    return false
  }
  const first = values[0]
  return values.some((val) => val !== first)
}

/**
 * Pure formatter for comparison table cell values.
 * - null or undefined -> '—'
 * - boolean -> yes / no (configurable via options)
 * - number or string with unit -> `${val} ${unit}`
 * - primitive -> String(val)
 */
export function formatCompareValue(
  val: string | number | boolean | null | undefined,
  unit?: string | null,
  options?: { yesLabel?: string; noLabel?: string },
): string {
  if (val === null || val === undefined) {
    return '—'
  }
  if (typeof val === 'boolean') {
    return val ? (options?.yesLabel ?? 'Yes') : (options?.noLabel ?? 'No')
  }
  if (unit) {
    return `${val} ${unit}`
  }
  return String(val)
}

/**
 * Extracts warranty years as a number from Arabic or English warranty text.
 * Returns null if not parseable.
 */
export function parseWarrantyYears(
  text: string | number | boolean | null | undefined,
): number | null {
  if (text === null || text === undefined || typeof text === 'boolean') return null
  if (typeof text === 'number') {
    return Number.isFinite(text) && text > 0 ? text : null
  }
  const str = String(text).trim()
  if (!str) return null

  // Normalize Arabic-Indic and Persian digits to ASCII
  const normalized = str
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))

  // Explicit dual word in Arabic: سنتين / عامين
  if (/(?<!\p{L})(سنتين|عامين)(?!\p{L})/u.test(normalized)) {
    return 2
  }

  // Explicit single year word without preceding digits: سنة واحدة / سنة / عام
  if (/(?<!\p{L})(سنة|عام)(?!\p{L})/u.test(normalized) && !/\d+/.test(normalized)) {
    return 1
  }

  // Look for number adjacent to year keywords (e.g. "10 years", "5 سنوات", "3 سنين")
  const yearKeywordMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|سنوات|سنة|سنين|عام|أعوام)/i)
  if (yearKeywordMatch && yearKeywordMatch[1]) {
    const val = parseFloat(yearKeywordMatch[1])
    return Number.isFinite(val) && val > 0 ? val : null
  }

  // Fallback: look for any leading or prominent number in the warranty string
  const numberMatch = normalized.match(/\b(\d+(?:\.\d+)?)\b/)
  if (numberMatch && numberMatch[1]) {
    const val = parseFloat(numberMatch[1])
    return Number.isFinite(val) && val > 0 ? val : null
  }

  return null
}

/**
 * Evaluates a comparison row to pick the winning index (if there is a clear winner).
 * Rules per spec 025:
 * - price: lowest (ties -> no mark)
 * - warranty: most years parsed from text (ties/unparseable -> no mark)
 * - boolean specs: "yes" wins when the others are "no" (ties -> no mark)
 * - number specs: highest wins by default; if field.better is 'lower', lowest wins; 'none' -> no mark
 * - ties and nulls -> no mark (returns empty array)
 */
export function pickBestIndexes(
  row: CompareTableRow,
  field?: SpecTemplateField | null,
): number[] {
  const values = row.values
  if (!values || values.length <= 1) {
    return []
  }

  // 1. Price: lowest price wins
  if (row.type === 'price') {
    const numericEntries = values
      .map((val, idx) => ({ val, idx }))
      .filter((entry): entry is { val: number; idx: number } => typeof entry.val === 'number' && Number.isFinite(entry.val))
    if (numericEntries.length === 0) return []
    const minVal = Math.min(...numericEntries.map((e) => e.val))
    const winners = numericEntries.filter((e) => e.val === minVal)
    if (winners.length === 1 && winners[0]) {
      return [winners[0].idx]
    }
    return []
  }

  // 2. Warranty: most years wins
  if (row.type === 'warranty') {
    const parsedEntries = values
      .map((val, idx) => ({
        years: typeof val === 'string' || typeof val === 'number' ? parseWarrantyYears(val) : null,
        idx,
      }))
      .filter((entry): entry is { years: number; idx: number } => entry.years !== null && Number.isFinite(entry.years))
    if (parsedEntries.length === 0) return []
    const maxYears = Math.max(...parsedEntries.map((e) => e.years))
    const winners = parsedEntries.filter((e) => e.years === maxYears)
    if (winners.length === 1 && winners[0]) {
      return [winners[0].idx]
    }
    return []
  }

  // 3. Boolean specs: "yes" wins when the others are "no"
  const isBoolean =
    row.type === 'spec' &&
    (field?.type === 'boolean' || values.some((v) => typeof v === 'boolean'))
  if (isBoolean) {
    const trueIndexes = values
      .map((val, idx) => ({ val, idx }))
      .filter((entry) => entry.val === true)
      .map((entry) => entry.idx)

    // Exactly one winner with true, others are false or null
    if (trueIndexes.length === 1 && trueIndexes[0] !== undefined) {
      return [trueIndexes[0]]
    }
    return []
  }

  // 4. Number specs: highest wins by default unless field.better is 'lower' or 'none'
  const isNumber =
    row.type === 'spec' &&
    (field?.type === 'number' || values.some((v) => typeof v === 'number' && Number.isFinite(v)))
  if (isNumber) {
    const betterDirection = field?.better ?? 'higher'
    if (betterDirection === 'none') {
      return []
    }

    const numericEntries = values
      .map((val, idx) => {
        let num: number | null = null
        if (typeof val === 'number' && Number.isFinite(val)) {
          num = val
        } else if (typeof val === 'string') {
          const parsed = parseFloat(val.trim().replace(/,/g, ''))
          if (Number.isFinite(parsed)) num = parsed
        }
        return { num, idx }
      })
      .filter((entry): entry is { num: number; idx: number } => entry.num !== null)

    if (numericEntries.length === 0) return []

    const targetVal =
      betterDirection === 'lower'
        ? Math.min(...numericEntries.map((e) => e.num))
        : Math.max(...numericEntries.map((e) => e.num))

    const winners = numericEntries.filter((e) => e.num === targetVal)
    if (winners.length === 1 && winners[0]) {
      return [winners[0].idx]
    }
    return []
  }

  return []
}

/**
 * Pure builder function for the product comparison table (PRD US-2.3).
 * - Standard rows: price, brand, then comparable specs, warranty, origin.
 * - Same category: union of comparable spec keys across the products' categories.
 * - Mixed categories: only spec rows whose key is present in ALL products.
 * - Marks `different: true` when values across products are not all equal.
 * - Determines `bestIndexes` for each row where a clear winner exists.
 */
export function buildCompareTable(
  products: readonly ProductDetail[],
  categories: readonly CategoryDetail[],
): CompareTableResult {
  if (products.length === 0) {
    return {
      rows: [],
      isMixed: false,
      hasDifferences: false,
    }
  }

  const categorySlugs = new Set(products.map((p) => p.category.slug))
  const isMixed = categorySlugs.size > 1

  const rows: CompareTableRow[] = []

  // 1. Price row
  const priceValues = products.map((p) => p.price)
  const priceRow: CompareTableRow = {
    key: 'price',
    label: 'price',
    type: 'price',
    values: priceValues,
    different: areValuesDifferent(priceValues),
  }
  priceRow.bestIndexes = pickBestIndexes(priceRow)
  rows.push(priceRow)

  // 2. Brand row
  const brandValues = products.map((p) => p.brand.name)
  const brandRow: CompareTableRow = {
    key: 'brand',
    label: 'brand',
    type: 'brand',
    values: brandValues,
    different: areValuesDifferent(brandValues),
  }
  brandRow.bestIndexes = pickBestIndexes(brandRow)
  rows.push(brandRow)

  // 3. Comparable spec fields
  const categoryMap = new Map<string, CategoryDetail>()
  for (const cat of categories) {
    categoryMap.set(cat.slug, cat)
  }

  // Union of comparable fields across the products' categories in stable order
  const comparableFieldKeys: string[] = []
  const comparableFieldMeta = new Map<string, SpecTemplateField>()

  for (const product of products) {
    const cat = categoryMap.get(product.category.slug)
    if (cat?.fields) {
      for (const field of cat.fields) {
        if (field.comparable) {
          if (!comparableFieldMeta.has(field.key)) {
            comparableFieldKeys.push(field.key)
            comparableFieldMeta.set(field.key, field)
          }
        }
      }
    }
  }

  // Fallback: If category fields were not found or empty, inspect products' specs
  if (comparableFieldKeys.length === 0) {
    for (const product of products) {
      for (const s of product.specs) {
        if (!comparableFieldMeta.has(s.key)) {
          comparableFieldKeys.push(s.key)
          comparableFieldMeta.set(s.key, {
            key: s.key,
            label: s.label,
            type: s.type,
            unit: s.unit,
            filterable: false,
            comparable: true,
          })
        }
      }
    }
  }

  // If mixed categories: only include spec rows whose key is present in ALL products
  const activeSpecKeys = isMixed
    ? comparableFieldKeys.filter((key) =>
        products.every((p) => p.specs.some((s) => s.key === key)),
      )
    : comparableFieldKeys

  for (const specKey of activeSpecKeys) {
    const meta = comparableFieldMeta.get(specKey)
    let label = meta?.label ?? specKey
    let unit = meta?.unit ?? null

    const values = products.map((p) => {
      const found = p.specs.find((s) => s.key === specKey)
      if (!found) return null
      if (!label && found.label) label = found.label
      if (!unit && found.unit) unit = found.unit
      return found.value
    })

    const specRow: CompareTableRow = {
      key: `spec_${specKey}`,
      label,
      type: 'spec',
      unit,
      values,
      different: areValuesDifferent(values),
      field: meta ?? null,
    }
    specRow.bestIndexes = pickBestIndexes(specRow, meta)
    rows.push(specRow)
  }

  // 4. Warranty row
  const warrantyValues = products.map((p) => p.warranty ?? null)
  const warrantyRow: CompareTableRow = {
    key: 'warranty',
    label: 'warranty',
    type: 'warranty',
    values: warrantyValues,
    different: areValuesDifferent(warrantyValues),
  }
  warrantyRow.bestIndexes = pickBestIndexes(warrantyRow)
  rows.push(warrantyRow)

  // 5. Origin row
  const originValues = products.map((p) => p.origin ?? null)
  const originRow: CompareTableRow = {
    key: 'origin',
    label: 'origin',
    type: 'origin',
    values: originValues,
    different: areValuesDifferent(originValues),
  }
  originRow.bestIndexes = pickBestIndexes(originRow)
  rows.push(originRow)

  const hasDifferences = rows.some((r) => r.different)

  return {
    rows,
    isMixed,
    hasDifferences,
  }
}

/**
 * Checks if a specification row relates to dimensions/sizes.
 */
function isDimensionRow(row: CompareTableRow): boolean {
  const text = `${row.key} ${row.label} ${row.unit ?? ''}`.toLowerCase()
  const dimKeywords = [
    'capacity',
    'dimension',
    'width',
    'height',
    'depth',
    'size',
    'weight',
    'volume',
    'length',
    'diameter',
    'سعة',
    'مقاس',
    'عرض',
    'ارتفاع',
    'عمق',
    'وزن',
    'حجم',
    'أبعاد',
    'طول',
    'قطر',
  ]
  const dimUnits = ['cm', 'سم', 'mm', 'ملم', 'kg', 'كجم', 'l', 'لتر', 'قدم', 'ft', 'بوصة', 'inch', '"', 'm', 'متر']

  if (dimKeywords.some((kw) => text.includes(kw))) {
    return true
  }
  if (row.unit && dimUnits.includes(row.unit.trim().toLowerCase())) {
    return true
  }
  return false
}

/**
 * Groups compare rows into logical editorial sections:
 * 1. Price & Warranty (السعر والضمان)
 * 2. Dimensions & Sizes (المقاسات والأبعاد)
 * 3. Features (المميزات)
 * 4. Other (أخرى)
 * Omits empty groups.
 */
export function groupCompareRows(rows: readonly CompareTableRow[]): CompareRowGroup[] {
  const priceWarrantyRows: CompareTableRow[] = []
  const dimensionRows: CompareTableRow[] = []
  const featureRows: CompareTableRow[] = []
  const otherRows: CompareTableRow[] = []

  for (const row of rows) {
    if (row.type === 'price' || row.type === 'warranty') {
      priceWarrantyRows.push(row)
    } else if (row.type === 'spec') {
      if (isDimensionRow(row)) {
        dimensionRows.push(row)
      } else if (
        row.field?.type === 'boolean' ||
        row.field?.type === 'choice' ||
        row.values.some((v) => typeof v === 'boolean')
      ) {
        featureRows.push(row)
      } else {
        otherRows.push(row)
      }
    } else {
      otherRows.push(row)
    }
  }

  const groups: CompareRowGroup[] = []

  if (priceWarrantyRows.length > 0) {
    groups.push({
      id: 'price_warranty',
      titleKey: 'store.compare.groups.priceWarranty',
      rows: priceWarrantyRows,
    })
  }

  if (dimensionRows.length > 0) {
    groups.push({
      id: 'dimensions',
      titleKey: 'store.compare.groups.dimensions',
      rows: dimensionRows,
    })
  }

  if (featureRows.length > 0) {
    groups.push({
      id: 'features',
      titleKey: 'store.compare.groups.features',
      rows: featureRows,
    })
  }

  if (otherRows.length > 0) {
    groups.push({
      id: 'other',
      titleKey: 'store.compare.groups.other',
      rows: otherRows,
    })
  }

  return groups
}

/**
 * Pure generator for the editorial summary sentence(s) above the compare table (Spec 025).
 * Rules:
 * - 1 to 2 editorial sentences built from the rows
 * - Price difference first, then up to three biggest wins per product
 * - Supports Arabic ('ar') and English ('en')
 */
export function buildCompareSummary(
  products: readonly ProductDetail[],
  rows: readonly CompareTableRow[],
  options?: { locale?: 'ar' | 'en' },
): string {
  const isEn = options?.locale === 'en'

  if (products.length < 2) {
    return ''
  }

  const hasDifferences = rows.some((r) => r.different)
  if (!hasDifferences) {
    return isEn
      ? 'The products are identical in the displayed specifications.'
      : 'المنتجات متطابقة في المواصفات المعروضة.'
  }

  // Find price difference if prices differ
  const priceRow = rows.find((r) => r.type === 'price')
  let priceWinnerIdx: number | null = null
  let priceDiffEgp: number | null = null

  if (priceRow && priceRow.different) {
    const validPrices = products.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0)
    if (validPrices.length >= 2) {
      const minPrice = Math.min(...validPrices)
      const maxPrice = Math.max(...validPrices)
      const winners = products
        .map((p, idx) => ({ price: p.price, idx }))
        .filter((entry) => entry.price === minPrice)

      if (winners.length === 1 && winners[0]) {
        priceWinnerIdx = winners[0].idx
        priceDiffEgp = Math.round((maxPrice - minPrice) / 100)
      }
    }
  }

  // Collect wins per product
  interface ProductWinItem {
    text: string
  }

  const productWins: ProductWinItem[][] = products.map(() => [])

  // 1. Price win first
  if (priceWinnerIdx !== null && priceDiffEgp !== null && priceDiffEgp > 0) {
    const formattedPrice = priceDiffEgp.toLocaleString('en-US')
    const winText = isEn
      ? `${formattedPrice} EGP cheaper`
      : `أرخص بـ ${formattedPrice} ج.م`
    productWins[priceWinnerIdx]?.push({ text: winText })
  }

  // 2. Up to three biggest wins per product from other rows
  for (const row of rows) {
    if (row.type === 'price' || !row.different) continue
    if (!row.bestIndexes || row.bestIndexes.length !== 1) continue

    const winnerIdx = row.bestIndexes[0]
    if (winnerIdx === undefined) continue
    const currentWins = productWins[winnerIdx]
    if (!currentWins || currentWins.length >= 4) continue // 1 price + up to 3 specs = 4 max

    // Warranty win
    if (row.type === 'warranty') {
      const winnerVal = row.values[winnerIdx]
      const winnerYears = parseWarrantyYears(winnerVal)
      const otherYearsList = row.values
        .filter((_, i) => i !== winnerIdx)
        .map((value) => parseWarrantyYears(value))
        .filter((y): y is number => y !== null)

      const maxOtherYears = otherYearsList.length > 0 ? Math.max(...otherYearsList) : null
      const diffYears = winnerYears && maxOtherYears ? winnerYears - maxOtherYears : null

      let warrantyWinText: string
      if (diffYears && diffYears > 0) {
        warrantyWinText = isEn
          ? `${diffYears} years longer warranty`
          : `ضمان أطول بـ ${diffYears} سنوات`
      } else {
        warrantyWinText = isEn
          ? `longer warranty (${winnerVal})`
          : `ضمان أطول (${winnerVal})`
      }
      currentWins.push({ text: warrantyWinText })
      continue
    }

    // Boolean spec win
    if (typeof row.values[winnerIdx] === 'boolean' && row.values[winnerIdx] === true) {
      const boolWinText = isEn
        ? `has ${row.label}`
        : `فيه ${row.label}`
      currentWins.push({ text: boolWinText })
      continue
    }

    // Number spec win
    const winnerVal = row.values[winnerIdx]
    if (typeof winnerVal === 'number' || (typeof winnerVal === 'string' && !isNaN(Number(winnerVal)))) {
      const numVal = Number(winnerVal)
      const otherNums = row.values
        .filter((_, i) => i !== winnerIdx)
        .map((v) => (v !== null ? Number(v) : null))
        .filter((n): n is number => n !== null && Number.isFinite(n))

      const compVal = otherNums.length > 0
        ? (row.field?.better === 'lower' ? Math.max(...otherNums) : Math.min(...otherNums))
        : null

      const diff = compVal !== null ? Math.abs(numVal - compVal) : null
      const unitStr = row.unit ? ` ${row.unit}` : ''

      let numWinText: string
      if (row.field?.better === 'lower') {
        numWinText = isEn
          ? (diff ? `${diff}${unitStr} lower ${row.label}` : `lower ${row.label}`)
          : (diff ? `أقل في ${row.label} بـ ${diff}${unitStr}` : `أقل في ${row.label}`)
      } else {
        numWinText = isEn
          ? (diff ? `${diff}${unitStr} higher ${row.label}` : `higher ${row.label}`)
          : (diff ? `${row.label} أعلى بـ ${diff}${unitStr}` : `${row.label} أعلى`)
      }
      currentWins.push({ text: numWinText })
    }
  }

  // Compose 1 to 2 sentences
  const sentences: string[] = []

  for (let idx = 0; idx < products.length; idx++) {
    const wins = productWins[idx]
    if (!wins || wins.length === 0) continue

    const product = products[idx]
    if (!product) continue
    const name = product.brand.name || product.name

    if (isEn) {
      const clauses = wins.map((w) => w.text)
      const joined = clauses.length === 1
        ? clauses[0]
        : `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`
      sentences.push(`${name} is ${joined}.`)
    } else {
      const clauses = wins.map((w) => w.text)
      const joined = clauses.join(' و')
      sentences.push(`${name} ${joined}.`)
    }
  }

  if (sentences.length === 0) {
    return isEn
      ? 'The products share identical specifications and differ only by brand.'
      : 'المنتجات متطابقة في المواصفات وتختلف في العلامة التجارية فقط.'
  }

  return sentences.join(' ')
}
