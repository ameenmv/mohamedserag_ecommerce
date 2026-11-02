<script setup lang="ts">
import type { ReportGrouping, ReportPreset } from '@serag/shared'
import { REPORT_GROUPINGS, REPORT_PRESETS } from '@serag/shared'
import { AlertCircle, Download } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  REPORT_GROUPING_LABEL_KEYS,
  REPORT_PRESET_LABEL_KEYS,
} from '~/utils/admin-reports'

defineProps<{
  preset: ReportPreset | 'custom'
  from: string
  to: string
  groupBy: ReportGrouping
  showGroupBy: boolean
  error: string | null
  exportHref: string | null
}>()

const emit = defineEmits<{
  'set-preset': [preset: ReportPreset | 'custom']
  'update:from': [value: string]
  'update:to': [value: string]
  apply: []
  'set-group-by': [groupBy: ReportGrouping]
}>()

const { t } = useI18n()

const presetOptions: (ReportPreset | 'custom')[] = [...REPORT_PRESETS, 'custom']
</script>

<template>
  <div class="flex flex-col gap-3 min-w-0" data-test="reports-toolbar">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <!-- Preset range -->
      <div class="flex flex-col gap-1.5 min-w-0">
        <span class="text-[11px] font-bold text-muted-foreground">
          {{ t('admin.reports.period.label') }}
        </span>
        <div
          role="group"
          :aria-label="t('admin.reports.period.label')"
          class="flex flex-wrap gap-1.5"
        >
          <button
            v-for="option in presetOptions"
            :key="option"
            type="button"
            class="min-h-11 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            :class="
              preset === option
                ? 'border-serag-night bg-serag-night text-white dark:border-serag-gold dark:bg-serag-gold dark:text-serag-night'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            "
            :aria-pressed="preset === option"
            @click="emit('set-preset', option)"
          >
            {{ t(REPORT_PRESET_LABEL_KEYS[option]) }}
          </button>
        </div>
      </div>

      <!-- Grouping + Export -->
      <div class="flex flex-wrap items-end gap-3">
        <div v-if="showGroupBy" class="flex flex-col gap-1.5 min-w-0">
          <span class="text-[11px] font-bold text-muted-foreground">
            {{ t('admin.reports.period.groupBy') }}
          </span>
          <div
            role="group"
            :aria-label="t('admin.reports.period.groupBy')"
            class="inline-flex rounded-xl border border-border/80 bg-muted/40 p-1"
          >
            <button
              v-for="option in REPORT_GROUPINGS"
              :key="option"
              type="button"
              class="min-h-9 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              :class="
                groupBy === option
                  ? 'bg-serag-night text-white dark:bg-serag-gold dark:text-serag-night'
                  : 'text-muted-foreground hover:text-foreground'
              "
              :aria-pressed="groupBy === option"
              @click="emit('set-group-by', option)"
            >
              {{ t(REPORT_GROUPING_LABEL_KEYS[option]) }}
            </button>
          </div>
        </div>

        <a
          v-if="exportHref"
          :href="exportHref"
          download
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input bg-card px-4 text-xs font-bold text-foreground shadow-xs transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-test="reports-export"
        >
          <Download class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
          <span>{{ t('admin.reports.period.exportCsv') }}</span>
        </a>
      </div>
    </div>

    <!-- Custom range -->
    <div v-if="preset === 'custom'" class="flex flex-wrap items-end gap-2.5" data-test="reports-custom-range">
      <AdminFormDatePicker
        :model-value="from"
        :label="t('admin.reports.period.from')"
        :max="to || undefined"
        class="min-w-44"
        @update:model-value="emit('update:from', $event)"
      />
      <AdminFormDatePicker
        :model-value="to"
        :label="t('admin.reports.period.to')"
        :min="from || undefined"
        class="min-w-44"
        @update:model-value="emit('update:to', $event)"
      />

      <Button
        type="button"
        size="sm"
        class="min-h-11 rounded-xl bg-serag-gold px-4 text-xs font-bold text-serag-ink shadow-xs hover:bg-serag-gold-hi"
        @click="emit('apply')"
      >
        {{ t('admin.reports.period.apply') }}
      </Button>
    </div>

    <!-- Query error (bad URL params, custom apply validation) -->
    <div
      v-if="error"
      class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive"
      role="alert"
      data-test="reports-period-error"
    >
      <AlertCircle class="size-4 shrink-0" aria-hidden="true" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
