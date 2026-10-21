<script setup lang="ts">
import { Clock, MapPin, Phone } from '@lucide/vue'

const props = defineProps<{
  phone: string
  address: string
  hours: string
}>()

const { t } = useI18n()

const hasAny = computed(() => Boolean(props.phone || props.address || props.hours))
</script>

<template>
  <section
    v-if="hasAny"
    class="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7"
    :aria-label="t('store.traders.contact.title')"
  >
    <h2 class="font-display text-xl text-foreground sm:text-2xl">
      {{ t('store.traders.contact.title') }}
    </h2>

    <dl class="mt-4 flex flex-col gap-3 text-sm sm:text-base">
      <div v-if="phone" class="flex items-start gap-3">
        <Phone class="mt-0.5 size-5 shrink-0 text-serag-green dark:text-serag-gold" aria-hidden="true" />
        <div>
          <dt class="font-bold text-foreground">{{ t('store.traders.contact.phone') }}</dt>
          <dd>
            <a
              :href="`tel:${phone}`"
              class="num inline-flex min-h-11 items-center font-semibold text-serag-green hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-serag-gold"
            >
              {{ phone }}
            </a>
          </dd>
        </div>
      </div>

      <div v-if="address" class="flex items-start gap-3">
        <MapPin class="mt-0.5 size-5 shrink-0 text-serag-green dark:text-serag-gold" aria-hidden="true" />
        <div>
          <dt class="font-bold text-foreground">{{ t('store.traders.contact.address') }}</dt>
          <dd class="text-muted-foreground">{{ address }}</dd>
        </div>
      </div>

      <div v-if="hours" class="flex items-start gap-3">
        <Clock class="mt-0.5 size-5 shrink-0 text-serag-green dark:text-serag-gold" aria-hidden="true" />
        <div>
          <dt class="font-bold text-foreground">{{ t('store.traders.contact.hours') }}</dt>
          <dd class="text-muted-foreground">{{ hours }}</dd>
        </div>
      </div>
    </dl>
  </section>
</template>
