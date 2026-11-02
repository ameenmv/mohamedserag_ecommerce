<script setup lang="ts">
import type { AdminSpecTemplate } from '@serag/shared'
import { useProductFormContext } from '~/composables/useProductFormContext'
import { parseSpecInput, specBool, specNumber, specText } from '~/utils/admin-spec-input'

defineProps<{
  template: AdminSpecTemplate | null
  errors: Record<string, string>
  disabled: boolean
}>()

const { form } = useProductFormContext()
const { t } = useI18n()
</script>

<template>
  <Card class="rounded-2xl border border-border bg-card p-6 shadow-xs">
    <CardHeader class="p-0 pb-4">
      <div class="flex items-center justify-between gap-2">
        <CardTitle class="font-display text-xl text-primary">
          {{ t('admin.products.editor.specs.title') }}
        </CardTitle>
        <span v-if="template" class="text-xs font-semibold text-muted-foreground">
          ({{ template.name }})
        </span>
      </div>
    </CardHeader>
    <CardContent class="p-0">
      <div
        v-if="!template || template.fields.length === 0"
        class="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
      >
        <p>{{ t('admin.products.editor.specs.noTemplate') }}</p>
        <p class="mt-1 text-xs opacity-80">
          {{ t('admin.products.editor.specs.assignTemplateHint') }}
        </p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="field in template.fields" :key="field.key">
          <!-- Text field -->
          <FormField
            v-if="field.type === 'text'"
            :id="`spec-${field.key}`"
            :label="field.label"
            :error="errors[`specs.${field.key}`]"
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                :model-value="specText(form.specs[field.key])"
                type="text"
                :disabled="disabled"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-10 rounded-lg"
                @update:model-value="(val) => (form.specs[field.key] = parseSpecInput('text', val))"
              />
            </template>
          </FormField>

          <!-- Number field with optional unit -->
          <FormField
            v-else-if="field.type === 'number'"
            :id="`spec-${field.key}`"
            :label="field.label"
            :error="errors[`specs.${field.key}`]"
          >
            <template #default="{ id, invalid, describedBy }">
              <!-- dir="ltr": a number input writes its digits from the left even on a rtl page, so the
                   unit sits on the right, clear of them -->
              <div class="relative flex items-center" dir="ltr">
                <Input
                  :id="id"
                  :model-value="specNumber(form.specs[field.key])"
                  type="number"
                  min="0"
                  :disabled="disabled"
                  :aria-invalid="invalid"
                  :aria-describedby="describedBy"
                  class="num h-10 rounded-lg pe-16"
                  @update:model-value="(val) => (form.specs[field.key] = parseSpecInput('number', val))"
                />
                <span
                  v-if="field.unit"
                  class="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-xs font-medium text-muted-foreground"
                >
                  {{ field.unit }}
                </span>
              </div>
            </template>
          </FormField>

          <!-- Boolean field -->
          <FormField
            v-else-if="field.type === 'boolean'"
            :id="`spec-${field.key}`"
            :label="field.label"
            :error="errors[`specs.${field.key}`]"
          >
            <template #default="{ id, invalid, describedBy }">
              <div class="flex h-10 items-center">
                <AdminFormCheckbox
                  :id="id"
                  :model-value="specBool(form.specs[field.key])"
                  :label="form.specs[field.key] ? t('admin.products.editor.specs.true') : t('admin.products.editor.specs.false')"
                  :disabled="disabled"
                  :aria-invalid="invalid"
                  :aria-describedby="describedBy"
                  @update:model-value="(val) => (form.specs[field.key] = parseSpecInput('boolean', val))"
                />
              </div>
            </template>
          </FormField>

          <!-- Choice field -->
          <FormField
            v-else-if="field.type === 'choice'"
            :id="`spec-${field.key}`"
            :label="field.label"
            :error="errors[`specs.${field.key}`]"
          >
            <template #default="{ id, invalid, describedBy }">
              <AdminFormSelect
                :id="id"
                :model-value="specText(form.specs[field.key])"
                :disabled="disabled"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                @update:model-value="(val) => (form.specs[field.key] = parseSpecInput('choice', val))"
              >
                <option value="">
                  {{ t('admin.products.editor.specs.selectOption') }}
                </option>
                <option v-for="opt in field.options || []" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </AdminFormSelect>
            </template>
          </FormField>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
