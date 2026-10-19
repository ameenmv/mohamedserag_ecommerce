<script setup lang="ts">
import { Star } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const { t } = useI18n()
const localePath = useLocalePath()
const reviewsApi = useAdminReviews()

const count = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

async function fetchPendingCount() {
  loading.value = true
  error.value = null
  try {
    const res = await reviewsApi.pendingCount()
    count.value = res.count
  } catch (err: unknown) {
    error.value = parseAdminApiError(err, t).message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchPendingCount()
})
</script>

<template>
  <Card class="min-w-0 shadow-xs border-border/80" data-testid="admin-dashboard-pending-reviews">
    <CardHeader class="pb-3 border-b border-border/60">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Star class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
          <CardTitle class="text-base font-bold text-foreground">
            {{ t('admin.dashboard.pendingReviews.title') }}
          </CardTitle>
        </div>
        <span
          v-if="!loading && count > 0"
          class="num inline-flex items-center justify-center rounded-full bg-serag-night/10 dark:bg-serag-gold/20 px-2 py-0.5 text-xs font-bold text-serag-night dark:text-serag-gold"
        >
          {{ count }}
        </span>
      </div>
    </CardHeader>

    <CardContent class="pt-4">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="flex flex-col gap-2.5">
        <div class="h-12 w-full rounded-xl bg-muted/50 animate-pulse" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-xs text-destructive py-3 text-center break-words">
        {{ error }}
      </div>

      <!-- Empty State (0) -->
      <div
        v-else-if="count === 0"
        class="py-6 text-center text-xs text-muted-foreground"
      >
        {{ t('admin.dashboard.pendingReviews.empty') }}
      </div>

      <!-- Count > 0 Content -->
      <div v-else class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-1">
        <p class="text-xs text-muted-foreground">
          {{ t('admin.dashboard.pendingReviews.countDescription', { count }) }}
        </p>
        <NuxtLink
          :to="localePath('/admin/reviews')"
          class="inline-flex min-h-11 sm:min-h-9 items-center justify-center rounded-xl bg-serag-night px-4 text-xs font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi shrink-0"
        >
          {{ t('admin.dashboard.pendingReviews.reviewAction') }}
        </NuxtLink>
      </div>
    </CardContent>
  </Card>
</template>
