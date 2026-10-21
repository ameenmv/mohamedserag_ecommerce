import { normalizeArabic } from './arabic.js'
import { egpToPiastres } from './money.js'

export const MAX_IMPORT_ROWS = 2000

export type ImportChangeField = 'price' | 'oldPrice' | 'stock'
export type ImportRowStatus = 'update' | 'unchanged' | 'not_found' | 'error' | 'duplicate'

export const PRODUCT_IMPORT_ERROR_KEYS = {
  headerMissing: 'admin.products.import.errors.headerMissing',
  missingModelCodeHeader: 'admin.products.import.errors.missingModelCodeHeader',
  noUpdatableColumns: 'admin.products.import.errors.noUpdatableColumns',
  maxRowsExceeded: 'admin.products.import.errors.maxRowsExceeded',
  emptyFile: 'admin.products.import.errors.emptyFile',
  noDataRows: 'admin.products.import.errors.noDataRows',
  missingModelCode: 'admin.products.import.errors.missingModelCode',
  modelNotFound: 'admin.products.import.errors.modelNotFound',
  duplicateModelCode: 'admin.products.import.errors.duplicateModelCode',
  invalidPrice: 'admin.products.import.errors.invalidPrice',
  invalidOldPrice: 'admin.products.import.errors.invalidOldPrice',
  invalidStock: 'admin.products.import.errors.invalidStock',
  oldPriceNotGreaterThanPrice: 'admin.products.import.errors.oldPriceNotGreaterThanPrice',
} as const

export interface ImportProductValues {
  price: number // integer piastres
  oldPrice: number | null // integer piastres
  stock: number
}

export interface ImportPlanRow {
  line: number
  modelCode: string
  productId?: string
  name?: string
  archived?: boolean
  current?: ImportProductValues
  next?: ImportProductValues
  changes: ImportChangeField[]
  status: ImportRowStatus
  errors: string[]
}

export interface ImportPlanSummary {
  update: number
  unchanged: number
  notFound: number
  error: number
  duplicate: number
}

export interface ImportPlan {
  headerError?: string
  rows: ImportPlanRow[]
  summary: ImportPlanSummary
}

export interface ImportProductSource {
  id: string
  modelCode: string
  name: string
  price: number
  oldPrice: number | null
  stock: number
  archived: boolean
}

export interface ImportHeaderMapping {
  modelCode: number
  price: number
  oldPrice: number
  stock: number
  name: number
}


/**
 * Parses raw CSV text according to RFC 4180 basics:
 * - Handles quotes, escaped double quotes (""), and commas/newlines within quotes.
 * - Supports CRLF, LF, and CR line breaks.
 * - Strips UTF-8 BOM if present.
 * - Skips fully empty lines.
 * - Auto-detects semicolon delimiter when header line contains ';' and no ','.
 */
export function parseCsv(rawText: string): string[][] {
  if (!rawText) return []

  let text = rawText
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  // Detect delimiter: look at the first non-empty line
  let delimiter = ','
  const lines = text.split(/\r?\n|\r/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0) {
      if (!line.includes(',') && line.includes(';')) {
        delimiter = ';'
      }
      break
    }
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let insideQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const char = text[i]

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          insideQuotes = false
          i++
          continue
        }
      } else {
        currentField += char
        i++
        continue
      }
    } else {
      if (char === '"') {
        insideQuotes = true
        i++
        continue
      } else if (char === delimiter) {
        currentRow.push(currentField)
        currentField = ''
        i++
        continue
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && i + 1 < len && text[i + 1] === '\n') {
          i++
        }
        currentRow.push(currentField)
        currentField = ''
        if (!isFullyEmptyRow(currentRow)) {
          rows.push(currentRow)
        }
        currentRow = []
        i++
        continue
      } else {
        currentField += char
        i++
        continue
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    if (!isFullyEmptyRow(currentRow)) {
      rows.push(currentRow)
    }
  }

  return rows
}

function isFullyEmptyRow(row: string[]): boolean {
  if (row.length === 0) return true
  if (row.length === 1 && (row[0] === undefined || row[0].trim() === '')) return true
  return false
}

