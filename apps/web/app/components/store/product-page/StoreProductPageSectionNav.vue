<script setup lang="ts">
export interface SectionNavItem {
  id: string
  labelKey: string
}

const props = defineProps<{
  items: SectionNavItem[]
}>()

const { t } = useI18n()
const activeSection = ref<string>(props.items[0]?.id ?? '')

let observer: IntersectionObserver | null = null

function scrollToSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  activeSection.value = id
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
}

onMounted(() => {
  if (!import.meta.client || !('IntersectionObserver' in window)) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      if (visible.length > 0 && visible[0]?.target.id) {
        activeSection.value = visible[0].target.id
      }
    },
    {
      rootMargin: '-15% 0px -65% 0px',
      threshold: [0, 0.2, 0.5],
    },
  )

  for (const item of props.items) {
    const el = document.getElementById(item.id)
    if (el) observer.observe(el)
  }
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <nav
    v-if="items.length > 0"
    :aria-label="t('store.productPage.sectionNav.ariaLabel')"
    class="rounded-2xl border border-border/80 bg-card/90 p-1.5 backdrop-blur-md shadow-xs"
  >
    <ul class="flex items-center gap-1.5" role="tablist">
      <li v-for="item in items" :key="item.id" role="presentation">
        <button
          type="button"
          role="tab"
          :aria-selected="activeSection === item.id"
          :class="[
            'inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:text-sm',
            activeSection === item.id
              ? 'bg-serag-night text-serag-gold-hi shadow-xs dark:bg-serag-gold/20 dark:text-serag-gold-hi'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          ]"
          @click="scrollToSection(item.id)"
        >
          {{ t(item.labelKey) }}
        </button>
      </li>
    </ul>
  </nav>
</template>
