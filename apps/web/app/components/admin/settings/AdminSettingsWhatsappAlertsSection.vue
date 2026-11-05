<script setup lang="ts">
import { Info, Plus, Trash2 } from '@lucide/vue'

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
} = useAdminSettingsSection('whatsappAlerts')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

function numberError(index: number): string | undefined {
  return fieldErrors.value[`adminNumbers.${index}`] || fieldErrors.value[String(index)]
}

const listError = computed(() => fieldErrors.value.adminNumbers)

function addNumber() {
  if (!loaded.value) return
  if (draft.value.adminNumbers.length < 5) {
    draft.value.adminNumbers.push('')
  }
}

function removeNumber(index: number) {
  if (!loaded.value) return
  draft.value.adminNumbers.splice(index, 1)
}

async function handleSave() {
  await save()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.settings.whatsappAlerts.hint') }}</span>
    </p>

    <p
      v-if="formError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ formError }}
    </p>

    <div v-if="loaded" class="flex flex-col gap-6">
      <!-- Enabled Switch Card -->
      <div class="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-bold text-foreground">
            {{ t('admin.settings.whatsappAlerts.enabled') }}
          </span>
          <span class="text-xs text-muted-foreground">
            {{ t('admin.settings.whatsappAlerts.adminNumbersHint') }}
          </span>
        </div>
        <AdminFormSwitch
          id="settings-whatsapp-alerts-enabled"
          v-model="draft.enabled"
          :disabled="saving"
          :aria-label="t('admin.settings.whatsappAlerts.enableAria')"
        />
      </div>

      <!-- Admin Numbers Section -->
      <div class="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <h2 class="text-sm font-bold text-foreground">
              {{ t('admin.settings.whatsappAlerts.adminNumbers') }}
            </h2>
            <span class="num text-xs text-muted-foreground">
              {{ draft.adminNumbers.length }} / 5
            </span>
          </div>

          <button
            type="button"
            :disabled="saving || draft.adminNumbers.length >= 5"
            class="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-input bg-background px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-40"
            @click="addNumber"
          >
            <Plus class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ t('admin.settings.whatsappAlerts.addNumber') }}</span>
          </button>
        </div>

        <p v-if="listError" role="alert" class="text-xs font-semibold text-destructive">
          {{ listError }}
        </p>

        <div v-if="draft.adminNumbers.length === 0" class="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
          {{ t('admin.settings.whatsappAlerts.empty') }}
        </div>

        <div v-else class="flex flex-col gap-2.5">
          <div
            v-for="(_, index) in draft.adminNumbers"
            :key="index"
            class="flex flex-col gap-1"
          >
            <div class="flex items-center gap-2">
              <Input
                :id="`settings-whatsapp-admin-number-${index}`"
                v-model="draft.adminNumbers[index]"
                type="tel"
                dir="ltr"
                :disabled="saving"
                :placeholder="t('admin.settings.whatsappAlerts.phonePlaceholder')"
                :aria-invalid="Boolean(numberError(index))"
                :aria-describedby="numberError(index) ? `settings-whatsapp-admin-number-error-${index}` : undefined"
                class="num h-10 flex-1 rounded-xl"
              />
              <button
                type="button"
                :disabled="saving"
                :aria-label="t('admin.settings.whatsappAlerts.removeNumberAria')"
                class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-destructive hover:bg-destructive/10 disabled:opacity-40"
                @click="removeNumber(index)"
              >
                <Trash2 class="size-4" aria-hidden="true" />
              </button>
            </div>
            <p
              v-if="numberError(index)"
              :id="`settings-whatsapp-admin-number-error-${index}`"
              class="text-[11px] font-semibold text-destructive"
            >
              {{ numberError(index) }}
            </p>
          </div>
        </div>
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
