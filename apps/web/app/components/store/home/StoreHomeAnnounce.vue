<script setup lang="ts">
import type { HomeContent } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['announce']
}>()

const localePath = useLocalePath()

const external = computed(() => isExternalHref(props.content.href ?? ''))

const link = computed(() => {
  const href = props.content.href
  if (!href) return null
  return isInternalHref(href) ? localePath(href) : href
})
</script>

<template>
  <div class="bg-serag-deep text-serag-ivory">
    <div class="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium sm:py-2.5 sm:text-sm">
      <NuxtLink
        v-if="link"
        :to="link"
        :target="external ? '_blank' : undefined"
        :rel="external ? 'noopener noreferrer' : undefined"
        class="underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
      >
        {{ content.text }}
      </NuxtLink>
      <span v-else>{{ content.text }}</span>
    </div>
  </div>
</template>
