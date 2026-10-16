<script setup lang="ts">
defineProps<{
  message?: string
}>()

const { t } = useI18n()
</script>

<template>
  <Card class="border-dashed py-12 text-center">
    <CardContent class="flex flex-col items-center justify-center gap-2">
      <p class="text-base font-medium text-muted-foreground">
        <slot>{{ message ?? t('admin.dashboard.emptyState') }}</slot>
      </p>
    </CardContent>
  </Card>
</template>
