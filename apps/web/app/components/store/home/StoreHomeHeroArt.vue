<script setup lang="ts">
// With a photo uploaded in the admin (Content → Home → hero image) it fills the tall middle card;
// without one the card keeps its fridge illustration.
// The whole composition is decorative (aria-hidden), so the photo has an empty alt.
defineProps<{
  image?: string | null
}>()

const { t } = useI18n()
</script>

<!-- Decorative appliance cards from the prototype; the category names are visual only. -->
<template>
  <div class="relative mx-auto h-[420px] w-full max-w-[600px] sm:h-[580px]" aria-hidden="true">
    <div class="absolute inset-[6%] rounded-full border border-dashed border-serag-gold/40" />
    <div class="absolute inset-[18%] rounded-full border border-serag-gold/20" />

    <!-- Store photo (when uploaded) -->
    <div
      v-if="image"
      class="animate-floaty absolute top-[8%] end-[31%] h-[76%] w-[36%] overflow-hidden rounded-[34px] border border-serag-gold-hi/55 bg-[#1B3526] shadow-[0_40px_70px_-24px_rgba(0,0,0,0.65)] [animation-delay:-1s]"
    >
      <NuxtImg
        :src="image"
        alt=""
        width="440"
        height="640"
        fetchpriority="high"
        loading="eager"
        class="size-full object-cover"
      />
      <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
    </div>

    <!-- Fridge -->
    <div
      v-else
      class="animate-floaty absolute top-[8%] end-[31%] flex h-[76%] w-[36%] flex-col items-center justify-center gap-4 rounded-[34px] border border-serag-gold-hi/55 bg-gradient-to-b from-[#4F7F1B] to-[#1B3526] text-serag-gold-hi shadow-[0_40px_70px_-24px_rgba(0,0,0,0.65)] [animation-delay:-1s]"
    >
      <svg viewBox="0 0 48 48" class="w-[64%]" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="13" y="4" width="22" height="40" rx="3" />
        <path d="M13 20h22M18 10v6M18 25v8" />
      </svg>
      <span class="rounded-full bg-black/30 px-4 py-1.5 text-sm font-bold text-serag-ivory sm:text-base">{{ t('store.home.heroArt.fridges') }}</span>
    </div>

    <!-- Washer -->
    <div
      class="animate-floaty absolute top-[44%] end-0 flex h-[42%] w-[31%] flex-col items-center justify-center gap-3 rounded-[30px] border border-[#E4DDC6] bg-serag-ivory text-serag-green shadow-[0_30px_50px_-22px_rgba(0,0,0,0.6)] [--tilt:-5deg] [animation-delay:-3s]"
    >
      <svg viewBox="0 0 48 48" class="w-[56%]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="4" width="30" height="40" rx="4" />
        <circle cx="24" cy="28" r="10" />
        <circle cx="24" cy="28" r="5" />
        <path d="M15 11h8M31 11h2" />
      </svg>
      <span class="text-sm font-bold sm:text-[15px]">{{ t('store.home.heroArt.washers') }}</span>
    </div>

    <!-- Screen -->
    <div
      class="animate-floaty absolute top-[2%] end-[66%] flex h-[34%] w-[34%] flex-col items-center justify-center gap-2.5 rounded-[30px] bg-serag-gold text-serag-ink shadow-[0_30px_50px_-22px_rgba(0,0,0,0.6)] [--tilt:5deg] [animation-delay:-4.5s]"
    >
      <svg viewBox="0 0 48 48" class="w-[62%]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="8" width="40" height="27" rx="3" />
        <path d="M16 42h16M24 35v7" />
      </svg>
      <span class="text-sm font-bold sm:text-[15px]">{{ t('store.home.heroArt.screens') }}</span>
    </div>

    <!-- AC -->
    <div
      class="animate-floaty absolute top-[58%] end-[68%] flex h-[26%] w-[32%] flex-col items-center justify-center gap-2 rounded-[26px] border border-serag-ivory/25 bg-serag-ivory/8 text-serag-ivory backdrop-blur-sm [--tilt:3deg] [animation-delay:-2s]"
    >
      <svg viewBox="0 0 48 48" class="w-1/2" fill="none" stroke="var(--color-serag-gold-hi)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="10" width="40" height="16" rx="3" />
        <path d="M10 21h28M14 32c2 3 2 5 0 8M24 32c2 3 2 5 0 8M34 32c2 3 2 5 0 8" />
      </svg>
      <span class="text-xs font-bold sm:text-sm">{{ t('store.home.heroArt.acs') }}</span>
    </div>

    <!-- Rotating «since 1972» seal -->
    <div class="absolute start-[2%] bottom-0 size-28 sm:size-[150px]" dir="ltr">
      <svg class="animate-spin-slow size-full" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="72" fill="#22211F" stroke="rgba(210,194,122,.6)" stroke-width="1.5" />
        <defs>
          <path id="hero-seal-ring" d="M75 75 m-54 0 a54 54 0 1 1 108 0 a54 54 0 1 1 -108 0" />
        </defs>
        <text style="font-family: var(--font-num)" font-weight="700" font-size="13" letter-spacing="4.2" fill="#C9B189">
          <textPath href="#hero-seal-ring">MOHAMED SERAG • SINCE 1972 • TRUSTED •</textPath>
        </text>
      </svg>
      <div class="num absolute inset-0 flex items-center justify-center text-3xl font-extrabold text-serag-gold-hi sm:text-[44px]">72</div>
    </div>
  </div>
</template>
