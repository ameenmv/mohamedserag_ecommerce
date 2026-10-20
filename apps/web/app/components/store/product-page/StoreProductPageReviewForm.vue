<script setup lang="ts">
import type { ProductDetail } from '@serag/shared'
import { REVIEW_TEXT_MAX, reviewInputSchema } from '@serag/shared'
import { CheckCircle2, Loader2, Send, Star } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  product: ProductDetail
}>()

const emit = defineEmits<{
  submitted: []
}>()

const { t } = useI18n()
const notify = useNotify()
const reviewSubmitApi = useReviewSubmit()

const stars = ref<number | null>(null)
const hoveredStar = ref<number | null>(null)
const text = ref('')
const name = ref('')
const phone = ref('')
const website = ref('')

const starsGroupRef = ref<HTMLElement | null>(null)

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const submitting = ref(false)
const submitted = ref(false)
const isDuplicate = ref(false)
const statusMessage = ref<string | null>(null)
const errors = ref<{
  stars?: string
  text?: string
  name?: string
  phone?: string
}>({})

function getStarLabel(star: number): string {
  return t(`store.reviews.starLabel.${star}`)
}

function handleStarsKeydown(e: KeyboardEvent): void {
  if (submitting.value || !hydrated.value || isDuplicate.value) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault()
    const next = stars.value ? Math.min(5, stars.value + 1) : 1
    stars.value = next
    if (errors.value.stars) errors.value.stars = undefined
    const radioEl = document.getElementById(`review-star-${next}`) as HTMLInputElement | null
    radioEl?.focus()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault()
    const prev = stars.value ? Math.max(1, stars.value - 1) : 1
    stars.value = prev
    if (errors.value.stars) errors.value.stars = undefined
    const radioEl = document.getElementById(`review-star-${prev}`) as HTMLInputElement | null
    radioEl?.focus()
  }
}

watch(stars, (val) => {
  if (val && errors.value.stars) {
    errors.value.stars = undefined
  }
})

function focusFirstError(): void {
  if (errors.value.stars) {
    starsGroupRef.value?.focus()
  } else if (errors.value.text) {
    document.getElementById('review-text')?.focus()
  } else if (errors.value.name) {
    document.getElementById('review-name')?.focus()
  } else if (errors.value.phone) {
    document.getElementById('review-phone')?.focus()
  }
}

