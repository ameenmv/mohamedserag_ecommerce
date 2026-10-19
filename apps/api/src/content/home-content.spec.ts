import {
  DEFAULT_HOME_CONTENT,
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
    expect(result.layout.hidden).toEqual([])
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
})
