import type { WhatsAppTemplateKey } from './whatsapp.js'

export const SETTINGS_SECTIONS = [
  'store',
  'payments',
  'zones',
  'codDeposit',
  'lowStock',
  'searchSynonyms',
  'templates',
] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export interface StoreInfoSetting {
  name: string
  phone: string
  whatsapp: string
  tradersWhatsapp: string
  address: string
  hours: string
}

export interface LowStockSetting {
  defaultThreshold: number
}

export type SearchSynonymsSetting = string[][]

export type TemplatesSetting = Record<WhatsAppTemplateKey, string>

export const DEFAULT_LOW_STOCK: LowStockSetting = { defaultThreshold: 3 }

export const TEMPLATE_VARIABLES: Record<WhatsAppTemplateKey, readonly string[]> = {
  order_confirmed: ['customerName', 'orderNo', 'total'],
  order_out_for_delivery: ['customerName', 'orderNo'],
  order_delivered: ['customerName', 'orderNo'],
  order_cancelled: ['customerName', 'orderNo'],
  payment_rejected: ['customerName', 'orderNo', 'reason'],
  payment_proof: ['amount', 'method', 'orderNo', 'confirmUrl'],
  bridal_locked: ['customerName', 'orderNo', 'lockedUntil'],
  bridal_repriced: ['customerName', 'orderNo', 'oldTotal', 'newTotal', 'lockedUntil'],
  notify_back_in_stock: ['customerName', 'productName', 'productUrl'],
  product_question: ['productName', 'productUrl'],
  traders_contact: ['businessName', 'governorate'],
}

export const TEMPLATE_SAMPLE_VALUES: Record<string, string> = {
  customerName: 'أحمد محمد',
  orderNo: 'SR-2026-000124',
  total: '28,900 ج.م',
  reason: 'التحويل مش واضح',
  amount: '5,000 ج.م',
  method: 'إنستا باي',
  confirmUrl: 'https://serag.example/confirm/abc123',
  lockedUntil: '15 فبراير 2026',
  oldTotal: '30,000 ج.م',
  newTotal: '28,900 ج.م',
  productName: 'ثلاجة توشيبا 16 قدم',
  productUrl: 'https://serag.example/p/toshiba-16',
  businessName: 'معرض النور للأجهزة',
  governorate: 'الدقهلية',
}

/** Extracts the unique `{{name}}` variable names from a template, in order of appearance. */
export function templateVariables(text: string): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
  let match = regex.exec(text)
  while (match !== null) {
    const name = match[1]
    if (name !== undefined && !seen.has(name)) {
      seen.add(name)
      names.push(name)
    }
    match = regex.exec(text)
  }
  return names
}

/** Returns the variable names used in `text` that are not allowed for the template key. */
export function unknownTemplateVariables(key: WhatsAppTemplateKey, text: string): string[] {
  const allowed = new Set(TEMPLATE_VARIABLES[key])
  return templateVariables(text).filter((name) => !allowed.has(name))
}

/**
 * Renders a template with sample values, leaving unknown `{{name}}` placeholders untouched.
 */
export function renderTemplatePreview(
  text: string,
  values: Record<string, string> = TEMPLATE_SAMPLE_VALUES,
): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key] ?? match
    }
    return match
  })
}

/** Field names in `store` that are empty or still contain a `[placeholder]`. */
export function settingsPlaceholderWarnings(store: StoreInfoSetting): string[] {
  const fields: (keyof StoreInfoSetting)[] = [
    'name',
    'phone',
    'whatsapp',
    'tradersWhatsapp',
    'address',
    'hours',
  ]
  return fields.filter((field) => {
    const value = store[field]
    // An empty traders number is valid: it falls back to the main WhatsApp number
    if (field === 'tradersWhatsapp' && value.trim() === '') return false
    return value.trim() === '' || value.includes('[')
  })
}

export interface SettingsSectionState<T> {
  value: T
  version: string | null
  warnings: string[]
}

export interface AdminSettingsResponse {
  sections: Record<SettingsSection, SettingsSectionState<unknown>>
}
