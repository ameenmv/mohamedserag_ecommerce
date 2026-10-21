<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BridalSettings } from '@serag/shared'
import { Info, Save, Settings } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  settings: BridalSettings
  saving?: boolean
  apiError?: string | null
}>()

const emit = defineEmits<{
  save: [input: BridalSettings]
}>()

const { t } = useI18n()

const depositPct = ref(props.settings.depositPct)
const lockDays = ref(props.settings.lockDays)
const validationError = ref<string | null>(null)

watch(
  () => props.settings,
  (newSettings) => {
    depositPct.value = newSettings.depositPct
    lockDays.value = newSettings.lockDays
  },
  { deep: true },
)

function handleSubmit() {
  const d = Math.round(Number(depositPct.value))
  const l = Math.round(Number(lockDays.value))

  if (Number.isNaN(d) || d < 1 || d > 50) {
    validationError.value = t('admin.bridal.settings.depositPctError')
    return
  }

  if (Number.isNaN(l) || l < 7 || l > 180) {
    validationError.value = t('admin.bridal.settings.lockDaysError')
    return
  }

  validationError.value = null
  emit('save', {
    depositPct: d,
    lockDays: l,
  })
}
</script>

<template>
  <Card class="min-w-0 shadow-xs border-border/80">
    <CardHeader class="pb-3 border-b border-border/60">
      <div class="flex items-center gap-2">
        <Settings class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <CardTitle class="text-base font-bold text-foreground">
          {{ t('admin.bridal.settings.title') }}
        </CardTitle>
      </div>
    </CardHeader>

    <CardContent class="pt-4">
      <form class="flex flex-col gap-4 max-w-xl" @submit.prevent="handleSubmit">
        <!-- Error alert -->
        <div
          v-if="validationError || apiError"
          class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium"
        >
          {{ validationError || apiError }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Deposit % (1-50) -->
          <div class="flex flex-col gap-1.5">
            <label for="bridal-deposit-pct" class="text-xs font-bold text-foreground">
              {{ t('admin.bridal.settings.depositPctLabel') }}
            </label>
            <div class="relative">
              <input
                id="bridal-deposit-pct"
                v-model.number="depositPct"
                type="number"
                min="1"
                max="50"
                required
                class="border-input bg-background h-10 w-full rounded-xl border ps-3 pe-8 text-xs font-bold num shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              >
              <span class="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-bold text-muted-foreground">
                %
              </span>
            </div>
            <span class="text-[11px] text-muted-foreground">
              {{ t('admin.bridal.settings.depositPctHint') }}
            </span>
          </div>

          <!-- Lock Days (7-180) -->
          <div class="flex flex-col gap-1.5">
            <label for="bridal-lock-days" class="text-xs font-bold text-foreground">
              {{ t('admin.bridal.settings.lockDaysLabel') }}
            </label>
            <input
              id="bridal-lock-days"
              v-model.number="lockDays"
              type="number"
              min="7"
              max="180"
              required
              class="border-input bg-background h-10 w-full rounded-xl border px-3 text-xs font-bold num shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
            >
            <span class="text-[11px] text-muted-foreground">
              {{ t('admin.bridal.settings.lockDaysHint') }}
            </span>
          </div>
        </div>

        <!-- Note Notice -->
        <div class="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground border border-border/40">
          <Info class="size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
          <span>{{ t('admin.bridal.settings.notice') }}</span>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-start pt-2">
          <Button
            type="submit"
            :disabled="saving"
            class="min-h-11 px-5 bg-serag-night text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink font-bold gap-2"
          >
            <Save class="size-4" aria-hidden="true" />
            <span>{{ saving ? t('common.save') + '...' : t('admin.bridal.settings.saveButton') }}</span>
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
