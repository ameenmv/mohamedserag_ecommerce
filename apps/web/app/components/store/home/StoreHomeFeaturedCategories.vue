<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import {
  resolveCategoryAccent,
  type CategoryTreeNode,
  type HomeContent,
} from '@serag/shared'

defineProps<{
  content: HomeContent['featuredCategories']
  categories: CategoryTreeNode[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { money } = usePrice()
const headingId = useId()

const {
  isSupported,
  isVisible,
  activeCategory,
  currentImage,
  previousImage,
  slideOffset,
  imageTransitionKey,
  previewContainerEl,
  onRowEnter,
  onRowLeave,
  onListLeave,
  onMouseMove,
} = useCursorPreview()
</script>

<template>
  <section
    class="bg-serag-ivory"
    :aria-labelledby="headingId"
  >
    <div class="mx-auto max-w-7xl px-4 pt-16 pb-14 sm:px-6 lg:px-10 lg:pt-[88px] lg:pb-[72px]">
      <!-- Section Header -->
      <div class="mb-11 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow text-serag-gold-ink">
            {{ t('store.home.categoriesEyebrow') }}
          </p>
          <h2
            :id="headingId"
            class="mt-2 font-display text-[clamp(36px,5vw,64px)] leading-none text-serag-green"
          >
            <CommonMadText :text="content.title" size="xl" />
          </h2>
        </div>
        <NuxtLink
          :to="localePath('/shop')"
          class="inline-flex min-h-11 items-center gap-2.5 border-b-2 border-serag-gold pb-1 font-bold text-serag-green transition-colors hover:text-serag-gold-ink focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        >
          {{ t('store.home.allCategories') }}
          <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>

      <!-- Editorial Index List (semantic <ul>/<li>) -->
      <ul
        class="border-t-[1.5px] border-serag-ink/90"
        @mouseleave="onListLeave"
      >
        <li
          v-for="category in categories"
          :key="category.slug"
        >
          <NuxtLink
            :to="localePath(`/c/${category.slug}`)"
            :data-accent="resolveCategoryAccent(category.accent, category.slug)"
            class="editorial-category-row group relative flex min-h-[64px] items-center justify-between border-b border-border/70 px-3 py-3.5 transition-[padding,background-color] duration-400 ease-[cubic-bezier(0.2,0.7,0.2,1)] focus-visible:bg-[var(--cat-bg)] focus-visible:px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cat-accent)] sm:py-4 md:px-4 md:py-5 motion-reduce:transition-none"
            @mouseenter="
              onRowEnter(
                {
                  slug: category.slug,
                  name: category.name,
                  accent: resolveCategoryAccent(category.accent, category.slug),
                  illustration: category.illustration,
                  coverImage: category.coverImage,
                  coverImages: category.coverImages,
                },
                $event,
              )
            "
            @mouseleave="onRowLeave"
            @mousemove="onMouseMove"
          >
            <!-- Start Section: Thumbnail + Title & Description -->
            <div class="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-5 md:gap-7">
              <!-- Rounded Thumbnail Tile with background var(--cat-bg) -->
              <div
                class="relative flex h-[60px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl md:h-[84px] md:w-[110px] md:rounded-2xl"
                :style="{ backgroundColor: 'var(--cat-bg)' }"
              >
                <img
                  v-if="category.coverImage"
                  :src="category.coverImage"
                  alt=""
                  width="110"
                  height="84"
                  loading="lazy"
                  decoding="async"
                  class="row-thumbnail-img size-full object-contain mix-blend-multiply transition-transform duration-400 ease-out group-hover:scale-[1.12] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                >
                <StoreCategoryIllustration
                  v-else
                  :name="category.illustration"
                  class="row-thumbnail-img size-8 text-[var(--cat-accent)] transition-transform duration-400 ease-out group-hover:scale-[1.12] md:size-11 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>

              <!-- Title & One-line Description Column -->
              <div class="min-w-0 flex-1 py-1">
                <h3 class="font-display text-[clamp(28px,3.6vw,48px)] font-extrabold leading-[1.15] text-[var(--cat-fg)]">
                  <CommonMadText :text="category.name" size="lg" />
                </h3>
                <p
                  v-if="category.intro"
                  class="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm"
                >
                  {{ category.intro }}
                </p>
                <!-- Mobile product count shown under description -->
                <span
                  v-if="category.productCount > 0"
                  class="mt-1 block text-xs font-medium text-muted-foreground md:hidden"
                >
                  {{ t('store.home.categoryCount', { count: category.productCount }) }}
                </span>
              </div>
            </div>

            <!-- End Section: Product Count + Starting Price + Arrow Circle -->
            <div class="flex shrink-0 items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12">
              <!-- Desktop Product Count -->
              <span
                v-if="category.productCount > 0"
                class="hidden whitespace-nowrap text-sm font-medium text-muted-foreground md:inline-block"
              >
                {{ t('store.home.categoryCount', { count: category.productCount }) }}
              </span>

              <!-- Desktop Starting Price -->
              <span
                v-if="category.startingPrice !== null && category.startingPrice !== undefined"
                class="hidden whitespace-nowrap font-num text-sm font-semibold text-foreground md:inline-block lg:text-base"
              >
                {{ t('store.home.startingFrom', { price: money(category.startingPrice) }) }}
              </span>

              <!-- Arrow Circle -->
              <div
                class="row-arrow-circle flex size-10 shrink-0 items-center justify-center rounded-full border border-border/80 text-foreground transition-all duration-400 ease-out sm:size-11 md:size-12 motion-reduce:transition-none"
                aria-hidden="true"
              >
                <ArrowRight class="size-4 rtl:-scale-x-100 sm:size-5" />
              </div>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>

    <!-- Floating Cursor Preview (ClientOnly, fine-pointer desktop only) -->
    <ClientOnly>
      <!-- Teleported to body: an ancestor with a transform would otherwise become the containing block of this fixed tile and offset it -->
      <Teleport to="body">
      <!-- Physical left-0: the position is computed in viewport coordinates, so it must not flip in RTL -->
      <div
        v-if="isSupported && activeCategory"
        ref="previewContainerEl"
        class="pointer-events-none fixed top-0 left-0 z-30 hidden h-[300px] w-[320px] md:block"
        :style="{
          willChange: 'transform',
          transform: 'translate3d(-9999px, -9999px, 0)',
        }"
        aria-hidden="true"
      >
        <div
          class="relative flex size-full flex-col items-center justify-center overflow-hidden rounded-3xl p-6 shadow-2xl transition-[transform,opacity,background-color] duration-350 ease-out"
          :data-accent="activeCategory.accent"
          :style="{
            backgroundColor: 'var(--cat-bg)',
            transform: isVisible ? 'scale(1)' : 'scale(0.6)',
            opacity: isVisible ? 1 : 0,
          }"
        >
          <div class="relative flex size-full items-center justify-center">
            <!-- Underneath image during crossfade: stays visible, no flashing blank -->
            <img
              v-if="previousImage"
              :src="previousImage"
              alt=""
              width="280"
              height="240"
              class="pointer-events-none absolute inset-0 z-0 m-auto max-h-[240px] max-w-[280px] object-contain mix-blend-multiply"
            >
            <!-- Current active image: crossfade + scale/slide -->
            <img
              v-if="currentImage"
              :key="imageTransitionKey"
              :src="currentImage"
              alt=""
              width="280"
              height="240"
              class="scrub-image-enter pointer-events-none absolute inset-0 z-10 m-auto max-h-[240px] max-w-[280px] object-contain mix-blend-multiply"
              :style="{ '--slide-x': `${slideOffset}px` }"
            >
            <!-- Fallback illustration if category has no images -->
            <StoreCategoryIllustration
              v-else-if="!previousImage"
              :name="activeCategory.illustration"
              class="size-44 text-[var(--cat-accent)] transition-opacity duration-200"
            />
          </div>
        </div>
      </div>
      </Teleport>
    </ClientOnly>
  </section>
