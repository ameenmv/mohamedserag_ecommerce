<script setup lang="ts">
defineProps<{
  name?: string
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
  </div>
</template>
