<script setup lang="ts">
import { AlertCircle, Check, RefreshCw } from '@lucide/vue'
import { useProductImport } from '~/composables/useProductImport'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
useSeoMeta({ title: () => t('admin.products.import.title') })
useAdminPageTitle('admin.products.import.title')

const {
  fileName,
  fileError,
  loading,
  applying,
  downloadingExport,
  hydrated,
  plan,
  appliedResult,
  confirmDialogOpen,
  filterStatus,
  filteredRows,
  updateCount,
  downloadCurrentCatalog,
  handleFile,
  applyImport,
  reset,
} = useProductImport()
</script>

<template>
  <div class="flex flex-col gap-6 max-w-6xl pb-12">
    <!-- Header with Step 1 instructions and Export button -->
    <AdminProductsImportHeader
      :downloading="downloadingExport"
      :disabled="!hydrated"
      @download="downloadCurrentCatalog"
    />

    <!-- Result View when import has succeeded -->
    <AdminProductsImportResult
      v-if="appliedResult"
      :result="appliedResult"
      @reset="reset"
    />

    <!-- Main Import Flow (when not applied) -->
    <template v-else>
      <!-- Step 2: File Dropzone -->
      <AdminProductsImportDropzone
        :loading="loading"
        :file-name="fileName"
        :file-error="fileError"
        :disabled="!hydrated"
        @file-selected="handleFile"
      />

      <!-- Header Error Alert (e.g. max rows or invalid header) -->
      <div
        v-if="plan?.headerError"
        role="alert"
        class="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-destructive shadow-xs"
      >
        <AlertCircle class="size-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div class="space-y-1 text-sm">
          <h3 class="font-display font-semibold text-base">
            {{ t('admin.products.import.errors.headerErrorTitle') }}
          </h3>
          <p>{{ t(plan.headerError) }}</p>
        </div>
      </div>

      <!-- Step 3: Preview and Actions (when plan has no header error) -->
      <div v-else-if="plan" class="flex flex-col gap-6">
        <!-- Summary chips & filters -->
        <AdminProductsImportSummary
          :summary="plan.summary"
          :current-filter="filterStatus"
          @update:filter="filterStatus = $event"
        />

        <!-- Apply CTA bar -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div class="space-y-0.5">
            <h4 class="font-display font-bold text-foreground text-sm">
              {{ t('admin.products.import.preview.applyBarTitle') }}
            </h4>
            <p class="text-xs text-muted-foreground">
              {{ t('admin.products.import.preview.applyBarHint', { count: updateCount }) }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-11 rounded-xl text-xs gap-1.5"
              @click="reset"
            >
              <RefreshCw class="size-3.5" aria-hidden="true" />
              <span>{{ t('common.cancel') }}</span>
            </Button>

            <Button
              type="button"
              :disabled="updateCount === 0 || !hydrated || applying"
              class="h-11 rounded-xl gap-2 bg-serag-night px-5 font-bold text-xs sm:text-sm text-serag-gold hover:bg-serag-green shadow-xs transition-all disabled:opacity-50"
              @click="confirmDialogOpen = true"
            >
              <Check class="size-4 stroke-[2.5]" aria-hidden="true" />
              <span>{{ t('admin.products.import.preview.applyButton', { count: updateCount }) }}</span>
            </Button>
          </div>
        </div>

        <!-- Diff Table & Cards -->
        <AdminProductsImportTable :rows="filteredRows" />
      </div>
    </template>

    <!-- Confirmation Dialog -->
    <AdminProductsImportConfirmDialog
      :open="confirmDialogOpen"
      :count="updateCount"
      :applying="applying"
      @update:open="confirmDialogOpen = $event"
      @confirm="applyImport"
    />
  </div>
</template>
