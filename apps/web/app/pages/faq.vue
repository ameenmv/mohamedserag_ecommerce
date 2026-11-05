<script setup lang="ts">
import { buildFaqJsonLd } from '~/utils/faq-jsonld'

const { t, locale } = useI18n()

const {
  rawItems,
  hasEntries,
  cmsPage,
  storeInfo,
  selectedTopic,
  searchQuery,
  activeQuestionId,
  filteredItems,
  topicCounts,
  toggleQuestion,
  resetFilters,
} = await useFaq()

useSeoPage({
  title: () => t('store.faq.seoTitle'),
  description: () => t('store.faq.seoDescription'),
})

useJsonLd('ld-faq', () => buildFaqJsonLd(rawItems.value))
</script>

<template>
  <main class="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
    <StoreListingBreadcrumb :items="[{ label: t('store.faq.title') }]" />

    <!-- Legacy CMS Fallback View when no structured entries exist -->
    <template v-if="!hasEntries && cmsPage">
      <article class="mt-4">
        <h1 class="title-draw font-display text-4xl text-foreground sm:text-5xl lg:text-6xl">
          <CommonMadText :text="cmsPage.title" size="xl" />
        </h1>
        <p class="mt-2 text-xs text-muted-foreground sm:text-sm">
          {{ t('store.pages.updatedAt', { date: formatDate(cmsPage.updatedAt, locale) }) }}
        </p>

        <div class="mt-6 rounded-[28px] border border-border bg-card p-5 sm:p-8">
          <StoreContentProse :html="cmsPage.body" />
        </div>
      </article>
    </template>

    <!-- Standard Premium FAQ View -->
    <template v-else>
      <StoreFaqHeader
        :title="t('store.faq.headline')"
        :subtitle="t('store.faq.subtitle')"
        class="mt-4 sm:mt-6"
      />

      <div class="mt-8 flex flex-col gap-6 sm:mt-10 sm:gap-8">
        <!-- Live Arabic-normalizing search -->
        <StoreFaqSearch v-model="searchQuery" />

        <!-- Topic pill button tabs -->
        <StoreFaqTabs
          v-model="selectedTopic"
          :counts="topicCounts"
        />

        <!-- Accordion of questions -->
        <StoreFaqAccordion
          :items="filteredItems"
          :active-id="activeQuestionId"
          @toggle="toggleQuestion"
          @reset-filters="resetFilters"
        />

        <!-- Closing contact card with WhatsApp & Phone -->
        <StoreFaqContactCard :store-info="storeInfo" />
      </div>
    </template>
  </main>
</template>
