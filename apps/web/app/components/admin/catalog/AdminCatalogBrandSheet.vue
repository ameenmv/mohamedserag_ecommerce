<script setup lang="ts">
import type { AdminBrand, CreateBrandInput, UpdateBrandInput } from '@serag/shared'
import { createBrandSchema, updateBrandSchema } from '@serag/shared'
import { ImagePlus, Loader2 } from '@lucide/vue'
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
  brand: AdminBrand | null // null for new
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  saved: []
}>()

const { t, localeProperties } = useI18n()
const side = computed<'right' | 'left'>(() => (localeProperties.value.dir === 'ltr' ? 'right' : 'left'))
const brandsApi = useAdminBrands()
const notify = useNotify()

const isEdit = computed(() => Boolean(props.brand?.id))
const saving = ref(false)
const uploadingLogo = ref(false)
const errors = ref<Record<string, string>>({})
const serverError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  name: '',
  slug: '',
  logoUrl: '' as string | null,
  intro: '',
  seoTitle: '',
  seoDescription: '',
  visible: true,
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      errors.value = {}
      serverError.value = ''
      if (props.brand) {
        form.name = props.brand.name
        form.slug = props.brand.slug
        form.logoUrl = props.brand.logoUrl ?? null
        form.intro = props.brand.intro ?? ''
        form.seoTitle = props.brand.seoTitle ?? ''
        form.seoDescription = props.brand.seoDescription ?? ''
        form.visible = props.brand.visible
      } else {
        form.name = ''
        form.slug = ''
        form.logoUrl = null
        form.intro = ''
        form.seoTitle = ''
        form.seoDescription = ''
        form.visible = true
      }
    }
  },
  { immediate: true },
)

async function handleLogoUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    notify.error(t('admin.catalog.brands.logoSizeError'))
    return
  }

  if (isEdit.value && props.brand) {
    uploadingLogo.value = true
    try {
      const updated = await brandsApi.uploadLogo(props.brand.id, file)
      form.logoUrl = updated.logoUrl
      notify.success(t('admin.catalog.brands.logoUploaded'))
    } catch (err) {
      notify.error(parseAdminApiError(err, t).message)
    } finally {
      uploadingLogo.value = false
    }
  }
}

async function handleSubmit() {
  errors.value = {}
  serverError.value = ''

  const payload = {
    name: form.name.trim(),
    slug: form.slug.trim(),
    logoUrl: form.logoUrl ? form.logoUrl.trim() : null,
    intro: form.intro.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    visible: form.visible,
  }

  const schema = isEdit.value ? updateBrandSchema : createBrandSchema
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
    if (isEdit.value && props.brand) {
      await brandsApi.update(props.brand.id, payload as UpdateBrandInput)
      notify.success(t('admin.catalog.brands.updated'))
    } else {
      const created = await brandsApi.create(payload as CreateBrandInput)
      // If logo file was queued on creation
      const file = fileInput.value?.files?.[0]
      if (file) {
        try {
          await brandsApi.uploadLogo(created.id, file)
        } catch {
          // logo failure after creation is non-fatal
        }
      }
      notify.success(t('admin.catalog.brands.created'))
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
          {{ isEdit ? t('admin.catalog.brands.edit') : t('admin.catalog.brands.new') }}
        </SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          {{ isEdit ? props.brand?.name : '' }}
        </SheetDescription>
      </SheetHeader>

      <form class="flex flex-col gap-4 py-2" @submit.prevent="handleSubmit">
        <div v-if="serverError" class="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          {{ serverError }}
        </div>

        <FormField
          id="brand-name"
          :label="t('admin.catalog.brands.name')"
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
          id="brand-slug"
          :label="t('admin.catalog.brands.slug')"
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

        <!-- Logo Upload -->
        <div class="flex flex-col gap-1.5">
          <Label class="text-sm font-semibold">
            {{ t('admin.catalog.brands.logo') }}
          </Label>
          <div class="flex items-center gap-3">
            <div
              class="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-serag-ivory/60 p-1 dark:bg-muted/30"
            >
              <img
                v-if="form.logoUrl"
                :src="form.logoUrl"
                :alt="form.name"
                class="size-full object-contain"
              >
              <ImagePlus v-else class="size-6 text-muted-foreground/40" aria-hidden="true" />
            </div>

            <div class="flex flex-col gap-1">
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                class="sr-only"
                @change="handleLogoUpload"
              >
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="saving || uploadingLogo"
                class="rounded-lg text-xs"
                @click="fileInput?.click()"
              >
                <Loader2 v-if="uploadingLogo" class="size-3.5 animate-spin me-1" aria-hidden="true" />
                <span>{{ t('admin.catalog.brands.uploadLogo') }}</span>
              </Button>
              <span class="text-[11px] text-muted-foreground">
                {{ t('admin.catalog.brands.logoHint') }}
              </span>
            </div>
          </div>
        </div>

        <FormField
          id="brand-intro"
          :label="t('admin.catalog.brands.intro')"
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
          id="brand-seo-title"
          :label="t('admin.catalog.brands.seoTitle')"
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
          id="brand-seo-desc"
          :label="t('admin.catalog.brands.seoDescription')"
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

        <div class="flex items-center justify-between rounded-xl border border-border p-3 mt-1">
          <span class="text-sm font-semibold">{{ t('admin.catalog.brands.visible') }}</span>
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
