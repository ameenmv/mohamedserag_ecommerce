<script setup lang="ts">
import { FAQ_TOPICS, type FaqTopic } from '@serag/shared'

const props = defineProps<{
  modelValue: string
  counts?: Record<string, number>
}>()

const emit = defineEmits<{
  'update:modelValue': [topic: string]
}>()

const { t } = useI18n()

interface TabItem {
  id: string
  label: string
  count?: number
}

const tabs = computed<TabItem[]>(() => {
  const allTab: TabItem = {
    id: 'all',
    label: t('store.faq.allTopics'),
    count: props.counts?.all,
  }

  const topicTabs: TabItem[] = FAQ_TOPICS.map((topic: FaqTopic) => ({
    id: topic,
    label: t(`store.faq.topics.${topic}`),
    count: props.counts?.[topic],
  }))

  return [allTab, ...topicTabs]
})

function selectTab(id: string): void {
  emit('update:modelValue', id)
}

function onKeydown(e: KeyboardEvent, index: number): void {
  let targetIndex = -1
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    // In RTL, ArrowRight moves to previous index, ArrowLeft moves to next index
    const isRtl = document.documentElement.dir === 'rtl'
    const forward = isRtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight'
    targetIndex = forward ? (index + 1) % tabs.value.length : (index - 1 + tabs.value.length) % tabs.value.length
  } else if (e.key === 'Home') {
    e.preventDefault()
    targetIndex = 0
  } else if (e.key === 'End') {
    e.preventDefault()
    targetIndex = tabs.value.length - 1
  }

  if (targetIndex >= 0) {
    const nextTab = tabs.value[targetIndex]
    if (nextTab) {
      selectTab(nextTab.id)
      const el = document.getElementById(`faq-tab-${nextTab.id}`)
      el?.focus()
    }
  }
}
</script>

<template>
  <div class="flex w-full items-center justify-start overflow-x-auto pb-1 sm:justify-center">
    <div
      role="tablist"
      :aria-label="t('store.faq.title')"
      class="inline-flex flex-nowrap items-center gap-2 p-1"
    >
      <button
        v-for="(tab, index) in tabs"
        :id="`faq-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="modelValue === tab.id"
        :aria-controls="`faq-panel-${tab.id}`"
        :tabindex="modelValue === tab.id ? 0 : -1"
        class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="
          modelValue === tab.id
            ? 'bg-serag-green font-bold text-serag-ivory shadow-xs dark:bg-serag-gold dark:text-serag-night'
            : 'border border-border bg-card text-muted-foreground hover:border-serag-gold/40 hover:bg-accent hover:text-foreground'
        "
        @click="selectTab(tab.id)"
        @keydown="onKeydown($event, index)"
      >
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.count !== undefined"
          class="num inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold"
          :class="
            modelValue === tab.id
              ? 'bg-white/20 text-white dark:bg-black/20 dark:text-serag-night'
              : 'bg-muted text-muted-foreground'
          "
        >
          {{ tab.count }}
        </span>
      </button>
    </div>
  </div>
</template>
