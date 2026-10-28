<script setup lang="ts">
import { ArrowLeftRight } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'

const props = defineProps<{
  product: ProductCard
}>()

const emit = defineEmits<{
  full: [product: ProductCard]
}>()

const { t } = useI18n()
const { has, toggle } = useCompare()
const hydrated = useHydrated()

const pendingCompare = useState<ProductCard | null>('compare-pending', () => null)

const isCompared = computed(() => hydrated.value && has(props.product.id))

function onToggle(): void {
  const result = toggle(props.product)
  if (result === 'full') {
    pendingCompare.value = props.product
    emit('full', props.product)
  }
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="isCompared"
    :aria-label="
      isCompared
        ? t('store.compare.removeAria', { name: product.name })
        : t('store.compare.addAria', { name: product.name })
    "
    :class="[
      'relative z-10 inline-flex size-9 items-center justify-center rounded-full border shadow-xs backdrop-blur-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-10 motion-reduce:transition-none',
      isCompared
        ? 'border-serag-gold bg-serag-gold/20 text-serag-night dark:text-serag-gold-hi'
        : 'border-border/80 bg-background/90 text-muted-foreground hover:border-serag-gold hover:text-foreground',
    ]"
    @click.stop.prevent="onToggle"
  >
    <ArrowLeftRight class="size-4 sm:size-4.5" aria-hidden="true" />
  </button>
</template>
