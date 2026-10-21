import { describe, expect, it } from 'vitest'
import {
  adminCodDepositSchema,
  adminPaymentsSettingSchema,
  adminZonesSettingSchema,
  lowStockSettingSchema,
  searchSynonymsSettingSchema,
  settingsPhoneSchema,
  settingsUpdateSchema,
  storeInfoSettingSchema,
  templatePreviewInputSchema,
  templatesSettingSchema,
} from './settings-schema.js'
import { DEFAULT_TEMPLATES } from './whatsapp.js'
import { DEFAULT_ZONES } from './zones.js'

describe('settingsPhoneSchema', () => {
  it('normalizes an Egyptian mobile', () => {
    expect(settingsPhoneSchema.parse('+20 101 234 5678')).toBe('01012345678')
    expect(settingsPhoneSchema.parse('01012345678')).toBe('01012345678')
  })

  it('accepts an international number as-is', () => {
    expect(settingsPhoneSchema.parse('+12345678901')).toBe('+12345678901')
  })

  it('keeps a placeholder containing [', () => {
    expect(settingsPhoneSchema.parse('[رقم المعرض]')).toBe('[رقم المعرض]')
  })

  it('rejects an invalid number', () => {
    const result = settingsPhoneSchema.safeParse('12345')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('رقم الموبايل مش صحيح')
    }
  })
})

describe('storeInfoSettingSchema', () => {
  it('accepts a complete store and defaults tradersWhatsapp to empty', () => {
    const result = storeInfoSettingSchema.parse({
      name: 'معرض محمد سراج',
      phone: '01012345678',
      whatsapp: '01098765432',
      address: 'المنصورة',
      hours: '10 ص - 10 م',
    })
    expect(result.tradersWhatsapp).toBe('')
  })

  it('rejects an empty name', () => {
    expect(
      storeInfoSettingSchema.safeParse({
        name: '',
        phone: '01012345678',
        whatsapp: '01012345678',
        address: '',
        hours: '',
      }).success,
    ).toBe(false)
  })
})

