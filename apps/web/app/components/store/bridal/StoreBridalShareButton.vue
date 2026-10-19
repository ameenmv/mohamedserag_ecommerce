<script setup lang="ts">
import { Copy, Share2 } from '@lucide/vue'
import { waShareLink } from '~/utils/bridal'

const props = defineProps<{
  shareToken: string
  tierName?: string | null
  itemCount: number
  total: number
}>()

const { t } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()
const notify = useNotify()
const analytics = useAnalytics()
const requestUrl = useRequestURL()

const shareUrl = computed(() => {
  const origin = requestUrl.origin || (import.meta.client ? window.location.origin : '')
  const path = localePath(`/bridal/${props.shareToken}`)
  return `${origin}${path}`
})

const shareMessage = computed(() =>
  t('store.bridal.share.message', {
    tierName: props.tierName || t('store.bridal.share.customList'),
    count: props.itemCount,
    total: money(props.total),
    url: shareUrl.value,
  }),
)

function handleShareWhatsApp(): void {
  analytics.track('bridal_list_shared')
  const link = waShareLink(shareMessage.value)
  if (import.meta.client) {
    window.open(link, '_blank', 'noopener,noreferrer')
  }
}

async function handleCopyLink(): Promise<void> {
  if (import.meta.client && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      notify.success(t('store.bridal.share.copied'))
    } catch {
      notify.error(t('store.bridal.share.copyFailed'))
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- WhatsApp Share Button -->
    <button
      type="button"
      class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-serag-green px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-serag-green-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @click="handleShareWhatsApp"
    >
      <Share2 class="size-4" aria-hidden="true" />
      <span>{{ t('store.bridal.share.button') }}</span>
    </button>

    <!-- Copy Link Button -->
    <button
      type="button"
      class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @click="handleCopyLink"
    >
      <Copy class="size-3.5" aria-hidden="true" />
      <span>{{ t('store.bridal.share.copyLink') }}</span>
    </button>
  </div>
</template>
