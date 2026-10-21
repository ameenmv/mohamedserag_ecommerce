<script setup lang="ts">
import type { ProductImportApplyResult } from '~/composables/useProductImport'
import { ArrowRight, CheckCircle2, RefreshCw } from '@lucide/vue'

defineProps<{
  result: ProductImportApplyResult
}>()

const emit = defineEmits<{
  reset: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="flex flex-col items-center justify-center rounded-2xl border border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-8 text-center shadow-xs"
  >
    <div
      class="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mb-4"
    >
      <CheckCircle2 class="size-8 stroke-[2.5]" aria-hidden="true" />
    </div>

    <h2 class="font-display text-xl font-bold text-foreground">
      {{ t('admin.products.import.result.title') }}
    </h2>
    <p class="mt-1 text-sm text-muted-foreground max-w-md">
      {{ t('admin.products.import.result.description') }}
    </p>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-3 my-6 w-full max-w-md">
      <!-- Updated -->
      <div class="flex flex-col rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-card p-3">
        <span class="text-xs text-muted-foreground">{{ t('admin.products.import.result.updated') }}</span>
        <span class="num font-bold text-lg text-emerald-600 dark:text-emerald-400 mt-0.5">
          {{ result.updated }}
        </span>
      </div>

      <!-- Skipped -->
      <div class="flex flex-col rounded-xl border border-border bg-card p-3">
        <span class="text-xs text-muted-foreground">{{ t('admin.products.import.result.skipped') }}</span>
        <span class="num font-bold text-lg text-muted-foreground mt-0.5">
          {{ result.skipped }}
        </span>
      </div>

      <!-- Errors -->
      <div class="flex flex-col rounded-xl border border-destructive/20 bg-card p-3">
        <span class="text-xs text-muted-foreground">{{ t('admin.products.import.summary.errors') }}</span>
        <span class="num font-bold text-lg text-destructive mt-0.5">
          {{ result.errors }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap items-center justify-center gap-3">
      <Button
        type="button"
        variant="outline"
        class="h-11 rounded-xl gap-2 font-bold text-xs sm:text-sm"
        @click="emit('reset')"
      >
        <RefreshCw class="size-4" aria-hidden="true" />
        <span>{{ t('admin.products.import.result.importAnother') }}</span>
      </Button>

      <NuxtLink
        :to="localePath('/admin/products')"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-serag-night px-5 font-bold text-xs sm:text-sm text-serag-gold hover:bg-serag-green transition-all shadow-xs"
      >
        <span>{{ t('admin.products.import.backToProducts') }}</span>
        <ArrowRight class="size-4 rtl:rotate-180" aria-hidden="true" />
      </NuxtLink>
    </div>
  </div>
</template>
