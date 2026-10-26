import {
  DEFAULT_HOME_CONTENT,
  DEFAULT_HOME_CONTENT_EN,
  DEFAULT_HOME_LAYOUT,
  HOME_SECTION_IDS,
  homeContentSchema,
  homeLayoutSchema,
  type HomeContent,
  type HomeLayout,
  type HomeSectionId,
} from '@serag/shared'

function isHomeSectionId(value: unknown): value is HomeSectionId {
  return typeof value === 'string' && HOME_SECTION_IDS.some((id) => id === value)
}

function readLegacySections(value: unknown): unknown[] | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const sections = (value as Record<string, unknown>).sections
  return Array.isArray(sections) ? sections : null
}

/**
 * A layout saved before a section existed has every other id but not the new one. Each missing
 * id is slotted in right after the id that precedes it in the canonical order (or appended),
 * so a new section lands next to where it belongs without moving anything the owner arranged.
 */
function addMissingSections(value: unknown): HomeLayout | null {
  if (typeof value !== 'object' || value === null) return null
  const { order, hidden } = value as Record<string, unknown>
  if (!Array.isArray(order) || !Array.isArray(hidden)) return null
  if (!order.every(isHomeSectionId) || !hidden.every(isHomeSectionId)) return null
  if (new Set(order).size !== order.length) return null

  const next: HomeSectionId[] = [...order]
  HOME_SECTION_IDS.forEach((id, index) => {
    if (next.includes(id)) return
    const before = HOME_SECTION_IDS.slice(0, index).reverse().find((prev) => next.includes(prev))
    next.splice(before ? next.indexOf(before) + 1 : next.length, 0, id)
  })
  return homeLayoutSchema.safeParse({ order: next, hidden: [...new Set(hidden)] }).data ?? null
}

/**
 * Parses the stored layout JSON, tolerating the legacy `{ sections: string[] }` shape
 * by reading the known ids as `order` and appending any missing ids in canonical order;
 * hidden sections start from the defaults.
 */
function parseLayout(value: unknown): HomeLayout {
  const parsed = homeLayoutSchema.safeParse(value)
  if (parsed.success) {
    return parsed.data
  }

  const upgraded = addMissingSections(value)
  if (upgraded) {
    return upgraded
  }

  const legacySections = readLegacySections(value)
  if (!legacySections) {
    return DEFAULT_HOME_LAYOUT
  }

  const seen = new Set<HomeSectionId>()
  const order: HomeSectionId[] = []
  for (const item of legacySections) {
    if (isHomeSectionId(item) && !seen.has(item)) {
      seen.add(item)
      order.push(item)
    }
  }
  for (const id of HOME_SECTION_IDS) {
    if (!seen.has(id)) {
      order.push(id)
    }
  }

  return { order, hidden: [...DEFAULT_HOME_LAYOUT.hidden] }
}

export interface StoredHome {
  sections: HomeContent
  layout: HomeLayout
  /** The owner's English version (stored as `data.en`), or null when there is none */
  english: HomeContent | null
}

/**
 * Reads `ContentVersion.data`/`ContentVersion.layout` JSON columns safely.
 * Content that fails validation falls back to the built-in defaults.
 */
export function parseStoredHome(data: unknown, layout: unknown): StoredHome {
  const parsedContent = homeContentSchema.safeParse(data)
  const rawEnglish = typeof data === 'object' && data !== null ? (data as Record<string, unknown>).en : undefined
  const parsedEnglish = rawEnglish === undefined ? null : homeContentSchema.safeParse(rawEnglish)
  let english = parsedEnglish?.success ? parsedEnglish.data : null
  // English saved before the video strip existed must not fall back to the Arabic default names
  if (english && typeof rawEnglish === 'object' && rawEnglish !== null && !('traderReels' in rawEnglish)) {
    english = { ...english, traderReels: DEFAULT_HOME_CONTENT_EN.traderReels }
  }
  return {
    sections: parsedContent.success ? parsedContent.data : DEFAULT_HOME_CONTENT,
    layout: parseLayout(layout),
    english,
  }
}
