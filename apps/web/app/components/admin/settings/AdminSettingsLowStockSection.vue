<script setup lang="ts">
import { Info } from '@lucide/vue'

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
} = useAdminSettingsSection('lowStock')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const thresholdError = computed(() => fieldErrors.value.defaultThreshold)

async function handleSave() {
  await save()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.settings.lowStock.hint') }}</span>
    </p>

    <p
      v-if="formError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ formError }}
    </p>

    <div v-if="loaded" class="flex max-w-sm flex-col gap-1.5">
      <label for="settings-low-stock" class="text-xs font-semibold text-foreground">
        {{ t('admin.settings.lowStock.threshold') }}
      </label>
      <Input
        id="settings-low-stock"
        v-model.number="draft.defaultThreshold"
        type="number"
        min="0"
        max="999"
        inputmode="numeric"
        dir="ltr"
        :disabled="saving"
        :aria-invalid="Boolean(thresholdError)"
        :aria-describedby="thresholdError ? 'settings-low-stock-error' : 'settings-low-stock-hint'"
        class="num h-10 rounded-xl"
      />
      <p v-if="thresholdError" id="settings-low-stock-error" class="text-[11px] font-semibold text-destructive">
        {{ thresholdError }}
      </p>
      <span v-else id="settings-low-stock-hint" class="text-[11px] text-muted-foreground">
        {{ t('admin.settings.lowStock.appliesToHint') }}
      </span>
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
