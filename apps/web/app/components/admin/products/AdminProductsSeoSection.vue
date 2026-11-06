<script setup lang="ts">
import { PRODUCT_SEO_TITLE_MAX } from '@serag/shared'
import { ChevronDown } from '@lucide/vue'
import { useProductFormContext } from '~/composables/useProductFormContext'

defineProps<{
  errors: Record<string, string>
  disabled: boolean
}>()

const {
  form,
  isEditMode,
  autoSlug,
  autoSeoTitleAr,
  autoSeoDescriptionAr,
} = useProductFormContext()
const { t } = useI18n()

const hasInitialManualSeo = Boolean(
  form.seoTitle.trim() ||
    form.seoDescription.trim() ||
    form.translations.en.seoTitle.trim() ||
    form.translations.en.seoDescription.trim(),
)
const seoOpen = ref(hasInitialManualSeo)
const slugUnlocked = ref(false)
const slugReadonly = computed(() => isEditMode.value && !slugUnlocked.value)

function handleToggle(event: Event) {
  const target = event.currentTarget
  if (target instanceof HTMLDetailsElement) {
    seoOpen.value = target.open
  }
}
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

      <!-- Google appearance (optional) -->
      <details
        class="group rounded-xl border border-border bg-background"
        :open="seoOpen"
        @toggle="handleToggle"
      >
        <summary
          class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
          :aria-expanded="seoOpen"
        >
          <span class="text-sm font-bold text-foreground">
            {{ t('admin.products.editor.seo.googleAppearance') }}
          </span>
          <ChevronDown
            class="size-4 shrink-0 text-muted-foreground transition-transform"
            :class="seoOpen ? 'rotate-180' : ''"
            aria-hidden="true"
          />
        </summary>

        <div class="flex flex-col gap-5 border-t border-border p-4">
          <p class="text-xs text-muted-foreground">
            {{ t('admin.products.editor.seo.autoHint') }}
          </p>

          <AdminProductsSeoPreview />

          <!-- Slug -->
          <FormField
            id="product-slug"
            :label="t('admin.products.editor.seo.slug')"
            :error="errors.slug"
          >
            <template #default="{ id, invalid, describedBy }">
              <div class="flex flex-col gap-2">
                <div class="flex flex-col gap-2 sm:flex-row">
                  <Input
                    :id="id"
                    v-model="form.slug"
                    type="text"
                    dir="ltr"
                    :placeholder="autoSlug"
                    :readonly="slugReadonly"
                    :disabled="disabled"
                    :aria-invalid="invalid"
                    :aria-describedby="describedBy"
                    class="h-11 min-h-11 flex-1 rounded-lg text-start font-mono"
                  />
                  <Button
                    v-if="isEditMode && !slugUnlocked"
                    type="button"
                    variant="outline"
                    class="min-h-11 shrink-0"
                    @click="slugUnlocked = true"
                  >
                    {{ t('admin.products.editor.seo.editSlug') }}
                  </Button>
                </div>
                <p
                  v-if="isEditMode && slugUnlocked"
                  class="text-xs font-medium text-amber-800 dark:text-amber-400"
                >
                  {{ t('admin.products.editor.seo.slugWarning') }}
                </p>
              </div>
            </template>
          </FormField>

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
                  :placeholder="autoSeoTitleAr"
                  :disabled="disabled"
                  :aria-invalid="invalid"
                  :aria-describedby="describedBy"
                  class="h-10 rounded-lg"
                />
                <div class="flex justify-between text-[11px] text-muted-foreground">
                  <span>{{ t('admin.products.editor.seo.seoTitleHint') }}</span>
                  <span class="num font-semibold" :class="form.seoTitle.length > PRODUCT_SEO_TITLE_MAX ? 'text-amber-800 dark:text-amber-400' : ''">
                    {{ t('admin.products.editor.seo.chars', { count: form.seoTitle.length }) }} / {{ PRODUCT_SEO_TITLE_MAX }}
                  </span>
                </div>
              </div>
            </template>
          </FormField>

          <!-- SEO Description with counter (~155) -->
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
                  :placeholder="autoSeoDescriptionAr"
                  :disabled="disabled"
                  :aria-invalid="invalid"
                  :aria-describedby="describedBy"
                />
                <div class="flex justify-between text-[11px] text-muted-foreground">
                  <span>{{ t('admin.products.editor.seo.seoDescriptionHint') }}</span>
                  <span class="num font-semibold" :class="form.seoDescription.length > 155 ? 'text-amber-800 dark:text-amber-400' : ''">
                    {{ t('admin.products.editor.seo.chars', { count: form.seoDescription.length }) }} / 155
                  </span>
                </div>
              </div>
            </template>
          </FormField>
        </div>
      </details>
    </CardContent>
  </Card>
</template>
