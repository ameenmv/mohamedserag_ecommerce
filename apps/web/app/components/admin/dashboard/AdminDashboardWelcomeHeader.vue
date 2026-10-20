<script setup lang="ts">
defineProps<{
  name?: string
  newOrders?: number | null
  calm?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <div>
    <h1 class="font-display text-3xl sm:text-4xl text-foreground">
      {{ t('admin.dashboard.welcome', { name: name ?? '' }) }}
    </h1>
    <p class="mt-1 text-sm text-muted-foreground">
      {{ t('admin.dashboard.subtitle') }}
    </p>
    <p
      v-if="newOrders"
      class="mt-3 inline-flex min-h-9 items-center rounded-full bg-serag-green/10 px-4 text-sm font-bold text-serag-green dark:bg-serag-gold/15 dark:text-serag-gold"
    >
      {{ t('admin.dashboard.hero.newOrders', { count: String(newOrders) }) }}
    </p>
    <p
      v-else-if="calm"
      class="mt-3 inline-flex min-h-9 items-center rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground"
    >
      {{ t('admin.dashboard.hero.calm') }}
    </p>
  </div>
</template>
