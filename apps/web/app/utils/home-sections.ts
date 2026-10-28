import type { HomeContent, HomeLayout, HomeSectionId } from '@serag/shared'
import { FEATURES } from '../constants/features'

/**
 * Live data available at render time, used to decide whether a dynamic
 * section has anything to show. Static sections (announce, hero, USP,
 * bridal/traders/about teasers) are driven purely by their content.
 */
export interface HomeLiveData {
  flashCount: number
  partnerCount: number
  guideCount: number
  featuredCategoryCount: number
}

function hasText(value: string): boolean {
  return value.trim().length > 0
}

/**
 * A section is empty (and must be omitted) when it has no content to render.
 * Only dynamic sections can become empty; static sections render as long as
 * their own content exists.
 */
function isHomeSectionEmpty(
  id: HomeSectionId,
  sections: HomeContent,
  live: HomeLiveData,
): boolean {
  switch (id) {
    case 'announce':
      return !hasText(sections.announce.text)
    case 'featuredCategories':
      return live.featuredCategoryCount === 0
    case 'flash':
      return live.flashCount === 0
    case 'partners':
      return live.partnerCount === 0
    case 'traderReels':
      return sections.traderReels.items.length === 0
    case 'guides':
      return live.guideCount === 0
    default:
      return false
  }
}

/**
 * Resolves the ordered list of section ids to render:
 * the layout order, minus hidden ids, minus empty dynamic sections.
 */
export function visibleHomeSections(
  layout: HomeLayout,
  sections: HomeContent,
  live: HomeLiveData,
): HomeSectionId[] {
  const hidden = new Set<HomeSectionId>(layout.hidden)
  const result: HomeSectionId[] = []
  for (const id of layout.order) {
    if (hidden.has(id)) continue
    // A switched-off feature's teaser never renders, whatever the published layout says
    if (id === 'bridalTeaser' && !FEATURES.bridal) continue
    if (isHomeSectionEmpty(id, sections, live)) continue
    result.push(id)
  }
  return result
}
