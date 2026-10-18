<script setup lang="ts">
import { Loader2, Sparkles } from '@lucide/vue'

const props = defineProps<{
  product: {
    id: string
    name: string
    category: {
      slug: string
    }
  }
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const hydrated = useHydrated()
const { pending, lastAddedToken, addToBridal } = useAddToBridal()

async function handleAdd(): Promise<void> {
  if (!hydrated.value || pending.value) return
  await addToBridal(props.product)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <button
      id="bridal-add-button"
      data-bridal-add-button
      type="button"
      :disabled="!hydrated || pending"
      :aria-disabled="!hydrated || pending"
      :aria-busy="pending"
      :aria-label="t('store.bridal.productButton.ariaLabel', { name: product.name })"
      class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-serag-gold/60 bg-serag-gold/10 px-4 text-xs sm:text-sm font-bold text-serag-night shadow-xs transition-colors hover:bg-serag-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-serag-gold/50 dark:bg-serag-gold/10 dark:text-serag-gold-hi dark:hover:bg-serag-gold/20 motion-reduce:transition-none"
      @click="handleAdd"
    >
      <Loader2 v-if="pending" class="size-4 animate-spin text-serag-gold" aria-hidden="true" />
      <Sparkles v-else class="size-4 shrink-0 text-serag-gold" aria-hidden="true" />
      <span>{{ pending ? t('store.bridal.productButton.adding') : t('store.bridal.productButton.label') }}</span>
    </button>

    <!-- Inline confirmation link under the button -->
    <div
      v-if="lastAddedToken"
      id="bridal-inline-confirmation"
      data-bridal-inline-confirmation
      class="flex items-center justify-between rounded-xl border border-serag-gold/40 bg-serag-gold/10 px-3.5 py-2 text-xs font-semibold text-serag-night dark:text-serag-gold-hi"
    >
      <span>{{ t('store.bridal.productButton.addedToast') }}</span>
      <NuxtLink
        id="bridal-inline-open-link"
        data-bridal-open-link
        :to="localePath(`/bridal/${lastAddedToken}`)"
        class="font-bold underline text-serag-gold hover:text-serag-gold-hi"
      >
        {{ t('store.bridal.productButton.openList') }}
      </NuxtLink>
    </div>
  </div>
</template>
