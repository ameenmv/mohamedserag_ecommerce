<script setup lang="ts">
import type { AdminProductDetail } from '@serag/shared'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProductForm } from '~/composables/useProductForm'
import { provideProductForm } from '~/composables/useProductFormContext'

const props = defineProps<{
  initialProduct?: AdminProductDetail | null
}>()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

const productFormCtx = useProductForm(props.initialProduct)
provideProductForm(productFormCtx)

const {
  form,
  isEditMode,
  isDirty,
  hydrated,
  saving,
  errors,
  serverError,
  categories,
  brands,
  currentTemplate,
  showSetContents,
  previewProduct,
  categoryConfirmDialogOpen,
  requestCategoryChange,
  confirmCategoryChange,
  cancelCategoryChange,
  submit,
  uploadingImage,
  uploadImageFile,
  patchImageDetails,
  moveImage,
  removeImage,
  addSetContentRow,
  removeSetContentRow,
} = productFormCtx

// The route-leave guard in useProductForm asks about unsaved changes.
function handleCancel() {
  void router.push(localePath('/admin/products'))
}
</script>

<template>
  <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
    <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <!-- Main Form Column (8 cols on lg) -->
      <div class="flex flex-col gap-6 lg:col-span-8">
        <!-- 1. Basics -->
        <AdminProductsBasicsSection
          :brands="brands"
          :categories="categories"
          :errors="errors"
          :disabled="!hydrated || saving"
          @category-change="requestCategoryChange"
        />

        <!-- 2. Pricing & Stock -->
        <AdminProductsPricingSection
          :errors="errors"
          :disabled="!hydrated || saving"
        />

        <!-- 3. Technical Specs -->
        <AdminProductsSpecsSection
          :template="currentTemplate"
          :errors="errors"
          :disabled="!hydrated || saving"
        />

        <!-- 4. Cookware Set Contents (conditional) -->
        <AdminProductsSetContentsSection
          v-if="showSetContents"
          :disabled="!hydrated || saving"
          @add-row="addSetContentRow"
          @remove-row="removeSetContentRow"
        />

        <!-- 5. Warranty & Origin -->
        <AdminProductsWarrantySection
          :errors="errors"
          :disabled="!hydrated || saving"
        />

        <!-- 6. Images -->
        <AdminProductsImagesSection
          :is-edit-mode="isEditMode"
          :images="form.images"
          :disabled="!hydrated || saving"
          :uploading="uploadingImage"
          @upload-file="uploadImageFile"
          @patch-image="patchImageDetails"
          @move-image="moveImage"
          @remove-image="removeImage"
        />

        <!-- 7. Visibility & SEO -->
        <AdminProductsSeoSection
          :errors="errors"
          :disabled="!hydrated || saving"
        />
      </div>

      <!-- Live Preview Sticky Panel (4 cols on lg) -->
      <aside class="lg:col-span-4" :aria-label="t('admin.products.editor.preview.title')">
        <AdminProductsPreviewPanel
          :product="previewProduct"
          :is-dirty="isDirty"
          :product-id="form.id"
        />
      </aside>
    </div>

    <!-- Sticky Save Bar -->
    <AdminProductsSaveBar
      :is-dirty="isDirty"
      :saving="saving"
      :hydrated="hydrated"
      :is-edit-mode="isEditMode"
      :server-error="serverError"
      @save="submit"
      @cancel="handleCancel"
    />

    <!-- Category change warning dialog -->
    <Dialog v-model:open="categoryConfirmDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ t('admin.products.editor.basics.categoryChangeWarnTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm">
            {{ t('admin.products.editor.basics.categoryChangeWarnDescription') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" @click="cancelCategoryChange">
            {{ t('admin.products.actions.cancel') }}
          </Button>
          <Button type="button" variant="destructive" @click="confirmCategoryChange">
            {{ t('common.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </form>
</template>
