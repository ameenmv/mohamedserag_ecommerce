import type { AdminHomeState, HomeContent, HomeSectionId } from '@serag/shared'
import { HOME_SECTION_IDS } from '@serag/shared'

type MutableHome = { sections: HomeContent; layout: AdminHomeState['draft']['layout'] }

/** Deep clone a home draft through JSON so the editable copy never aliases server state. */
export function cloneHomeDraft<T>(value: T): T {
  const parsed: unknown = JSON.parse(JSON.stringify(value))
  return parsed as T
}

function readSectionField(
  sections: HomeContent,
  sectionId: HomeSectionId,
  key: string,
): unknown {
  return Reflect.get(sections[sectionId], key)
}

function writeSectionField(
  sections: HomeContent,
  sectionId: HomeSectionId,
  key: string,
  value: unknown,
): void {
  Reflect.set(sections[sectionId], key, value)
}

/**
 * Moves a section one slot up (-1) or down (1) inside the layout order.
 * Returns a new order array; out-of-range moves return the original order unchanged.
 */
export function moveHomeSection(
  order: HomeSectionId[],
  id: HomeSectionId,
  direction: -1 | 1,
): HomeSectionId[] {
  const index = order.indexOf(id)
  if (index === -1) return order.slice()
  const target = index + direction
  if (target < 0 || target >= order.length) return order.slice()
  const next = order.slice()
  const current = next[index]
  const swapped = next[target]
  if (current === undefined || swapped === undefined) return order.slice()
  next[index] = swapped
  next[target] = current
  return next
}

/** Returns a new hidden array with the section toggled in or out. */
export function toggleHomeSectionHidden(
  hidden: HomeSectionId[],
  id: HomeSectionId,
): HomeSectionId[] {
  if (hidden.includes(id)) return hidden.filter((entry) => entry !== id)
  return [...hidden, id]
}

/** Whether a top-level field of a section differs between the draft and the published copy. */
export function isHomeFieldChanged(
  draft: HomeContent,
  published: HomeContent,
  sectionId: HomeSectionId,
  key: string,
): boolean {
  const draftValue = readSectionField(draft, sectionId, key)
  const publishedValue = readSectionField(published, sectionId, key)
  return JSON.stringify(draftValue) !== JSON.stringify(publishedValue)
}

/** Copies the published value of a single section field back into the mutable draft. */
export function resetHomeField(
  draft: MutableHome,
  published: HomeContent,
  sectionId: HomeSectionId,
  key: string,
): void {
  const publishedValue = readSectionField(published, sectionId, key)
  writeSectionField(draft.sections, sectionId, key, cloneHomeDraft(publishedValue))
}

/** Writes a single section field value into the mutable draft. */
export function setHomeField(
  draft: MutableHome,
  sectionId: HomeSectionId,
  key: string,
  value: unknown,
): void {
  writeSectionField(draft.sections, sectionId, key, value)
}

/**
 * Whether a section id is one of the known home section ids.
 * Used to guard API error paths before indexing the field metadata map.
 */
export function isHomeSectionId(value: string): value is HomeSectionId {
  return (HOME_SECTION_IDS as readonly string[]).includes(value)
}

/**
 * Maps an API validation issue path (e.g. `sections.hero.title`) to the
 * `sectionId` + `fieldKey` the editor can attach an error to.
 * Paths outside the editable home shape return `null`.
 */
export function mapHomeIssuePath(
  path: string,
): { sectionId: HomeSectionId; key: string } | null {
  const parts = path.split('.')
  if (parts[0] === 'sections' && parts.length >= 3) {
    const sectionId = parts[1]
    const key = parts[2]
    if (sectionId === undefined || key === undefined) return null
    if (!isHomeSectionId(sectionId)) return null
    return { sectionId, key }
  }
  return null
}

/**
 * Collapses the API's 400 field errors (`{ 'sections.hero.title': message }`, as parsed by
 * `parseAdminApiError`) into a `sectionId.key` map. Sub-field paths such as
 * `sections.hero.stats.0.value` land on the parent `stats` key so the whole repeater shows it.
 */
export function mapHomeFieldErrors(fieldErrors: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [path, message] of Object.entries(fieldErrors)) {
    const mapped = mapHomeIssuePath(path)
    if (!mapped) continue
    const composite = `${mapped.sectionId}.${mapped.key}`
    if (!map[composite]) map[composite] = message
  }
  return map
}
