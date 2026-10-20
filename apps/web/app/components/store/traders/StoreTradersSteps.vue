<script setup lang="ts">
const { t } = useI18n()

const steps = computed(() =>
  [1, 2, 3].map((index) => ({
    title: t(`store.traders.steps.step${index}Title`),
    description: t(`store.traders.steps.step${index}Desc`),
  })),
)
</script>

<template>
  <section
    class="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7"
    :aria-label="t('store.traders.steps.title')"
  >
    <h2 class="font-display text-xl text-foreground sm:text-2xl">
      {{ t('store.traders.steps.title') }}
    </h2>

    <ol class="mt-5 grid gap-4 sm:grid-cols-3">
      <li
        v-for="(step, index) in steps"
        :key="index"
        class="flex flex-col gap-2 rounded-2xl bg-serag-ivory/60 p-4 dark:bg-muted/40"
      >
        <span class="num inline-flex size-9 items-center justify-center rounded-full bg-serag-green/10 text-sm font-bold text-serag-green dark:bg-serag-gold/15 dark:text-serag-gold">
          {{ index + 1 }}
        </span>
        <h3 class="text-base font-bold text-foreground">{{ step.title }}</h3>
        <p class="text-sm leading-relaxed text-muted-foreground">{{ step.description }}</p>
      </li>
    </ol>
  </section>
</template>
