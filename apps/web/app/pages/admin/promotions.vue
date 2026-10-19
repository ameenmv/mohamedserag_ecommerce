<script setup lang="ts">
import { PERMISSIONS } from '@serag/shared'
import { Tag, Zap } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.promotions.manage)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useSeoMeta({ title: () => t('admin.promotions.pageTitle') })
useAdminPageTitle('admin.nav.promotions')

type PromotionTab = 'flash' | 'coupons'

const activeTab = computed<PromotionTab>(() => {
  return route.query.tab === 'coupons' ? 'coupons' : 'flash'
})

function setTab(tab: PromotionTab) {
  void router.replace({
    query: {
      ...route.query,
      tab: tab === 'flash' ? undefined : tab,
    },
  })
}
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <!-- Header -->
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {{ t('admin.promotions.pageTitle') }}
      </h1>
    </div>

    <!-- Accessible Tabs -->
    <div class="border-b border-border">
      <div
        role="tablist"
        :aria-label="t('admin.promotions.pageTitle')"
        class="flex items-center gap-2 -mb-px overflow-x-auto"
      >
        <button
          id="tab-flash"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'flash'"
          aria-controls="panel-flash"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            activeTab === 'flash'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab('flash')"
        >
          <Zap class="size-4" aria-hidden="true" />
          <span>{{ t('admin.promotions.tabs.flash') }}</span>
        </button>

        <button
          id="tab-coupons"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'coupons'"
          aria-controls="panel-coupons"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            activeTab === 'coupons'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab('coupons')"
        >
          <Tag class="size-4" aria-hidden="true" />
          <span>{{ t('admin.promotions.tabs.coupons') }}</span>
        </button>
      </div>
    </div>

    <!-- Tab Panels -->
    <div
      id="panel-flash"
      role="tabpanel"
      aria-labelledby="tab-flash"
      :class="activeTab === 'flash' ? 'block' : 'hidden'"
    >
      <AdminPromotionsFlashTab />
    </div>

    <div
      id="panel-coupons"
      role="tabpanel"
      aria-labelledby="tab-coupons"
      :class="activeTab === 'coupons' ? 'block' : 'hidden'"
    >
      <AdminPromotionsCouponsTab />
    </div>
  </div>
</template>
