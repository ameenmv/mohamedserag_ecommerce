<script setup lang="ts">
import type { AdminCategory, AdminSpecTemplate, CreateCategoryInput, UpdateCategoryInput } from '@serag/shared'
import { createCategorySchema, updateCategorySchema } from '@serag/shared'
import { Loader2 } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const props = defineProps<{
  open: boolean
  category: AdminCategory | null // null for new
  categories: AdminCategory[]
  specTemplates: AdminSpecTemplate[]
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  saved: []
}>()

const { t, localeProperties } = useI18n()
const side = computed<'right' | 'left'>(() => (localeProperties.value.dir === 'ltr' ? 'right' : 'left'))
const categoriesApi = useAdminCategories()
const notify = useNotify()

const isEdit = computed(() => Boolean(props.category?.id))
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const serverError = ref('')

const form = reactive({
  name: '',
  slug: '',
  parentId: '',
  specTemplateId: '',
  intro: '',
  seoTitle: '',
  seoDescription: '',
  visible: true,
  translations: {
    en: {
      name: '',
      intro: '',
      seoTitle: '',
      seoDescription: '',
    },
  },
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      errors.value = {}
      serverError.value = ''
      if (props.category) {
        form.name = props.category.name
        form.slug = props.category.slug
        form.parentId = props.category.parentId ?? ''
        form.specTemplateId = props.category.specTemplateId ?? ''
        form.intro = props.category.intro ?? ''
        form.seoTitle = props.category.seoTitle ?? ''
        form.seoDescription = props.category.seoDescription ?? ''
        form.visible = props.category.visible
        const en = props.category.translations?.en
        form.translations.en.name = en?.name ?? ''
        form.translations.en.intro = en?.intro ?? ''
        form.translations.en.seoTitle = en?.seoTitle ?? ''
        form.translations.en.seoDescription = en?.seoDescription ?? ''
      } else {
        form.name = ''
        form.slug = ''
        form.parentId = ''
        form.specTemplateId = ''
        form.intro = ''
        form.seoTitle = ''
        form.seoDescription = ''
        form.visible = true
        form.translations.en.name = ''
        form.translations.en.intro = ''
        form.translations.en.seoTitle = ''
        form.translations.en.seoDescription = ''
      }
    }
  },
  { immediate: true },
)

// Exclude self when picking parent
const candidateParents = computed(() =>
  props.categories.filter((c) => !props.category || c.id !== props.category.id),
)

