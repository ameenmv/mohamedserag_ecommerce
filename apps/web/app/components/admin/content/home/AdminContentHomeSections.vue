<script setup lang="ts">
import type { HomeSectionId } from '@serag/shared'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import { HOME_SECTION_META } from '~/utils/admin-home-fields'

const props = defineProps<{
  order: HomeSectionId[]
  hidden: HomeSectionId[]
  selected: HomeSectionId
  changedCounts: Record<HomeSectionId, number>
  hydrated: boolean
}>()

const emit = defineEmits<{
  select: [id: HomeSectionId]
  move: [id: HomeSectionId, direction: -1 | 1]
  toggle: [id: HomeSectionId]
}>()

const { t } = useI18n()

function isHidden(id: HomeSectionId): boolean {
  return props.hidden.includes(id)
}

function sectionName(id: HomeSectionId): string {
  return t(HOME_SECTION_META[id].nameKey)
}
</script>

<template>
  <section class="flex flex-col gap-1" :aria-label="t('admin.content.sections.title')">
    <div class="flex flex-col gap-0.5 px-1 pb-2">
      <h2 class="font-display text-xl font-bold text-foreground">
        {{ t('admin.content.sections.title') }}
      </h2>
      <span class="text-xs text-muted-foreground">{{ t('admin.content.sections.subtitle') }}</span>
    </div>

    <div
      v-for="(id, index) in order"
      :key="id"
      class="flex items-center gap-2 rounded-xl border p-1.5 transition-colors"
      :class="
        id === selected
          ? 'border-serag-green bg-accent/40 dark:border-serag-gold'
          : 'border-border'
      "
      :aria-current="id === selected ? 'true' : undefined"
    >
      <span class="flex flex-col">
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-30"
          :disabled="index === 0"
          :aria-label="t('admin.content.sections.moveUp', { section: sectionName(id) })"
          @click="emit('move', id, -1)"
        >
          <ChevronUp class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-30"
          :disabled="index === order.length - 1"
          :aria-label="t('admin.content.sections.moveDown', { section: sectionName(id) })"
          @click="emit('move', id, 1)"
        >
          <ChevronDown class="size-4" aria-hidden="true" />
        </button>
      </span>

      <button
        type="button"
        class="flex min-h-11 flex-1 items-center gap-3 rounded-lg px-2 text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        :aria-label="t('admin.content.sections.open', { section: sectionName(id) })"
        @click="emit('select', id)"
      >
        <span
          class="num flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground"
        >
          {{ index + 1 }}
        </span>
        <span class="flex min-w-0 flex-col">
          <b class="truncate text-sm text-foreground">{{ sectionName(id) }}</b>
          <small class="truncate text-xs text-muted-foreground">
            {{
              isHidden(id)
                ? t('admin.content.sections.hiddenBadge')
                : t('admin.content.sections.fieldCount', {
                    count: HOME_SECTION_META[id].fields.length,
                  })
            }}
          </small>
        </span>
      </button>

      <span
        v-if="changedCounts[id]"
        class="num flex size-6 shrink-0 items-center justify-center rounded-full bg-serag-gold text-xs font-bold text-serag-night"
        :aria-label="t('admin.content.sections.changedCount', { count: changedCounts[id] })"
      >
        {{ changedCounts[id] }}
      </span>

      <AdminFormSwitch
        :model-value="!isHidden(id)"
        :disabled="!hydrated"
        :aria-label="t('admin.content.sections.toggleVisibility', { section: sectionName(id) })"
        class="me-1"
        @update:model-value="emit('toggle', id)"
      />
    </div>
  </section>
</template>
