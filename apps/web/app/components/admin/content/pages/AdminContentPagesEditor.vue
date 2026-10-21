<script setup lang="ts">
import type { AdminPage } from '@serag/shared'
import { ArrowLeft, ExternalLink, Loader2, Save } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const props = defineProps<{
  pageId: string
}>()

const emit = defineEmits<{
  back: []
  saved: [page: AdminPage]
}>()

const AdminRichTextEditor = defineAsyncComponent(
  () => import('~/components/admin/rich-text/AdminRichTextEditor.vue'),
)

const { t } = useI18n()
const localePath = useLocalePath()
const pagesApi = useAdminPages()
const notify = useNotify()

const hydrated = ref(false)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const fieldErrors = ref<Record<string, string>>({})

const page = ref<AdminPage | null>(null)
const title = ref('')
const body = ref('')
const seoTitle = ref('')
const seoDescription = ref('')
const published = ref(false)

const initial = ref<{
  title: string
  body: string
  seoTitle: string
  seoDescription: string
  published: boolean
} | null>(null)

const changed = computed(() => {
  const start = initial.value
  if (!start) return false
  return (
    title.value !== start.title ||
    body.value !== start.body ||
    seoTitle.value !== start.seoTitle ||
    seoDescription.value !== start.seoDescription ||
    published.value !== start.published
  )
})

const canSave = computed(() => hydrated.value && !saving.value && changed.value)

const snippetTitle = computed(
  () =>
    seoTitle.value.trim() ||
    title.value.trim() ||
    t('admin.content.pages.previewTitleFallback'),
)

const snippetDescription = computed(
  () =>
    seoDescription.value.trim() ||
    plainTextExcerpt(body.value, 160) ||
    t('admin.content.pages.previewDescriptionFallback'),
)

const viewHref = computed(() =>
  page.value ? localePath(`/pages/${page.value.slug}`) : '#',
)

function applyPage(data: AdminPage): void {
  const values = {
    title: data.title,
    body: data.body,
    seoTitle: data.seoTitle ?? '',
    seoDescription: data.seoDescription ?? '',
    published: data.published,
  }

  page.value = data
  title.value = values.title
  body.value = values.body
  seoTitle.value = values.seoTitle
  seoDescription.value = values.seoDescription
  published.value = values.published
  initial.value = { ...values }
  fieldErrors.value = {}
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const data = await pagesApi.get(props.pageId)
    applyPage(data)
  } catch {
    loadError.value = t('admin.content.pages.editorLoadError')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!canSave.value) return

  saving.value = true
  fieldErrors.value = {}
  try {
    const updated = await pagesApi.update(props.pageId, {
      title: title.value.trim(),
      body: body.value,
      seoTitle: seoTitle.value.trim(),
      seoDescription: seoDescription.value.trim(),
      published: published.value,
    })
    applyPage(updated)
    emit('saved', updated)
    notify.success(t('admin.content.pages.savedToast'))
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    fieldErrors.value = parsed.fieldErrors
    if (Object.keys(parsed.fieldErrors).length === 0) {
      notify.error(t('admin.content.pages.saveError'), parsed.message)
    }
  } finally {
    saving.value = false
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
        <span>{{ t('admin.content.pages.back') }}</span>
      </Button>

      <div class="flex flex-wrap items-center gap-2">
        <a
          v-if="page"
          :href="viewHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ExternalLink class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.pages.viewPage') }}</span>
        </a>
        <Button
          type="button"
          :disabled="!canSave"
          class="min-h-11 bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi"
          @click="save()"
        >
          <Loader2 v-if="saving" class="size-4 animate-spin" aria-hidden="true" />
          <Save v-else class="size-4" aria-hidden="true" />
          <span>{{ saving ? t('admin.content.pages.saving') : t('admin.content.pages.save') }}</span>
        </Button>
      </div>
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center py-20 text-sm text-muted-foreground"
    >
      {{ t('admin.content.pages.loading') }}
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
      <div v-if="page" class="flex min-w-0 flex-col gap-1">
        <h2 class="font-display text-xl font-bold text-foreground">
          {{ t('admin.content.pages.editorHeading') }}
        </h2>
        <p class="num text-xs text-muted-foreground" dir="ltr">
          {{ t('admin.content.pages.snippetUrl', { slug: page.slug }) }}
        </p>
      </div>

      <FormField
        id="page-title"
        :label="t('admin.content.pages.fieldTitle')"
        :error="fieldErrors.title"
      >
        <template #default="{ id, invalid, describedBy }">
          <div class="flex flex-col gap-1">
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
            <span class="num self-end text-[11px] text-muted-foreground">
              {{ t('admin.content.pages.counter', { count: title.length, max: 120 }) }}
            </span>
          </div>
        </template>
      </FormField>

      <div class="flex flex-col gap-2">
        <Label class="text-sm font-semibold">
          {{ t('admin.content.pages.fieldBody') }}
        </Label>
        <AdminRichTextEditor
          v-model="body"
          :allow-images="false"
          :label="t('admin.content.pages.fieldBody')"
        />
        <p v-if="fieldErrors.body" class="text-xs font-medium text-destructive">
          {{ fieldErrors.body }}
        </p>
      </div>

      <FormField
        id="page-seo-title"
        :label="t('admin.content.pages.fieldSeoTitle')"
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
              {{ t('admin.content.pages.counter', { count: seoTitle.length, max: 70 }) }}
            </span>
          </div>
        </template>
      </FormField>

      <FormField
        id="page-seo-description"
        :label="t('admin.content.pages.fieldSeoDescription')"
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
              {{ t('admin.content.pages.counter', { count: seoDescription.length, max: 160 }) }}
            </span>
          </div>
        </template>
      </FormField>

      <div class="rounded-2xl border border-border bg-muted/30 p-4">
        <p class="mb-2 text-xs font-bold text-muted-foreground">
          {{ t('admin.content.pages.snippetLabel') }}
        </p>
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="num truncate text-xs text-emerald-700 dark:text-emerald-400">
            {{ t('admin.content.pages.snippetUrl', { slug: page?.slug ?? '' }) }}
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
        <Label for="page-published" class="text-sm font-semibold">
          {{ t('admin.content.pages.fieldPublished') }}
        </Label>
        <AdminFormSwitch
          id="page-published"
          v-model="published"
          :disabled="!hydrated || saving"
          :aria-label="t('admin.content.pages.fieldPublished')"
        />
      </div>
    </form>
  </div>
</template>