async function handleSubmit(): Promise<void> {
  if (!hydrated.value || submitting.value || isDuplicate.value) return

  errors.value = {}
  statusMessage.value = null

  // Client-side schema validation using shared schema
  const validation = reviewInputSchema.safeParse({
    productId: props.product.id,
    stars: stars.value,
    text: text.value,
    name: name.value,
    phone: phone.value,
    website: website.value || undefined,
  })

  if (!validation.success) {
    const fieldErrors: {
      stars?: string
      text?: string
      name?: string
      phone?: string
    } = {}

    for (const issue of validation.error.issues) {
      const field = String(issue.path[0])
      if (field === 'stars' && !fieldErrors.stars) {
        fieldErrors.stars = t('store.reviews.validation.stars')
      } else if (field === 'text' && !fieldErrors.text) {
        fieldErrors.text = t('store.reviews.validation.text')
      } else if (field === 'name' && !fieldErrors.name) {
        fieldErrors.name = t('store.reviews.validation.name')
      } else if (field === 'phone' && !fieldErrors.phone) {
        fieldErrors.phone = t('store.reviews.validation.phone')
      }
    }
    errors.value = fieldErrors

    await nextTick()
    focusFirstError()
    return
  }

  submitting.value = true
  try {
    const result = await reviewSubmitApi.submit(validation.data)

    if (result.ok) {
      submitted.value = true
      emit('submitted')
      return
    }

    if (result.reason === 'duplicate') {
      isDuplicate.value = true
      statusMessage.value = t('store.reviews.duplicateError')
    } else if (result.reason === 'throttled') {
      statusMessage.value = t('store.reviews.throttledError')
    } else if (result.reason === 'not_found') {
      statusMessage.value = t('store.reviews.notFoundError')
    } else {
      notify.error(t('store.reviews.genericError'))
    }
  } catch {
    notify.error(t('store.reviews.genericError'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    id="review-form-panel"
    data-testid="review-form-panel"
    class="flex flex-col gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-xs"
  >
    <!-- Success Confirmation State (role="status", no PII echoed) -->
    <div
      v-if="submitted"
      role="status"
      class="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center dark:bg-emerald-950/40"
    >
      <div class="flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 class="size-6" aria-hidden="true" />
      </div>
      <div class="flex flex-col gap-1.5">
        <h3 class="font-bold text-foreground text-base sm:text-lg">
          {{ t('store.reviews.successTitle') }}
        </h3>
        <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
          {{ t('store.reviews.successDesc') }}
        </p>
      </div>
    </div>

    <!-- Active Review Form -->
    <template v-else>
      <div class="flex flex-col gap-1">
        <h3 class="font-bold text-foreground text-base sm:text-lg">
          {{ t('store.reviews.formTitle') }}
        </h3>
        <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {{ t('store.reviews.formDesc') }}
        </p>
      </div>

      <!-- In-form status message (duplicate, throttled, not found) -->
      <div
        v-if="statusMessage"
        role="alert"
        class="rounded-xl border border-serag-gold/40 bg-serag-gold/10 p-3.5 text-xs sm:text-sm font-semibold text-foreground leading-relaxed"
      >
        {{ statusMessage }}
      </div>

      <form
        method="post"
        action="#"
        class="flex flex-col gap-4.5"
        @submit.prevent="handleSubmit"
      >
        <!-- Honeypot field (hidden from assistive tech and real users) -->
        <div class="sr-only" aria-hidden="true">
          <label for="review-website">{{ t('store.reviews.botFieldLabel') }}</label>
          <input
            id="review-website"
            v-model="website"
            type="text"
            tabindex="-1"
            autocomplete="off"
          >
        </div>

        <!-- Rating Stars (Accessible Radiogroup) -->
        <div class="flex flex-col gap-2">
          <Label id="review-stars-label" class="text-sm font-semibold">
            {{ t('store.reviews.ratingLabel') }}
          </Label>

          <div
            id="review-stars-group"
            ref="starsGroupRef"
            role="radiogroup"
            aria-labelledby="review-stars-label"
            :aria-invalid="Boolean(errors.stars)"
            :aria-describedby="errors.stars ? 'review-stars-error' : undefined"
            tabindex="0"
            class="inline-flex w-fit items-center gap-1 rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @keydown="handleStarsKeydown"
          >
            <label
              v-for="star in 5"
              :key="star"
              :for="`review-star-${star}`"
              class="relative flex size-11 cursor-pointer items-center justify-center rounded-lg transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-ring"
              @mouseenter="hoveredStar = star"
              @mouseleave="hoveredStar = null"
            >
              <input
                :id="`review-star-${star}`"
                v-model="stars"
                type="radio"
                name="review-stars"
                :value="star"
                :disabled="submitting || !hydrated || isDuplicate"
                :aria-label="getStarLabel(star)"
                class="sr-only"
              >
              <Star
                class="size-7 transition-colors"
                :class="
                  (hoveredStar !== null ? star <= hoveredStar : (stars !== null && star <= stars))
                    ? 'fill-serag-gold text-serag-gold'
                    : 'text-muted-foreground/30 fill-transparent'
                "
                aria-hidden="true"
              />
            </label>
          </div>

          <p
            v-if="errors.stars"
            id="review-stars-error"
            class="text-xs font-medium text-destructive"
          >
            {{ errors.stars }}
          </p>
        </div>

        <!-- Textarea with Live Counter -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <Label for="review-text" class="text-sm font-semibold">
              {{ t('store.reviews.textLabel') }}
            </Label>
            <span
              class="num text-xs text-muted-foreground"
              aria-live="polite"
            >
              {{ text.length }} / {{ REVIEW_TEXT_MAX }}
            </span>
          </div>

          <textarea
            id="review-text"
            v-model="text"
            rows="4"
            :maxlength="REVIEW_TEXT_MAX"
            :disabled="submitting || !hydrated || isDuplicate"
            :aria-invalid="Boolean(errors.text)"
            :aria-describedby="errors.text ? 'review-text-error' : undefined"
            :placeholder="t('store.reviews.textPlaceholder')"
            class="flex min-h-24 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive resize-y"
          />

          <p
            v-if="errors.text"
            id="review-text-error"
            class="text-xs font-medium text-destructive"
          >
            {{ errors.text }}
          </p>
        </div>

        <!-- Reviewer Name -->
        <FormField
          id="review-name"
          :label="t('store.reviews.nameLabel')"
          :error="errors.name"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="name"
              type="text"
              autocomplete="name"
              :placeholder="t('store.reviews.namePlaceholder')"
              :disabled="submitting || !hydrated || isDuplicate"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-11 rounded-xl bg-background text-sm"
            />
          </template>
        </FormField>

        <!-- Reviewer Mobile Phone (Private) -->
        <div class="flex flex-col gap-1.5">
          <FormField
            id="review-phone"
            :label="t('store.reviews.phoneLabel')"
            :error="errors.phone"
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="phone"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                dir="ltr"
                :placeholder="t('store.reviews.phonePlaceholder')"
                :disabled="submitting || !hydrated || isDuplicate"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-11 rounded-xl bg-background font-mono text-sm text-start"
              />
            </template>
          </FormField>
          <p class="text-xs text-muted-foreground">
            {{ t('store.reviews.phoneHint') }}
          </p>
        </div>

        <!-- Submit Button -->
        <Button
          type="submit"
          :disabled="submitting || !hydrated || isDuplicate"
          class="h-11 w-full rounded-xl bg-serag-night font-bold text-serag-ivory hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night transition-colors cursor-pointer"
        >
          <Loader2 v-if="submitting" class="size-4 animate-spin me-2" aria-hidden="true" />
          <Send v-else class="size-4 me-2 text-serag-gold-hi rtl:-scale-x-100" aria-hidden="true" />
          <span>{{ submitting ? t('store.reviews.submitting') : t('store.reviews.submit') }}</span>
        </Button>
      </form>
    </template>
  </div>
</template>
