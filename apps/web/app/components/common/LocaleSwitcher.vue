<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Languages } from '@lucide/vue'
import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'pill'
    class?: HTMLAttributes['class']
  }>(),
  {
    variant: 'default',
    class: undefined,
  },
)

const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const other = computed(() => locales.value.find((l) => l.code !== locale.value)!)
</script>

<template>
  <NuxtLink
    :to="switchLocalePath(other.code)"
    :lang="other.code"
    :hreflang="other.language"
    :class="
      cn(
        'inline-flex min-h-11 items-center justify-center gap-2 border border-border bg-card px-3.5 text-sm font-bold text-foreground transition-colors hover:border-accent hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
        props.variant === 'pill' ? 'rounded-full' : 'rounded-xl',
        props.class,
      )
    "
  >
    <Languages class="size-4 shrink-0 text-primary" aria-hidden="true" />
    <span>{{ other.name }}</span>
  </NuxtLink>
</template>
