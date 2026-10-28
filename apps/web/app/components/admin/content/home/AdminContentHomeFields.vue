<script setup lang="ts">
import { facebookEmbedSrc, isSafeContentLink, isUploadedImage } from '@serag/shared'
import type { HomeContent, HomeSectionId } from '@serag/shared'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2, Upload, X } from '@lucide/vue'
import { HOME_SECTION_META, homeFieldErrorKey } from '~/utils/admin-home-fields'

type HomeSectionContent = HomeContent[HomeSectionId]

const props = withDefaults(
  defineProps<{
    sectionId: HomeSectionId
    section: HomeSectionContent
    englishSection?: HomeSectionContent
    publishedSection: HomeSectionContent
    publishedEnglishSection?: HomeSectionContent
    locale?: 'ar' | 'en'
    hydrated: boolean
    errors: Record<string, string>
  }>(),
  {
    englishSection: undefined,
    publishedEnglishSection: undefined,
    locale: 'ar',
  },
)

const emit = defineEmits<{
  (e: 'set', key: string, value: unknown, locale: 'ar' | 'en'): void
  (e: 'reset', key: string, locale: 'ar' | 'en'): void
  (e: 'update:locale', locale: 'ar' | 'en'): void
}>()

const { t } = useI18n()
const cms = useAdminCms()

const meta = computed(() => HOME_SECTION_META[props.sectionId])
const uploadingKey = ref<string | null>(null)

const activeSection = computed(() =>
  props.locale === 'en' && props.englishSection ? props.englishSection : props.section,
)
const activePublishedSection = computed(() =>
  props.locale === 'en' && props.publishedEnglishSection
    ? props.publishedEnglishSection
    : props.publishedSection,
)

/**
 * Reads a top-level field by key from the union-typed section content.
 * The editor owns the exact field keys via `HOME_SECTION_META`, so the
 * index lookup is narrowed to `unknown` in a single place.
 */
function read(section: HomeSectionContent, key: string): unknown {
  return Reflect.get(section, key)
}

function fieldError(key: string): string | undefined {
  return props.errors[homeFieldErrorKey(props.sectionId, key)]
}

function isChanged(key: string): boolean {
  return (
    JSON.stringify(read(activeSection.value, key)) !==
    JSON.stringify(read(activePublishedSection.value, key))
  )
}

// --- text / textarea --------------------------------------------------------

function textValue(key: string): string {
  const value = read(activeSection.value, key)
  return typeof value === 'string' ? value : ''
}

// --- links ------------------------------------------------------------------

interface LinkDraft {
  label: string
  href: string
}

function linkValue(key: string, optional: boolean): LinkDraft | null {
  const value = read(activeSection.value, key)
  if (value === null || value === undefined) {
    return optional ? null : { label: '', href: '' }
  }
  if (typeof value === 'object' && 'label' in value && 'href' in value) {
    const link = value as { label: unknown; href: unknown }
    return { label: String(link.label), href: String(link.href) }
  }
  return optional ? null : { label: '', href: '' }
}

function linkHint(href: string): string | null {
  if (!href) return null
  return isSafeContentLink(href) ? null : t('admin.content.fields.linkInvalid')
}

// --- image ------------------------------------------------------------------

function imageValue(key: string): string | null {
  const value = read(activeSection.value, key)
  return typeof value === 'string' && value ? value : null
}

async function onUpload(file: File, key: string): Promise<void> {
  uploadingKey.value = key
  try {
    const res = await cms.uploadImage(file)
    emit('set', key, res.url, props.locale)
  } catch {
    useNotify().error(t('admin.content.errors.uploadFailed'))
  } finally {
    uploadingKey.value = null
  }
}

function onFileChange(event: Event, key: string): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void onUpload(file, key)
  input.value = ''
}

// --- stats ------------------------------------------------------------------

interface StatRow {
  value: string
  label: string
}

function statsValue(key: string): StatRow[] {
  const value = read(activeSection.value, key)
  if (!Array.isArray(value)) return []
  return value.filter(
    (row): row is StatRow =>
      typeof row === 'object' && row !== null && 'value' in row && 'label' in row,
  )
}

