<script setup lang="ts">
import type { AdminCategory, AdminGuide, GuidePatch } from '@serag/shared'
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseAdminApiError } from '~/utils/admin-api-errors'
import { isValidGuideSlug, slugifyGuideTitle } from '~/utils/guide-slug'

const props = defineProps<{
  guideId: string | null
}>()

const emit = defineEmits<{
  back: []
  created: [guide: AdminGuide]
  saved: [guide: AdminGuide]
  deleted: []
}>()

const AdminRichTextEditor = defineAsyncComponent(
  () => import('~/components/admin/rich-text/AdminRichTextEditor.vue'),
)

const MAX_TERMS = 4

interface SelectedTerm {
  id: string
  name: string
}

const { t } = useI18n()
const localePath = useLocalePath()
const guidesApi = useAdminGuides()
const categoriesApi = useAdminCategories()
const cms = useAdminCms()
const notify = useNotify()

const creating = computed(() => props.guideId === null)

const hydrated = ref(false)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const uploading = ref(false)
const fieldErrors = ref<Record<string, string>>({})

const guide = ref<AdminGuide | null>(null)

const slug = ref('')
const title = ref('')
const summary = ref('')
const cover = ref<string | null>(null)
const body = ref('')
const categories = ref<SelectedTerm[]>([])
const products = ref<SelectedTerm[]>([])
const seoTitle = ref('')
const seoDescription = ref('')
const published = ref(false)

const slugTouched = ref(false)
const initial = ref<string | null>(null)

const categoryOptions = ref<AdminCategory[]>([])
const selectedCategoryId = ref('')
const pickerOpen = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)

const slugInvalid = computed(() => slug.value.trim().length > 0 && !isValidGuideSlug(slug.value.trim()))
const titleRequired = computed(() => title.value.trim().length === 0)

function buildInput(): GuidePatch {
  return {
    slug: slug.value.trim(),
    title: title.value.trim(),
    summary: summary.value.trim(),
    cover: cover.value,
    body: body.value,
    categoryIds: categories.value.map((term) => term.id),
    productIds: products.value.map((term) => term.id),
    seoTitle: seoTitle.value.trim(),
    seoDescription: seoDescription.value.trim(),
    published: published.value,
  }
}

const snapshot = computed(() => JSON.stringify(buildInput()))
const changed = computed(() => snapshot.value !== initial.value)
const canSave = computed(
  () =>
    hydrated.value &&
    !saving.value &&
    !titleRequired.value &&
    !slugInvalid.value &&
    (creating.value || changed.value),
)

const snippetTitle = computed(
  () =>
    seoTitle.value.trim() ||
    title.value.trim() ||
    t('admin.content.guides.previewTitleFallback'),
)

const snippetDescription = computed(
  () =>
    seoDescription.value.trim() ||
    summary.value.trim() ||
    plainTextExcerpt(body.value, 160) ||
    t('admin.content.guides.previewDescriptionFallback'),
)

const viewHref = computed(() =>
  guide.value ? localePath(`/guides/${guide.value.slug}`) : '#',
)

const availableCategoryOptions = computed(() =>
  categoryOptions.value.filter(
    (option) => !categories.value.some((term) => term.id === option.id),
  ),
)

function applyGuide(data: AdminGuide): void {
  guide.value = data
  slug.value = data.slug
  title.value = data.title
  summary.value = data.summary ?? ''
  cover.value = data.cover
  body.value = data.body
  categories.value = data.categories.map((c) => ({ id: c.id, name: c.name }))
  products.value = data.products.map((p) => ({ id: p.id, name: p.name }))
  seoTitle.value = data.seoTitle ?? ''
  seoDescription.value = data.seoDescription ?? ''
  published.value = data.published
  slugTouched.value = true
  initial.value = JSON.stringify(buildInput())
  fieldErrors.value = {}
}

async function loadCategories(): Promise<void> {
  try {
    categoryOptions.value = await categoriesApi.list()
  } catch {
    categoryOptions.value = []
  }
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    if (props.guideId) {
      const data = await guidesApi.get(props.guideId)
      applyGuide(data)
    } else {
      initial.value = JSON.stringify(buildInput())
      slugTouched.value = false
    }
  } catch {
    loadError.value = t('admin.content.guides.editorLoadError')
  } finally {
    loading.value = false
  }
}

watch(title, (next) => {
  if (creating.value && !slugTouched.value) {
    slug.value = slugifyGuideTitle(next)
  }
})

/** Only typing in the slug field stops the title → slug auto-fill. */
function onSlugInput(): void {
  slugTouched.value = true
}

