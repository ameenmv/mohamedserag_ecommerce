<script setup lang="ts">
import { AlertCircle, BarChart3, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

defineProps<{
  loading: boolean
  error: string | null
  empty: boolean
}>()

defineEmits<{
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="flex flex-col gap-2" data-test="reports-loading">
    <Skeleton v-for="i in 5" :key="i" class="h-14 w-full rounded-xl" />
  </div>

  <!-- Error -->
  <div
    v-else-if="error"
    class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"
    data-test="reports-error"
  >
    <AlertCircle class="size-8 text-destructive" aria-hidden="true" />
    <p class="text-sm font-semibold text-destructive">{{ error }}</p>
    <Button
      type="button"
      variant="outline"
      size="sm"
      class="gap-1.5 rounded-xl text-xs"
      @click="$emit('retry')"
    >
      <RefreshCw class="size-3.5" aria-hidden="true" />
      <span>{{ t('common.retry') }}</span>
    </Button>
  </div>

  <!-- Empty -->
  <div
    v-else-if="empty"
    class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-12 text-center"
    data-test="reports-empty"
  >
    <BarChart3 class="size-10 text-muted-foreground/30" aria-hidden="true" />
    <p class="text-sm font-medium text-muted-foreground">{{ t('admin.reports.empty') }}</p>
  </div>

  <!-- Content -->
  <slot v-else />
</template>