const MODEL_CODE_ALIASES = new Set([
  'model_code',
  'modelcode',
  'model',
  'sku',
  'كود الموديل',
  'الموديل',
  'الكود',
])

const PRICE_ALIASES = new Set([
  'price',
  'السعر',
  'سعر البيع',
])

const OLD_PRICE_ALIASES = new Set([
  'old_price',
  'oldprice',
  'compare_at',
  'السعر القديم',
  'السعر قبل الخصم',
])

const STOCK_ALIASES = new Set([
  'stock',
  'qty',
  'quantity',
  'المخزون',
  'الكمية',
  'الكميه',
])

const NAME_ALIASES = new Set([
  'name',
  'اسم المنتج',
])

/**
 * Maps the header row into column indices.
 * Matches case-insensitively and trimmed in English and Arabic.
 */
export function mapImportHeader(headerRow: string[] | undefined): {
  headerError?: string
  mapping?: ImportHeaderMapping
} {
  if (!headerRow || headerRow.length === 0) {
    return { headerError: PRODUCT_IMPORT_ERROR_KEYS.headerMissing }
  }

  let modelCode = -1
  let price = -1
  let oldPrice = -1
  let stock = -1
  let name = -1

  for (let idx = 0; idx < headerRow.length; idx++) {
    const raw = (headerRow[idx] ?? '').trim().toLowerCase()
    if (!raw) continue

    const norm = normalizeArabic(raw)

    if (modelCode === -1 && (MODEL_CODE_ALIASES.has(raw) || MODEL_CODE_ALIASES.has(norm))) {
      modelCode = idx
      continue
    }

    if (price === -1 && (PRICE_ALIASES.has(raw) || PRICE_ALIASES.has(norm))) {
      price = idx
      continue
    }

    if (oldPrice === -1 && (OLD_PRICE_ALIASES.has(raw) || OLD_PRICE_ALIASES.has(norm))) {
      oldPrice = idx
      continue
    }

    if (stock === -1 && (STOCK_ALIASES.has(raw) || STOCK_ALIASES.has(norm))) {
      stock = idx
      continue
    }

    if (name === -1 && (NAME_ALIASES.has(raw) || NAME_ALIASES.has(norm))) {
      name = idx
      continue
    }
  }

  if (modelCode === -1) {
    return { headerError: PRODUCT_IMPORT_ERROR_KEYS.missingModelCodeHeader }
  }

  if (price === -1 && oldPrice === -1 && stock === -1) {
    return { headerError: PRODUCT_IMPORT_ERROR_KEYS.noUpdatableColumns }
  }

  return {
    mapping: {
      modelCode,
      price,
      oldPrice,
      stock,
      name,
    },
  }
}

/**
 * Normalizes Eastern Arabic / Persian digits to Western ASCII digits.
 */
function normalizeDigits(text: string): string {
  return text
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}

interface ParsedValue<T> {
  hasValue: boolean
  value?: T
  error?: string
}

/**
 * Parses price in EGP, converts to integer piastres.
 * Accepts Arabic-Indic digits, thousands separators (`,`, `٬`, and spaces), and up to 2 decimals.
 * Price must be > 0.
 */
export function parsePrice(raw: string | undefined): ParsedValue<number> {
  if (raw === undefined) return { hasValue: false }
  const trimmed = raw.trim()
  if (trimmed === '') return { hasValue: false }

  let cleaned = normalizeDigits(trimmed)
  // Convert Arabic decimal separator U+066B ('٫') to '.'
  cleaned = cleaned.replace(/\u066B/g, '.')
  // Remove thousands separators: Arabic thousands U+066C ('٬'), comma ',', and spaces / non-breaking spaces
  cleaned = cleaned.replace(/[\u066C,\s\u00A0]/g, '')

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { hasValue: true, error: PRODUCT_IMPORT_ERROR_KEYS.invalidPrice }
  }

  const num = Number.parseFloat(cleaned)
  if (!Number.isFinite(num) || num <= 0) {
    return { hasValue: true, error: PRODUCT_IMPORT_ERROR_KEYS.invalidPrice }
  }

  return { hasValue: true, value: egpToPiastres(num) }
}

