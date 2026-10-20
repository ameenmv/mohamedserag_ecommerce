<script setup lang="ts">
import { isSafeContentLink, isUploadedImage } from '@serag/shared'
import type { HomeContent, HomeSectionId } from '@serag/shared'
import { Plus, RotateCcw, Trash2, Upload, X } from '@lucide/vue'
import { HOME_SECTION_META, homeFieldErrorKey } from '~/utils/admin-home-fields'

type HomeSectionContent = HomeContent[HomeSectionId]

const props = defineProps<{
  sectionId: HomeSectionId
  section: HomeSectionContent
  publishedSection: HomeSectionContent
  hydrated: boolean
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'set', key: string, value: unknown): void
  (e: 'reset', key: string): void
}>()

const { t } = useI18n()
const cms = useAdminCms()

const meta = computed(() => HOME_SECTION_META[props.sectionId])
const uploadingKey = ref<string | null>(null)

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
    JSON.stringify(read(props.section, key)) !==
    JSON.stringify(read(props.publishedSection, key))
  )
}

// --- text / textarea --------------------------------------------------------

function textValue(key: string): string {
  const value = read(props.section, key)
  return typeof value === 'string' ? value : ''
}

// --- links ------------------------------------------------------------------

interface LinkDraft {
  label: string
  href: string
}

function linkValue(key: string, optional: boolean): LinkDraft | null {
  const value = read(props.section, key)
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
  const value = read(props.section, key)
  return typeof value === 'string' && value ? value : null
}

async function onUpload(file: File, key: string): Promise<void> {
  uploadingKey.value = key
  try {
    const res = await cms.uploadImage(file)
    emit('set', key, res.url)
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
  const value = read(props.section, key)
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
  emit('set', key, rows)
}

function addStat(key: string): void {
  emit('set', key, [...statsValue(key), { value: '', label: '' }])
}

function removeStat(key: string, index: number): void {
  emit('set', key, statsValue(key).filter((_, i) => i !== index))
}

// --- usp items --------------------------------------------------------------

interface UspRow {
  title: string
  description: string
}

function uspValue(key: string): UspRow[] {
  const value = read(props.section, key)
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
  emit('set', key, rows)
}

// --- generic string list ----------------------------------------------------

function listValue(key: string): string[] {
  const value = read(props.section, key)
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function updateListItem(key: string, index: number, value: string): void {
  const items = [...listValue(key)]
  items[index] = value
  emit('set', key, items)
}

function addListItem(key: string): void {
  emit('set', key, [...listValue(key), ''])
}

function removeListItem(key: string, index: number): void {
  emit('set', key, listValue(key).filter((_, i) => i !== index))
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
  emit('set', key, checked ? [...current, slug] : current.filter((item) => item !== slug))
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
            @click="emit('reset', field.key)"
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
          :maxlength="field.max"
          :aria-invalid="Boolean(fieldError(field.key))"
          :aria-describedby="fieldError(field.key) ? `e-${sectionId}-${field.key}` : undefined"
          @update:model-value="emit('set', field.key, $event)"
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
          :maxlength="field.max"
          :rows="3"
          :aria-invalid="Boolean(fieldError(field.key))"
          :aria-describedby="fieldError(field.key) ? `e-${sectionId}-${field.key}` : undefined"
          @update:model-value="emit('set', field.key, $event)"
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
            :maxlength="field.max"
            :placeholder="t('admin.content.fields.linkLabel')"
            @update:model-value="
              emit('set', field.key, {
                label: String($event),
                href: linkValue(field.key, false)?.href ?? '',
              })
            "
          />
          <Input
            :model-value="linkValue(field.key, false)?.href ?? ''"
            :disabled="!hydrated"
            dir="ltr"
            :placeholder="t('admin.content.fields.linkHref')"
            @update:model-value="
              emit('set', field.key, {
                label: linkValue(field.key, false)?.label ?? '',
                href: String($event),
              })
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
              :maxlength="field.max"
              :placeholder="t('admin.content.fields.linkLabel')"
              @update:model-value="
                emit('set', field.key, {
                  label: String($event),
                  href: linkValue(field.key, true)?.href ?? '',
                })
              "
            />
            <Input
              :model-value="linkValue(field.key, true)?.href ?? ''"
              :disabled="!hydrated"
              dir="ltr"
              :placeholder="t('admin.content.fields.linkHref')"
              @update:model-value="
                emit('set', field.key, {
                  label: linkValue(field.key, true)?.label ?? '',
                  href: String($event),
                })
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
              @click="emit('set', field.key, null)"
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
          @click="emit('set', field.key, { label: '', href: '' })"
        >
          <Plus class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.fields.addLink') }}</span>
        </Button>
      </template>

      <!-- image -->
      <template v-else-if="field.kind === 'image'">
        <div class="flex flex-wrap items-center gap-3">
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
            @click="emit('set', field.key, null)"
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
              maxlength="10"
              :placeholder="t('admin.content.fields.statValue')"
              @update:model-value="updateStat(field.key, index, 'value', String($event))"
            />
            <Input
              :model-value="row.label"
              :disabled="!hydrated"
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
              maxlength="30"
              :placeholder="t('admin.content.fields.uspTitle')"
              @update:model-value="updateUsp(field.key, index, 'title', String($event))"
            />
            <AdminFormTextarea
              :model-value="row.description"
              :disabled="!hydrated"
              :maxlength="field.max"
              :rows="2"
              :placeholder="t('admin.content.fields.uspDescription')"
              @update:model-value="updateUsp(field.key, index, 'description', String($event))"
            />
          </div>
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
        <div class="flex flex-col gap-2">
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