describe('adminPaymentsSettingSchema', () => {
  it('requires at least one enabled method', () => {
    const result = adminPaymentsSettingSchema.safeParse({
      methods: {
        cod: { enabled: false, name: 'الدفع عند الاستلام' },
        instapay: { enabled: false, name: 'إنستا باي' },
        vodafone_cash: { enabled: false, name: 'فودافون كاش' },
        fawry: { enabled: false, name: 'فوري' },
      },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('طريقة دفع واحد'))).toBe(true)
    }
  })

  it('accepts one enabled method', () => {
    const result = adminPaymentsSettingSchema.safeParse({
      methods: {
        cod: { enabled: true, name: 'الدفع عند الاستلام', account: null, hint: null },
        instapay: { enabled: false, name: 'إنستا باي' },
        vodafone_cash: { enabled: false, name: 'فودافون كاش' },
        fawry: { enabled: false, name: 'فوري' },
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('adminZonesSettingSchema', () => {
  const base = {
    id: 'dakahlia',
    name: 'الدقهلية',
    fee: 5000,
    places: [{ governorate: 'الدقهلية' }],
  }

  it('accepts a valid zone list', () => {
    expect(adminZonesSettingSchema.safeParse([base]).success).toBe(true)
  })

  it('rejects two governorate-wide places for the same governorate', () => {
    const result = adminZonesSettingSchema.safeParse([
      base,
      { id: 'z2', name: 'تانية', fee: 0, places: [{ governorate: 'الدقهلية' }] },
    ])
    expect(result.success).toBe(false)
  })

  it('rejects the same governorate+city pair twice', () => {
    const result = adminZonesSettingSchema.safeParse([
      { id: 'z1', name: 'أ', fee: 0, places: [{ governorate: 'الدقهلية', city: 'المنصورة' }] },
      { id: 'z2', name: 'ب', fee: 0, places: [{ governorate: 'الدقهلية', city: 'المنصورة' }] },
    ])
    expect(result.success).toBe(false)
  })

  it('rejects duplicate zone ids', () => {
    const result = adminZonesSettingSchema.safeParse([
      base,
      { id: 'dakahlia', name: 'ب', fee: 0, places: [{ governorate: 'القاهرة' }] },
    ])
    expect(result.success).toBe(false)
  })

  it('rejects an unknown governorate', () => {
    const result = adminZonesSettingSchema.safeParse([
      { id: 'z1', name: 'أ', fee: 0, places: [{ governorate: 'أتلانتس' }] },
    ])
    expect(result.success).toBe(false)
  })

  it('accepts one catch-all zone without places and rejects a second', () => {
    const catchAll = { id: 'egypt', name: 'باقي مصر', fee: 40000, places: [] }
    expect(adminZonesSettingSchema.safeParse([base, catchAll]).success).toBe(true)
    expect(
      adminZonesSettingSchema.safeParse([base, catchAll, { ...catchAll, id: 'egypt2' }]).success,
    ).toBe(false)
  })

  it('accepts the default zones', () => {
    expect(adminZonesSettingSchema.safeParse(DEFAULT_ZONES).success).toBe(true)
  })

  it('rejects an empty zone list', () => {
    expect(adminZonesSettingSchema.safeParse([]).success).toBe(false)
  })
})

describe('adminCodDepositSchema', () => {
  it('requires a positive threshold and pct 1-100', () => {
    expect(adminCodDepositSchema.safeParse({ threshold: 0, pct: 10 }).success).toBe(false)
    expect(adminCodDepositSchema.safeParse({ threshold: 100, pct: 0 }).success).toBe(false)
    expect(adminCodDepositSchema.safeParse({ threshold: 100, pct: 101 }).success).toBe(false)
    expect(adminCodDepositSchema.safeParse({ threshold: 100, pct: 50 }).success).toBe(true)
  })
})

describe('lowStockSettingSchema', () => {
  it('bounds 0-999', () => {
    expect(lowStockSettingSchema.safeParse({ defaultThreshold: 0 }).success).toBe(true)
    expect(lowStockSettingSchema.safeParse({ defaultThreshold: 999 }).success).toBe(true)
    expect(lowStockSettingSchema.safeParse({ defaultThreshold: 1000 }).success).toBe(false)
    expect(lowStockSettingSchema.safeParse({ defaultThreshold: -1 }).success).toBe(false)
  })
})

describe('searchSynonymsSettingSchema', () => {
  it('accepts groups of 2-10 unique words', () => {
    expect(
      searchSynonymsSettingSchema.safeParse([['تلاجة', 'ثلاجة', 'براد']]).success,
    ).toBe(true)
  })

  it('rejects a single-word group', () => {
    expect(searchSynonymsSettingSchema.safeParse([['تلاجة']]).success).toBe(false)
  })

  it('rejects duplicate words in a group', () => {
    expect(searchSynonymsSettingSchema.safeParse([['تلاجة', 'تلاجة']]).success).toBe(false)
  })
})

describe('templatesSettingSchema', () => {
  it('every DEFAULT_TEMPLATES entry passes', () => {
    const result = templatesSettingSchema.safeParse(DEFAULT_TEMPLATES)
    expect(result.success).toBe(true)
  })

  it('rejects an unknown variable with the allowed list', () => {
    const result = templatesSettingSchema.safeParse({
      ...DEFAULT_TEMPLATES,
      order_confirmed: 'أهلاً {{customerName}} {{bogus}}',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'order_confirmed')
      expect(issue?.message).toContain('bogus')
      expect(issue?.message).toContain('customerName')
    }
  })

  it('rejects an empty template', () => {
    const result = templatesSettingSchema.safeParse({
      ...DEFAULT_TEMPLATES,
      order_confirmed: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('templatePreviewInputSchema', () => {
  it('accepts a known key and template', () => {
    expect(
      templatePreviewInputSchema.safeParse({ key: 'order_confirmed', template: 'أهلاً {{customerName}}' })
        .success,
    ).toBe(true)
  })

  it('rejects an unknown key', () => {
    expect(
      templatePreviewInputSchema.safeParse({ key: 'nope', template: 'x' }).success,
    ).toBe(false)
  })
})

describe('settingsUpdateSchema', () => {
  it('accepts an unknown value with a nullable version', () => {
    expect(settingsUpdateSchema.safeParse({ value: { any: true }, version: null }).success).toBe(true)
    expect(settingsUpdateSchema.safeParse({ value: 'x', version: '2026-03-15T00:00:00Z' }).success).toBe(
      true,
    )
  })
})
