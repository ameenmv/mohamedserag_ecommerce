<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { BridalExpiringItem } from '@serag/shared'
import { Clock } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const { t } = useI18n()
const localePath = useLocalePath()

const items = ref<BridalExpiringItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function fetchExpiring() {
  loading.value = true
  error.value = null
  try {
    const res = await adminFetch<{ items: BridalExpiringItem[] }>('/admin/bridal/expiring')
    items.value = res.items
  } catch (err) {
    error.value = parseAdminApiError(err).message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchExpiring()
})
</script>

<template>
  <Card class="min-w-0 shadow-xs border-border/80">
    <CardHeader class="pb-3 border-b border-border/60">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Clock class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
          <CardTitle class="text-base font-bold text-foreground">
            {{ t('admin.dashboard.expiringLocks.title') }}
          </CardTitle>
        </div>
        <span
          v-if="!loading && items.length > 0"
          class="num inline-flex items-center justify-center rounded-full bg-serag-night/10 dark:bg-serag-gold/20 px-2 py-0.5 text-xs font-bold text-serag-night dark:text-serag-gold"
        >
          {{ items.length }}
        </span>
      </div>
    </CardHeader>

    <CardContent class="pt-4">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="flex flex-col gap-2.5">
        <div v-for="i in 3" :key="i" class="h-12 w-full rounded-xl bg-muted/50 animate-pulse" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="break-words py-3 text-center text-xs text-destructive">
        {{ error }}
      </div>

      <!-- Empty State -->
      <div
        v-else-if="items.length === 0"
        class="py-6 text-center text-xs text-muted-foreground"
      >
        {{ t('admin.dashboard.expiringLocks.empty') }}
      </div>

      <!-- Expiring Items List -->
      <div v-else class="divide-y divide-border/60 min-w-0">
        <div
          v-for="item in items"
          :key="item.id"
          class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 min-w-0"
        >
          <div class="flex items-center gap-3 min-w-0">
            <NuxtLink
              :to="localePath(`/admin/orders/${item.id}`)"
              class="font-mono text-xs font-bold text-serag-night dark:text-serag-gold hover:underline shrink-0"
            >
              {{ item.no }}
            </NuxtLink>
            <span class="truncate text-xs font-medium text-foreground">
              {{ item.customerName }}
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span
              v-if="item.lockExpired"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-destructive/10 text-destructive border border-destructive/20"
            >
              {{ t('admin.dashboard.expiringLocks.expired') }}
            </span>
            <span
              v-else
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-900 bg-amber-100 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
            >
              {{ t('admin.dashboard.expiringLocks.daysLeft', { n: item.lockDaysLeft ?? 0 }) }}
            </span>

          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
