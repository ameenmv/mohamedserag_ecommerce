<script setup lang="ts">
import { Monitor, Smartphone } from '@lucide/vue'

const props = defineProps<{
  saveVersion: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()

type PreviewDevice = 'desktop' | 'mobile'

const device = ref<PreviewDevice>('desktop')
const frameKey = ref(0)

watch(
  () => props.saveVersion,
  () => {
    frameKey.value += 1
  },
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs text-muted-foreground">{{ t('admin.content.preview.label') }}</span>
      <div
        class="flex items-center gap-1 rounded-full border border-border p-1"
        role="group"
        :aria-label="t('admin.content.preview.deviceGroup')"
      >
        <button
          type="button"
          class="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :class="device === 'desktop' ? 'bg-serag-green text-white dark:bg-serag-gold dark:text-serag-night' : 'text-muted-foreground'"
          :aria-pressed="device === 'desktop'"
          @click="device = 'desktop'"
        >
          <Monitor class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.preview.desktop') }}</span>
        </button>
        <button
          type="button"
          class="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :class="device === 'mobile' ? 'bg-serag-green text-white dark:bg-serag-gold dark:text-serag-night' : 'text-muted-foreground'"
          :aria-pressed="device === 'mobile'"
          @click="device = 'mobile'"
        >
          <Smartphone class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.preview.mobile') }}</span>
        </button>
      </div>
    </div>

    <div class="mx-auto w-full" :class="device === 'mobile' ? 'max-w-[390px]' : 'max-w-full'">
      <iframe
        :key="frameKey"
        :src="localePath('/admin/content/preview')"
        :title="t('admin.content.preview.frameTitle')"
        class="h-[70vh] w-full rounded-2xl border border-border bg-white"
      />
    </div>
  </div>
</template>
