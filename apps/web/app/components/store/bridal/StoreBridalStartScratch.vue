<script setup lang="ts">
import { PlusCircle } from '@lucide/vue'

defineProps<{
  pending?: boolean
  hydrated?: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="mt-12 rounded-3xl border border-dashed border-border/80 bg-muted/20 p-6 text-center sm:p-8">
    <div class="mx-auto max-w-xl">
      <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PlusCircle class="size-6" aria-hidden="true" />
      </div>

      <h3 class="text-xl font-bold text-foreground">
        {{ t('store.bridal.scratch.title') }}
      </h3>

      <p class="mt-2 text-sm text-muted-foreground">
        {{ t('store.bridal.scratch.description') }}
      </p>

      <div class="mt-5">
        <button
          type="button"
          data-start-scratch
          :disabled="pending || !hydrated"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/80 bg-background px-6 text-sm font-bold text-foreground shadow-xs transition-colors hover:bg-muted hover:border-border disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="emit('start')"
        >
          <span>{{ pending ? t('store.bridal.scratch.starting') : t('store.bridal.scratch.button') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
