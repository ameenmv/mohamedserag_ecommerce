import {
  DEFAULT_HOME_CONTENT,
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
 * Parses the stored layout JSON, tolerating the legacy `{ sections: string[] }` shape
 * by reading the known ids as `order` and appending any missing ids in canonical order.
 */
function parseLayout(value: unknown): HomeLayout {
  const parsed = homeLayoutSchema.safeParse(value)
  if (parsed.success) {
    return parsed.data
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

  return { order, hidden: [] }
}

export interface StoredHome {
  sections: HomeContent
  layout: HomeLayout
}

/**
 * Reads `ContentVersion.data`/`ContentVersion.layout` JSON columns safely.
 * Content that fails validation falls back to the built-in defaults.
 */
export function parseStoredHome(data: unknown, layout: unknown): StoredHome {
  const parsedContent = homeContentSchema.safeParse(data)
  return {
    sections: parsedContent.success ? parsedContent.data : DEFAULT_HOME_CONTENT,
    layout: parseLayout(layout),
  }
}