function addCategory(): void {
  const option = availableCategoryOptions.value.find((c) => c.id === selectedCategoryId.value)
  if (!option) return
  if (categories.value.length >= MAX_TERMS) {
    notify.warning(t('admin.content.guides.maxTerms'))
    return
  }
  categories.value = [...categories.value, { id: option.id, name: option.name }]
  selectedCategoryId.value = ''
}

function removeCategory(id: string): void {
  categories.value = categories.value.filter((term) => term.id !== id)
}

function onPickProduct(product: {
  id: string
  name: string
  modelCode: string
  price: number
  flagged: boolean
}): void {
  if (products.value.some((term) => term.id === product.id)) {
    notify.warning(t('admin.content.guides.duplicateProduct'))
    return
  }
  if (products.value.length >= MAX_TERMS) {
    notify.warning(t('admin.content.guides.maxTerms'))
    return
  }
  products.value = [...products.value, { id: product.id, name: product.name }]
}

function removeProduct(id: string): void {
  products.value = products.value.filter((term) => term.id !== id)
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  try {
    const res = await cms.uploadImage(file)
    cover.value = res.url
  } catch {
    notify.error(t('admin.content.errors.uploadFailed'))
  } finally {
    uploading.value = false
  }
}

async function uploadBodyImage(file: File): Promise<string> {
  const res = await cms.uploadImage(file)
  return res.url
}

async function save(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  fieldErrors.value = {}
  try {
    const input = buildInput()
    if (props.guideId) {
      const updated = await guidesApi.update(props.guideId, input)
      applyGuide(updated)
      emit('saved', updated)
      notify.success(t('admin.content.guides.savedToast'))
    } else {
      const created = await guidesApi.create(input)
      emit('created', created)
      notify.success(t('admin.content.guides.savedToast'))
    }
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    fieldErrors.value = parsed.fieldErrors
    if (Object.keys(parsed.fieldErrors).length === 0) {
      notify.error(t('admin.content.guides.saveError'), parsed.message)
    }
  } finally {
    saving.value = false
  }
}

async function executeDelete(): Promise<void> {
  if (!props.guideId) return
  deleting.value = true
  try {
    await guidesApi.remove(props.guideId)
    deleteOpen.value = false
    emit('deleted')
  } catch (err: unknown) {
    notify.error(parseAdminApiError(err, t).message)
  } finally {
    deleting.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
  }
}

