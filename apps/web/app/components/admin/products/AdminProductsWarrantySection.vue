<script setup lang="ts">
import { useProductFormContext } from '~/composables/useProductFormContext'

defineProps<{
  errors: Record<string, string>
  disabled: boolean
}>()

const { form } = useProductFormContext()
const { t } = useI18n()
</script>

<template>
  <Card class="rounded-2xl border border-border bg-card p-6 shadow-xs">
    <CardHeader class="p-0 pb-4">
      <CardTitle class="font-display text-xl text-primary">
        {{ t('admin.products.editor.warranty.title') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="p-0 grid grid-cols-1 gap-4 md:grid-cols-3">
      <FormField
        id="product-warranty"
        :label="t('admin.products.editor.warranty.warranty')"
        :error="errors.warranty"
      >
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="form.warranty"
            type="text"
            :placeholder="t('admin.products.editor.warranty.warrantyPlaceholder')"
            :disabled="disabled"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
            class="h-10 rounded-lg"
          />
        </template>
      </FormField>

      <FormField
        id="product-warranty-activation"
        :label="t('admin.products.editor.warranty.warrantyActivation')"
        :error="errors.warrantyActivation"
      >
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="form.warrantyActivation"
            type="text"
            :placeholder="t('admin.products.editor.warranty.warrantyActivationPlaceholder')"
            :disabled="disabled"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
            class="h-10 rounded-lg"
          />
        </template>
      </FormField>

      <FormField
        id="product-origin"
        :label="t('admin.products.editor.warranty.origin')"
        :error="errors.origin"
      >
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="form.origin"
            type="text"
            :placeholder="t('admin.products.editor.warranty.originPlaceholder')"
            :disabled="disabled"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
            class="h-10 rounded-lg"
          />
        </template>
      </FormField>
    </CardContent>
  </Card>
</template>
