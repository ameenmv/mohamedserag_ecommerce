<script setup lang="ts">
import {
  resolveCategoryAccent,
  resolveCategoryIllustration,
  type CategoryAccent,
  type CategoryIllustration,
} from '@serag/shared'

const props = defineProps<{
  category: {
    name: string
    slug?: string
    intro?: string | null
    accent?: string | null
    illustration?: string | null
  }
  accent?: CategoryAccent | string | null
  illustration?: CategoryIllustration | string | null
}>()

const resolvedAccent = computed<CategoryAccent>(() =>
  resolveCategoryAccent(props.accent ?? props.category?.accent, props.category?.slug),
)

const resolvedIllustration = computed<CategoryIllustration>(() =>
  resolveCategoryIllustration(
    props.illustration ?? props.category?.illustration,
    props.category?.slug,
  ),
)
</script>

<template>
  <div
    class="category-identity-band relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 sm:rounded-3xl sm:p-8 md:min-h-[170px] md:flex-row md:items-center md:gap-8 lg:p-10"
    :data-accent="resolvedAccent"
  >
    <!-- Text column: Title and Intro with entrance stagger -->
    <div class="relative z-10 flex max-w-2xl flex-col gap-2">
      <h1 class="cat-title font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
        {{ category.name }}
      </h1>
      <p
        v-if="category.intro"
        class="cat-intro text-sm leading-relaxed opacity-85 sm:text-base md:text-lg"
      >
        {{ category.intro }}
      </p>
    </div>

    <!-- Large line illustration at inline-end side, softly cropped -->
    <div
      class="pointer-events-none absolute -bottom-10 -end-8 select-none text-current opacity-25 sm:opacity-35 md:static md:-my-10 md:-me-6 md:opacity-90 lg:-my-12 lg:-me-8"
      aria-hidden="true"
    >
      <StoreCategoryIllustration
        :name="resolvedIllustration"
        class="size-44 sm:size-56 md:size-64 lg:size-72"
      />
    </div>
  </div>
</template>
