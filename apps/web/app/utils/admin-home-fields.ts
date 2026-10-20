import type { HomeSectionId } from '@serag/shared'

/**
 * Editable field kinds for the home CMS editor. Each kind maps to a control
 * in `AdminContentHomeFields.vue` and to a shape in `@serag/shared` content schema.
 */
export type HomeFieldKind =
  | 'text'
  | 'textarea'
  | 'link'
  | 'optionalLink'
  | 'image'
  | 'stats'
  | 'uspItems'
  | 'stringList'
  | 'categorySlugs'

export interface HomeFieldMeta {
  /** Top-level key on the section content object. */
  key: string
  kind: HomeFieldKind
  /** i18n key under `admin.content.fields.*` for the control label. */
  labelKey: string
  /** Character limit per string (single field or each string in a repeater). */
  max: number
  /** Minimum number of items for repeater kinds. */
  minItems?: number
  /** Maximum number of items for repeater kinds. */
  maxItems?: number
}

export interface HomeSectionMeta {
  /** i18n key under `admin.content.sections.*` for the section name. */
  nameKey: string
  fields: HomeFieldMeta[]
}

/**
 * Per-section editable field metadata. Limits mirror `packages/shared/src/content-schema.ts`.
 * Text labels live in i18n so both locales stay in sync.
 */
export const HOME_SECTION_META: Record<HomeSectionId, HomeSectionMeta> = {
  announce: {
    nameKey: 'admin.content.sections.announce',
    fields: [
      { key: 'text', kind: 'text', labelKey: 'admin.content.fields.announce.text', max: 120 },
      { key: 'href', kind: 'optionalLink', labelKey: 'admin.content.fields.announce.href', max: 200 },
    ],
  },
  hero: {
    nameKey: 'admin.content.sections.hero',
    fields: [
      { key: 'eyebrow', kind: 'text', labelKey: 'admin.content.fields.hero.eyebrow', max: 60 },
      { key: 'title', kind: 'text', labelKey: 'admin.content.fields.hero.title', max: 80 },
      { key: 'subtitle', kind: 'textarea', labelKey: 'admin.content.fields.hero.subtitle', max: 240 },
      { key: 'cta', kind: 'link', labelKey: 'admin.content.fields.hero.cta', max: 30 },
      {
        key: 'secondaryCta',
        kind: 'optionalLink',
        labelKey: 'admin.content.fields.hero.secondaryCta',
        max: 30,
      },
      { key: 'image', kind: 'image', labelKey: 'admin.content.fields.hero.image', max: 300 },
      {
        key: 'stats',
        kind: 'stats',
        labelKey: 'admin.content.fields.hero.stats',
        max: 30,
        maxItems: 3,
      },
    ],
  },
  uspStrip: {
    nameKey: 'admin.content.sections.uspStrip',
    fields: [
      {
        key: 'items',
        kind: 'uspItems',
        labelKey: 'admin.content.fields.uspStrip.items',
        max: 90,
        minItems: 4,
        maxItems: 4,
      },
    ],
  },
  featuredCategories: {
    nameKey: 'admin.content.sections.featuredCategories',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'admin.content.fields.featuredCategories.title',
        max: 60,
      },
      {
        key: 'categorySlugs',
        kind: 'categorySlugs',
        labelKey: 'admin.content.fields.featuredCategories.categorySlugs',
        max: 80,
        maxItems: 8,
      },
    ],
  },
  flash: {
    nameKey: 'admin.content.sections.flash',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'admin.content.fields.flash.title', max: 60 },
      { key: 'subtitle', kind: 'textarea', labelKey: 'admin.content.fields.flash.subtitle', max: 120 },
    ],
  },
  bridalTeaser: {
    nameKey: 'admin.content.sections.bridalTeaser',
    fields: [
      { key: 'eyebrow', kind: 'text', labelKey: 'admin.content.fields.bridalTeaser.eyebrow', max: 40 },
      { key: 'title', kind: 'text', labelKey: 'admin.content.fields.bridalTeaser.title', max: 80 },
      {
        key: 'subtitle',
        kind: 'textarea',
        labelKey: 'admin.content.fields.bridalTeaser.subtitle',
        max: 300,
      },
      { key: 'cta', kind: 'link', labelKey: 'admin.content.fields.bridalTeaser.cta', max: 30 },
    ],
  },
  tradersTeaser: {
    nameKey: 'admin.content.sections.tradersTeaser',
    fields: [
      { key: 'badge', kind: 'text', labelKey: 'admin.content.fields.tradersTeaser.badge', max: 30 },
      { key: 'title', kind: 'text', labelKey: 'admin.content.fields.tradersTeaser.title', max: 80 },
      {
        key: 'subtitle',
        kind: 'textarea',
        labelKey: 'admin.content.fields.tradersTeaser.subtitle',
        max: 300,
      },
      { key: 'cta', kind: 'link', labelKey: 'admin.content.fields.tradersTeaser.cta', max: 30 },
      {
        key: 'points',
        kind: 'stringList',
        labelKey: 'admin.content.fields.tradersTeaser.points',
        max: 60,
        maxItems: 4,
      },
    ],
  },
  aboutTeaser: {
    nameKey: 'admin.content.sections.aboutTeaser',
    fields: [
      { key: 'eyebrow', kind: 'text', labelKey: 'admin.content.fields.aboutTeaser.eyebrow', max: 40 },
      { key: 'title', kind: 'text', labelKey: 'admin.content.fields.aboutTeaser.title', max: 80 },
      {
        key: 'subtitle',
        kind: 'textarea',
        labelKey: 'admin.content.fields.aboutTeaser.subtitle',
        max: 300,
      },
      {
        key: 'cta',
        kind: 'optionalLink',
        labelKey: 'admin.content.fields.aboutTeaser.cta',
        max: 30,
      },
    ],
  },
  partners: {
    nameKey: 'admin.content.sections.partners',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'admin.content.fields.partners.title', max: 60 },
    ],
  },
  guides: {
    nameKey: 'admin.content.sections.guides',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'admin.content.fields.guides.title', max: 60 },
    ],
  },
}

/** Composite `sectionId.key` form used to key per-field errors in the editor. */
export function homeFieldErrorKey(sectionId: HomeSectionId, key: string): string {
  return `${sectionId}.${key}`
}
