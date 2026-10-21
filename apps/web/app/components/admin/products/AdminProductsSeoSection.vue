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
        {{ t('admin.products.editor.seo.title') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="p-0 flex flex-col gap-5">
      <!-- Visibility & Featured Toggles -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-bold text-foreground">
              {{ t('admin.products.editor.seo.visible') }}
            </span>
            <span class="text-xs text-muted-foreground">
              {{ t('admin.products.editor.seo.visibleHint') }}
            </span>
          </div>
          <AdminFormSwitch
            id="product-visible"
            v-model="form.visible"
            :disabled="disabled"
            :aria-label="t('admin.products.editor.seo.visible')"
          />
        </div>

        <div class="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-bold text-foreground">
              {{ t('admin.products.editor.seo.featured') }}
            </span>
            <span class="text-xs text-muted-foreground">
              {{ t('admin.products.editor.seo.featuredHint') }}
            </span>
          </div>
          <AdminFormSwitch
            id="product-featured"
            v-model="form.featured"
            :disabled="disabled"
            :aria-label="t('admin.products.editor.seo.featured')"
          />
        </div>
      </div>

      <!-- SEO Title with counter (~60) -->
      <FormField
        id="product-seo-title"
        :label="t('admin.products.editor.seo.seoTitle')"
        :error="errors.seoTitle"
      >
        <template #default="{ id, invalid, describedBy }">
          <div class="flex flex-col gap-1">
            <Input
              :id="id"
              v-model="form.seoTitle"
              type="text"
              maxlength="100"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg"
            />
            <div class="flex justify-between text-[11px] text-muted-foreground">
              <span>{{ t('admin.products.editor.seo.seoTitleHint') }}</span>
              <span class="num font-semibold" :class="form.seoTitle.length > 60 ? 'text-amber-800 dark:text-amber-400' : ''">
                {{ t('admin.products.editor.seo.chars', { count: form.seoTitle.length }) }} / 60
              </span>
            </div>
          </div>
        </template>
      </FormField>

      <!-- SEO Description with counter (~160) -->
      <FormField
        id="product-seo-desc"
        :label="t('admin.products.editor.seo.seoDescription')"
        :error="errors.seoDescription"
      >
        <template #default="{ id, invalid, describedBy }">
          <div class="flex flex-col gap-1">
            <AdminFormTextarea
              :id="id"
              v-model="form.seoDescription"
              :rows="3"
              maxlength="250"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            />
            <div class="flex justify-between text-[11px] text-muted-foreground">
              <span>{{ t('admin.products.editor.seo.seoDescriptionHint') }}</span>
              <span class="num font-semibold" :class="form.seoDescription.length > 160 ? 'text-amber-800 dark:text-amber-400' : ''">
                {{ t('admin.products.editor.seo.chars', { count: form.seoDescription.length }) }} / 160
              </span>
            </div>
          </div>
        </template>
      </FormField>
    </CardContent>
  </Card>
</template>
