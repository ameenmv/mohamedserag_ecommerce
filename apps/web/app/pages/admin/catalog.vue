<script setup lang="ts">
import type { AdminBrand, AdminCategory, AdminSpecTemplate } from '@serag/shared'
import { FolderTree, Layers, Sparkles } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useSeoMeta({ title: () => t('admin.catalog.title') })
useAdminPageTitle('admin.nav.catalog')

const categoriesApi = useAdminCategories()
const brandsApi = useAdminBrands()
const specTemplatesApi = useAdminSpecTemplates()

type CatalogTab = 'categories' | 'brands' | 'spec-templates'
const activeTab = computed<CatalogTab>(() => {
  const queryTab = route.query.tab
  if (queryTab === 'brands' || queryTab === 'spec-templates') {
    return queryTab
  }
  return 'categories'
})

function setTab(tab: CatalogTab) {
  void router.replace({
    query: {
      ...route.query,
      tab: tab === 'categories' ? undefined : tab,
    },
  })
}

// Data loading
const {
  data: catalogData,
  status,
  refresh,
} = await useAsyncData('admin-catalog-data', async () => {
  const [categories, brands, specTemplates] = await Promise.all([
    categoriesApi.list(),
    brandsApi.list(),
    specTemplatesApi.list(),
  ])
  return {
    categories,
    brands,
    specTemplates,
  }
})

const categories = computed<AdminCategory[]>(() => catalogData.value?.categories ?? [])
const brands = computed<AdminBrand[]>(() => catalogData.value?.brands ?? [])
const specTemplates = computed<AdminSpecTemplate[]>(() => catalogData.value?.specTemplates ?? [])
const loading = computed(() => status.value === 'pending')
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {{ t('admin.catalog.title') }}
      </h1>
    </div>

    <!-- Accessible Tabs -->
    <div class="border-b border-border">
      <div
        role="tablist"
        :aria-label="t('admin.catalog.title')"
        class="flex items-center gap-2 -mb-px overflow-x-auto"
      >
        <button
          id="tab-categories"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'categories'"
          aria-controls="panel-categories"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            activeTab === 'categories'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab('categories')"
        >
          <FolderTree class="size-4" aria-hidden="true" />
          <span>{{ t('admin.catalog.tabs.categories') }}</span>
          <span class="num ms-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {{ categories.length }}
          </span>
        </button>

        <button
          id="tab-brands"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'brands'"
          aria-controls="panel-brands"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            activeTab === 'brands'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab('brands')"
        >
          <Sparkles class="size-4" aria-hidden="true" />
          <span>{{ t('admin.catalog.tabs.brands') }}</span>
          <span class="num ms-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {{ brands.length }}
          </span>
        </button>

        <button
          id="tab-spec-templates"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'spec-templates'"
          aria-controls="panel-spec-templates"
          class="flex shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer"
          :class="
            activeTab === 'spec-templates'
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab('spec-templates')"
        >
          <Layers class="size-4" aria-hidden="true" />
          <span>{{ t('admin.catalog.tabs.specTemplates') }}</span>
          <span class="num ms-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {{ specTemplates.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- Tab Panels -->
    <div
      id="panel-categories"
      role="tabpanel"
      aria-labelledby="tab-categories"
      :class="activeTab === 'categories' ? 'block' : 'hidden'"
    >
      <AdminCatalogCategoriesTab
        :categories="categories"
        :spec-templates="specTemplates"
        :loading="loading"
        @refresh="refresh"
      />
    </div>

    <div
      id="panel-brands"
      role="tabpanel"
      aria-labelledby="tab-brands"
      :class="activeTab === 'brands' ? 'block' : 'hidden'"
    >
      <AdminCatalogBrandsTab
        :brands="brands"
        :loading="loading"
        @refresh="refresh"
      />
    </div>

    <div
      id="panel-spec-templates"
      role="tabpanel"
      aria-labelledby="tab-spec-templates"
      :class="activeTab === 'spec-templates' ? 'block' : 'hidden'"
    >
      <AdminCatalogSpecTemplatesTab
        :templates="specTemplates"
        :loading="loading"
        @refresh="refresh"
      />
    </div>
  </div>
</template>
