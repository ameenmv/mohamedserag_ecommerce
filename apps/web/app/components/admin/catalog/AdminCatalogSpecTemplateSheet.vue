<script setup lang="ts">
import type { AdminSpecFieldType, AdminSpecTemplate, CreateSpecTemplateInput, UpdateSpecTemplateInput } from '@serag/shared'
import { createSpecTemplateSchema, updateSpecTemplateSchema } from '@serag/shared'
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Trash2,
} from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { parseAdminApiError } from '~/utils/admin-api-errors'

interface EditableFieldRow {
  key: string
  label: string
  type: AdminSpecFieldType
  unit: string
  optionsRaw: string
  filterable: boolean
  comparable: boolean
}

const props = defineProps<{
  open: boolean
  template: AdminSpecTemplate | null // null for new
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  saved: []
}>()

const { t, localeProperties } = useI18n()
const side = computed<'right' | 'left'>(() => (localeProperties.value.dir === 'ltr' ? 'right' : 'left'))
const templatesApi = useAdminSpecTemplates()
const notify = useNotify()

const isEdit = computed(() => Boolean(props.template?.id))
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const serverError = ref('')

const formName = ref('')
const formFields = ref<EditableFieldRow[]>([])

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      errors.value = {}
      serverError.value = ''
      if (props.template) {
        formName.value = props.template.name
        formFields.value = props.template.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          unit: f.unit ?? '',
          optionsRaw: f.options ? f.options.join(', ') : '',
          filterable: f.filterable,
          comparable: f.comparable,
        }))
      } else {
        formName.value = ''
        formFields.value = []
      }
    }
  },
  { immediate: true },
)

function addFieldRow() {
  formFields.value.push({
    key: '',
    label: '',
    type: 'text',
    unit: '',
    optionsRaw: '',
    filterable: false,
    comparable: false,
  })
}

function removeFieldRow(index: number) {
  formFields.value.splice(index, 1)
}

function moveFieldRow(index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= formFields.value.length) return
  const [removed] = formFields.value.splice(index, 1)
  if (!removed) return
  formFields.value.splice(targetIndex, 0, removed)
}

