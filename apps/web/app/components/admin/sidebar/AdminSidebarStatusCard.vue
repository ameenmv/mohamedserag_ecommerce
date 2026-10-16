<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="flex flex-col gap-2.5 rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-4">
    <div class="flex items-center gap-2 text-sm font-bold text-sidebar-accent-foreground">
      <span class="size-2.5 shrink-0 rounded-full bg-chart-5" aria-hidden="true" />
      <span>{{ t('admin.nav.statusOnline') }}</span>
    </div>
    <p class="text-xs leading-relaxed text-sidebar-foreground/80">
      {{ t('admin.nav.statusDesc') }}
    </p>
    <NuxtLink
      :to="localePath('/')"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 text-sm font-bold text-sidebar-primary-foreground transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
    >
      <span>{{ t('admin.nav.openStore') }}</span>
      <ExternalLink class="size-4" aria-hidden="true" />
    </NuxtLink>
  </div>
</template>
