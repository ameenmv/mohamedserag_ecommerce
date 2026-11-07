<script setup lang="ts">
import type { ProductDetailMergedSpec } from '@serag/shared'

const props = defineProps<{
  specs: ProductDetailMergedSpec[]
}>()

const { t } = useI18n()

const keySpecs = computed(() => props.specs.slice(0, 4))
const remainingSpecs = computed(() =>
  props.specs.length > 4 ? props.specs.slice(4) : []
)

function formatSpecValue(spec: ProductDetailMergedSpec): string {
  if (typeof spec.value === 'boolean') {
    return spec.value ? t('store.productPage.specs.yes') : t('store.productPage.specs.no')
  }
  if (spec.unit && spec.unit.trim().length > 0) {
    return `${spec.value} ${spec.unit}`
  }
  return String(spec.value)
}

function isNumeric(spec: ProductDetailMergedSpec): boolean {
  return typeof spec.value === 'number' || spec.type === 'number'
}
</script>

<template>
  <section
    v-if="specs && specs.length > 0"
    class="scroll-mt-32 rounded-[28px] border border-border bg-card p-5 sm:p-7"
    :aria-label="t('store.productPage.specs.title')"
  >
    <h2 class="mb-4 text-base font-bold text-foreground sm:text-lg">
      {{ t('store.productPage.specs.title') }}
    </h2>

    <!-- Key specs figures: first 4 fields as large figures -->
    <div v-if="keySpecs.length > 0" class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="spec in keySpecs"
        :key="spec.key"
        class="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-serag-cream/50 p-3 text-center sm:p-4 dark:bg-muted/20"
      >
        <span class="text-xs font-medium text-muted-foreground line-clamp-1">
          {{ spec.label }}
        </span>
        <span
          :class="[
            'mt-1 font-bold text-foreground text-sm sm:text-base lg:text-lg',
            isNumeric(spec) ? 'num' : '',
          ]"
        >
          {{ formatSpecValue(spec) }}
        </span>
      </div>
    </div>

    <!-- The rest of specs: two-column definition list on >= 640px -->
    <div v-if="remainingSpecs.length > 0" class="flex flex-col gap-2">
      <h3 class="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {{ t('store.productPage.specs.allSpecs') }}
      </h3>
      <dl class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
        <div
          v-for="spec in remainingSpecs"
          :key="spec.key"
          class="flex items-center justify-between rounded-xl border border-border/60 bg-serag-cream/40 p-3 sm:px-4 dark:bg-muted/15"
        >
          <dt class="text-xs sm:text-sm font-semibold text-muted-foreground pe-2">
            {{ spec.label }}
          </dt>
          <dd class="text-xs sm:text-sm font-bold text-foreground text-end">
            <span :class="isNumeric(spec) ? 'num inline-block' : ''">{{ formatSpecValue(spec) }}</span>
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>