async function handleSubmit() {
  errors.value = {}
  serverError.value = ''

  const mappedFields = formFields.value.map((f) => {
    const options =
      f.type === 'choice'
        ? f.optionsRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null

    return {
      key: f.key.trim().toLowerCase(),
      label: f.label.trim(),
      type: f.type,
      unit: f.unit.trim() || null,
      options,
      filterable: f.filterable,
      comparable: f.comparable,
    }
  })

  const payload = {
    name: formName.value.trim(),
    fields: mappedFields,
  }

  const schema = isEdit.value ? updateSpecTemplateSchema : createSpecTemplateSchema
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
    if (isEdit.value && props.template) {
      await templatesApi.update(props.template.id, payload as UpdateSpecTemplateInput)
      notify.success(t('admin.catalog.specTemplates.updated'))
    } else {
      await templatesApi.create(payload as CreateSpecTemplateInput)
      notify.success(t('admin.catalog.specTemplates.created'))
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
      class="w-full max-w-2xl overflow-y-auto p-6 sm:max-w-2xl"
    >
      <SheetHeader class="text-start pb-4">
        <SheetTitle class="font-display text-2xl text-primary">
          {{ isEdit ? t('admin.catalog.specTemplates.edit') : t('admin.catalog.specTemplates.new') }}
        </SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          {{ isEdit ? props.template?.name : '' }}
        </SheetDescription>
      </SheetHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSubmit">
        <div v-if="serverError" class="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          {{ serverError }}
        </div>

        <FormField
          id="template-name"
          :label="t('admin.catalog.specTemplates.name')"
          :error="errors.name"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="formName"
              type="text"
              :disabled="saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg"
            />
          </template>
        </FormField>

        <!-- Fields List -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-border pb-2">
            <span class="text-sm font-bold text-foreground">
              {{ t('admin.catalog.specTemplates.fields') }} ({{ formFields.length }})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="saving"
              class="gap-1 rounded-lg text-xs font-semibold"
              @click="addFieldRow"
            >
              <Plus class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.catalog.specTemplates.addField') }}</span>
            </Button>
          </div>

          <div v-if="formFields.length === 0" class="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            {{ t('admin.catalog.specTemplates.emptyHint') }}
          </div>

          <div v-else class="flex flex-col gap-3">
            <div
              v-for="(row, idx) in formFields"
              :key="idx"
              class="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3.5 shadow-2xs"
            >
              <!-- Row header: Key & Label & Type -->
              <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-semibold text-muted-foreground">
                    {{ t('admin.catalog.specTemplates.key') }}
                  </label>
                  <Input
                    v-model="row.key"
                    type="text"
                    dir="ltr"
                    :placeholder="t('admin.catalog.specTemplates.keyPlaceholder')"
                    :disabled="saving"
                    class="h-9 font-mono text-xs text-start"
                  />
                  <span v-if="errors[`fields.${idx}.key`]" class="text-[11px] text-destructive">
                    {{ errors[`fields.${idx}.key`] }}
                  </span>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-semibold text-muted-foreground">
                    {{ t('admin.catalog.specTemplates.label') }}
                  </label>
                  <Input
                    v-model="row.label"
                    type="text"
                    :placeholder="t('admin.catalog.specTemplates.labelPlaceholder')"
                    :disabled="saving"
                    class="h-9 text-xs"
                  />
                  <span v-if="errors[`fields.${idx}.label`]" class="text-[11px] text-destructive">
                    {{ errors[`fields.${idx}.label`] }}
                  </span>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-semibold text-muted-foreground">
                    {{ t('admin.catalog.specTemplates.type') }}
                  </label>
                  <AdminFormSelect
                    v-model="row.type"
                    :disabled="saving"
                    class="h-9 text-xs"
                  >
                    <option value="text">{{ t('admin.catalog.specTemplates.types.text') }}</option>
                    <option value="number">{{ t('admin.catalog.specTemplates.types.number') }}</option>
                    <option value="boolean">{{ t('admin.catalog.specTemplates.types.boolean') }}</option>
                    <option value="choice">{{ t('admin.catalog.specTemplates.types.choice') }}</option>
                  </AdminFormSelect>
                </div>
              </div>

              <!-- Row secondary: Unit (if number) or Options (if choice) -->
              <div v-if="row.type === 'number'" class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-muted-foreground">
                  {{ t('admin.catalog.specTemplates.unit') }}
                </label>
                <Input
                  v-model="row.unit"
                  type="text"
                  :placeholder="t('admin.catalog.specTemplates.unitPlaceholder')"
                  :disabled="saving"
                  class="h-9 text-xs max-w-xs"
                />
              </div>

              <div v-else-if="row.type === 'choice'" class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-muted-foreground">
                  {{ t('admin.catalog.specTemplates.options') }}
                </label>
                <Input
                  v-model="row.optionsRaw"
                  type="text"
                  :placeholder="t('admin.catalog.specTemplates.optionsPlaceholder')"
                  :disabled="saving"
                  class="h-9 text-xs"
                />
                <span v-if="errors[`fields.${idx}.options`]" class="text-[11px] text-destructive">
                  {{ errors[`fields.${idx}.options`] }}
                </span>
              </div>

              <!-- Row footer: filterable, comparable, move, remove -->
              <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs">
                <div class="flex items-center gap-4">
                  <AdminFormCheckbox
                    :id="`filter-${idx}`"
                    v-model="row.filterable"
                    :disabled="saving"
                    :label="t('admin.catalog.specTemplates.filterable')"
                    class="text-xs"
                  />
                  <AdminFormCheckbox
                    :id="`compare-${idx}`"
                    v-model="row.comparable"
                    :disabled="saving"
                    :label="t('admin.catalog.specTemplates.comparable')"
                    class="text-xs"
                  />
                </div>

                <div class="flex items-center gap-1 ms-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    :disabled="saving || idx === 0"
                    class="size-7 rounded-md"
                    :aria-label="t('admin.catalog.specTemplates.moveUpN', { n: idx + 1 })"
                    @click="moveFieldRow(idx, 'up')"
                  >
                    <ArrowUp class="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    :disabled="saving || idx === formFields.length - 1"
                    class="size-7 rounded-md"
                    :aria-label="t('admin.catalog.specTemplates.moveDownN', { n: idx + 1 })"
                    @click="moveFieldRow(idx, 'down')"
                  >
                    <ArrowDown class="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    :disabled="saving"
                    class="size-7 rounded-md text-destructive hover:bg-destructive/10"
                    :aria-label="t('admin.catalog.specTemplates.removeFieldN', { n: idx + 1 })"
                    @click="removeFieldRow(idx)"
                  >
                    <Trash2 class="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
