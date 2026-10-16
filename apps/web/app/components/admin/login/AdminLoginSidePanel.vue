<script setup lang="ts">
const { t } = useI18n()

const features = computed(() => [
  t('admin.login.features.orders'),
  t('admin.login.features.bridal'),
  t('admin.login.features.catalog'),
])
</script>

<template>
  <div
    class="lg:col-span-5 relative overflow-hidden bg-serag-deep text-serag-ivory p-8 sm:p-12 flex flex-col justify-between gap-10 min-h-[380px]"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -top-36 -left-36 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(181,164,92,0.3)_0%,rgba(181,164,92,0)_65%)]"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none select-none absolute -bottom-10 left-1/2 -translate-x-1/2 font-num font-extrabold text-[180px] leading-[0.8] text-transparent [-webkit-text-stroke:2px_rgba(181,164,92,0.16)] tracking-tighter whitespace-nowrap"
    >
      1972
    </div>

    <div class="relative flex flex-col gap-4">
      <span class="font-num font-bold tracking-[4px] text-xs text-serag-gold-hi">
        MOHAMED SERAG · SINCE 1972
      </span>
      <h2 class="font-display text-4xl sm:text-5xl leading-tight">
        {{ t('admin.login.sideTitle') }}
        <br>
        <span class="text-serag-gold-hi">{{ t('brand.name') }}</span>
      </h2>
      <p class="text-base leading-relaxed text-[#C9D5C6] max-w-sm">
        {{ t('admin.login.sideDescription') }}
      </p>
    </div>

    <ul class="relative flex flex-col gap-3.5 text-sm sm:text-base">
      <AdminLoginFeatureItem
        v-for="feature in features"
        :key="feature"
        :text="feature"
      />
    </ul>
  </div>
</template>
