<script setup lang="ts">
import type { NuxtError } from '#app'
import { Home, ShoppingBag } from '@lucide/vue'

const props = defineProps<{
  error: NuxtError
}>()

useAppHead()

const { t } = useI18n()
const localePath = useLocalePath()

const statusCode = computed(() => props.error?.statusCode ?? 500)
const is404 = computed(() => statusCode.value === 404)

const title = computed(() =>
  is404.value
    ? t('store.errorPage.notFoundTitle')
    : t('store.errorPage.generalTitle'),
)

const description = computed(() =>
  is404.value
    ? t('store.errorPage.notFoundDescription')
    : t('store.errorPage.generalDescription'),
)

useHead({
  title: () => title.value,
})

useSeoMeta({
  robots: 'noindex',
})

function handleGoHome(): Promise<void> {
  return clearError({ redirect: localePath('/') })
}

function handleGoShop(): Promise<void> {
  return clearError({ redirect: localePath('/shop') })
}
</script>

<template>
  <NuxtLayout>
    <main class="flex min-h-[50vh] flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
      <div class="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <!-- Status Code -->
        <p class="num text-7xl font-extrabold tracking-tight text-serag-gold sm:text-8xl md:text-9xl">
          {{ statusCode }}
        </p>

        <!-- Heading -->
        <h1 class="mt-4 font-display text-2xl font-bold text-foreground sm:mt-6 sm:text-3xl lg:text-4xl">
          {{ title }}
        </h1>

        <!-- Description -->
        <p class="mt-2 max-w-md text-sm text-muted-foreground sm:mt-3 sm:text-base">
          {{ description }}
        </p>

        <!-- Action Buttons -->
        <div class="mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <button
            type="button"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-serag-night px-6 text-sm font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi sm:w-auto motion-reduce:transition-none"
            @click="handleGoHome"
          >
            <Home class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ t('store.errorPage.home') }}</span>
          </button>

          <button
            type="button"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 text-sm font-bold text-foreground transition-colors hover:bg-muted hover:text-serag-night focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-serag-gold-hi sm:w-auto motion-reduce:transition-none"
            @click="handleGoShop"
          >
            <ShoppingBag class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ t('store.errorPage.shopAll') }}</span>
          </button>
        </div>
      </div>
    </main>
  </NuxtLayout>
</template>