</template>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  .editorial-category-row:hover {
    background-color: var(--cat-bg);
    padding-inline: 1.75rem; /* px-7 */
  }
  .editorial-category-row:hover .row-arrow-circle {
    background-color: var(--cat-fg);
    border-color: var(--cat-fg);
    color: var(--cat-bg);
    transform: translateX(-0.5rem);
  }
  :where([dir='rtl'], [dir='rtl'] *) .editorial-category-row:hover .row-arrow-circle {
    transform: translateX(0.5rem);
  }
  .editorial-category-row:hover .row-thumbnail-img {
    transform: scale(1.12);
  }
}

.editorial-category-row:focus-visible {
  background-color: var(--cat-bg);
  padding-inline: 1.75rem; /* px-7 */
}
.editorial-category-row:focus-visible .row-arrow-circle {
  background-color: var(--cat-fg);
  border-color: var(--cat-fg);
  color: var(--cat-bg);
  transform: translateX(-0.5rem);
}
:where([dir='rtl'], [dir='rtl'] *) .editorial-category-row:focus-visible .row-arrow-circle {
  transform: translateX(0.5rem);
}
.editorial-category-row:focus-visible .row-thumbnail-img {
  transform: scale(1.12);
}

@keyframes scrub-enter {
  from {
    opacity: 0;
    transform: scale(1.04) translateX(var(--slide-x, 0px));
  }
  to {
    opacity: 1;
    transform: scale(1) translateX(0);
  }
}

.scrub-image-enter {
  animation: scrub-enter 120ms cubic-bezier(0.2, 0, 0.2, 1) forwards;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .editorial-category-row,
  .row-arrow-circle,
  .row-thumbnail-img {
    transition: none !important;
    transform: none !important;
  }
  .scrub-image-enter {
    animation: none !important;
  }
}
</style>
