import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME_CONTENT } from '@serag/shared'
import type { HomeContent, HomeLayout } from '@serag/shared'
import {
  visibleHomeSections,
  type HomeLiveData,
} from '../app/utils/home-sections'

const ALL_VISIBLE: HomeLiveData = {
  flashCount: 3,
  partnerCount: 5,
  guideCount: 3,
  featuredCategoryCount: 4,
}

function layout(order: HomeLayout['order'], hidden: HomeLayout['hidden'] = []): HomeLayout {
  return { order, hidden }
}

describe('visibleHomeSections', () => {
  it('skips hidden sections', () => {
    const result = visibleHomeSections(
      layout(['hero', 'tradersTeaser', 'aboutTeaser'], ['tradersTeaser']),
      DEFAULT_HOME_CONTENT,
      ALL_VISIBLE,
    )
    expect(result).toEqual(['hero', 'aboutTeaser'])
  })

  it('keeps the layout order', () => {
    const result = visibleHomeSections(
      layout(['aboutTeaser', 'hero', 'uspStrip']),
      DEFAULT_HOME_CONTENT,
      ALL_VISIBLE,
    )
    expect(result).toEqual(['aboutTeaser', 'hero', 'uspStrip'])
  })

  it('skips dynamic sections that are empty at render time', () => {
    const empty: HomeLiveData = {
      flashCount: 0,
      partnerCount: 0,
      guideCount: 0,
      featuredCategoryCount: 0,
    }
    const result = visibleHomeSections(
      layout([
        'featuredCategories',
        'flash',
        'partners',
        'guides',
        'hero',
      ]),
      DEFAULT_HOME_CONTENT,
      empty,
    )
    expect(result).toEqual(['hero'])
  })

  it('skips the announce section when its text is empty', () => {
    const sections: HomeContent = {
      ...DEFAULT_HOME_CONTENT,
      announce: { text: '   ', href: null },
    }
    const result = visibleHomeSections(
      layout(['announce', 'hero']),
      sections,
      ALL_VISIBLE,
    )
    expect(result).toEqual(['hero'])
  })

  it('keeps dynamic sections that have data', () => {
    const result = visibleHomeSections(
      layout(['flash', 'partners', 'guides', 'featuredCategories']),
      DEFAULT_HOME_CONTENT,
      ALL_VISIBLE,
    )
    expect(result).toEqual(['flash', 'partners', 'guides', 'featuredCategories'])
  })
})
