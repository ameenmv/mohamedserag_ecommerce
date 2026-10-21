<script setup lang="ts">
import type { AdminBrand, AdminCategory } from '@serag/shared'
import { useProductFormContext } from '~/composables/useProductFormContext'

defineProps<{
  brands: AdminBrand[]
  categories: AdminCategory[]
  errors: Record<string, string>
  disabled: boolean
}>()

const emit = defineEmits<{
  categoryChange: [categoryId: string]
}>()

const { form } = useProductFormContext()
const { t } = useI18n()
</script>

<template>
  <Card class="rounded-2xl border border-border bg-card p-6 shadow-xs">
    <CardHeader class="p-0 pb-4">
      <CardTitle class="font-display text-xl text-primary">
        {{ t('admin.products.editor.basics.title') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="p-0 flex flex-col gap-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          id="product-name"
          :label="t('admin.products.editor.basics.name')"
          :error="errors.name"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.name"
              type="text"
              :placeholder="t('admin.products.editor.basics.namePlaceholder')"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg"
            />
          </template>
        </FormField>

        <FormField
          id="product-model-code"
          :label="t('admin.products.editor.basics.modelCode')"
          :error="errors.modelCode"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.modelCode"
              type="text"
              dir="ltr"
              :placeholder="t('admin.products.editor.basics.modelCodePlaceholder')"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg text-start font-mono"
            />
          </template>
        </FormField>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          id="product-brand"
          :label="t('admin.products.editor.basics.brand')"
          :error="errors.brandId"
        >
          <template #default="{ id, invalid, describedBy }">
            <AdminFormSelect
              :id="id"
              v-model="form.brandId"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            >
              <option value="" disabled>
                {{ t('admin.products.editor.basics.selectBrand') }}
              </option>
              <option v-for="b in brands" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </AdminFormSelect>
          </template>
        </FormField>

        <FormField
          id="product-category"
          :label="t('admin.products.editor.basics.category')"
          :error="errors.categoryId"
        >
          <template #default="{ id, invalid, describedBy }">
            <AdminFormSelect
              :id="id"
              :model-value="form.categoryId"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              @update:model-value="emit('categoryChange', String($event))"
            >
              <option value="" disabled>
                {{ t('admin.products.editor.basics.selectCategory') }}
              </option>
              <option v-for="c in categories" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </AdminFormSelect>
          </template>
        </FormField>

        <FormField
          id="product-slug"
          :label="t('admin.products.editor.basics.slug')"
          :error="errors.slug"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.slug"
              type="text"
              dir="ltr"
              :placeholder="t('admin.products.editor.basics.slugPlaceholder')"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg text-start font-mono"
            />
          </template>
        </FormField>
      </div>
    </CardContent>
  </Card>
</template>
