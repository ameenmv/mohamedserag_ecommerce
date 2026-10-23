<script setup lang="ts">
import { useProductFormContext } from '~/composables/useProductFormContext'

defineProps<{
  errors: Record<string, string>
  disabled: boolean
}>()

const { form, showSetContents } = useProductFormContext()
const { t } = useI18n()
</script>

<template>
  <Card class="rounded-2xl border border-border bg-card p-6 shadow-xs">
    <CardHeader class="p-0 pb-4">
      <CardTitle class="font-display text-xl text-primary">
        {{ t('admin.products.editor.english.title') }}
      </CardTitle>
      <CardDescription class="mt-1 text-xs text-muted-foreground">
        {{ t('admin.products.editor.english.description') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="p-0 flex flex-col gap-5">
      <!-- English Name -->
      <FormField
        id="product-en-name"
        :label="t('admin.products.editor.english.name')"
        :error="errors['translations.en.name']"
      >
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="form.translations.en.name"
            type="text"
            dir="ltr"
            lang="en"
            :placeholder="t('admin.products.editor.english.namePlaceholder')"
            :disabled="disabled"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
            class="h-10 rounded-lg text-start"
          />
        </template>
      </FormField>

      <!-- Lead time & Origin & Warranty & Activation in a grid -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          id="product-en-lead-time"
          :label="t('admin.products.editor.english.leadTimeText')"
          :error="errors['translations.en.leadTimeText']"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.translations.en.leadTimeText"
              type="text"
              dir="ltr"
              lang="en"
              :placeholder="t('admin.products.editor.english.leadTimePlaceholder')"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg text-start"
            />
          </template>
        </FormField>

        <FormField
          id="product-en-origin"
          :label="t('admin.products.editor.english.origin')"
          :error="errors['translations.en.origin']"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.translations.en.origin"
              type="text"
              dir="ltr"
              lang="en"
              :placeholder="t('admin.products.editor.english.originPlaceholder')"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg text-start"
            />
          </template>
        </FormField>

        <FormField
          id="product-en-warranty"
          :label="t('admin.products.editor.english.warranty')"
          :error="errors['translations.en.warranty']"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.translations.en.warranty"
              type="text"
              dir="ltr"
              lang="en"
              :placeholder="t('admin.products.editor.english.warrantyPlaceholder')"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg text-start"
            />
          </template>
        </FormField>

        <FormField
          id="product-en-warranty-activation"
          :label="t('admin.products.editor.english.warrantyActivation')"
          :error="errors['translations.en.warrantyActivation']"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.translations.en.warrantyActivation"
              type="text"
              dir="ltr"
              lang="en"
              :placeholder="t('admin.products.editor.english.warrantyActivationPlaceholder')"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg text-start"
            />
          </template>
        </FormField>
      </div>

      <!-- Cookware Set Contents in English (conditional on showSetContents && form.setContents.length > 0) -->
      <div
        v-if="showSetContents && form.setContents.length > 0"
        class="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4"
      >
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-bold text-foreground">
            {{ t('admin.products.editor.english.setContentsTitle') }}
          </span>
          <span class="text-xs text-muted-foreground">
            {{ t('admin.products.editor.english.setContentsDescription') }}
          </span>
        </div>

        <div class="flex flex-col gap-3">
          <div
            v-for="(piece, idx) in form.translations.en.setContents"
            :key="idx"
            class="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center"
          >
            <div class="flex-1">
              <Input
                v-model="piece.item"
                type="text"
                dir="ltr"
                lang="en"
                :placeholder="form.setContents[idx]?.item ? `${t('admin.products.editor.english.itemPlaceholder')} (${form.setContents[idx]?.item})` : t('admin.products.editor.english.itemPlaceholder')"
                :disabled="disabled"
                class="h-9 rounded-lg text-sm text-start"
                :aria-label="t('admin.products.editor.english.item')"
              />
            </div>

            <div class="w-full sm:w-36">
              <Input
                :model-value="piece.size ?? ''"
                type="text"
                dir="ltr"
                lang="en"
                :placeholder="t('admin.products.editor.english.sizePlaceholder')"
                :disabled="disabled"
                class="h-9 rounded-lg text-sm text-start"
                :aria-label="t('admin.products.editor.english.size')"
                @update:model-value="(val) => (piece.size = String(val).trim() || null)"
              />
            </div>

            <div class="w-full sm:w-24">
              <Input
                :model-value="piece.qty ?? undefined"
                type="number"
                min="1"
                dir="ltr"
                lang="en"
                :placeholder="t('admin.products.editor.english.qty')"
                :disabled="disabled"
                class="num h-9 rounded-lg text-sm text-start"
                :aria-label="t('admin.products.editor.english.qty')"
                @update:model-value="(val) => (piece.qty = val ? Number(val) : null)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- SEO Title with counter (~60) -->
      <FormField
        id="product-en-seo-title"
        :label="t('admin.products.editor.english.seoTitle')"
        :error="errors['translations.en.seoTitle']"
      >
        <template #default="{ id, invalid, describedBy }">
          <div class="flex flex-col gap-1">
            <Input
              :id="id"
              v-model="form.translations.en.seoTitle"
              type="text"
              dir="ltr"
              lang="en"
              maxlength="100"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg text-start"
            />
            <div class="flex justify-between text-[11px] text-muted-foreground">
              <span>{{ t('admin.products.editor.english.seoTitleHint') }}</span>
              <span class="num font-semibold" :class="form.translations.en.seoTitle.length > 60 ? 'text-amber-800 dark:text-amber-400' : ''">
                {{ t('admin.products.editor.seo.chars', { count: form.translations.en.seoTitle.length }) }} / 60
              </span>
            </div>
          </div>
        </template>
      </FormField>

      <!-- SEO Description with counter (~160) -->
      <FormField
        id="product-en-seo-desc"
        :label="t('admin.products.editor.english.seoDescription')"
        :error="errors['translations.en.seoDescription']"
      >
        <template #default="{ id, invalid, describedBy }">
          <div class="flex flex-col gap-1">
            <AdminFormTextarea
              :id="id"
              v-model="form.translations.en.seoDescription"
              :rows="3"
              dir="ltr"
              lang="en"
              maxlength="250"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="text-start"
            />
            <div class="flex justify-between text-[11px] text-muted-foreground">
              <span>{{ t('admin.products.editor.english.seoDescriptionHint') }}</span>
              <span class="num font-semibold" :class="form.translations.en.seoDescription.length > 160 ? 'text-amber-800 dark:text-amber-400' : ''">
                {{ t('admin.products.editor.seo.chars', { count: form.translations.en.seoDescription.length }) }} / 160
              </span>
            </div>
          </div>
        </template>
      </FormField>
    </CardContent>
  </Card>
</template>
