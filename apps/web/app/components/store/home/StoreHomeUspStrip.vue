<script setup lang="ts">
import { Award, CreditCard, ShieldCheck, Truck } from '@lucide/vue'
import type { Component } from 'vue'
import type { HomeContent } from '@serag/shared'

defineProps<{
  content: HomeContent['uspStrip']
}>()

const { t } = useI18n()

const icons: Component[] = [ShieldCheck, Award, Truck, CreditCard]

function iconFor(index: number): Component {
  return icons[index % icons.length] ?? ShieldCheck
}

const headingId = useId()
</script>

<template>
  <section
    class="border-b border-border bg-card"
    :aria-labelledby="headingId"
  >
    <h2 :id="headingId" class="sr-only">{{ t('store.home.uspHeading') }}</h2>
    <div class="mx-auto flex max-w-7xl flex-wrap gap-7 px-4 py-9 sm:px-6 lg:px-8">
      <div
        v-for="(item, index) in content.items"
        :key="item.title"
        class="flex min-w-0 flex-1 basis-60 items-center gap-4"
      >
        <div
          class="flex size-14 flex-none items-center justify-center rounded-2xl bg-serag-green/10 text-serag-green"
          aria-hidden="true"
        >
          <component :is="iconFor(index)" class="size-7" />
        </div>
        <div class="min-w-0">
          <p class="font-bold text-foreground">{{ item.title }}</p>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
