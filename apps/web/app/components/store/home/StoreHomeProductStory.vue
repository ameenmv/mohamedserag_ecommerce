<script setup lang="ts">
import type { HomeContent, ProductCard } from '@serag/shared'
import { loadGsap } from '~/composables/useGsap'

const props = defineProps<{
  content: HomeContent['productStory']
  product: ProductCard | null
}>()

const { t } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()
const headingId = useId()

const rootRef = ref<HTMLElement | null>(null)

// Split callouts evenly: 1-2 on the start side, 3-4 on the end side
const midpoint = computed(() => Math.ceil(props.content.callouts.length / 2))
const startCallouts = computed(() => props.content.callouts.slice(0, midpoint.value))
const endCallouts = computed(() => props.content.callouts.slice(midpoint.value))

let stopMotion: (() => void) | undefined
let unmounted = false

onMounted(async () => {
  const kit = await loadGsap()
  if (!kit || unmounted || !rootRef.value) return
  const { startProductStoryMotion } = await import('~/utils/product-story-motion')
  if (unmounted || !rootRef.value) return
  stopMotion = startProductStoryMotion(kit, rootRef.value, props.content.appliance)
})

onBeforeUnmount(() => {
  unmounted = true
  stopMotion?.()
})
</script>

<template>
  <section
    v-if="product"
    ref="rootRef"
    class="home-stack relative overflow-clip bg-serag-deep text-serag-ivory"
    :aria-labelledby="headingId"
  >
    <!-- Background subtle ambient lighting -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="absolute -top-32 start-1/4 size-[32rem] rounded-full bg-[radial-gradient(circle,rgba(201,177,137,0.12)_0%,transparent_65%)]" />
      <div class="absolute -bottom-32 end-1/4 size-[32rem] rounded-full bg-[radial-gradient(circle,rgba(85,120,64,0.14)_0%,transparent_65%)]" />
    </div>

    <!-- Pinned scroll scene wrapper -->
    <div
      data-story-pin
      class="relative mx-auto flex min-h-svh max-w-7xl flex-col justify-between px-4 pb-12 pt-24 sm:px-6 lg:px-10 lg:pb-14 lg:pt-28"
    >
      <!-- Centred header -->
      <header class="flex flex-col items-center text-center">
        <span class="eyebrow inline-flex items-center rounded-full border border-serag-gold/30 bg-serag-gold/10 px-4 py-1 text-serag-gold-hi">
          {{ t('store.home.productStory.eyebrow') }}
        </span>
        <h2
          :id="headingId"
          class="mt-4 max-w-3xl font-display text-[clamp(40px,5.6vw,80px)] font-bold leading-[1.05] text-serag-ivory"
        >
          <CommonMadText :text="content.title" size="xl" />
        </h2>
      </header>

      <!-- Center grid: [callouts 1-2] [appliance] [callouts 3-4] on lg; appliance first then 2-col callouts below lg -->
      <div class="my-auto grid grid-cols-2 items-center gap-6 py-8 sm:gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-12">
        <!-- Callouts 1 & 2 (Start side on lg, Col 1 on mobile) -->
        <dl class="order-2 flex flex-col gap-6 sm:gap-8 lg:order-1">
          <div
            v-for="(callout, index) in startCallouts"
            :key="`start-${index}`"
            data-story-callout
            class="flex flex-col border-t border-serag-ivory/15 pt-3 sm:pt-4 text-start lg:text-end"
          >
            <dd class="order-1 font-display text-[clamp(30px,3.6vw,48px)] font-bold leading-tight text-serag-gold-hi">
              {{ callout.value }}
            </dd>
            <dt class="order-2 mt-1 text-sm text-[#C4BEB0] sm:text-base">
              {{ callout.label }}
            </dt>
          </div>
        </dl>

        <!-- Appliance illustration (Col-span-2 on mobile, Center on lg) -->
        <div
          data-story-appliance
          class="order-1 col-span-2 flex justify-center lg:order-2 lg:col-span-1 lg:px-20"
        >
          <StoreHomeProductStoryAppliance class="max-sm:-my-10 max-sm:scale-[.78]" :kind="content.appliance" />
        </div>

        <!-- Callouts 3 & 4 (End side on lg, Col 2 on mobile) -->
        <dl class="order-3 flex flex-col gap-6 sm:gap-8 lg:order-3">
          <div
            v-for="(callout, index) in endCallouts"
            :key="`end-${index}`"
            data-story-callout
            class="flex flex-col border-t border-serag-ivory/15 pt-3 sm:pt-4 text-start"
          >
            <dd class="order-1 font-display text-[clamp(30px,3.6vw,48px)] font-bold leading-tight text-serag-gold-hi">
              {{ callout.value }}
            </dd>
            <dt class="order-2 mt-1 text-sm text-[#C4BEB0] sm:text-base">
              {{ callout.label }}
            </dt>
          </div>
        </dl>
      </div>

      <!-- Price row centred under grid -->
      <div
        data-story-price
        class="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-serag-ivory/15 bg-serag-night/75 p-4 backdrop-blur-md sm:rounded-3xl sm:p-5"
      >
        <div class="flex min-w-0 items-center gap-3 sm:gap-4">
          <!-- Product thumbnail -->
          <div
            v-if="product.image"
            class="relative size-14 shrink-0 overflow-hidden rounded-xl border border-serag-ivory/15 bg-black/30 sm:size-16"
          >
            <NuxtImg
              :src="product.image.url"
              :alt="product.image.alt || product.name"
              width="64"
              height="64"
              loading="lazy"
              class="size-full object-contain p-1"
            />
          </div>

          <!-- Product name & price -->
          <div class="flex min-w-0 flex-col">
            <NuxtLink
              :to="localePath(`/p/${product.slug}`)"
              class="truncate text-base font-bold text-serag-ivory transition-colors hover:text-serag-gold-hi sm:text-lg"
            >
              {{ product.name }}
            </NuxtLink>
            <div class="mt-0.5 flex flex-wrap items-baseline gap-2">
              <span class="font-display text-xl font-bold text-serag-gold-hi sm:text-2xl">
                {{ money(product.price) }}
              </span>
              <span
                v-if="product.oldPrice"
                class="text-xs text-[#C4BEB0] line-through sm:text-sm"
              >
                <span class="sr-only">{{ t('store.home.productStory.was') }} </span>
                {{ money(product.oldPrice) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Add to cart & details link -->
        <div class="flex w-full items-center gap-3 sm:w-auto">
          <div class="w-full sm:w-44">
            <StoreProductAddToCart :product="product" />
          </div>
          <NuxtLink
            :to="localePath(`/p/${product.slug}`)"
            class="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-serag-ivory/25 px-4 text-sm font-bold text-serag-ivory transition-colors hover:border-serag-gold hover:text-serag-gold-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-[52px] sm:rounded-2xl sm:px-5 sm:text-base"
          >
            {{ t('store.home.productStory.details') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