function updateStat(key: string, index: number, field: 'value' | 'label', value: string): void {
  const rows = statsValue(key).map((row) => ({ ...row }))
  const row = rows[index]
  if (!row) return
  row[field] = value
  emit('set', key, rows, props.locale)
}

function addStat(key: string): void {
  emit('set', key, [...statsValue(key), { value: '', label: '' }], props.locale)
}

function removeStat(key: string, index: number): void {
  emit('set', key, statsValue(key).filter((_, i) => i !== index), props.locale)
}

// --- usp items --------------------------------------------------------------

interface UspRow {
  title: string
  description: string
}

function uspValue(key: string): UspRow[] {
  const value = read(activeSection.value, key)
  if (!Array.isArray(value)) return []
  return value.filter(
    (row): row is UspRow =>
      typeof row === 'object' && row !== null && 'title' in row && 'description' in row,
  )
}

function updateUsp(key: string, index: number, field: 'title' | 'description', value: string): void {
  const rows = uspValue(key).map((row) => ({ ...row }))
  const row = rows[index]
  if (!row) return
  row[field] = value
  emit('set', key, rows, props.locale)
}

// --- trader videos ----------------------------------------------------------

interface ReelRow {
  name: string
  place: string
  url: string
  embed: boolean
  image: string
}

function reelsValue(key: string): ReelRow[] {
  const value = read(activeSection.value, key)
  if (!Array.isArray(value)) return []
  return value.flatMap((row): ReelRow[] =>
    typeof row === 'object' && row !== null && 'name' in row
      ? [
          {
            name: String(row.name),
            place: 'place' in row ? String(row.place) : '',
            url: 'url' in row && row.url ? String(row.url) : '',
            embed: 'embed' in row ? row.embed === true : false,
            image: 'image' in row && row.image ? String(row.image) : '',
          },
        ]
      : [],
  )
}

function emitReels(key: string, rows: ReelRow[]): void {
  emit(
    'set',
    key,
    rows.map((row) => ({
      ...row,
      url: row.url.trim() === '' ? null : row.url.trim(),
      image: row.image === '' ? null : row.image,
    })),
    props.locale,
  )
}

function patchReel(key: string, index: number, patch: Partial<ReelRow>): void {
  emitReels(key, reelsValue(key).map((row, i) => (i === index ? { ...row, ...patch } : row)))
}

function updateReel(key: string, index: number, field: 'name' | 'place' | 'url', value: string): void {
  patchReel(key, index, { [field]: value })
}

function addReel(key: string): void {
  emitReels(key, [...reelsValue(key), { name: '', place: '', url: '', embed: true, image: '' }])
}

function removeReel(key: string, index: number): void {
  emitReels(key, reelsValue(key).filter((_, i) => i !== index))
}

function moveReel(key: string, index: number, step: -1 | 1): void {
  const rows = reelsValue(key)
  const target = index + step
  if (target < 0 || target >= rows.length) return
  const moved = rows[index]
  const other = rows[target]
  if (!moved || !other) return
  rows[index] = other
  rows[target] = moved
  emitReels(key, rows)
}

function reelUrlHint(url: string): string | null {
  if (!url) return null
  if (!url.startsWith('https://')) return t('admin.content.fields.reelUrlInvalid')
  return null
}

/** True when the link is a Facebook address the popup cannot play (e.g. a short /share/ link). */
function reelNeedsResolve(row: ReelRow): boolean {
  return row.embed && row.url !== '' && !facebookEmbedSrc(row.url)
}

const reelBusy = ref<string | null>(null)

/** Fetches the plain link and the picture from Facebook, then saves both into the row. */
async function fetchReelFromFacebook(key: string, index: number): Promise<void> {
  const row = reelsValue(key)[index]
  if (!row || !row.url) return
  reelBusy.value = `${key}-${index}`
  try {
    const res = await cms.previewReel(row.url)
    patchReel(key, index, { url: res.url, image: res.image ?? row.image })
    if (res.image) useNotify().success(t('admin.content.fields.reelFetched'))
    else useNotify().warning(t('admin.content.fields.reelFetchedNoImage'))
  } catch {
    useNotify().error(t('admin.content.fields.reelFetchFailed'))
  } finally {
    reelBusy.value = null
  }
}

