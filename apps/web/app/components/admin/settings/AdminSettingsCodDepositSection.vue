<script setup lang="ts">
import { Info } from '@lucide/vue'
import { egpInputToPiastres, piastresToEgpInput } from '~/utils/admin-money'

const { t } = useI18n()
const {
  draft,
  loaded,
  saving,
  fieldErrors,
  formError,
  dirty,
  save,
  discard,
} = useAdminSettingsSection('codDeposit')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const thresholdInput = ref('')
const thresholdError = ref('')

watch(
  () => [loaded.value, draft.value.threshold],
  () => {
    if (loaded.value) {
      thresholdInput.value = piastresToEgpInput(draft.value.threshold)
    }
  },
  { immediate: true },
)

function onThresholdInput(value: string): void {
  thresholdInput.value = value
  const piastres = egpInputToPiastres(value)
  if (piastres === null || piastres <= 0) {
    thresholdError.value = t('admin.settings.codDeposit.thresholdInvalid')
    return
  }
  thresholdError.value = ''
  draft.value.threshold = piastres
}

const pctError = computed(() => fieldErrors.value.pct)

async function handleSave() {
  await save()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.settings.codDeposit.hint') }}</span>
    </p>

    <p
      v-if="formError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ formError }}
    </p>

    <div v-if="loaded" class="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-1.5">
        <label for="settings-cod-threshold" class="text-xs font-semibold text-foreground">
          {{ t('admin.settings.codDeposit.threshold') }}
        </label>
        <Input
          id="settings-cod-threshold"
          :model-value="thresholdInput"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          dir="ltr"
          :disabled="saving"
          :aria-invalid="Boolean(thresholdError)"
          :aria-describedby="thresholdError ? 'settings-cod-threshold-error' : 'settings-cod-threshold-hint'"
          class="num h-10 rounded-xl"
          @update:model-value="onThresholdInput(String($event))"
        />
        <p v-if="thresholdError" id="settings-cod-threshold-error" class="text-[11px] font-semibold text-destructive">
          {{ thresholdError }}
        </p>
        <span v-else id="settings-cod-threshold-hint" class="text-[11px] text-muted-foreground">
          {{ t('admin.settings.codDeposit.thresholdHint') }}
        </span>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="settings-cod-pct" class="text-xs font-semibold text-foreground">
          {{ t('admin.settings.codDeposit.pct') }}
        </label>
        <Input
          id="settings-cod-pct"
          v-model.number="draft.pct"
          type="number"
          min="1"
          max="100"
          inputmode="numeric"
          dir="ltr"
          :disabled="saving"
          :aria-invalid="Boolean(pctError)"
          :aria-describedby="pctError ? 'settings-cod-pct-error' : undefined"
          class="num h-10 rounded-xl"
        />
        <p v-if="pctError" id="settings-cod-pct-error" class="text-[11px] font-semibold text-destructive">
          {{ pctError }}
        </p>
      </div>
    </div>

    <AdminSettingsSaveBar
      :saving="saving"
      :dirty="dirty"
      :hydrated="hydrated"
      @save="handleSave"
      @discard="discard"
    />
  </div>
</template>
