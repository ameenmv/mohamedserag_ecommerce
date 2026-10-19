import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOME_CONTENT,
  DEFAULT_HOME_LAYOUT,
  countHomeChanges,
  isSafeContentLink,
  isUploadedImage,
  HOME_SECTION_IDS,
} from './content.js'
import {
  homeContentSchema,
  homeLayoutSchema,
  pageInputSchema,
  guideInputSchema,
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
})
