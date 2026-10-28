<script setup lang="ts">
import type { ProductDetailMergedSpec } from '@serag/shared'

defineProps<{
  specs: ProductDetailMergedSpec[]
}>()

const { t } = useI18n()

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
    class="rounded-[28px] border border-border bg-card p-5 sm:p-7"
    :aria-label="t('store.productPage.specs.title')"
  >
    <h2 class="mb-4 text-base font-bold text-foreground sm:text-lg">
      {{ t('store.productPage.specs.title') }}
    </h2>

    <div class="overflow-x-auto rounded-2xl border border-border/80">
      <table class="w-full text-start text-xs sm:text-sm">
        <caption class="sr-only">
          {{ t('store.productPage.specs.caption') }}
        </caption>
        <tbody>
          <tr
            v-for="(spec, idx) in specs"
            :key="spec.key"
            :class="[
              'border-b border-border/60 last:border-0 transition-colors',
              idx % 2 === 0 ? 'bg-serag-cream/70 dark:bg-muted/15' : 'bg-background',
            ]"
          >
            <th
              scope="row"
              class="w-2/5 p-3.5 sm:px-5 sm:py-4 text-start font-bold text-foreground"
            >
              {{ spec.label }}
            </th>
            <!-- num on an inner span: on the cell its LTR direction pushed numbers to the far side -->
            <td class="w-3/5 p-3.5 text-start font-semibold text-foreground/85 sm:px-5 sm:py-4">
              <span :class="isNumeric(spec) ? 'num inline-block' : ''">{{ formatSpecValue(spec) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
