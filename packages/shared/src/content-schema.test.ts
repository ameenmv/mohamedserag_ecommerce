import { describe, expect, it } from 'vitest'
import {
  TRADER_REELS_MAX,
  DEFAULT_HOME_CONTENT,
  DEFAULT_HOME_CONTENT_EN,
  DEFAULT_HOME_LAYOUT,
  facebookEmbedSrc,
  isFacebookVideoUrl,
  comparePageOrder,
  countHomeChanges,
  isSafeContentLink,
  isUploadedImage,
  HOME_SECTION_IDS,
} from './content.js'
import {
  homeContentSchema,
  homeDraftInputSchema,
  homeLayoutSchema,
  pageInputSchema,
  pageTranslationsSchema,
  guideInputSchema,
  guideTranslationsSchema,
} from './content-schema.js'

describe('content', () => {
  it('DEFAULT_HOME_CONTENT + DEFAULT_HOME_LAYOUT pass the schemas', () => {
    expect(homeContentSchema.safeParse(DEFAULT_HOME_CONTENT).success).toBe(true)
    expect(homeLayoutSchema.safeParse(DEFAULT_HOME_LAYOUT).success).toBe(true)
  })

  it('empty hero title fails', () => {
    const invalid = { ...DEFAULT_HOME_CONTENT }
    invalid.hero = { ...invalid.hero, title: '' }
    expect(homeContentSchema.safeParse(invalid).success).toBe(false)
  })

  it('javascript: and //evil.test hrefs fail', () => {
    const bad1 = { ...DEFAULT_HOME_CONTENT }
    bad1.hero = { ...bad1.hero, cta: { label: 'test', href: 'javascript:alert(1)' } }
    expect(homeContentSchema.safeParse(bad1).success).toBe(false)

    const bad2 = { ...DEFAULT_HOME_CONTENT }
    bad2.announce = { text: 'test', href: '//evil.test' }
    expect(homeContentSchema.safeParse(bad2).success).toBe(false)
  })

  it('/shop and https://wa.me/2010 pass', () => {
    const good1 = { ...DEFAULT_HOME_CONTENT }
    good1.hero = { ...good1.hero, cta: { label: 'shop', href: '/shop' } }
    expect(homeContentSchema.safeParse(good1).success).toBe(true)

    const good2 = { ...DEFAULT_HOME_CONTENT }
    good2.announce = { text: 'test', href: 'https://wa.me/2010' }
    expect(homeContentSchema.safeParse(good2).success).toBe(true)
  })

  it('image validation works', () => {
    expect(isUploadedImage('https://x/a.png')).toBe(false)
    expect(isUploadedImage('/uploads/content/a.webp')).toBe(true)
    expect(isUploadedImage('/uploads/../etc')).toBe(false)
  })

  it('layout validation', () => {
    expect(homeLayoutSchema.safeParse({ order: HOME_SECTION_IDS.slice(1), hidden: [] }).success).toBe(false) // missing
    const dup = [...HOME_SECTION_IDS, HOME_SECTION_IDS[0]]
    expect(homeLayoutSchema.safeParse({ order: dup, hidden: [] }).success).toBe(false) // duplicated
    expect(homeLayoutSchema.safeParse({ order: HOME_SECTION_IDS, hidden: [HOME_SECTION_IDS[0], HOME_SECTION_IDS[0]] }).success).toBe(false) // dup hidden
  })

  it('uspStrip with 3 items fails', () => {
    const bad = { ...DEFAULT_HOME_CONTENT, uspStrip: { items: DEFAULT_HOME_CONTENT.uspStrip.items.slice(0, 3) } }
    expect(homeContentSchema.safeParse(bad).success).toBe(false)
  })

  it('guide slug validation', () => {
    const bad = guideInputSchema.safeParse({
      slug: 'Bad Slug',
      title: 'Test',
      summary: null,
      cover: null,
      body: 'content',
      categoryIds: ['c1'],
      productIds: ['p1'],
      seoTitle: null,
      seoDescription: null,
      published: false,
    })
    expect(bad.success).toBe(false)
  })

  it('page seoTitle empty becomes null', () => {
    const res = pageInputSchema.safeParse({
      title: 'Test',
      body: 'body content here for test',
      seoTitle: '',
      seoDescription: '',
      published: true,
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.seoTitle).toBe(null)
      expect(res.data.seoDescription).toBe(null)
    }
  })

  it('countHomeChanges works', () => {
    const draft = { sections: DEFAULT_HOME_CONTENT, layout: DEFAULT_HOME_LAYOUT }
    const published = { sections: DEFAULT_HOME_CONTENT, layout: DEFAULT_HOME_LAYOUT }
    expect(countHomeChanges(draft, published)).toBe(0)

    const draft2 = { sections: { ...DEFAULT_HOME_CONTENT }, layout: DEFAULT_HOME_LAYOUT }
    draft2.sections.hero = { ...draft2.sections.hero, title: 'New Title' }
    expect(countHomeChanges(draft2, published)).toBe(1)

    const draft3 = { sections: DEFAULT_HOME_CONTENT, layout: { order: [...HOME_SECTION_IDS].reverse(), hidden: [...DEFAULT_HOME_LAYOUT.hidden] } }
    expect(countHomeChanges(draft3, published)).toBe(1)

    const draft4 = { sections: DEFAULT_HOME_CONTENT, layout: { order: [...HOME_SECTION_IDS], hidden: [...DEFAULT_HOME_LAYOUT.hidden, 'hero' as const, 'uspStrip' as const] } }
    expect(countHomeChanges(draft4, published)).toBe(2)
  })

  it('isSafeContentLink accepts site paths and https only', () => {
    expect(isSafeContentLink('/shop')).toBe(true)
    expect(isSafeContentLink('https://wa.me/2010')).toBe(true)
    for (const bad of ['', 'http://x.test', '//evil.test', 'javascript:alert(1)', 'shop']) {
      expect(isSafeContentLink(bad)).toBe(false)
    }
  })

  it('comparePageOrder keeps the fixed slug order, then sorts other pages by title', () => {
    const pages = [
      { slug: 'faq', title: 'أسئلة' },
      { slug: 'zeta', title: 'ب' },
      { slug: 'about', title: 'من نحن' },
      { slug: 'alpha', title: 'أ' },
      { slug: 'returns', title: 'الاسترجاع' },
    ]
    expect([...pages].sort(comparePageOrder).map((p) => p.slug)).toEqual(['about', 'returns', 'faq', 'alpha', 'zeta'])
  })

  it('pageTranslationsSchema drops empty strings so Arabic fallback applies', () => {
    const parsed = pageTranslationsSchema.safeParse({
      en: {
        title: '  About Mohamed Serag  ',
        body: '  <p>English content</p>  ',
        seoTitle: '   ',
        seoDescription: null,
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.en).toEqual({
        title: 'About Mohamed Serag',
        body: '<p>English content</p>',
      })
      expect('seoTitle' in (parsed.data.en ?? {})).toBe(false)
      expect('seoDescription' in (parsed.data.en ?? {})).toBe(false)
    }
  })

  it('guideTranslationsSchema drops empty strings and trims values', () => {
    const parsed = guideTranslationsSchema.safeParse({
      en: {
        title: '  Refrigerator Buying Guide  ',
        summary: '  Quick summary  ',
        body: '   ',
        seoTitle: 'Guide SEO',
        seoDescription: '',
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.en).toEqual({
        title: 'Refrigerator Buying Guide',
        summary: 'Quick summary',
        seoTitle: 'Guide SEO',
      })
    }
  })

  it('pageInputSchema and guideInputSchema accept optional translations', () => {
    const pageRes = pageInputSchema.safeParse({
      title: 'عن المعرض',
      body: '<p>محتوى عربي</p>',
      seoTitle: null,
      seoDescription: null,
      published: true,
      translations: {
        en: {
          title: 'About Us',
          body: '<p>English body</p>',
          seoTitle: '',
          seoDescription: 'English SEO description',
        },
      },
    })
    expect(pageRes.success).toBe(true)
    if (pageRes.success) {
      expect(pageRes.data.translations?.en).toEqual({
        title: 'About Us',
        body: '<p>English body</p>',
        seoDescription: 'English SEO description',
      })
    }

    const guideRes = guideInputSchema.safeParse({
      slug: 'washers-guide',
      title: 'دليل الغسالات',
      summary: 'ملخص عربي',
      cover: null,
      body: '<p>محتوى</p>',
      categoryIds: [],
      productIds: [],
      seoTitle: null,
      seoDescription: null,
      published: false,
      translations: {
        en: {
          title: 'Washers Guide',
          summary: 'English summary',
        },
      },
    })
    expect(guideRes.success).toBe(true)
    if (guideRes.success) {
      expect(guideRes.data.translations?.en).toEqual({
        title: 'Washers Guide',
        summary: 'English summary',
      })
    }
  })

  it('homeDraftInputSchema accepts optional english HomeContent', () => {
    const res = homeDraftInputSchema.safeParse({
      sections: DEFAULT_HOME_CONTENT,
      layout: DEFAULT_HOME_LAYOUT,
      english: DEFAULT_HOME_CONTENT_EN,
    })
    expect(res.success).toBe(true)

    const resWithoutEn = homeDraftInputSchema.safeParse({
      sections: DEFAULT_HOME_CONTENT,
      layout: DEFAULT_HOME_LAYOUT,
    })
    expect(resWithoutEn.success).toBe(true)
  })

  it('countHomeChanges accounts for english differences', () => {
    const base = {
      sections: DEFAULT_HOME_CONTENT,
      layout: DEFAULT_HOME_LAYOUT,
      english: DEFAULT_HOME_CONTENT_EN,
    }
    const modifiedEn = {
      sections: DEFAULT_HOME_CONTENT,
      layout: DEFAULT_HOME_LAYOUT,
      english: {
        ...DEFAULT_HOME_CONTENT_EN,
        hero: { ...DEFAULT_HOME_CONTENT_EN.hero, title: 'Brand New English Title' },
      },
    }
    expect(countHomeChanges(modifiedEn, base)).toBe(1)
  })

  describe('trader videos', () => {
    const reel = { name: 'تاجر', place: 'معرض', url: 'https://www.facebook.com/share/r/abc/' }
    const parse = (items: unknown) =>
      homeContentSchema.safeParse({ ...DEFAULT_HOME_CONTENT, traderReels: { items } })

    it('content without the section reads as the default videos', () => {
      const { traderReels: _omitted, ...old } = DEFAULT_HOME_CONTENT
      const result = homeContentSchema.safeParse(old)
      expect(result.success && result.data.traderReels).toEqual(DEFAULT_HOME_CONTENT.traderReels)
    })

    it('accepts a video, no videos, and a card without a link', () => {
      expect(parse([reel]).success).toBe(true)
      expect(parse([]).success).toBe(true)
      expect(parse([{ ...reel, url: null }]).success).toBe(true)
      expect(parse([{ ...reel, url: '  ' }]).success).toBe(true)
    })

    it('turns a blank link into null', () => {
      const result = parse([{ ...reel, url: '  ' }])
      expect(result.success && result.data.traderReels.items[0]?.url).toBeNull()
    })

    it('rejects a missing name, an insecure or script link, and too many videos', () => {
      expect(parse([{ ...reel, name: ' ' }]).success).toBe(false)
      expect(parse([{ ...reel, url: 'http://facebook.com/x' }]).success).toBe(false)
      expect(parse([{ ...reel, url: 'javascript:alert(1)' }]).success).toBe(false)
      expect(parse(Array.from({ length: TRADER_REELS_MAX + 1 }, () => reel)).success).toBe(false)
    })

    it('the default videos are six real links in both languages', () => {
      for (const content of [DEFAULT_HOME_CONTENT, DEFAULT_HOME_CONTENT_EN]) {
        expect(content.traderReels.items).toHaveLength(6)
        expect(content.traderReels.items.every((item) => item.url?.startsWith('https://'))).toBe(true)
      }
    })
  })

  describe('Facebook video addresses', () => {
    it('recognises reels and page videos on Facebook hosts', () => {
      expect(isFacebookVideoUrl('https://www.facebook.com/reel/1444506754485675/')).toBe(true)
      expect(isFacebookVideoUrl('https://facebook.com/Elkawagastore/videos/1725780245171281/')).toBe(true)
      expect(isFacebookVideoUrl('https://m.facebook.com/page/videos/slug/123/?x=1')).toBe(true)
    })

    it('rejects short share links, other pages, other hosts and look-alike hosts', () => {
      expect(isFacebookVideoUrl('https://www.facebook.com/share/r/19rBsq1tFH/')).toBe(false)
      expect(isFacebookVideoUrl('https://www.facebook.com/MohamedSeragCo/')).toBe(false)
      expect(isFacebookVideoUrl('http://www.facebook.com/reel/1/')).toBe(false)
      expect(isFacebookVideoUrl('https://facebook.com.evil.test/reel/1/')).toBe(false)
      expect(isFacebookVideoUrl('https://facebook.com@evil.test/reel/1/')).toBe(false)
      expect(isFacebookVideoUrl('https://evil.test/reel/1/')).toBe(false)
    })

    it('builds the player address only on facebook.com, with the reel in the href', () => {
      const src = facebookEmbedSrc('https://m.facebook.com/reel/123/?rdid=x')
      expect(src).toBe(
        'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F123%2F&show_text=false&autoplay=1',
      )
      expect(facebookEmbedSrc('https://www.facebook.com/share/r/abc/')).toBeNull()
      expect(facebookEmbedSrc(null)).toBeNull()
    })
  })
})
