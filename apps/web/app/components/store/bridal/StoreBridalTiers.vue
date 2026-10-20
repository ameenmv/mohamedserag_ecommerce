<script setup lang="ts">
import type { BridalTierSummary } from '@serag/shared'
import StoreBridalTierCard from './StoreBridalTierCard.vue'

defineProps<{
  tiers: BridalTierSummary[]
  pending?: boolean
  hydrated?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', tier: BridalTierSummary): void
}>()
</script>

<template>
  <div class="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 md:gap-6 lg:gap-8">
    <StoreBridalTierCard
      v-for="tier in tiers"
      :key="tier.id"
      :tier="tier"
      :pending="pending"
      :hydrated="hydrated"
      @select="emit('select', $event)"
    />
  </div>
</template>
