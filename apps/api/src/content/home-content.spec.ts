import {
  DEFAULT_HOME_CONTENT,
  DEFAULT_HOME_CONTENT_EN,
  DEFAULT_HOME_LAYOUT,
  HOME_SECTION_IDS,
  type HomeLayout,
} from '@serag/shared'
import { describe, expect, it } from 'vitest'
import { parseStoredHome } from './home-content.js'

describe('parseStoredHome', () => {
  it('returns the parsed content and layout when both are valid', () => {
    const customContent = {
      ...DEFAULT_HOME_CONTENT,
      hero: { ...DEFAULT_HOME_CONTENT.hero, title: 'عنوان مخصص' },
    }
    const customLayout: HomeLayout = {
      order: [...HOME_SECTION_IDS].reverse(),
      hidden: ['tradersTeaser'],
    }

    const result = parseStoredHome(customContent, customLayout)

    expect(result.sections.hero.title).toBe('عنوان مخصص')
    expect(result.layout.order).toEqual(customLayout.order)
    expect(result.layout.hidden).toEqual(['tradersTeaser'])
  })

  it('falls back to default content when the content JSON is invalid', () => {
    const result = parseStoredHome({ hero: { title: '' } }, DEFAULT_HOME_LAYOUT)

    expect(result.sections).toEqual(DEFAULT_HOME_CONTENT)
    expect(result.layout).toEqual(DEFAULT_HOME_LAYOUT)
  })

  it('maps the legacy { sections } layout to order and appends missing ids', () => {
    const result = parseStoredHome(DEFAULT_HOME_CONTENT, {
      sections: ['hero', 'announce'],
    })

    expect(result.layout.order.slice(0, 2)).toEqual(['hero', 'announce'])
    expect(result.layout.order).toHaveLength(HOME_SECTION_IDS.length)
    expect(new Set(result.layout.order).size).toBe(HOME_SECTION_IDS.length)
    expect(result.layout.hidden).toEqual(DEFAULT_HOME_LAYOUT.hidden)
  })

  it('drops unknown and duplicate legacy ids, then appends the missing ones', () => {
    const result = parseStoredHome(DEFAULT_HOME_CONTENT, {
      sections: ['hero', 'unknown-section', 'hero', 'guides'],
    })

    expect(result.layout.order.slice(0, 2)).toEqual(['hero', 'guides'])
    expect(result.layout.order).toHaveLength(HOME_SECTION_IDS.length)
    expect(new Set(result.layout.order).size).toBe(HOME_SECTION_IDS.length)
  })

  it('falls back to the default layout when the layout is neither valid nor legacy', () => {
    const result = parseStoredHome(DEFAULT_HOME_CONTENT, { order: ['hero'] })

    expect(result.layout).toEqual(DEFAULT_HOME_LAYOUT)
  })

  describe('content saved before the trader videos section existed', () => {
    const { traderReels: _reels, ...oldContent } = DEFAULT_HOME_CONTENT
    const oldOrder = HOME_SECTION_IDS.filter((id) => id !== 'traderReels')

    it('keeps the owner content and fills the videos with the defaults', () => {
      const edited = { ...oldContent, hero: { ...oldContent.hero, title: 'عنوان المالك' } }

      const result = parseStoredHome(edited, DEFAULT_HOME_LAYOUT)

      expect(result.sections.hero.title).toBe('عنوان المالك')
      expect(result.sections.traderReels).toEqual(DEFAULT_HOME_CONTENT.traderReels)
    })

    it('slots the new section into an old layout after the section that precedes it', () => {
      const layout = { order: [...oldOrder].reverse(), hidden: ['guides'] }

      const result = parseStoredHome(oldContent, layout)

      expect(result.layout.order).toHaveLength(HOME_SECTION_IDS.length)
      expect(result.layout.order.indexOf('traderReels')).toBe(
        result.layout.order.indexOf('partners') + 1,
      )
      expect(result.layout.hidden).toEqual(['guides'])
    })

    it('shows English video names for English content saved without the section', () => {
      const { traderReels: _enReels, ...oldEnglish } = DEFAULT_HOME_CONTENT_EN

      const result = parseStoredHome({ ...oldContent, en: oldEnglish }, DEFAULT_HOME_LAYOUT)

      expect(result.english?.traderReels).toEqual(DEFAULT_HOME_CONTENT_EN.traderReels)
    })
  })

  describe('content saved before productStory and reviews sections existed', () => {
    const { productStory: _story, reviews: _rev, ...oldContent } = DEFAULT_HOME_CONTENT
    const oldOrder = HOME_SECTION_IDS.filter((id) => id !== 'productStory' && id !== 'reviews')

    it('keeps the owner content and fills productStory and reviews with the defaults', () => {
      const edited = { ...oldContent, hero: { ...oldContent.hero, title: 'عنوان المالك' } }

      const result = parseStoredHome(edited, DEFAULT_HOME_LAYOUT)

      expect(result.sections.hero.title).toBe('عنوان المالك')
      expect(result.sections.productStory).toEqual(DEFAULT_HOME_CONTENT.productStory)
      expect(result.sections.reviews).toEqual(DEFAULT_HOME_CONTENT.reviews)
    })

    it('slots the new sections into an old layout after the sections that precede them', () => {
      const layout = { order: [...oldOrder].reverse(), hidden: ['guides'] }

      const result = parseStoredHome(oldContent, layout)

      expect(result.layout.order).toHaveLength(HOME_SECTION_IDS.length)
      expect(result.layout.order.indexOf('productStory')).toBe(
        result.layout.order.indexOf('flash') + 1,
      )
      expect(result.layout.order.indexOf('reviews')).toBe(
        result.layout.order.indexOf('traderReels') + 1,
      )
      expect(result.layout.hidden).toEqual(['guides'])
    })

    it('shows English defaults for English content saved without the two sections', () => {
      const { productStory: _enStory, reviews: _enRev, ...oldEnglish } = DEFAULT_HOME_CONTENT_EN

      const result = parseStoredHome({ ...oldContent, en: oldEnglish }, DEFAULT_HOME_LAYOUT)

      expect(result.english?.productStory).toEqual(DEFAULT_HOME_CONTENT_EN.productStory)
      expect(result.english?.reviews).toEqual(DEFAULT_HOME_CONTENT_EN.reviews)
    })

    it('parses custom finish and productMode on productStory', () => {
      const custom = {
        ...DEFAULT_HOME_CONTENT,
        productStory: {
          ...DEFAULT_HOME_CONTENT.productStory,
          finish: 'champagne' as const,
          productMode: 'bestseller' as const,
        },
      }
      const result = parseStoredHome(custom, DEFAULT_HOME_LAYOUT)
      expect(result.sections.productStory.finish).toBe('champagne')
      expect(result.sections.productStory.productMode).toBe('bestseller')
    })

    it('parses content saved without finish and productMode as valid productStory', () => {
      const { finish: _f, productMode: _m, ...oldStory } = DEFAULT_HOME_CONTENT.productStory
      const old = { ...DEFAULT_HOME_CONTENT, productStory: oldStory }
      const result = parseStoredHome(old, DEFAULT_HOME_LAYOUT)
      expect(result.sections.productStory.productSlug).toBe(DEFAULT_HOME_CONTENT.productStory.productSlug)
      expect(result.sections.productStory.finish).toBeUndefined()
      expect(result.sections.productStory.productMode).toBeUndefined()
    })
  })
})
