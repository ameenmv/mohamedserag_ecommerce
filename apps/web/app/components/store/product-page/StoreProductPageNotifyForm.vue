<script setup lang="ts">
import type { ProductDetail } from '@serag/shared'
import { notifyMeInputSchema } from '@serag/shared'
import { BellRing, CheckCircle2, Loader2 } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  product: ProductDetail
}>()

const { t } = useI18n()
const notify = useNotify()
const notifyMeApi = useNotifyMe()

const name = ref('')
const phone = ref('')
const website = ref('')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const submitting = ref(false)
const submitted = ref(false)
const statusMessage = ref<string | null>(null)
const errors = ref<{ name?: string; phone?: string }>({})

async function handleSubmit(): Promise<void> {
  if (!hydrated.value || submitting.value) return

  errors.value = {}
  statusMessage.value = null

  // Client-side schema validation using shared schema (normalizes phone and Arabic digits)
  const validation = notifyMeInputSchema.safeParse({
    productId: props.product.id,
    name: name.value,
    phone: phone.value,
    website: website.value || undefined,
  })

  if (!validation.success) {
    const fieldErrors: { name?: string; phone?: string } = {}
    for (const issue of validation.error.issues) {
      const field = issue.path[0]
      if (field === 'name' && !fieldErrors.name) {
        fieldErrors.name = issue.message
      } else if (field === 'phone' && !fieldErrors.phone) {
        fieldErrors.phone = issue.message
      }
    }
    errors.value = fieldErrors
    return
  }

  submitting.value = true
  try {
    const result = await notifyMeApi.submit(validation.data)

    if (result.ok) {
      submitted.value = true
      return
    }

    if (result.reason === 'in_stock') {
      statusMessage.value = t('store.notifyMe.inStockMessage')
      await refreshNuxtData(`product:${props.product.slug}`)
    } else if (result.reason === 'throttled') {
      statusMessage.value = t('store.notifyMe.throttledMessage')
    } else if (result.reason === 'not_found') {
      notify.error(result.message || t('store.notifyMe.notFoundMessage'))
    } else {
      notify.error(result.message || t('store.notifyMe.genericError'))
    }
  } catch {
    notify.error(t('store.notifyMe.genericError'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    v-if="product.availability.state === 'out'"
    id="notify-me-form"
    data-testid="notify-me-form"
    class="flex flex-col gap-4 rounded-2xl border border-border/80 bg-serag-ivory/40 p-4 sm:p-5 dark:bg-muted/20"
  >
    <!-- Success Confirmation State -->
    <div
      v-if="submitted"
      role="status"
      class="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center dark:bg-emerald-950/40"
    >
      <div class="flex size-11 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 class="size-6" aria-hidden="true" />
      </div>
      <div class="flex flex-col gap-1">
        <h3 class="font-bold text-foreground text-sm sm:text-base">
          {{ t('store.notifyMe.successTitle') }}
        </h3>
        <p class="text-xs text-muted-foreground leading-relaxed">
          {{ t('store.notifyMe.successDesc') }}
        </p>
      </div>
    </div>

    <!-- Active Form -->
    <template v-else>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <BellRing class="size-5 text-serag-gold shrink-0" aria-hidden="true" />
          <h2 class="font-bold text-foreground text-base sm:text-lg">
            {{ t('store.notifyMe.title') }}
          </h2>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">
          {{ t('store.notifyMe.subtitle') }}
        </p>
      </div>

      <!-- In-stock or throttled status message -->
      <div
        v-if="statusMessage"
        role="alert"
        class="rounded-xl border border-serag-gold/40 bg-serag-gold/10 p-3 text-xs font-semibold text-foreground leading-relaxed"
      >
        {{ statusMessage }}
      </div>

      <form
        method="POST"
        action="#"
        class="flex flex-col gap-3.5"
        @submit.prevent="handleSubmit"
      >
        <!-- Honeypot field (hidden from assistive tech and real users) -->
        <div class="sr-only" aria-hidden="true">
          <label for="notify-website">{{ t('store.notifyMe.botFieldLabel') }}</label>
          <input
            id="notify-website"
            v-model="website"
            type="text"
            tabindex="-1"
            autocomplete="off"
          >
        </div>

        <!-- Name Input -->
        <FormField
          id="notify-name"
          :label="t('store.notifyMe.nameLabel')"
          :error="errors.name"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="name"
              type="text"
              autocomplete="name"
              :placeholder="t('store.notifyMe.namePlaceholder')"
              :disabled="submitting || !hydrated"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-11 rounded-xl bg-background text-sm"
            />
          </template>
        </FormField>

        <!-- Phone Input (Accepts Egyptian mobile & Arabic digits) -->
        <FormField
          id="notify-phone"
          :label="t('store.notifyMe.phoneLabel')"
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
              :placeholder="t('store.notifyMe.phonePlaceholder')"
              :disabled="submitting || !hydrated"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-11 rounded-xl bg-background font-mono text-sm text-start"
            />
          </template>
        </FormField>

        <!-- Submit Button -->
        <Button
          type="submit"
          :disabled="submitting || !hydrated"
          class="h-11 w-full rounded-xl bg-serag-night font-bold text-serag-ivory hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night transition-colors cursor-pointer"
        >
          <Loader2 v-if="submitting" class="size-4 animate-spin me-2" aria-hidden="true" />
          <BellRing v-else class="size-4 me-2 text-serag-gold-hi" aria-hidden="true" />
          <span>{{ submitting ? t('store.notifyMe.submitting') : t('store.notifyMe.submit') }}</span>
        </Button>
      </form>
    </template>
  </div>
</template>
