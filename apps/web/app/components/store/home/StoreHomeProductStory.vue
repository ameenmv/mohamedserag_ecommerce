<script setup lang="ts">
import type { HomeContent, ProductCard } from '@serag/shared'

defineProps<{
  content: HomeContent['productStory']
  product: ProductCard | null
}>()
</script>

<template>
  <section class="py-12">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2 class="font-display text-3xl font-bold text-foreground">{{ content.title }}</h2>
      <dl class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div v-for="(callout, index) in content.callouts" :key="index" class="flex flex-col">
          <dt class="text-sm text-muted-foreground">{{ callout.label }}</dt>
          <dd class="text-xl font-bold text-foreground">{{ callout.value }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
