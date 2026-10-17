<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('store.compare.pageTitle'),
  robots: 'noindex, follow',
})

const compare = useCompareTable()
</script>

<template>
  <main class="w-full min-w-0">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb :items="[{ label: t('store.compare.title') }]" />
      </div>
    </div>

    <!-- Page Content Composition -->
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
      <StoreCompareEmpty
        v-if="compare.isMounted.value && !compare.loading.value && compare.products.value.length < 2"
        :products="compare.products.value"
        @remove="compare.remove"
      />
      <StoreCompareTable
        v-else
        v-model:show-only-differences="compare.showOnlyDifferences.value"
        :products="compare.products.value"
        :table-data="compare.tableData.value"
        :displayed-rows="compare.displayedRows.value"
        :loading="!compare.isMounted.value || compare.loading.value"
        @remove="compare.remove"
        @clear="compare.clear"
      />
    </div>
  </main>
</template>
