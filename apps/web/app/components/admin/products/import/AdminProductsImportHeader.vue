<script setup lang="ts">
import { ArrowRight, Download, FileSpreadsheet, Loader2 } from '@lucide/vue'

defineProps<{
  downloading: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  download: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Top row: title & back link -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink
            :to="localePath('/admin/products')"
            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowRight class="size-3.5 rtl:rotate-180" aria-hidden="true" />
            <span>{{ t('admin.products.import.backToProducts') }}</span>
          </NuxtLink>
        </div>
        <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {{ t('admin.products.import.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t('admin.products.import.subtitle') }}
        </p>
      </div>

      <!-- Export button -->
      <Button
        type="button"
        variant="outline"
        size="lg"
        :disabled="downloading || disabled"
        class="h-11 rounded-xl gap-2 font-bold text-xs sm:text-sm self-start sm:self-auto border-border bg-card hover:bg-muted"
        @click="emit('download')"
      >
        <Loader2 v-if="downloading" class="size-4 animate-spin" aria-hidden="true" />
        <Download v-else class="size-4" aria-hidden="true" />
        <span>{{ t('admin.products.import.downloadCurrentCatalog') }}</span>
      </Button>
    </div>

    <!-- Step 1 Instruction Card -->
    <div class="rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div class="flex items-start gap-3.5">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-serag-gold/15 text-serag-night dark:text-serag-gold">
          <FileSpreadsheet class="size-5" aria-hidden="true" />
        </div>
        <div class="space-y-2 text-sm leading-relaxed">
          <h2 class="font-display font-semibold text-foreground text-base">
            {{ t('admin.products.import.instructions.title') }}
          </h2>
          <ul class="list-disc list-inside space-y-1 text-muted-foreground text-xs sm:text-sm">
            <li>{{ t('admin.products.import.instructions.columns') }}</li>
            <li>{{ t('admin.products.import.instructions.pricing') }}</li>
            <li>{{ t('admin.products.import.instructions.emptyMeansNoChange') }}</li>
            <li>{{ t('admin.products.import.instructions.clearOldPrice') }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