/**
 * Parses oldPrice in EGP, converts to integer piastres or clears it (null).
 * Value `0`, `٠`, or `-` clears oldPrice (sets null).
 */
export function parseOldPrice(raw: string | undefined): ParsedValue<number | null> {
  if (raw === undefined) return { hasValue: false }
  const trimmed = raw.trim()
  if (trimmed === '') return { hasValue: false }

  // 0 or - means clear oldPrice
  if (trimmed === '0' || trimmed === '٠' || trimmed === '-') {
    return { hasValue: true, value: null }
  }

  let cleaned = normalizeDigits(trimmed)
  cleaned = cleaned.replace(/\u066B/g, '.')
  cleaned = cleaned.replace(/[\u066C,\s\u00A0]/g, '')

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { hasValue: true, error: PRODUCT_IMPORT_ERROR_KEYS.invalidOldPrice }
  }

  const num = Number.parseFloat(cleaned)
  if (!Number.isFinite(num) || num <= 0) {
    return { hasValue: true, error: PRODUCT_IMPORT_ERROR_KEYS.invalidOldPrice }
  }

  return { hasValue: true, value: egpToPiastres(num) }
}

/**
 * Parses stock quantity.
 * Must be a non-negative integer.
 */
export function parseStock(raw: string | undefined): ParsedValue<number> {
  if (raw === undefined) return { hasValue: false }
  const trimmed = raw.trim()
  if (trimmed === '') return { hasValue: false }

  let cleaned = normalizeDigits(trimmed)
  cleaned = cleaned.replace(/[\u066C,\s\u00A0]/g, '')

  if (!/^\d+$/.test(cleaned)) {
    return { hasValue: true, error: PRODUCT_IMPORT_ERROR_KEYS.invalidStock }
  }

  const num = Number.parseInt(cleaned, 10)
  if (!Number.isSafeInteger(num) || num < 0) {
    return { hasValue: true, error: PRODUCT_IMPORT_ERROR_KEYS.invalidStock }
  }

  return { hasValue: true, value: num }
}

/**
 * Builds the import execution plan from parsed CSV rows and existing products.
 */
