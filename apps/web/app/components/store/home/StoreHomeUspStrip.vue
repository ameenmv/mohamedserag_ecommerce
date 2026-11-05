<script setup lang="ts">
import { Award, Banknote, ShieldCheck, Truck } from '@lucide/vue'
import type { Component } from 'vue'
import type { HomeContent } from '@serag/shared'

defineProps<{
  content: HomeContent['uspStrip']
}>()

const { t } = useI18n()

const icons: Component[] = [ShieldCheck, Award, Truck, Banknote]

function iconFor(index: number): Component {
  return icons[index % icons.length] ?? ShieldCheck
}

const headingId = useId()
</script>

<template>
  <!-- A slim trust bar under the hero: the store's four promises in one row -->
  <section class="bg-serag-ivory" :aria-labelledby="headingId">
    <h2 :id="headingId" class="sr-only">{{ t('store.home.uspHeading') }}</h2>
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div class="grid grid-cols-2 gap-3 rounded-[28px] border border-[#E6DFCF] bg-card p-3 sm:p-4 lg:grid-cols-4 lg:gap-2">
        <div
          v-for="(item, index) in content.items"
          :key="item.title"
          class="flex min-w-0 flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center sm:flex-row sm:gap-3 sm:text-start lg:px-4"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-serag-green/10 text-serag-green" aria-hidden="true">
            <component :is="iconFor(index)" class="size-5" :stroke-width="1.8" />
          </span>
          <div class="min-w-0">
            <p class="font-display text-base leading-tight text-serag-ink sm:text-lg">{{ item.title }}</p>
            <p class="mt-0.5 text-xs leading-snug text-serag-ink/70 sm:text-sm">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
