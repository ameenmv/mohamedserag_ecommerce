<script setup lang="ts">
import { HelpCircle, Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { PublicFaqEntry } from '@serag/shared'

defineProps<{
  items: PublicFaqEntry[]
  activeId: string | null
}>()

const emit = defineEmits<{
  toggle: [id: string]
  resetFilters: []
}>()

const { t } = useI18n()

function formatNumber(idx: number): string {
  return String(idx + 1).padStart(2, '0')
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl">
    <!-- Empty state when no items match filters -->
    <div
      v-if="items.length === 0"
      class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8 text-center sm:p-12"
    >
      <div class="flex size-14 items-center justify-center rounded-2xl bg-serag-gold/15 text-serag-gold">
        <HelpCircle class="size-7" aria-hidden="true" />
      </div>

      <h3 class="mt-4 font-display text-lg font-bold text-foreground sm:text-xl">
        {{ t('store.faq.emptyTitle') }}
      </h3>

      <p class="mt-2 max-w-md text-xs text-muted-foreground sm:text-sm">
        {{ t('store.faq.emptyDescription') }}
      </p>

      <Button
        type="button"
        variant="outline"
        class="mt-6 min-h-11 rounded-full px-6 text-sm font-bold"
        @click="emit('resetFilters')"
      >
        {{ t('store.faq.resetSearch') }}
      </Button>
    </div>

    <!-- Accordion item list -->
    <div v-else class="flex flex-col gap-3 sm:gap-4">
      <article
        v-for="(item, index) in items"
        :id="`q-${item.id}`"
        :key="item.id"
        class="scroll-mt-28 rounded-2xl border border-border bg-card transition-colors hover:border-serag-gold/50"
        :class="{ 'border-serag-gold/60 ring-1 ring-serag-gold/20 shadow-xs': activeId === item.id }"
      >
        <h3>
          <button
            :id="`faq-question-${item.id}`"
            type="button"
            :aria-expanded="activeId === item.id"
            :aria-controls="`faq-answer-${item.id}`"
            class="flex min-h-14 w-full items-center justify-between gap-3 p-4 text-start font-bold text-foreground transition-colors sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
            @click="emit('toggle', item.id)"
          >
            <div class="flex items-center gap-3.5 sm:gap-4">
              <!-- Numbered gold marker -->
              <span
                class="num flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors sm:size-8 sm:text-xs"
                :class="
                  activeId === item.id
                    ? 'bg-serag-gold text-serag-night'
                    : 'bg-serag-gold/15 text-serag-gold'
                "
                aria-hidden="true"
              >
                {{ formatNumber(index) }}
              </span>

              <span class="text-sm sm:text-base leading-snug">
                {{ item.question }}
              </span>
            </div>

            <!-- Plus icon rotating 45deg to cross -->
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
              :class="activeId === item.id ? 'bg-serag-gold/15' : 'bg-muted/60'"
              aria-hidden="true"
            >
              <Plus
                class="size-4.5 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:transition-none"
                :class="activeId === item.id ? 'rotate-45 text-serag-gold' : ''"
              />
            </span>
          </button>
        </h3>

        <!-- Smooth height expansion with CSS grid-template-rows 0fr -> 1fr -->
        <div
          :id="`faq-answer-${item.id}`"
          role="region"
          :aria-labelledby="`faq-question-${item.id}`"
          :inert="activeId !== item.id"
          class="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
          :class="activeId === item.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        >
          <div class="overflow-hidden">
            <div class="border-t border-border/60 px-5 pt-3 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:text-base">
              <StoreContentProse :html="item.answer" />
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