export function buildImportPlan(
  rows: string[][],
  products: ImportProductSource[],
): ImportPlan {
  if (!rows || rows.length === 0) {
    return {
      headerError: PRODUCT_IMPORT_ERROR_KEYS.emptyFile,
      rows: [],
      summary: { update: 0, unchanged: 0, notFound: 0, error: 0, duplicate: 0 },
    }
  }

  const headerRow = rows[0]
  const { headerError, mapping } = mapImportHeader(headerRow)
  if (headerError || !mapping) {
    return {
      headerError: headerError ?? PRODUCT_IMPORT_ERROR_KEYS.headerMissing,
      rows: [],
      summary: { update: 0, unchanged: 0, notFound: 0, error: 0, duplicate: 0 },
    }
  }

  const dataRows = rows.slice(1)
  if (dataRows.length === 0) {
    return {
      headerError: PRODUCT_IMPORT_ERROR_KEYS.noDataRows,
      rows: [],
      summary: { update: 0, unchanged: 0, notFound: 0, error: 0, duplicate: 0 },
    }
  }

  if (dataRows.length > MAX_IMPORT_ROWS) {
    return {
      headerError: PRODUCT_IMPORT_ERROR_KEYS.maxRowsExceeded,
      rows: [],
      summary: { update: 0, unchanged: 0, notFound: 0, error: 0, duplicate: 0 },
    }
  }

  // Build lookup map for products keyed by trimmed lowercase model code
  const productMap = new Map<string, ImportProductSource>()
  for (const p of products) {
    const key = p.modelCode.trim().toLowerCase()
    if (key) {
      productMap.set(key, p)
    }
  }

  const seenModelCodes = new Set<string>()
  const planRows: ImportPlanRow[] = []

  let updateCount = 0
  let unchangedCount = 0
  let notFoundCount = 0
  let errorCount = 0
  let duplicateCount = 0

  for (let idx = 0; idx < dataRows.length; idx++) {
    const line = idx + 2
    const row = dataRows[idx] ?? []

    const rawModelCode = (mapping.modelCode < row.length ? row[mapping.modelCode] : '')?.trim() ?? ''
    if (!rawModelCode) {
      errorCount++
      planRows.push({
        line,
        modelCode: '',
        changes: [],
        status: 'error',
        errors: [PRODUCT_IMPORT_ERROR_KEYS.missingModelCode],
      })
      continue
    }

    const normalizedModel = rawModelCode.toLowerCase()
    if (seenModelCodes.has(normalizedModel)) {
      duplicateCount++
      const product = productMap.get(normalizedModel)
      planRows.push({
        line,
        modelCode: rawModelCode,
        productId: product?.id,
        name: product?.name,
        archived: product?.archived ? true : undefined,
        changes: [],
        status: 'duplicate',
        errors: [PRODUCT_IMPORT_ERROR_KEYS.duplicateModelCode],
      })
      continue
    }
    seenModelCodes.add(normalizedModel)

    const rowErrors: string[] = []

    let parsedPrice: number | undefined
    if (mapping.price !== -1 && mapping.price < row.length) {
      const res = parsePrice(row[mapping.price])
      if (res.error) rowErrors.push(res.error)
      else parsedPrice = res.value
    }

    let parsedOldPrice: number | null | undefined
    if (mapping.oldPrice !== -1 && mapping.oldPrice < row.length) {
      const res = parseOldPrice(row[mapping.oldPrice])
      if (res.error) rowErrors.push(res.error)
      else parsedOldPrice = res.value
    }

    let parsedStock: number | undefined
    if (mapping.stock !== -1 && mapping.stock < row.length) {
      const res = parseStock(row[mapping.stock])
      if (res.error) rowErrors.push(res.error)
      else parsedStock = res.value
    }

    const product = productMap.get(normalizedModel)
    if (!product) {
      notFoundCount++
      planRows.push({
        line,
        modelCode: rawModelCode,
        changes: [],
        status: 'not_found',
        errors: [PRODUCT_IMPORT_ERROR_KEYS.modelNotFound, ...rowErrors],
      })
      continue
    }

    const currentValues: ImportProductValues = {
      price: product.price,
      oldPrice: product.oldPrice,
      stock: product.stock,
    }

    const nextPrice = parsedPrice !== undefined ? parsedPrice : product.price
    const nextOldPrice = parsedOldPrice !== undefined ? parsedOldPrice : product.oldPrice
    const nextStock = parsedStock !== undefined ? parsedStock : product.stock

    const nextValues: ImportProductValues = {
      price: nextPrice,
      oldPrice: nextOldPrice,
      stock: nextStock,
    }

    if (nextOldPrice !== null && nextOldPrice <= nextPrice) {
      rowErrors.push(PRODUCT_IMPORT_ERROR_KEYS.oldPriceNotGreaterThanPrice)
    }

    const changes: ImportChangeField[] = []
    if (nextPrice !== product.price) changes.push('price')
    if (nextOldPrice !== product.oldPrice) changes.push('oldPrice')
    if (nextStock !== product.stock) changes.push('stock')

    let status: ImportRowStatus
    if (rowErrors.length > 0) {
      status = 'error'
      errorCount++
    } else if (changes.length > 0) {
      status = 'update'
      updateCount++
    } else {
      status = 'unchanged'
      unchangedCount++
    }

    planRows.push({
      line,
      modelCode: rawModelCode,
      productId: product.id,
      name: product.name,
      archived: product.archived ? true : undefined,
      current: currentValues,
      next: nextValues,
      changes,
      status,
      errors: rowErrors,
    })
  }

  return {
    rows: planRows,
    summary: {
      update: updateCount,
      unchanged: unchangedCount,
      notFound: notFoundCount,
      error: errorCount,
      duplicate: duplicateCount,
    },
  }
}
