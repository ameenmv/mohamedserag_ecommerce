<script setup lang="ts">
import type { FooterLinkItem, FooterResolvedLink } from '~/constants/navigation'

defineProps<{
  title: string
  links: readonly (FooterLinkItem | FooterResolvedLink)[]
  gridColsClass?: string
}>()

const { t } = useI18n()
const localePath = useLocalePath()

function linkLabel(link: FooterLinkItem | FooterResolvedLink): string {
  return 'label' in link ? link.label : t(link.labelKey)
}
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <h2 class="mb-1 text-lg font-bold text-serag-ivory">
      {{ title }}
    </h2>
    <div :class="gridColsClass">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="localePath(link.to)"
        class="inline-flex min-h-11 items-center rounded-lg px-1 text-base transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
      >
        {{ linkLabel(link) }}
      </NuxtLink>
    </div>
  </div>
</template>