onMounted(() => {
  hydrated.value = true
  window.addEventListener('keydown', onKeydown)
  void loadCategories()
  void load()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Button type="button" variant="outline" class="min-h-11" @click="emit('back')">
        <ArrowLeft class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        <span>{{ t('admin.content.guides.back') }}</span>
      </Button>

      <div class="flex flex-wrap items-center gap-2">
        <a
          v-if="guide"
          :href="viewHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ExternalLink class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.guides.viewGuide') }}</span>
        </a>
        <Button
          v-if="guide"
          type="button"
          variant="ghost"
          class="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
          :disabled="!hydrated || deleting"
          @click="deleteOpen = true"
        >
          <Trash2 class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.guides.delete') }}</span>
        </Button>
        <Button
          type="button"
          :disabled="!canSave"
          class="min-h-11 bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi"
          @click="save()"
        >
          <Loader2 v-if="saving" class="size-4 animate-spin" aria-hidden="true" />
          <Save v-else class="size-4" aria-hidden="true" />
          <span>{{ saving ? t('admin.content.guides.saving') : t('admin.content.guides.save') }}</span>
        </Button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-muted-foreground">
      {{ t('admin.content.guides.loading') }}
    </div>

    <div
      v-else-if="loadError"
      class="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 p-8 text-center"
    >
      <p class="text-sm font-semibold text-destructive">{{ loadError }}</p>
      <Button type="button" variant="outline" class="min-h-11" @click="load()">
        {{ t('common.retry') }}
      </Button>
    </div>

    <form v-else class="flex min-w-0 flex-col gap-5" @submit.prevent="save()">
      <div class="flex min-w-0 flex-col gap-1">
        <h2 class="font-display text-xl font-bold text-foreground">
          {{ creating ? t('admin.content.guides.editorCreateHeading') : t('admin.content.guides.editorHeading') }}
        </h2>
        <p class="num text-xs text-muted-foreground" dir="ltr">
          {{ t('admin.content.guides.snippetUrl', { slug: slug || '…' }) }}
        </p>
      </div>

      <FormField
        id="guide-title"
        :label="t('admin.content.guides.fieldTitle')"
        :error="fieldErrors.title || (titleRequired ? t('admin.content.guides.titleRequired') : undefined)"
      >
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="title"
            type="text"
            maxlength="120"
            :disabled="!hydrated || saving"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
            class="h-11 rounded-lg"
          />
        </template>
      </FormField>

      <FormField
        id="guide-slug"
        :label="t('admin.content.guides.fieldSlug')"
        :error="fieldErrors.slug || (slugInvalid ? t('admin.content.guides.slugInvalid') : undefined)"
      >
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="slug"
            type="text"
            maxlength="80"
            dir="ltr"
            :disabled="!hydrated || saving"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
            class="h-11 rounded-lg font-mono"
            @input="onSlugInput"
          />
        </template>
      </FormField>

      <FormField
        id="guide-summary"
        :label="t('admin.content.guides.fieldSummary')"
        :error="fieldErrors.summary"
      >
        <template #default="{ id, invalid, describedBy }">
          <div class="flex flex-col gap-1">
            <AdminFormTextarea
              :id="id"
              v-model="summary"
              :rows="2"
              maxlength="280"
              :disabled="!hydrated || saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            />
            <span class="num self-end text-[11px] text-muted-foreground">
              {{ t('admin.content.guides.counter', { count: summary.length, max: 280 }) }}
            </span>
          </div>
        </template>
      </FormField>

      <!-- Cover -->
      <div class="flex flex-col gap-2">
        <Label class="text-sm font-semibold">{{ t('admin.content.guides.fieldCover') }}</Label>
        <div class="flex flex-wrap items-center gap-3">
          <img
            v-if="cover"
            :src="cover"
            :alt="t('admin.content.guides.fieldCover')"
            class="h-20 w-32 rounded-xl border border-border object-cover"
          >
          <label
            class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-input px-4 text-sm font-bold text-foreground hover:bg-accent focus-within:ring-2 focus-within:ring-ring"
          >
            <Upload class="size-4" aria-hidden="true" />
            <span>
              {{
                uploading
                  ? t('admin.content.fields.uploading')
                  : t('admin.content.fields.upload')
              }}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              :disabled="!hydrated || uploading"
              @change="onFileChange"
            >
          </label>
          <button
            v-if="cover"
            type="button"
            class="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-destructive hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="cover = null"
          >
            <Trash2 class="size-3.5" aria-hidden="true" />
            <span>{{ t('admin.content.fields.removeImage') }}</span>
          </button>
        </div>
        <p v-if="fieldErrors.cover" class="text-xs font-medium text-destructive">
          {{ fieldErrors.cover }}
        </p>
      </div>

      <!-- Body -->
      <div class="flex flex-col gap-2">
        <Label class="text-sm font-semibold">{{ t('admin.content.guides.fieldBody') }}</Label>
        <AdminRichTextEditor
          v-model="body"
          allow-images
          :label="t('admin.content.guides.fieldBody')"
          :on-upload-image="uploadBodyImage"
        />
        <p v-if="fieldErrors.body" class="text-xs font-medium text-destructive">
          {{ fieldErrors.body }}
        </p>
      </div>

      <!-- Categories -->
      <div class="flex flex-col gap-2">
        <Label for="guide-category" class="text-sm font-semibold">
          {{ t('admin.content.guides.fieldCategories') }}
        </Label>
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <AdminFormSelect
              id="guide-category"
              :model-value="selectedCategoryId"
              :disabled="!hydrated || saving || availableCategoryOptions.length === 0"
              @update:model-value="selectedCategoryId = String($event)"
            >
              <option value="">{{ t('admin.content.guides.pickCategory') }}</option>
              <option v-for="option in availableCategoryOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </AdminFormSelect>
          </div>
          <Button
            type="button"
            variant="outline"
            class="min-h-10 shrink-0 gap-1"
            :disabled="!hydrated || saving || !selectedCategoryId"
            @click="addCategory"
          >
            <Plus class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.guides.addCategory') }}</span>
          </Button>
        </div>
        <ul v-if="categories.length" class="flex flex-wrap gap-2">
          <li
            v-for="term in categories"
            :key="term.id"
            class="inline-flex items-center gap-2 rounded-full bg-serag-green/10 px-3 py-1 text-xs font-bold text-serag-green"
          >
            <span>{{ term.name }}</span>
            <button
              type="button"
              :disabled="!hydrated || saving"
              :aria-label="t('admin.content.guides.removeTerm', { name: term.name })"
              class="inline-flex size-5 items-center justify-center rounded-full hover:bg-serag-green/20 disabled:opacity-50"
              @click="removeCategory(term.id)"
            >
              <X class="size-3.5" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <p v-if="fieldErrors.categoryIds" class="text-xs font-medium text-destructive">
          {{ fieldErrors.categoryIds }}
        </p>
      </div>

      <!-- Products -->
      <div class="flex flex-col gap-2">
        <Label class="text-sm font-semibold">{{ t('admin.content.guides.fieldProducts') }}</Label>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            class="min-h-10 gap-1"
            :disabled="!hydrated || saving || products.length >= MAX_TERMS"
            @click="pickerOpen = true"
          >
            <Plus class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.guides.addProduct') }}</span>
          </Button>
        </div>
        <ul v-if="products.length" class="flex flex-wrap gap-2">
          <li
            v-for="term in products"
            :key="term.id"
            class="inline-flex items-center gap-2 rounded-full bg-serag-night/10 px-3 py-1 text-xs font-bold text-serag-night dark:bg-serag-gold/15 dark:text-serag-gold"
          >
            <span class="max-w-[14rem] truncate">{{ term.name }}</span>
            <button
              type="button"
              :disabled="!hydrated || saving"
              :aria-label="t('admin.content.guides.removeTerm', { name: term.name })"
              class="inline-flex size-5 items-center justify-center rounded-full hover:bg-serag-night/15 disabled:opacity-50"
              @click="removeProduct(term.id)"
            >
              <X class="size-3.5" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <p v-if="fieldErrors.productIds" class="text-xs font-medium text-destructive">
          {{ fieldErrors.productIds }}
        </p>
      </div>

      <!-- SEO -->
      <FormField
        id="guide-seo-title"
        :label="t('admin.content.guides.fieldSeoTitle')"
        :error="fieldErrors.seoTitle"
      >
        <template #default="{ id, invalid, describedBy }">
          <div class="flex flex-col gap-1">
            <Input
              :id="id"
              v-model="seoTitle"
              type="text"
              maxlength="70"
              :disabled="!hydrated || saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-11 rounded-lg"
            />
            <span class="num self-end text-[11px] text-muted-foreground">
              {{ t('admin.content.guides.counter', { count: seoTitle.length, max: 70 }) }}
            </span>
          </div>
        </template>
      </FormField>

      <FormField
        id="guide-seo-description"
        :label="t('admin.content.guides.fieldSeoDescription')"
        :error="fieldErrors.seoDescription"
      >
        <template #default="{ id, invalid, describedBy }">
          <div class="flex flex-col gap-1">
            <AdminFormTextarea
              :id="id"
              v-model="seoDescription"
              :rows="3"
              maxlength="160"
              :disabled="!hydrated || saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            />
            <span class="num self-end text-[11px] text-muted-foreground">
              {{ t('admin.content.guides.counter', { count: seoDescription.length, max: 160 }) }}
            </span>
          </div>
        </template>
      </FormField>

      <!-- Snippet preview -->
      <div class="rounded-2xl border border-border bg-muted/30 p-4">
        <p class="mb-2 text-xs font-bold text-muted-foreground">
          {{ t('admin.content.guides.snippetLabel') }}
        </p>
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="num truncate text-xs text-emerald-700 dark:text-emerald-400">
            {{ t('admin.content.guides.snippetUrl', { slug: slug || '' }) }}
          </span>
          <span class="line-clamp-2 text-base font-medium text-serag-green dark:text-serag-gold">
            {{ snippetTitle }}
          </span>
          <p class="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {{ snippetDescription }}
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
        <Label for="guide-published" class="text-sm font-semibold">
          {{ t('admin.content.guides.fieldPublished') }}
        </Label>
        <AdminFormSwitch
          id="guide-published"
          v-model="published"
          :disabled="!hydrated || saving"
          :aria-label="t('admin.content.guides.fieldPublished')"
        />
      </div>
    </form>

    <AdminProductPicker
      v-model:open="pickerOpen"
      :title="t('admin.content.guides.productPickerTitle')"
      @select="onPickProduct"
    />

    <Dialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ t('admin.content.guides.confirmDeleteTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-foreground">
            {{ t('admin.content.guides.confirmDelete') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            :disabled="deleting"
            class="min-h-11 sm:min-h-9"
            @click="deleteOpen = false"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="deleting"
            class="min-h-11 font-bold sm:min-h-9"
            @click="executeDelete"
          >
            <Loader2 v-if="deleting" class="me-1.5 size-4 animate-spin" aria-hidden="true" />
            <span>{{ t('common.delete') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
