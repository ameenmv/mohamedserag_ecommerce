import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME_CONTENT } from '@serag/shared'
import type { HomeContent, HomeSectionId } from '@serag/shared'
import {
  cloneHomeDraft,
  isHomeFieldChanged,
  isHomeSectionId,
  mapHomeIssuePath,
  mapHomeFieldErrors,
  moveHomeSection,
  resetHomeField,
  toggleHomeSectionHidden,
} from '../app/utils/admin-home-editor'

const ORDER: HomeSectionId[] = [
  'announce',
  'hero',
  'uspStrip',
  'featuredCategories',
  'flash',
  'bridalTeaser',
  'tradersTeaser',
  'aboutTeaser',
  'partners',
  'guides',
]

function freshSections(): HomeContent {
  return cloneHomeDraft(DEFAULT_HOME_CONTENT)
}

describe('moveHomeSection', () => {
  it('moves a section up by swapping with its previous neighbour', () => {
    const result = moveHomeSection(ORDER, 'flash', -1)
    expect(result.indexOf('flash')).toBe(ORDER.indexOf('flash') - 1)
    expect(result.indexOf('featuredCategories')).toBe(ORDER.indexOf('featuredCategories') + 1)
  })

  it('moves a section down by swapping with its next neighbour', () => {
    const result = moveHomeSection(ORDER, 'hero', 1)
    expect(result.indexOf('hero')).toBe(ORDER.indexOf('hero') + 1)
  })

  it('returns an unchanged copy when the move is out of range', () => {
    const result = moveHomeSection(ORDER, 'announce', -1)
    expect(result).toEqual(ORDER)
    expect(result).not.toBe(ORDER)
  })

  it('returns an unchanged copy for an unknown section', () => {
    const result = moveHomeSection(ORDER, 'nope' as HomeSectionId, 1)
    expect(result).toEqual(ORDER)
  })

  it('preserves the full set of sections after a move', () => {
    const result = moveHomeSection(ORDER, 'guides', -1)
    expect([...result].sort()).toEqual([...ORDER].sort())
  })
})

describe('toggleHomeSectionHidden', () => {
  it('adds a section that is not hidden', () => {
    expect(toggleHomeSectionHidden(['announce'], 'hero')).toEqual(['announce', 'hero'])
  })

  it('removes a section that is hidden', () => {
    expect(toggleHomeSectionHidden(['announce', 'hero'], 'announce')).toEqual(['hero'])
  })

  it('does not mutate the source array', () => {
    const source: HomeSectionId[] = ['announce']
    toggleHomeSectionHidden(source, 'hero')
    expect(source).toEqual(['announce'])
  })
})

describe('isHomeFieldChanged', () => {
  it('reports false for identical values', () => {
    const draft = freshSections()
    const published = freshSections()
    expect(isHomeFieldChanged(draft, published, 'hero', 'title')).toBe(false)
  })

  it('reports true for a changed string field', () => {
    const draft = freshSections()
    const published = freshSections()
    draft.hero.title = 'عنوان جديد'
    expect(isHomeFieldChanged(draft, published, 'hero', 'title')).toBe(true)
  })

  it('detects a change in a nested array field', () => {
    const draft = freshSections()
    const published = freshSections()
    draft.hero.stats = [{ value: '١', label: 'واحد' }]
    expect(isHomeFieldChanged(draft, published, 'hero', 'stats')).toBe(true)
  })
})

describe('resetHomeField', () => {
  it('copies the published value back into the draft for a scalar field', () => {
    const draft = { sections: freshSections(), layout: { order: ORDER, hidden: [] } }
    const published = freshSections()
    draft.sections.hero.title = 'معدّل'
    resetHomeField(draft, published, 'hero', 'title')
    expect(draft.sections.hero.title).toBe(published.hero.title)
  })

  it('deep clones the published value so later mutation does not leak', () => {
    const draft = { sections: freshSections(), layout: { order: ORDER, hidden: [] } }
    const published = freshSections()
    draft.sections.hero.stats = [{ value: '٩', label: 'تسعة' }]
    resetHomeField(draft, published, 'hero', 'stats')
    expect(draft.sections.hero.stats).toEqual(published.hero.stats)
    expect(draft.sections.hero.stats).not.toBe(published.hero.stats)
  })
})

describe('isHomeSectionId', () => {
  it('accepts a known section id', () => {
    expect(isHomeSectionId('hero')).toBe(true)
  })

  it('rejects an unknown id', () => {
    expect(isHomeSectionId('footer')).toBe(false)
  })
})

describe('mapHomeIssuePath', () => {
  it('maps a valid settings path to section and key', () => {
    expect(mapHomeIssuePath('sections.hero.title')).toEqual({ sectionId: 'hero', key: 'title' })
  })

  it('maps a nested repeater path to its parent key', () => {
    expect(mapHomeIssuePath('sections.hero.stats.0.value')).toEqual({
      sectionId: 'hero',
      key: 'stats',
    })
  })

  it('returns null for non-section paths', () => {
    expect(mapHomeIssuePath('layout.order')).toBeNull()
  })

  it('returns null for an unknown section id', () => {
    expect(mapHomeIssuePath('sections.footer.title')).toBeNull()
  })
})

describe('mapHomeFieldErrors', () => {
  it('collapses API field errors into a sectionId.key map', () => {
    const map = mapHomeFieldErrors({
      'sections.hero.title': 'عنوان الهيرو مطلوب',
      'sections.hero.stats.0.value': 'قيمة الإحصاء مطلوبة',
      'layout.order': 'ترتيب غير صالح',
    })
    expect(map).toEqual({
      'hero.title': 'عنوان الهيرو مطلوب',
      'hero.stats': 'قيمة الإحصاء مطلوبة',
    })
  })

  it('returns an empty map when there are no field errors', () => {
    expect(mapHomeFieldErrors({})).toEqual({})
  })
})
