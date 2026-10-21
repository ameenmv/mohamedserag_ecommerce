<script setup lang="ts">
const props = defineProps<{
  current: number
  total: number
}>()

const { t } = useI18n()

const percent = computed(() => {
  if (props.total <= 0) return 0
  return Math.round((props.current / props.total) * 100)
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="num text-sm font-semibold text-muted-foreground" aria-hidden="true">
      {{ t('store.quiz.progress', { current, total }) }}
    </p>
    <div
      class="h-2 w-full overflow-hidden rounded-full bg-serag-green/10"
      role="progressbar"
      :aria-valuenow="current"
      :aria-valuemin="1"
      :aria-valuemax="total"
      :aria-label="t('store.quiz.progress', { current, total })"
    >
      <div
        class="h-full rounded-full bg-serag-gold transition-[width] duration-300 motion-reduce:transition-none"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>
