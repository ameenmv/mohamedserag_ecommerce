<script setup lang="ts">
import { Check, Minus } from '@lucide/vue'
import {
  formatCompareValue,
  type CompareRowGroup,
  type CompareTableRow,
} from '~/utils/compare-table'
import { MAX_COMPARE_ITEMS } from '~/utils/compare'

defineProps<{
  group: CompareRowGroup
  productCount: number
}>()

const { t } = useI18n()
const { money } = usePrice()

function getRowLabel(row: CompareTableRow): string {
  if (row.type === 'price') return t('store.compare.price')
  if (row.type === 'brand') return t('store.compare.brand')
  if (row.type === 'warranty') return t('store.compare.warranty')
  if (row.type === 'origin') return t('store.compare.origin')
  return row.label
}
</script>

<template>
  <!-- Group Heading Row -->
  <tr class="border-y border-border/80 bg-secondary/50">
    <th
      :colspan="productCount < MAX_COMPARE_ITEMS ? productCount + 2 : productCount + 1"
      scope="colgroup"
      class="p-0 text-start"
    >
      <!-- The heading cell spans the whole table; only its label sticks, so it stays readable while the columns scroll sideways -->
      <span class="sticky start-0 inline-block px-4 py-2.5 text-xs font-bold text-muted-foreground">
        {{ t(group.titleKey) }}
      </span>
    </th>
  </tr>

  <!-- Group Spec Rows -->
  <tr
    v-for="row in group.rows"
    :key="row.key"
    :class="[
      'group transition-colors',
      row.different
        ? 'bg-serag-gold/[0.07]'
        : 'text-muted-foreground hover:bg-secondary/20',
    ]"
  >
    <!-- Row Header Label: Fixed on start side on mobile -->
    <th
      scope="row"
      :class="[
        'sticky start-0 z-10 w-28 min-w-28 border-b border-e border-border bg-card p-3.5 text-start font-bold text-foreground sm:w-44 sm:min-w-44 sm:p-4',
        row.different ? 'border-s-4 border-s-serag-gold' : 'border-s-4 border-s-transparent',
      ]"
    >
      <span :class="row.different ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'">
        {{ getRowLabel(row) }}
      </span>
    </th>

    <!-- Product Values with Winner Badge & Snap Support -->
    <td
      v-for="(val, idx) in row.values"
      :key="idx"
      class="border-b border-e border-border p-3.5 align-middle snap-start sm:p-4"
    >
      <!-- Kept out of row header so accessible name stays the row label -->
      <span v-if="row.different && idx === 0" class="sr-only">
        {{ t('store.compare.differentValue') }}:
      </span>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Best winner mark: small check badge + bold value -->
        <span
          v-if="row.bestIndexes?.includes(idx)"
          class="inline-flex shrink-0 items-center gap-1 rounded-full bg-serag-gold/25 px-1.5 py-0.5 text-[10px] font-bold text-serag-gold-ink dark:text-serag-gold-hi"
          :aria-label="t('store.compare.bestAria')"
        >
          <Check class="size-2.5 stroke-[3]" aria-hidden="true" />
          <span>{{ t('store.compare.best') }}</span>
        </span>

        <!-- Price type -->
        <span
          v-if="row.type === 'price'"
          :class="[
            'num text-sm sm:text-base',
            row.bestIndexes?.includes(idx) ? 'font-bold text-primary' : 'font-semibold text-foreground',
          ]"
        >
          {{ money(val as number) }}
        </span>

        <!-- Boolean type: green check / grey dash icons with sr-only text -->
        <span
          v-else-if="typeof val === 'boolean'"
          :class="[
            'inline-flex items-center gap-1.5 text-xs sm:text-sm',
            row.bestIndexes?.includes(idx) ? 'font-bold text-foreground' : 'font-semibold',
          ]"
        >
          <span
            :class="[
              'flex size-5 items-center justify-center rounded-full',
              val ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
            ]"
          >
            <Check v-if="val" class="size-3" aria-hidden="true" />
            <Minus v-else class="size-3" aria-hidden="true" />
          </span>
          <span class="sr-only">{{ val ? t('store.compare.yes') : t('store.compare.no') }}</span>
          <span>
            {{ formatCompareValue(val, row.unit, { yesLabel: t('store.compare.yes'), noLabel: t('store.compare.no') }) }}
          </span>
        </span>

        <!-- Other types (numbers, text, choice) -->
        <span
          v-else
          :class="[
            'text-xs sm:text-sm',
            val === null || val === undefined ? 'text-muted-foreground' : 'text-foreground',
            row.bestIndexes?.includes(idx) ? 'font-bold' : '',
          ]"
        >
          {{ formatCompareValue(val, row.unit) }}
        </span>
      </div>
    </td>

    <!-- Empty slot spacer cell if comparing less than max -->
    <td
      v-if="productCount < MAX_COMPARE_ITEMS"
      class="border-b border-border bg-card/40"
      aria-hidden="true"
    />
  </tr>
</template>
