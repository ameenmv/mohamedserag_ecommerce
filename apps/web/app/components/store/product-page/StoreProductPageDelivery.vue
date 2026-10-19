<script setup lang="ts">
import { ChevronDown, Truck } from '@lucide/vue'
import { DEFAULT_ZONES } from '@serag/shared'

const { t } = useI18n()
const { format } = usePrice()
</script>

<template>
  <details
    class="group rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all duration-200 open:shadow-xs"
  >
    <summary
      class="flex cursor-pointer list-none items-center justify-between rounded-xl p-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-serag-night/10 text-serag-night dark:bg-serag-gold/10 dark:text-serag-gold-hi"
          aria-hidden="true"
        >
          <Truck class="size-5" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-foreground sm:text-base">
            {{ t('store.productPage.delivery.title') }}
          </h2>
          <p class="text-xs text-muted-foreground font-normal">
            {{ t('store.productPage.delivery.description') }}
          </p>
        </div>
      </div>

      <ChevronDown
        class="size-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
        aria-hidden="true"
      />
    </summary>

    <div class="mt-4 border-t border-border/60 pt-3">
      <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <li
          v-for="zone in DEFAULT_ZONES"
          :key="zone.id"
          class="flex items-center justify-between rounded-xl bg-serag-ivory/50 px-3 py-2 text-xs sm:text-sm dark:bg-muted/30"
        >
          <span class="font-medium text-foreground">{{ zone.name }}</span>
          <span class="num font-bold text-serag-night dark:text-serag-gold-hi">
            {{ format(zone.fee).formatted }}
          </span>
        </li>
      </ul>
    </div>
  </details>
</template>
