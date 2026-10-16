import {
  buildModelCode,
  buildProductSlug,
  parseSpecs,
  slugify,
  splitBrand,
} from '../prisma/seed-helpers.js'

describe('seed-helpers', () => {
  describe('slugify', () => {
    it('converts ASCII, Turkish characters, and spaces into lowercase hyphenated slugs', () => {
      expect(slugify('Samsung')).toBe('samsung')
      expect(slugify('TAÇ')).toBe('tac')
      expect(slugify('Öztef Döküm')).toBe('oztef-dokum')
      expect(slugify('  Unionaire · يونيون إير  ')).toBe('unionaire')
      expect(slugify('Samsung Fridge ٤٥٠L s1')).toBe('samsung-fridge-450l-s1')
    })
  })

  describe('splitBrand', () => {
    it('splits bilingual catalog brand strings into English name, Arabic name, and slug', () => {
      expect(splitBrand('Samsung · سامسونج')).toEqual({
        enName: 'Samsung',
        name: 'سامسونج',
        slug: 'samsung',
      })
      expect(splitBrand('LG · إل جي')).toEqual({
        enName: 'LG',
        name: 'إل جي',
        slug: 'lg',
      })
      expect(splitBrand('Unionaire · يونيون إير')).toEqual({
        enName: 'Unionaire',
        name: 'يونيون إير',
        slug: 'unionaire',
      })
    })
  })

  describe('buildModelCode & buildProductSlug', () => {
    it('builds canonical model codes and deterministic ASCII product slugs', () => {
      expect(buildModelCode('s1')).toBe('SR-S1')
      expect(buildModelCode('f4')).toBe('SR-F4')
      expect(buildProductSlug('samsung', 'refrigerators', '450 لتر (16 قدم)', 's1')).toBe(
        'samsung-fridge-450l-s1',
      )
      expect(buildProductSlug('sharp', 'acs', '1.5 حصان (تغطية 14 م²)', 's11')).toBe(
        'sharp-ac-1-5hp-s11',
      )
      expect(buildProductSlug('tac', 'cookware', '10 قطع جرانيت تركي تقيل', 'c1')).toBe(
        'tac-cookware-10pc-c1',
      )
    })
  })

  describe('parseSpecs', () => {
    it('parses refrigerator capacity, cooling type, inverter, and doors', () => {
      expect(
        parseSpecs('450 لتر (16 قدم)', 'ديجيتال انفرتر · Twin Cooling', 'refrigerators'),
      ).toEqual({
        capacity_l: 450,
        capacity_ft: 16,
        cooling: 'نوفروست',
        inverter: true,
        doors: 2,
        energy_class: 'A+',
      })

      expect(parseSpecs('350 لتر (14 قدم)', 'تبريد هجين · موفرة للطاقة', 'refrigerators')).toEqual({
        capacity_l: 350,
        capacity_ft: 14,
        cooling: 'ديفروست',
        inverter: false,
        doors: 2,
        energy_class: 'A',
      })
    })

    it('parses washer capacity, rpm, loading type, inverter, and steam', () => {
      expect(
        parseSpecs('8 كجم · 1200 لفة', 'موتور دفع مباشر Direct Drive بالبخار', 'washers'),
      ).toEqual({
        capacity_kg: 8,
        rpm: 1200,
        loading: 'أمامي',
        inverter: false,
        steam: true,
      })

      expect(parseSpecs('7 كجم · حوضين', 'موتور قوي · فلتر نسالة مزدوج', 'washers')).toEqual({
        capacity_kg: 7,
        loading: 'حوضين',
        inverter: false,
        steam: false,
      })

      expect(parseSpecs('13 كيلو تحميل علوي', 'موتور الدفع المباشر · 8 برامج غسيل', 'washers')).toEqual(
        {
          capacity_kg: 13,
          loading: 'علوي',
          inverter: false,
          steam: false,
        },
      )
    })

    it('parses TV size, resolution, smart, and internal receiver', () => {
      expect(
        parseSpecs('55 بوصة 4K UHD', 'معالج Crystal 4K · ريسيفر داخلي · HDR10+', 'tvs'),
      ).toEqual({
        size_in: 55,
        resolution: '4K',
        smart: true,
        receiver: true,
      })

      expect(
        parseSpecs('65 بوصة QLED 4K', 'ألوان Quantum · ذكاء اصطناعي ThinQ AI', 'tvs'),
      ).toEqual({
        size_in: 65,
        resolution: 'QLED',
        smart: true,
        receiver: false,
      })
    })

    it('parses AC horsepower, cooling/heating mode, inverter, and room coverage', () => {
      expect(
        parseSpecs('1.5 حصان (تغطية 14 م²)', 'انفرتر موفر 40% · بلازما كلاستر ديجيتال', 'acs'),
      ).toEqual({
        hp: 1.5,
        mode: 'بارد',
        inverter: true,
        coverage_m2: 14,
      })

      expect(
        parseSpecs('2.25 حصان (تغطية 20 م²)', 'بارد ساخن · تربو كول · فلاتر مضادة للبكتيريا', 'acs'),
      ).toEqual({
        hp: 2.25,
        mode: 'بارد ساخن',
        inverter: false,
        coverage_m2: 20,
      })
    })

    it('parses cooker burners, width, oven fan, and auto ignition', () => {
      expect(
        parseSpecs('90 × 60 سم (5 شعلة)', 'استانلس كامل · إشعال ذاتي · مروحة فرن', 'cookers'),
      ).toEqual({
        burners: 5,
        width_cm: 90,
        fan: true,
        auto_ignition: true,
      })
    })

    it('parses Turkish cookware pieces, material, induction, and dishwasher safety', () => {
      expect(
        parseSpecs(
          '10 قطع جرانيت تركي تقيل',
          'جرانيت 5 طبقات · يدعم الحث الحراري · آمن لغسالة الأطباق',
          'cookware',
        ),
      ).toEqual({
        pieces: 10,
        material: 'جرانيت',
        induction: true,
        dishwasher_safe: true,
      })
    })
  })
})
