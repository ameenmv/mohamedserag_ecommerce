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

// Size and colour by position: a big green tile, a wide sand one, then ivory and charcoal
function tileClass(index: number): string {
  const size = index === 0 ? 'col-span-2 lg:row-span-2' : index === 1 ? 'col-span-2' : ''
  const tones = [
    'bg-serag-green text-serag-ivory',
    'bg-[#EFE6D2] text-serag-ink',
    'border border-[#E6DFCF] bg-card text-serag-ink',
    'bg-serag-night text-serag-ivory',
  ]
  return `${size} ${tones[index % tones.length]}`
}

const headingId = useId()
</script>

<template>
  <!-- The store's promises as a bento grid: the first one large, the rest in smaller tiles -->
  <section class="bg-serag-ivory" :aria-labelledby="headingId">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <h2 :id="headingId" class="mb-8 font-display text-[clamp(34px,4.5vw,56px)] leading-none text-serag-green sm:mb-10">
        {{ t('store.home.uspHeading') }}
      </h2>
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[minmax(170px,auto)] lg:grid-cols-4">
        <div
          v-for="(item, index) in content.items"
          :key="item.title"
          :class="['group relative flex min-w-0 flex-col justify-between gap-6 overflow-hidden rounded-[28px] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_50px_-28px_rgba(20,20,18,.45)] sm:p-7 motion-reduce:transition-none motion-reduce:hover:translate-y-0', tileClass(index)]"
        >
          <component
            :is="iconFor(index)"
            class="pointer-events-none absolute -bottom-6 -end-6 size-40 opacity-[.12] transition-transform duration-700 ease-out group-hover:-rotate-12 group-hover:scale-110 motion-reduce:transition-none"
            :stroke-width="1.2"
            aria-hidden="true"
          />
          <div
            :class="['flex size-14 items-center justify-center rounded-2xl', index === 0 ? 'bg-serag-ivory/15' : 'bg-current/10']"
            aria-hidden="true"
          >
            <component :is="iconFor(index)" class="size-7" :stroke-width="1.8" />
          </div>
          <div class="relative min-w-0">
            <p :class="['font-display leading-tight', index === 0 ? 'text-[clamp(30px,3.6vw,48px)]' : 'text-xl sm:text-2xl']">{{ item.title }}</p>
            <p :class="['mt-1.5', index === 0 ? 'text-base sm:text-lg' : 'text-sm']">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
