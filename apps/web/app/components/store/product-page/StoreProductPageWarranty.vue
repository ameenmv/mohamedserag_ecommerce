<script setup lang="ts">
import { Globe, PhoneCall, ShieldCheck } from '@lucide/vue'

const props = defineProps<{
  warranty?: string | null
  warrantyActivation?: string | null
  origin?: string | null
}>()

const { t } = useI18n()

const hasAnyInfo = computed(
  () =>
    Boolean(props.warranty?.trim()) ||
    Boolean(props.warrantyActivation?.trim()) ||
    Boolean(props.origin?.trim()),
)
</script>

<template>
  <section
    v-if="hasAnyInfo"
    class="rounded-3xl border border-border bg-card p-5 sm:p-6"
    :aria-label="t('store.productPage.warranty.title')"
  >
    <h2 class="mb-4 text-base font-bold text-foreground sm:text-lg">
      {{ t('store.productPage.warranty.title') }}
    </h2>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Certified warranty -->
      <div
        v-if="warranty?.trim()"
        class="flex items-start gap-3 rounded-2xl bg-serag-ivory/50 p-3.5 dark:bg-muted/30 border border-border/60"
      >
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          aria-hidden="true"
        >
          <ShieldCheck class="size-5" />
        </div>
        <div>
          <span class="block text-xs font-semibold text-muted-foreground">
            {{ t('store.productPage.warranty.warrantyTitle') }}
          </span>
          <span class="mt-0.5 block text-xs font-bold text-foreground sm:text-sm">
            {{ warranty }}
          </span>
        </div>
      </div>

      <!-- Warranty activation -->
      <div
        v-if="warrantyActivation?.trim()"
        class="flex items-start gap-3 rounded-2xl bg-serag-ivory/50 p-3.5 dark:bg-muted/30 border border-border/60"
      >
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-serag-gold/15 text-serag-gold dark:text-serag-gold-hi"
          aria-hidden="true"
        >
          <PhoneCall class="size-5" />
        </div>
        <div>
          <span class="block text-xs font-semibold text-muted-foreground">
            {{ t('store.productPage.warranty.activationTitle') }}
          </span>
          <span class="mt-0.5 block text-xs font-bold text-foreground sm:text-sm">
            {{ warrantyActivation }}
          </span>
        </div>
      </div>

      <!-- Country of origin -->
      <div
        v-if="origin?.trim()"
        class="flex items-start gap-3 rounded-2xl bg-serag-ivory/50 p-3.5 dark:bg-muted/30 border border-border/60"
      >
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400"
          aria-hidden="true"
        >
          <Globe class="size-5" />
        </div>
        <div>
          <span class="block text-xs font-semibold text-muted-foreground">
            {{ t('store.productPage.warranty.originTitle') }}
          </span>
          <span class="mt-0.5 block text-xs font-bold text-foreground sm:text-sm">
            {{ origin }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
