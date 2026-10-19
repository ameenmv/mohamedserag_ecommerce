<script setup lang="ts">
import type { AdminReviewRow } from '@serag/shared'
import { REVIEW_REPLY_MAX, reviewReplySchema } from '@serag/shared'
import { Loader2, MessageSquare, Trash2 } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const props = defineProps<{
  review: AdminReviewRow | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [review: AdminReviewRow]
}>()

const { t } = useI18n()
const reviewsApi = useAdminReviews()
const notify = useNotify()

const replyText = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      replyText.value = props.review?.reply ?? ''
      error.value = null
    }
  },
)

const charCount = computed(() => replyText.value.length)
const isOverLimit = computed(() => charCount.value > REVIEW_REPLY_MAX)

async function handleSave() {
  if (!props.review || loading.value) return
  error.value = null

  const validation = reviewReplySchema.safeParse({ reply: replyText.value })
  if (!validation.success) {
    error.value = t('admin.reviews.replyDialog.tooLong', { max: REVIEW_REPLY_MAX })
    return
  }

  loading.value = true
  try {
    const updated = await reviewsApi.reply(props.review.id, validation.data.reply)
    notify.success(t('admin.reviews.notifications.replySaved'))
    emit('saved', updated)
    emit('update:open', false)
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    error.value = parsed.message
  } finally {
    loading.value = false
  }
}

async function handleClearReply() {
  if (!props.review || loading.value) return
  error.value = null
  loading.value = true
  try {
    const updated = await reviewsApi.reply(props.review.id, null)
    notify.info(t('admin.reviews.notifications.replyCleared'))
    emit('saved', updated)
    emit('update:open', false)
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    error.value = parsed.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader class="text-start">
        <div class="flex items-center gap-2 text-serag-night dark:text-serag-gold">
          <MessageSquare class="size-5" aria-hidden="true" />
          <DialogTitle class="font-display text-lg">
            {{ t('admin.reviews.replyDialog.title', { name: review?.name ?? '' }) }}
          </DialogTitle>
        </div>
        <DialogDescription class="pt-1 text-xs text-muted-foreground">
          {{ t('admin.reviews.replyDialog.description') }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-4 py-2" @submit.prevent="handleSave">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label
              for="admin-review-reply-input"
              class="text-xs font-semibold text-foreground"
            >
              {{ t('admin.reviews.replyDialog.label') }}
            </label>
            <span
              class="num text-xs"
              :class="isOverLimit ? 'font-bold text-destructive' : 'text-muted-foreground'"
            >
              {{ t('admin.reviews.replyDialog.charCount', { current: charCount, max: REVIEW_REPLY_MAX }) }}
            </span>
          </div>

          <textarea
            id="admin-review-reply-input"
            v-model="replyText"
            rows="4"
            :maxlength="REVIEW_REPLY_MAX + 50"
            :placeholder="t('admin.reviews.replyDialog.placeholder')"
            :disabled="loading"
            :aria-invalid="Boolean(error) || isOverLimit"
            :aria-describedby="error ? 'admin-review-reply-error' : undefined"
            class="w-full rounded-xl border border-input bg-card p-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-y"
          />

          <p v-if="error" id="admin-review-reply-error" role="alert" class="text-xs font-semibold text-destructive">
            {{ error }}
          </p>
        </div>

        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          <!-- Clear reply button (only when review already had a reply) -->
          <div>
            <Button
              v-if="review?.reply"
              type="button"
              variant="outline"
              size="sm"
              :disabled="loading"
              class="min-h-11 sm:min-h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 w-full sm:w-auto"
              @click="handleClearReply"
            >
              <Trash2 class="size-3.5" aria-hidden="true" />
              <span>{{ t('admin.reviews.replyDialog.clearReply') }}</span>
            </Button>
          </div>

          <div class="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="loading"
              class="min-h-11 sm:min-h-9 text-xs"
              @click="emit('update:open', false)"
            >
              {{ t('common.cancel') }}
            </Button>
            <Button
              type="submit"
              size="sm"
              :disabled="loading || isOverLimit"
              class="min-h-11 sm:min-h-9 font-bold text-xs bg-serag-gold text-serag-ink hover:bg-serag-gold-hi shadow-xs"
            >
              <Loader2 v-if="loading" class="size-3.5 animate-spin me-1.5" aria-hidden="true" />
              <span>{{ t('admin.reviews.replyDialog.save') }}</span>
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