async function uploadReelImage(file: File, key: string, index: number): Promise<void> {
  reelBusy.value = `${key}-${index}`
  try {
    const res = await cms.uploadImage(file)
    patchReel(key, index, { image: res.url })
  } catch {
    useNotify().error(t('admin.content.errors.uploadFailed'))
  } finally {
    reelBusy.value = null
  }
}

function onReelFileChange(event: Event, key: string, index: number): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void uploadReelImage(file, key, index)
  input.value = ''
}

// --- generic string list ----------------------------------------------------

function listValue(key: string): string[] {
  const value = read(activeSection.value, key)
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function updateListItem(key: string, index: number, value: string): void {
  const items = [...listValue(key)]
  items[index] = value
  emit('set', key, items, props.locale)
}

function addListItem(key: string): void {
  emit('set', key, [...listValue(key), ''], props.locale)
}

function removeListItem(key: string, index: number): void {
  emit('set', key, listValue(key).filter((_, i) => i !== index), props.locale)
}

// --- category slugs ---------------------------------------------------------

const categories = ref<{ slug: string; name: string }[]>([])

function flattenCategories(
  nodes: { slug: string; name: string; children: unknown[] }[],
): { slug: string; name: string }[] {
  const out: { slug: string; name: string }[] = []
  for (const node of nodes) {
    out.push({ slug: node.slug, name: node.name })
    const children = node.children as { slug: string; name: string; children: unknown[] }[]
    if (children.length) out.push(...flattenCategories(children))
  }
  return out
}

async function loadCategories(): Promise<void> {
  try {
    const tree = await useStoreApi().categories()
    categories.value = flattenCategories(tree)
  } catch {
    categories.value = []
  }
}

function toggleSlug(key: string, slug: string, checked: boolean): void {
  const current = listValue(key)
  emit('set', key, checked ? [...current, slug] : current.filter((item) => item !== slug), props.locale)
}

function isSlugSelected(key: string, slug: string): boolean {
  return listValue(key).includes(slug)
}

function categoryLabel(slug: string): string {
  return categories.value.find((entry) => entry.slug === slug)?.name ?? slug
}

onMounted(() => {
  if (meta.value.fields.some((f) => f.kind === 'categorySlugs')) void loadCategories()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <h2 class="font-display text-xl font-bold text-foreground">
        {{ t(meta.nameKey) }}
      </h2>
    </div>

    <div class="border-b border-border">
      <div
        role="tablist"
        :aria-label="t('admin.content.langTabs.ariaLabel')"
        class="-mb-px flex items-center gap-2"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="locale === 'ar'"
          class="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-bold transition-colors"
          :class="
            locale === 'ar'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="emit('update:locale', 'ar')"
        >
          <span>{{ t('admin.content.langTabs.ar') }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="locale === 'en'"
          class="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-bold transition-colors"
          :class="
            locale === 'en'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="emit('update:locale', 'en')"
        >
          <span>{{ t('admin.content.langTabs.en') }}</span>
        </button>
      </div>
    </div>

    <div
      v-for="field in meta.fields"
      :key="field.key"
      class="flex flex-col gap-2"
      :class="fieldError(field.key) ? 'rounded-xl border border-destructive/50 p-3' : ''"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <label :for="`f-${sectionId}-${field.key}`" class="text-sm font-bold text-foreground">
          {{ t(field.labelKey) }}
        </label>
        <div class="flex items-center gap-2">
          <button
            v-if="isChanged(field.key)"
            type="button"
            class="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-serag-green hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-serag-gold"
            @click="emit('reset', field.key, locale)"
          >
            <RotateCcw class="size-3.5" aria-hidden="true" />
            <span>{{ t('admin.content.fields.reset') }}</span>
          </button>
        </div>
      </div>

      <!-- text -->
      <template v-if="field.kind === 'text'">
        <Input
          :id="`f-${sectionId}-${field.key}`"
          :model-value="textValue(field.key)"
          :disabled="!hydrated"
          :dir="locale === 'en' ? 'ltr' : undefined"
          :lang="locale === 'en' ? 'en' : undefined"
          :maxlength="field.max"
          :aria-invalid="Boolean(fieldError(field.key))"
          :aria-describedby="fieldError(field.key) ? `e-${sectionId}-${field.key}` : undefined"
          @update:model-value="emit('set', field.key, $event, locale)"
        />
        <span class="num self-end text-[11px] text-muted-foreground">
          {{ textValue(field.key).length }} / {{ field.max }}
        </span>
      </template>

      <!-- textarea -->
      <template v-else-if="field.kind === 'textarea'">
        <AdminFormTextarea
          :id="`f-${sectionId}-${field.key}`"
          :model-value="textValue(field.key)"
          :disabled="!hydrated"
          :dir="locale === 'en' ? 'ltr' : undefined"
          :lang="locale === 'en' ? 'en' : undefined"
          :maxlength="field.max"
          :rows="3"
          :aria-invalid="Boolean(fieldError(field.key))"
          :aria-describedby="fieldError(field.key) ? `e-${sectionId}-${field.key}` : undefined"
          @update:model-value="emit('set', field.key, $event, locale)"
        />
        <span class="num self-end text-[11px] text-muted-foreground">
          {{ textValue(field.key).length }} / {{ field.max }}
        </span>
      </template>

      <!-- link (required) -->
      <template v-else-if="field.kind === 'link'">
        <div class="grid gap-2 sm:grid-cols-2">
          <Input
            :id="`f-${sectionId}-${field.key}`"
            :model-value="linkValue(field.key, false)?.label ?? ''"
            :disabled="!hydrated"
            :dir="locale === 'en' ? 'ltr' : undefined"
            :lang="locale === 'en' ? 'en' : undefined"
            :maxlength="field.max"
            :placeholder="t('admin.content.fields.linkLabel')"
            @update:model-value="
              emit(
                'set',
                field.key,
                {
                  label: String($event),
                  href: linkValue(field.key, false)?.href ?? '',
                },
                locale,
              )
            "
          />
          <Input
            :model-value="linkValue(field.key, false)?.href ?? ''"
            :disabled="!hydrated"
            dir="ltr"
            :placeholder="t('admin.content.fields.linkHref')"
            @update:model-value="
              emit(
                'set',
                field.key,
                {
                  label: linkValue(field.key, false)?.label ?? '',
                  href: String($event),
                },
                locale,
              )
            "
          />
        </div>
        <span
          v-if="linkHint(linkValue(field.key, false)?.href ?? '')"
          class="text-xs font-semibold text-destructive"
        >
          {{ linkHint(linkValue(field.key, false)?.href ?? '') }}
        </span>
      </template>

      <!-- optional link -->
      <template v-else-if="field.kind === 'optionalLink'">
        <template v-if="linkValue(field.key, true)">
          <div class="grid gap-2 sm:grid-cols-2">
            <Input
              :model-value="linkValue(field.key, true)?.label ?? ''"
              :disabled="!hydrated"
              :dir="locale === 'en' ? 'ltr' : undefined"
              :lang="locale === 'en' ? 'en' : undefined"
              :maxlength="field.max"
              :placeholder="t('admin.content.fields.linkLabel')"
              @update:model-value="
                emit(
                  'set',
                  field.key,
                  {
                    label: String($event),
                    href: linkValue(field.key, true)?.href ?? '',
                  },
                  locale,
                )
              "
            />
            <Input
              :model-value="linkValue(field.key, true)?.href ?? ''"
              :disabled="!hydrated"
              dir="ltr"
              :placeholder="t('admin.content.fields.linkHref')"
              @update:model-value="
                emit(
                  'set',
                  field.key,
                  {
                    label: linkValue(field.key, true)?.label ?? '',
                    href: String($event),
                  },
                  locale,
                )
              "
            />
          </div>
          <div class="flex items-center justify-between gap-2">
            <span
              v-if="linkHint(linkValue(field.key, true)?.href ?? '')"
              class="text-xs font-semibold text-destructive"
            >
              {{ linkHint(linkValue(field.key, true)?.href ?? '') }}
            </span>
            <button
              type="button"
              class="ms-auto inline-flex min-h-11 items-center gap-1 text-xs font-bold text-destructive hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              @click="emit('set', field.key, null, locale)"
            >
              <X class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.content.fields.removeLink') }}</span>
            </button>
          </div>
        </template>
        <Button
          v-else
          type="button"
          variant="outline"
          :disabled="!hydrated"
          class="min-h-11 w-fit"
          @click="emit('set', field.key, { label: '', href: '' }, locale)"
        >
          <Plus class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.fields.addLink') }}</span>
        </Button>
      </template>

      <!-- image -->
      <template v-else-if="field.kind === 'image'">
        <div
          v-if="locale === 'en'"
          class="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground"
        >
          {{ t('admin.content.home.sharedWithArabic') }}
        </div>
        <div v-else class="flex flex-wrap items-center gap-3">
          <img
            v-if="imageValue(field.key) && isUploadedImage(imageValue(field.key) ?? '')"
            :src="imageValue(field.key) ?? undefined"
            :alt="t(field.labelKey)"
            class="size-20 rounded-xl border border-border object-cover"
          >
          <label
            class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-input px-4 text-sm font-bold text-foreground hover:bg-accent focus-within:ring-2 focus-within:ring-ring"
          >
            <Upload class="size-4" aria-hidden="true" />
            <span>
              {{
                uploadingKey === field.key
                  ? t('admin.content.fields.uploading')
                  : t('admin.content.fields.upload')
              }}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              :disabled="!hydrated || uploadingKey === field.key"
              @change="onFileChange($event, field.key)"
            >
          </label>
          <button
            v-if="imageValue(field.key)"
            type="button"
            class="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-destructive hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="emit('set', field.key, null, locale)"
          >
            <Trash2 class="size-3.5" aria-hidden="true" />
            <span>{{ t('admin.content.fields.removeImage') }}</span>
          </button>
        </div>
      </template>

      <!-- stats -->
      <template v-else-if="field.kind === 'stats'">
        <div class="flex flex-col gap-2">
          <div
            v-for="(row, index) in statsValue(field.key)"
            :key="index"
            class="grid grid-cols-[1fr_2fr_auto] items-center gap-2"
          >
            <Input
              :model-value="row.value"
              :disabled="!hydrated"
              :dir="locale === 'en' ? 'ltr' : undefined"
              maxlength="10"
              :placeholder="t('admin.content.fields.statValue')"
              @update:model-value="updateStat(field.key, index, 'value', String($event))"
            />
            <Input
              :model-value="row.label"
              :disabled="!hydrated"
              :dir="locale === 'en' ? 'ltr' : undefined"
              :lang="locale === 'en' ? 'en' : undefined"
              :maxlength="field.max"
              :placeholder="t('admin.content.fields.statLabel')"
              @update:model-value="updateStat(field.key, index, 'label', String($event))"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="min-h-11 min-w-11 shrink-0"
              :disabled="!hydrated"
              :aria-label="t('admin.content.fields.removeItem')"
              @click="removeStat(field.key, index)"
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Button
            v-if="statsValue(field.key).length < (field.maxItems ?? 3)"
            type="button"
            variant="outline"
            :disabled="!hydrated"
            class="min-h-11 w-fit"
            @click="addStat(field.key)"
          >
            <Plus class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.fields.addItem') }}</span>
          </Button>
        </div>
      </template>

      <!-- usp items -->
      <template v-else-if="field.kind === 'uspItems'">
        <div class="flex flex-col gap-3">
          <div
            v-for="(row, index) in uspValue(field.key)"
            :key="index"
            class="flex flex-col gap-2 rounded-xl border border-border p-3"
          >
            <span class="num text-[11px] text-muted-foreground">{{ index + 1 }}</span>
            <Input
              :model-value="row.title"
              :disabled="!hydrated"
              :dir="locale === 'en' ? 'ltr' : undefined"
              :lang="locale === 'en' ? 'en' : undefined"
              maxlength="30"
              :placeholder="t('admin.content.fields.uspTitle')"
              @update:model-value="updateUsp(field.key, index, 'title', String($event))"
            />
            <AdminFormTextarea
              :model-value="row.description"
              :disabled="!hydrated"
              :dir="locale === 'en' ? 'ltr' : undefined"
              :lang="locale === 'en' ? 'en' : undefined"
              :maxlength="field.max"
              :rows="2"
              :placeholder="t('admin.content.fields.uspDescription')"
              @update:model-value="updateUsp(field.key, index, 'description', String($event))"
            />
          </div>
        </div>
      </template>

      <!-- trader videos -->
      <template v-else-if="field.kind === 'reels'">
        <p class="text-xs text-muted-foreground">{{ t('admin.content.fields.reelsHint') }}</p>
        <div class="flex flex-col gap-3">
          <div
            v-for="(row, index) in reelsValue(field.key)"
            :key="index"
            class="flex flex-col gap-2 rounded-xl border border-border p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="num text-xs font-bold text-muted-foreground">{{ index + 1 }}</span>
              <div class="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="min-h-11 min-w-11"
                  :disabled="!hydrated || index === 0"
                  :aria-label="t('admin.content.fields.moveItemUp')"
                  @click="moveReel(field.key, index, -1)"
                >
                  <ArrowUp class="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="min-h-11 min-w-11"
                  :disabled="!hydrated || index === reelsValue(field.key).length - 1"
                  :aria-label="t('admin.content.fields.moveItemDown')"
                  @click="moveReel(field.key, index, 1)"
                >
                  <ArrowDown class="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="min-h-11 min-w-11"
                  :disabled="!hydrated"
                  :aria-label="t('admin.content.fields.removeItem')"
                  @click="removeReel(field.key, index)"
                >
                  <Trash2 class="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <Input
              :model-value="row.name"
              :disabled="!hydrated"
              :dir="locale === 'en' ? 'ltr' : undefined"
              :lang="locale === 'en' ? 'en' : undefined"
              maxlength="60"
              :aria-label="t('admin.content.fields.reelName')"
              :placeholder="t('admin.content.fields.reelName')"
              @update:model-value="updateReel(field.key, index, 'name', String($event))"
            />
            <Input
              :model-value="row.place"
              :disabled="!hydrated"
              :dir="locale === 'en' ? 'ltr' : undefined"
              :lang="locale === 'en' ? 'en' : undefined"
              :maxlength="field.max"
              :aria-label="t('admin.content.fields.reelPlace')"
              :placeholder="t('admin.content.fields.reelPlace')"
              @update:model-value="updateReel(field.key, index, 'place', String($event))"
            />
            <Input
              :model-value="row.url"
              :disabled="!hydrated"
              dir="ltr"
              maxlength="300"
              inputmode="url"
              :aria-label="t('admin.content.fields.reelUrl')"
              :placeholder="t('admin.content.fields.reelUrl')"
              @update:model-value="updateReel(field.key, index, 'url', String($event))"
            />
            <p v-if="reelUrlHint(row.url)" class="text-xs text-destructive">{{ reelUrlHint(row.url) }}</p>

            <div class="flex flex-wrap items-center gap-3">
              <div
                class="flex h-24 w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"
                :aria-label="t('admin.content.fields.reelThumbnail')"
              >
                <img v-if="row.image" :src="row.image" alt="" class="size-full object-cover">
                <span v-else class="px-1 text-center text-[10px] leading-tight text-muted-foreground">
                  {{ t('admin.content.fields.reelNoThumbnail') }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  :disabled="!hydrated || !row.url || reelBusy !== null"
                  class="min-h-11"
                  @click="fetchReelFromFacebook(field.key, index)"
                >
                  <span>{{ reelBusy === `${field.key}-${index}` ? t('admin.content.fields.reelFetching') : t('admin.content.fields.reelFetch') }}</span>
                </Button>
                <label
                  class="inline-flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                  :class="hydrated && reelBusy === null ? 'cursor-pointer' : ''"
                >
                  <Upload class="size-4" aria-hidden="true" />
                  <span>{{ t('admin.content.fields.upload') }}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    class="sr-only"
                    :disabled="!hydrated || reelBusy !== null"
                    @change="onReelFileChange($event, field.key, index)"
                  >
                </label>
                <Button
                  v-if="row.image"
                  type="button"
                  variant="ghost"
                  :disabled="!hydrated"
                  class="min-h-11"
                  @click="patchReel(field.key, index, { image: '' })"
                >
                  <X class="size-4" aria-hidden="true" />
                  <span>{{ t('admin.content.fields.removeImage') }}</span>
                </Button>
              </div>
            </div>

            <label class="flex min-h-11 items-center gap-3 text-sm font-medium" :class="hydrated ? 'cursor-pointer' : ''">
              <input
                type="checkbox"
                class="size-5 shrink-0 accent-serag-green"
                :checked="row.embed"
                :disabled="!hydrated"
                @change="patchReel(field.key, index, { embed: ($event.target as HTMLInputElement).checked })"
              >
              <span>{{ t('admin.content.fields.reelEmbed') }}</span>
            </label>
            <p v-if="reelNeedsResolve(row)" class="text-xs text-amber-700 dark:text-amber-400">
              {{ t('admin.content.fields.reelNeedsResolve') }}
            </p>
          </div>
          <Button
            v-if="reelsValue(field.key).length < (field.maxItems ?? 12)"
            type="button"
            variant="outline"
            :disabled="!hydrated"
            class="min-h-11 w-fit"
            @click="addReel(field.key)"
          >
            <Plus class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.fields.addReel') }}</span>
          </Button>
        </div>
      </template>

      <!-- generic string list -->
      <template v-else-if="field.kind === 'stringList'">
        <div class="flex flex-col gap-2">
          <div
            v-for="(item, index) in listValue(field.key)"
            :key="index"
            class="flex items-center gap-2"
          >
            <Input
              :model-value="item"
              :disabled="!hydrated"
              :dir="locale === 'en' ? 'ltr' : undefined"
              :lang="locale === 'en' ? 'en' : undefined"
              :maxlength="field.max"
              @update:model-value="updateListItem(field.key, index, String($event))"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="min-h-11 min-w-11 shrink-0"
              :disabled="!hydrated"
              :aria-label="t('admin.content.fields.removeItem')"
              @click="removeListItem(field.key, index)"
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Button
            v-if="listValue(field.key).length < (field.maxItems ?? 4)"
            type="button"
            variant="outline"
            :disabled="!hydrated"
            class="min-h-11 w-fit"
            @click="addListItem(field.key)"
          >
            <Plus class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.fields.addItem') }}</span>
          </Button>
        </div>
      </template>

      <!-- category slugs -->
      <template v-else-if="field.kind === 'categorySlugs'">
        <div
          v-if="locale === 'en'"
          class="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground"
        >
          {{ t('admin.content.home.sharedWithArabic') }}
        </div>
        <div v-else class="flex flex-col gap-2">
          <label
            v-for="cat in categories"
            :key="cat.slug"
            class="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3"
          >
            <input
              type="checkbox"
              class="size-4 accent-serag-green"
              :checked="isSlugSelected(field.key, cat.slug)"
              :disabled="
                !hydrated ||
                (!isSlugSelected(field.key, cat.slug) &&
                  listValue(field.key).length >= (field.maxItems ?? 8))
              "
              @change="toggleSlug(field.key, cat.slug, ($event.target as HTMLInputElement).checked)"
            >
            <span class="text-sm text-foreground">{{ cat.name }}</span>
            <span class="num ms-auto text-[11px] text-muted-foreground" dir="ltr">
              {{ cat.slug }}
            </span>
          </label>
          <p v-if="!categories.length" class="text-sm text-muted-foreground">
            {{ t('admin.content.fields.noCategories') }}
          </p>
          <div v-if="listValue(field.key).length" class="flex flex-wrap gap-2">
            <span
              v-for="slug in listValue(field.key)"
              :key="slug"
              class="rounded-full bg-muted px-3 py-1 text-xs text-foreground"
            >
              {{ categoryLabel(slug) }}
            </span>
          </div>
        </div>
      </template>

      <span
        v-if="fieldError(field.key)"
        :id="`e-${sectionId}-${field.key}`"
        role="alert"
        class="text-xs font-semibold text-destructive"
      >
        {{ fieldError(field.key) }}
      </span>
    </div>
  </div>
</template>
