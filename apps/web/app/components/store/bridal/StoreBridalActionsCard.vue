<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft } from '@lucide/vue'
import StoreBridalShareButton from './StoreBridalShareButton.vue'

const props = defineProps<{
  shareToken: string
  tierName?: string | null
  itemCount: number
  total: number
  hasUnavailableItems?: boolean
  isEmpty?: boolean
  editable?: boolean
  canReserve?: boolean
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const reserveReason = computed(() => {
  if (props.canReserve) {
    return null
  }
  if (props.hasUnavailableItems) {
    return t('store.bridal.reserve.unavailableReason')
  }
  if (props.isEmpty) {
    return t('store.bridal.reserve.emptyReason')
  }
  return null
})
</script>

<template>
  <div
    class="flex flex-col gap-3.5 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs lg:rounded-3xl lg:p-6"
  >
    <!-- Edit Mode: Reserve reason text + Share controls -->
    <template v-if="editable">
       <!-- Small line in page body explaining why reserve is disabled -->
       <p
         v-if="reserveReason"
         id="bridal-reserve-reason"
         :class="[
           'text-center text-xs font-semibold leading-relaxed',
           hasUnavailableItems ? 'text-destructive' : 'text-muted-foreground',
         ]"
       >
         {{ reserveReason }}
       </p>

      <!-- Share controls -->
      <div class="border-t border-border/60 pt-3">
        <StoreBridalShareButton
          :share-token="shareToken"
          :tier-name="tierName"
          :item-count="itemCount"
          :total="total"
        />
      </div>
    </template>

    <!-- View Mode: Read-only explanation + Start own list -->
    <template v-else>
      <p class="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {{ t('store.bridal.view.readOnlyNotice') }}
      </p>

      <NuxtLink
        :to="localePath('/bridal')"
        class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
      >
        <span>{{ t('store.bridal.view.startOwn') }}</span>
        <ArrowLeft class="size-3.5 rtl:rotate-0 ltr:rotate-180" aria-hidden="true" />
      </NuxtLink>
    </template>
  </div>
</template>