async function handleSubmit() {
  errors.value = {}
  serverError.value = ''

  const payload: CreateCategoryInput = {
    name: form.name.trim(),
    slug: form.slug.trim(),
    parentId: form.parentId ? form.parentId : null,
    specTemplateId: form.specTemplateId ? form.specTemplateId : null,
    intro: form.intro.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    visible: form.visible,
    translations: {
      en: {
        name: form.translations.en.name.trim() || undefined,
        intro: form.translations.en.intro.trim() || undefined,
        seoTitle: form.translations.en.seoTitle.trim() || undefined,
        seoDescription: form.translations.en.seoDescription.trim() || undefined,
      },
    },
  }

  const schema = isEdit.value ? updateCategorySchema : createCategorySchema
  const parseResult = schema.safeParse(payload)
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      const key = issue.path.join('.') || 'name'
      errors.value[key] = issue.message
    }
    return
  }

  saving.value = true
  try {
    if (isEdit.value && props.category) {
      await categoriesApi.update(props.category.id, payload as UpdateCategoryInput)
      notify.success(t('admin.catalog.categories.updated'))
    } else {
      await categoriesApi.create(payload as CreateCategoryInput)
      notify.success(t('admin.catalog.categories.created'))
    }
    emit('update:open', false)
    emit('saved')
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    serverError.value = parsed.message
    if (parsed.fieldErrors) {
      Object.assign(errors.value, parsed.fieldErrors)
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      :side="side"
      class="w-full max-w-lg overflow-y-auto p-6 sm:max-w-lg"
    >
      <SheetHeader class="text-start pb-4">
        <SheetTitle class="font-display text-2xl text-primary">
          {{ isEdit ? t('admin.catalog.categories.edit') : t('admin.catalog.categories.new') }}
        </SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          {{ isEdit ? props.category?.name : '' }}
        </SheetDescription>
      </SheetHeader>

      <form class="flex flex-col gap-4 py-2" @submit.prevent="handleSubmit">
        <div v-if="serverError" class="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          {{ serverError }}
        </div>

        <FormField
          id="cat-name"
          :label="t('admin.catalog.categories.name')"
          :error="errors.name"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.name"
              type="text"
              :disabled="saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg"
            />
          </template>
        </FormField>

        <FormField
          id="cat-slug"
          :label="t('admin.catalog.categories.slug')"
          :error="errors.slug"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.slug"
              type="text"
              dir="ltr"
              :disabled="saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg font-mono text-start"
            />
          </template>
        </FormField>

        <FormField
          id="cat-parent"
          :label="t('admin.catalog.categories.parent')"
          :error="errors.parentId"
        >
          <template #default="{ id, invalid, describedBy }">
            <AdminFormSelect
              :id="id"
              v-model="form.parentId"
              :disabled="saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            >
              <option value="">
                {{ t('admin.catalog.categories.noParent') }}
              </option>
              <option v-for="c in candidateParents" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </AdminFormSelect>
          </template>
        </FormField>

        <FormField
          id="cat-spec-template"
          :label="t('admin.catalog.categories.specTemplate')"
          :error="errors.specTemplateId"
        >
          <template #default="{ id, invalid, describedBy }">
            <AdminFormSelect
              :id="id"
              v-model="form.specTemplateId"
              :disabled="saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            >
              <option value="">
                {{ t('admin.catalog.categories.noSpecTemplate') }}
              </option>
              <option v-for="tpl in specTemplates" :key="tpl.id" :value="tpl.id">
                {{ tpl.name }}
              </option>
            </AdminFormSelect>
          </template>
        </FormField>

        <FormField
          id="cat-intro"
          :label="t('admin.catalog.categories.intro')"
          :error="errors.intro"
        >
          <template #default="{ id, invalid, describedBy }">
            <AdminFormTextarea
              :id="id"
              v-model="form.intro"
              :rows="2"
              :disabled="saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            />
          </template>
        </FormField>

        <FormField
          id="cat-seo-title"
          :label="t('admin.catalog.categories.seoTitle')"
          :error="errors.seoTitle"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.seoTitle"
              type="text"
              :disabled="saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg"
            />
          </template>
        </FormField>

        <FormField
          id="cat-seo-desc"
          :label="t('admin.catalog.categories.seoDescription')"
          :error="errors.seoDescription"
        >
          <template #default="{ id, invalid, describedBy }">
            <AdminFormTextarea
              :id="id"
              v-model="form.seoDescription"
              :rows="2"
              :disabled="saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            />
          </template>
        </FormField>

        <!-- English (for the /en site) Section -->
        <div class="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
          <div class="flex flex-col gap-0.5">
            <h3 class="text-sm font-bold text-foreground">
              {{ t('admin.catalog.english.sectionTitle') }}
            </h3>
            <p class="text-xs text-muted-foreground">
              {{ t('admin.catalog.english.sectionHint') }}
            </p>
          </div>

          <FormField
            id="cat-name-en"
            :label="t('admin.catalog.english.name')"
            :error="errors['translations.en.name']"
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="form.translations.en.name"
                type="text"
                dir="ltr"
                lang="en"
                :placeholder="t('admin.catalog.english.namePlaceholder')"
                :disabled="saving"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-10 rounded-lg text-start"
              />
            </template>
          </FormField>

          <FormField
            id="cat-intro-en"
            :label="t('admin.catalog.english.intro')"
            :error="errors['translations.en.intro']"
          >
            <template #default="{ id, invalid, describedBy }">
              <AdminFormTextarea
                :id="id"
                v-model="form.translations.en.intro"
                :rows="2"
                dir="ltr"
                lang="en"
                :placeholder="t('admin.catalog.english.introPlaceholder')"
                :disabled="saving"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="text-start"
              />
            </template>
          </FormField>

          <FormField
            id="cat-seo-title-en"
            :label="t('admin.catalog.english.seoTitle')"
            :error="errors['translations.en.seoTitle']"
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="form.translations.en.seoTitle"
                type="text"
                dir="ltr"
                lang="en"
                :disabled="saving"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-10 rounded-lg text-start"
              />
            </template>
          </FormField>

          <FormField
            id="cat-seo-desc-en"
            :label="t('admin.catalog.english.seoDescription')"
            :error="errors['translations.en.seoDescription']"
          >
            <template #default="{ id, invalid, describedBy }">
              <AdminFormTextarea
                :id="id"
                v-model="form.translations.en.seoDescription"
                :rows="2"
                dir="ltr"
                lang="en"
                :disabled="saving"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="text-start"
              />
            </template>
          </FormField>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-border p-3 mt-1">
          <span class="text-sm font-semibold">{{ t('admin.catalog.categories.visible') }}</span>
          <AdminFormSwitch v-model="form.visible" :disabled="saving" />
        </div>

        <SheetFooter class="pt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            :disabled="saving"
            @click="emit('update:open', false)"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="submit"
            class="bg-serag-gold text-serag-ink font-bold hover:bg-serag-gold-hi"
            :disabled="saving"
          >
            <Loader2 v-if="saving" class="size-4 animate-spin me-1.5" aria-hidden="true" />
            <span>{{ isEdit ? t('common.save') : t('common.create') }}</span>
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
