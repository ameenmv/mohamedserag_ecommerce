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
  <section
    class="border-b border-[#ECE6D3] bg-card"
    :aria-labelledby="headingId"
  >
    <h2 :id="headingId" class="sr-only">{{ t('store.home.uspHeading') }}</h2>
    <div class="mx-auto flex max-w-7xl flex-wrap gap-7 px-4 py-9 sm:px-6 lg:px-10">
      <div
        v-for="(item, index) in content.items"
        :key="item.title"
        class="flex min-w-0 flex-1 basis-60 items-center gap-4"
      >
        <div
          :class="[
            'flex size-[60px] flex-none items-center justify-center rounded-[18px]',
            index % 2 === 0 ? 'bg-[#EAF2DC] text-serag-green' : 'bg-[#F4EFD6] text-serag-gold-ink',
          ]"
          aria-hidden="true"
        >
          <component :is="iconFor(index)" class="size-[30px]" :stroke-width="1.8" />
        </div>
        <div class="min-w-0">
          <p class="text-lg font-bold text-foreground">{{ item.title }}</p>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
