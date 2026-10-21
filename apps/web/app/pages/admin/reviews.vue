<script setup lang="ts">
import { PERMISSIONS } from '@serag/shared'
import { CheckCircle2, Clock, XCircle } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.reviews.moderate)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useSeoMeta({ title: () => t('admin.reviews.pageTitle') })
useAdminPageTitle('admin.nav.reviews')

type ReviewTab = 'pending' | 'approved' | 'rejected'

const activeTab = computed<ReviewTab>(() => {
  const tab = route.query.tab
  return tab === 'approved' || tab === 'rejected' ? tab : 'pending'
})

const counts = ref<{ pending: number; approved: number; rejected: number }>({
  pending: 0,
  approved: 0,
  rejected: 0,
})

function setTab(tab: ReviewTab) {
  void router.replace({
    query: {
      ...route.query,
      tab: tab === 'pending' ? undefined : tab,
      page: undefined,
    },
  })
}
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <!-- Header -->
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {{ t('admin.reviews.pageTitle') }}
        </h1>
        <p class="text-xs text-muted-foreground sm:text-sm">
          {{ t('admin.reviews.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Accessible Tabs -->
    <div class="border-b border-border">
      <div
        role="tablist"
        :aria-label="t('admin.reviews.tabs.ariaLabel')"
        class="flex items-center gap-2 -mb-px overflow-x-auto"
      >
        <button
          id="tab-pending"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'pending'"
          aria-controls="panel-reviews"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            activeTab === 'pending'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab('pending')"
        >
          <Clock class="size-4" aria-hidden="true" />
          <span>{{ t('admin.reviews.tabs.pending') }}</span>
          <span
            class="num inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-colors"
            :class="
              activeTab === 'pending'
                ? 'bg-serag-green/15 text-serag-green dark:bg-serag-gold/20 dark:text-serag-gold'
                : 'bg-muted text-muted-foreground'
            "
          >
            {{ counts.pending }}
          </span>
        </button>

        <button
          id="tab-approved"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'approved'"
          aria-controls="panel-reviews"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            activeTab === 'approved'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab('approved')"
        >
          <CheckCircle2 class="size-4" aria-hidden="true" />
          <span>{{ t('admin.reviews.tabs.approved') }}</span>
          <span
            class="num inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-colors"
            :class="
              activeTab === 'approved'
                ? 'bg-serag-green/15 text-serag-green dark:bg-serag-gold/20 dark:text-serag-gold'
                : 'bg-muted text-muted-foreground'
            "
          >
            {{ counts.approved }}
          </span>
        </button>

        <button
          id="tab-rejected"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'rejected'"
          aria-controls="panel-reviews"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            activeTab === 'rejected'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab('rejected')"
        >
          <XCircle class="size-4" aria-hidden="true" />
          <span>{{ t('admin.reviews.tabs.rejected') }}</span>
          <span
            class="num inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-colors"
            :class="
              activeTab === 'rejected'
                ? 'bg-serag-green/15 text-serag-green dark:bg-serag-gold/20 dark:text-serag-gold'
                : 'bg-muted text-muted-foreground'
            "
          >
            {{ counts.rejected }}
          </span>
        </button>
      </div>
    </div>

    <!-- Tab Panel -->
    <div
      id="panel-reviews"
      role="tabpanel"
      :aria-labelledby="`tab-${activeTab}`"
    >
      <AdminReviewsList
        :status="activeTab"
        @counts-change="counts = $event"
      />
    </div>
  </div>
</template>
