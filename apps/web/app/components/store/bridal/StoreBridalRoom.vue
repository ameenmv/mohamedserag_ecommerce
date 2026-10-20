<script setup lang="ts">
import { Plus } from '@lucide/vue'
import type { BridalRoomKey } from '@serag/shared'
import type { DisplayItem, DisplayRoom } from '~/composables/useBridalList'
import StoreBridalItemRow from './StoreBridalItemRow.vue'

defineProps<{
  room: DisplayRoom
  editable?: boolean
}>()

const emit = defineEmits<{
  'update:qty': [productId: string, qty: number]
  remove: [productId: string]
  swap: [item: DisplayItem]
  add: [roomKey: BridalRoomKey]
}>()

const { t } = useI18n()
const { money } = usePrice()
</script>

<template>
  <section
    :data-room="room.key"
    class="rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs"
  >
    <!-- Room Header -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
      <div>
        <h3 class="text-lg font-extrabold text-foreground sm:text-xl">
          {{ t(`store.bridal.rooms.${room.key}`) }}
        </h3>
        <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{{ t('store.bridal.rooms.subtotal') }}</span>
          <span class="num font-bold text-serag-night dark:text-serag-gold whitespace-nowrap">
            {{ money(room.subtotal) }}
          </span>
        </p>
      </div>

      <!-- Add to this room button in edit mode -->
      <button
        v-if="editable"
        type="button"
        class="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-border px-3.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="emit('add', room.key)"
      >
        <Plus class="size-3.5" aria-hidden="true" />
        <span>{{ t('store.bridal.rooms.addItemToRoom') }}</span>
      </button>
    </div>

    <!-- Items List -->
    <div class="flex flex-col gap-3">
      <StoreBridalItemRow
        v-for="item in room.items"
        :key="item.productId"
        :item="item"
        :editable="editable"
        @update:qty="(qty) => emit('update:qty', item.productId, qty)"
        @remove="emit('remove', item.productId)"
        @swap="emit('swap', item)"
      />
    </div>
  </section>
</template>
