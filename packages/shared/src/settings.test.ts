import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOW_STOCK,
  renderTemplatePreview,
  settingsPlaceholderWarnings,
  templateVariables,
  unknownTemplateVariables,
  type StoreInfoSetting,
} from './settings.js'
import { DEFAULT_TEMPLATES } from './whatsapp.js'

const sampleStore: StoreInfoSetting = {
  name: 'معرض محمد سراج',
  phone: '01012345678',
  whatsapp: '01012345678',
  tradersWhatsapp: '',
  address: 'المنصورة، الدقهلية',
  hours: 'من 10 ص لـ 10 م',
}

describe('templateVariables', () => {
  it('returns unique names in order', () => {
    expect(templateVariables('{{a}} نص {{b}} و{{a}}')).toEqual(['a', 'b'])
  })

  it('returns an empty array for plain text', () => {
    expect(templateVariables('بدون متغيرات')).toEqual([])
  })
})

describe('unknownTemplateVariables', () => {
  it('flags variables not allowed for the key', () => {
    expect(unknownTemplateVariables('order_confirmed', '{{customerName}} {{orderNo}} {{bogus}}')).toEqual([
      'bogus',
    ])
  })

  it('returns nothing for allowed variables', () => {
    const text = DEFAULT_TEMPLATES.order_confirmed
    expect(unknownTemplateVariables('order_confirmed', text)).toEqual([])
  })
})

describe('renderTemplatePreview', () => {
  it('fills known variables with sample values', () => {
    const result = renderTemplatePreview('أهلاً {{customerName}}، طلبك {{orderNo}}')
    expect(result).toBe('أهلاً أحمد محمد، طلبك SR-2026-000124')
  })

  it('leaves unknown variables untouched', () => {
    expect(renderTemplatePreview('{{nope}}')).toBe('{{nope}}')
  })
})

describe('settingsPlaceholderWarnings', () => {
  it('flags empty and placeholder fields', () => {
    const warnings = settingsPlaceholderWarnings({
      ...sampleStore,
      phone: '[رقم المعرض]',
      hours: '',
    })
    expect(warnings).toContain('phone')
    expect(warnings).toContain('hours')
    expect(warnings).not.toContain('name')
  })

  it('returns nothing for a complete store', () => {
    expect(settingsPlaceholderWarnings(sampleStore)).toEqual([])
  })
})

describe('DEFAULT_LOW_STOCK', () => {
  it('defaults to 3', () => {
    expect(DEFAULT_LOW_STOCK).toEqual({ defaultThreshold: 3 })
  })
})
