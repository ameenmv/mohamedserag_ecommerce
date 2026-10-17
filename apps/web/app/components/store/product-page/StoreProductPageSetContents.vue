<script setup lang="ts">
import { parseSetContents } from '~/utils/set-contents'

const props = defineProps<{
  setContents: unknown[] | null
}>()

const { t } = useI18n()

const pieces = computed(() => parseSetContents(props.setContents))
</script>

<template>
  <section
    v-if="pieces.length > 0"
    class="rounded-3xl border border-border bg-card p-5 sm:p-6"
    :aria-label="t('store.productPage.setContents.title')"
  >
    <h2 class="mb-4 text-base font-bold text-foreground sm:text-lg">
      {{ t('store.productPage.setContents.title') }}
    </h2>

    <div class="overflow-x-auto rounded-2xl border border-border/80">
      <table class="w-full text-start text-xs sm:text-sm">
        <caption class="sr-only">
          {{ t('store.productPage.setContents.caption') }}
        </caption>
        <thead class="border-b border-border bg-serag-ivory/60 dark:bg-muted/30 text-xs font-bold text-foreground">
          <tr>
            <th scope="col" class="p-3 sm:px-4 sm:py-3.5 text-start font-bold">
              {{ t('store.productPage.setContents.piece') }}
            </th>
            <th scope="col" class="p-3 sm:px-4 sm:py-3.5 text-start font-bold">
              {{ t('store.productPage.setContents.size') }}
            </th>
            <th scope="col" class="p-3 sm:px-4 sm:py-3.5 text-start font-bold">
              {{ t('store.productPage.setContents.qty') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(piece, idx) in pieces"
            :key="idx"
            :class="[
              'border-b border-border/60 last:border-0 transition-colors',
              idx % 2 === 0 ? 'bg-serag-ivory/20 dark:bg-muted/10' : 'bg-background',
            ]"
          >
            <th scope="row" class="p-3 sm:px-4 sm:py-3.5 text-start font-medium text-foreground">
              {{ piece.item }}
            </th>
            <td class="num p-3 sm:px-4 sm:py-3.5 text-start text-muted-foreground">
              {{ piece.size ?? '—' }}
            </td>
            <td class="num p-3 sm:px-4 sm:py-3.5 text-start font-bold text-foreground">
              {{ piece.qty }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
