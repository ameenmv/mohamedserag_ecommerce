<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
// The same list as the footer's service column, so shoppers can move between policies
const { links } = useFooterPages()

const { page, title, seoTitle, seoDescription, updatedLabel } = await useContentPage()

useSeoPage({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
})
</script>

<template>
  <main class="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <StoreListingBreadcrumb :items="[{ label: title }]" />

    <div class="mt-4 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
      <article class="min-w-0 lg:col-span-8">
        <h1 class="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
          {{ title }}
        </h1>
        <p v-if="page" class="mt-2 text-xs text-muted-foreground sm:text-sm">
          {{ t('store.pages.updatedAt', { date: updatedLabel }) }}
        </p>

        <div v-if="page" class="mt-6 rounded-[28px] border border-border bg-card p-5 sm:p-8">
          <StoreContentProse :html="page.body" />
        </div>
      </article>

      <nav
        :aria-label="t('store.pages.moreTitle')"
        class="rounded-[28px] border border-border bg-card p-5 lg:sticky lg:top-28 lg:col-span-4"
      >
        <h2 class="mb-3 text-sm font-bold text-foreground">
          {{ t('store.pages.moreTitle') }}
        </h2>
        <ul class="flex flex-col gap-1">
          <li v-for="link in links" :key="link.to">
            <NuxtLink
              :to="localePath(link.to)"
              :aria-current="route.path === localePath(link.to) ? 'page' : undefined"
              class="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-serag-cream focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:bg-serag-green aria-[current=page]:text-serag-ivory"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </main>
</template>
