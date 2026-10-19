<script setup lang="ts">
import type { ImportPlanRow, ImportRowStatus } from '@serag/shared'
import { AlertCircle, Archive, ArrowRight, CheckCircle2, Copy, HelpCircle, MinusCircle } from '@lucide/vue'

defineProps<{
  rows: ImportPlanRow[]
}>()

const { t } = useI18n()
const { money } = usePrice()

function formatPriceCell(piastres: number | null | undefined): string {
  if (piastres === null || piastres === undefined) return '—'
  return money(piastres)
}

function formatStockCell(stock: number | null | undefined): string {
  if (stock === null || stock === undefined) return '—'
  return String(stock)
}

function getStatusBadge(status: ImportRowStatus) {
  switch (status) {
    case 'update':
      return {
        label: t('admin.products.import.status.update'),
        class: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
        icon: CheckCircle2,
      }
    case 'unchanged':
      return {
        label: t('admin.products.import.status.unchanged'),
        class: 'bg-muted text-muted-foreground border-border',
        icon: MinusCircle,
      }
    case 'not_found':
      return {
        label: t('admin.products.import.status.notFound'),
        class: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
        icon: HelpCircle,
      }
    case 'duplicate':
      return {
        label: t('admin.products.import.status.duplicate'),
        class: 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300',
        icon: Copy,
      }
    case 'error':
    default:
      return {
        label: t('admin.products.import.status.error'),
        class: 'bg-destructive/10 text-destructive border-destructive/30',
        icon: AlertCircle,
      }
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Desktop Table (md and above) -->
    <div class="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
      <table class="w-full text-start text-xs border-collapse">
        <thead class="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
          <tr>
            <th scope="col" class="py-3.5 ps-4 pe-2 text-start w-14">#</th>
            <th scope="col" class="py-3.5 px-3 text-start">{{ t('admin.products.import.table.product') }}</th>
            <th scope="col" class="py-3.5 px-3 text-start">{{ t('admin.products.import.table.price') }}</th>
            <th scope="col" class="py-3.5 px-3 text-start">{{ t('admin.products.import.table.oldPrice') }}</th>
            <th scope="col" class="py-3.5 px-3 text-start">{{ t('admin.products.import.table.stock') }}</th>
            <th scope="col" class="py-3.5 px-3 text-start">{{ t('admin.products.import.table.status') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr
            v-for="row in rows"
            :key="`${row.line}-${row.modelCode}`"
            :class="[
              'transition-colors',
              row.status === 'error'
                ? 'bg-destructive/5'
                : row.status === 'update'
                  ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'hover:bg-muted/20',
            ]"
          >
            <!-- Line # -->
            <td class="py-3 ps-4 pe-2 font-mono num text-muted-foreground">
              {{ row.line }}
            </td>

            <!-- Product: Model Code & Name -->
            <td class="py-3 px-3">
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-mono font-bold text-foreground num">
                    {{ row.modelCode || '—' }}
                  </span>
                  <!-- Archived badge -->
                  <span
                    v-if="row.archived"
                    class="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20"
                  >
                    <Archive class="size-3" aria-hidden="true" />
                    {{ t('admin.products.import.table.archived') }}
                  </span>
                </div>
                <span v-if="row.name" class="text-xs text-muted-foreground line-clamp-1">
                  {{ row.name }}
                </span>
              </div>
            </td>

            <!-- Price: current -> next -->
            <td class="py-3 px-3">
              <div
                v-if="row.changes.includes('price')"
                class="flex items-center gap-1.5 font-bold"
              >
                <span class="num text-muted-foreground line-through text-[11px]">
                  {{ formatPriceCell(row.current?.price) }}
                </span>
                <ArrowRight class="size-3 text-serag-gold shrink-0 rtl:rotate-180" aria-hidden="true" />
                <span class="num text-emerald-600 dark:text-emerald-400">
                  {{ formatPriceCell(row.next?.price) }}
                </span>
              </div>
              <span v-else class="num text-muted-foreground">
                {{ formatPriceCell(row.current?.price) }}
              </span>
            </td>

            <!-- Old Price: current -> next -->
            <td class="py-3 px-3">
              <div
                v-if="row.changes.includes('oldPrice')"
                class="flex items-center gap-1.5 font-bold"
              >
                <span class="num text-muted-foreground line-through text-[11px]">
                  {{ formatPriceCell(row.current?.oldPrice) }}
                </span>
                <ArrowRight class="size-3 text-serag-gold shrink-0 rtl:rotate-180" aria-hidden="true" />
                <span class="num text-emerald-600 dark:text-emerald-400">
                  {{ formatPriceCell(row.next?.oldPrice) }}
                </span>
              </div>
              <span v-else class="num text-muted-foreground">
                {{ formatPriceCell(row.current?.oldPrice) }}
              </span>
            </td>

            <!-- Stock: current -> next -->
            <td class="py-3 px-3">
              <div
                v-if="row.changes.includes('stock')"
                class="flex items-center gap-1.5 font-bold"
              >
                <span class="num text-muted-foreground text-[11px]">
                  {{ formatStockCell(row.current?.stock) }}
                </span>
                <ArrowRight class="size-3 text-serag-gold shrink-0 rtl:rotate-180" aria-hidden="true" />
                <span class="num text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {{ formatStockCell(row.next?.stock) }}
                </span>
              </div>
              <span v-else class="num text-muted-foreground">
                {{ formatStockCell(row.current?.stock) }}
              </span>
            </td>

            <!-- Status / Errors -->
            <td class="py-3 px-3">
              <div class="flex flex-col gap-1 items-start">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-bold',
                    getStatusBadge(row.status).class,
                  ]"
                >
                  <component :is="getStatusBadge(row.status).icon" class="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{{ getStatusBadge(row.status).label }}</span>
                </span>

                <!-- Error messages translated -->
                <div v-if="row.errors.length > 0" class="flex flex-col gap-0.5 mt-0.5">
                  <span
                    v-for="err in row.errors"
                    :key="err"
                    class="text-[11px] text-destructive leading-tight"
                  >
                    {{ t(err) }}
                  </span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards (below md) -->
    <div class="flex flex-col gap-3 md:hidden">
      <div
        v-for="row in rows"
        :key="`card-${row.line}-${row.modelCode}`"
        :class="[
          'flex flex-col gap-3 rounded-2xl border p-4 shadow-xs transition-colors',
          row.status === 'error'
            ? 'border-destructive/30 bg-destructive/5'
            : row.status === 'update'
              ? 'border-emerald-300/40 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-border bg-card',
        ]"
      >
        <!-- Top header: Line, model, status badge -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="num font-mono text-xs text-muted-foreground">#{{ row.line }}</span>
            <span class="font-mono font-bold text-sm text-foreground num">
              {{ row.modelCode || '—' }}
            </span>
          </div>

          <span
            :class="[
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold',
              getStatusBadge(row.status).class,
            ]"
          >
            <component :is="getStatusBadge(row.status).icon" class="size-3" aria-hidden="true" />
            <span>{{ getStatusBadge(row.status).label }}</span>
          </span>
        </div>

        <!-- Name & archived -->
        <div v-if="row.name || row.archived" class="flex items-center gap-2 flex-wrap">
          <span v-if="row.name" class="text-xs text-muted-foreground font-medium">
            {{ row.name }}
          </span>
          <span
            v-if="row.archived"
            class="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20"
          >
            <Archive class="size-3" aria-hidden="true" />
            {{ t('admin.products.import.table.archived') }}
          </span>
        </div>

        <!-- Values grid -->
        <div class="grid grid-cols-3 gap-2 rounded-xl bg-muted/30 p-2.5 text-center text-xs">
          <!-- Price -->
          <div class="flex flex-col gap-0.5">
            <span class="text-[10px] text-muted-foreground font-medium">{{ t('admin.products.import.table.price') }}</span>
            <div v-if="row.changes.includes('price')" class="flex flex-col font-bold">
              <span class="num text-[10px] text-muted-foreground line-through">
                {{ formatPriceCell(row.current?.price) }}
              </span>
              <span class="num text-emerald-600 dark:text-emerald-400 text-xs">
                {{ formatPriceCell(row.next?.price) }}
              </span>
            </div>
            <span v-else class="num text-foreground">
              {{ formatPriceCell(row.current?.price) }}
            </span>
          </div>

          <!-- Old Price -->
          <div class="flex flex-col gap-0.5">
            <span class="text-[10px] text-muted-foreground font-medium">{{ t('admin.products.import.table.oldPrice') }}</span>
            <div v-if="row.changes.includes('oldPrice')" class="flex flex-col font-bold">
              <span class="num text-[10px] text-muted-foreground line-through">
                {{ formatPriceCell(row.current?.oldPrice) }}
              </span>
              <span class="num text-emerald-600 dark:text-emerald-400 text-xs">
                {{ formatPriceCell(row.next?.oldPrice) }}
              </span>
            </div>
            <span v-else class="num text-foreground">
              {{ formatPriceCell(row.current?.oldPrice) }}
            </span>
          </div>

          <!-- Stock -->
          <div class="flex flex-col gap-0.5">
            <span class="text-[10px] text-muted-foreground font-medium">{{ t('admin.products.import.table.stock') }}</span>
            <div v-if="row.changes.includes('stock')" class="flex flex-col font-bold">
              <span class="num text-[10px] text-muted-foreground line-through">
                {{ formatStockCell(row.current?.stock) }}
              </span>
              <span class="num text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
                {{ formatStockCell(row.next?.stock) }}
              </span>
            </div>
            <span v-else class="num text-foreground">
              {{ formatStockCell(row.current?.stock) }}
            </span>
          </div>
        </div>

        <!-- Errors -->
        <div v-if="row.errors.length > 0" class="flex flex-col gap-1 border-t border-destructive/20 pt-2">
          <span
            v-for="err in row.errors"
            :key="err"
            class="text-xs text-destructive flex items-center gap-1.5"
          >
            <AlertCircle class="size-3.5 shrink-0" aria-hidden="true" />
            <span>{{ t(err) }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Empty filtered results -->
    <div
      v-if="rows.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center"
    >
      <p class="text-sm text-muted-foreground">
        {{ t('admin.products.import.table.noMatchingRows') }}
      </p>
    </div>
  </div>
</template>
