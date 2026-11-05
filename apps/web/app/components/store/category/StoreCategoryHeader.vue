<script setup lang="ts">
import {
  resolveCategoryAccent,
  type CategoryAccent,
  type CategoryIllustration,
} from '@serag/shared'

const props = withDefaults(
  defineProps<{
    category: {
      name: string
      slug?: string
      intro?: string | null
      accent?: string | null
      illustration?: string | null
    }
    accent?: CategoryAccent | string | null
    illustration?: CategoryIllustration | string | null
    productCount?: number
    startingPrice?: number | null
  }>(),
  {
    accent: undefined,
    illustration: undefined,
    productCount: undefined,
    startingPrice: undefined,
  },
)

const { t } = useI18n()
const { money } = usePrice()

const resolvedAccent = computed<CategoryAccent>(() =>
  resolveCategoryAccent(props.accent ?? props.category?.accent, props.category?.slug),
)

const metaLine = computed(() => {
  const parts: string[] = []
  if (props.productCount !== undefined && props.productCount !== null) {
    parts.push(t('store.category.categoryCount', { count: props.productCount }))
  }
  if (props.startingPrice !== undefined && props.startingPrice !== null) {
    parts.push(t('store.category.startingFrom', { price: money(props.startingPrice) }))
  }
  return parts.join(' · ')
})
</script>

<template>
  <header
    class="relative py-2 sm:py-3"
    :data-accent="resolvedAccent"
  >
    <div class="flex flex-col gap-2.5 sm:gap-3">
      <!-- Large title in category accent colour -->
      <h1 class="font-display text-[clamp(40px,5.5vw,72px)] font-extrabold leading-[1.1] text-[var(--cat-fg)]">
        <CommonMadText :text="category.name" size="lg" />
      </h1>

      <!-- Short accent underline bar under the title -->
      <div
        class="h-1.5 w-24 rounded-full"
        :style="{ backgroundColor: 'var(--cat-accent)' }"
        aria-hidden="true"
      />

      <!-- One-line intro (if any) -->
      <p
        v-if="category.intro"
        class="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
      >
        {{ category.intro }}
      </p>

      <!-- Muted metadata line: "N منتج · من X ج.م" -->
      <p
        v-if="metaLine"
        class="text-xs font-medium text-muted-foreground sm:text-sm"
      >
        {{ metaLine }}
      </p>
    </div>
  </header>
</template>
