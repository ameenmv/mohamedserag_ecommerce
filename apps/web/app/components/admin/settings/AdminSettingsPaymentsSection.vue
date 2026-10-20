<script setup lang="ts">
import { Info } from '@lucide/vue'
import { PAYMENT_METHODS } from '@serag/shared'

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
} = useAdminSettingsSection('payments')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const methodsError = computed(() => {
  return fieldErrors.value.methods || (formError.value ? formError.value : '')
})

const methodRows = computed(() =>
  PAYMENT_METHODS.flatMap((method) => {
    const setting = draft.value.methods[method]
    return setting ? [{ method, setting }] : []
  }),
)

function methodLabel(method: string): string {
  return t(`admin.orders.paymentMethods.${method}`)
}

async function handleSave() {
  await save()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.settings.payments.hint') }}</span>
    </p>

    <p
      v-if="methodsError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ methodsError }}
    </p>

    <div v-if="loaded" class="flex flex-col gap-4">
      <div
        v-for="row in methodRows"
        :key="row.method"
        class="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs"
      >
        <div class="flex items-center justify-between gap-4">
          <span class="text-sm font-bold text-foreground">{{ methodLabel(row.method) }}</span>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-muted-foreground">
              {{ t('admin.settings.payments.enabled') }}
            </span>
            <AdminFormSwitch
              :id="`settings-payment-${row.method}-enabled`"
              v-model="row.setting.enabled"
              :disabled="saving"
              :aria-label="t('admin.settings.payments.enableAria')"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label :for="`settings-payment-${row.method}-name`" class="text-xs font-semibold text-foreground">
              {{ t('admin.settings.payments.name') }}
            </label>
            <Input
              :id="`settings-payment-${row.method}-name`"
              v-model="row.setting.name"
              type="text"
              maxlength="40"
              :disabled="saving"
              class="h-10 rounded-xl"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label :for="`settings-payment-${row.method}-account`" class="text-xs font-semibold text-foreground">
              {{ t('admin.settings.payments.account') }}
            </label>
            <Input
              :id="`settings-payment-${row.method}-account`"
              :model-value="row.setting.account ?? ''"
              type="text"
              maxlength="300"
              :disabled="saving"
              :placeholder="t('admin.settings.payments.accountPlaceholder')"
              class="h-10 rounded-xl"
              @update:model-value="row.setting.account = String($event)"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label :for="`settings-payment-${row.method}-hint`" class="text-xs font-semibold text-foreground">
            {{ t('admin.settings.payments.hintLabel') }}
          </label>
          <AdminFormTextarea
            :id="`settings-payment-${row.method}-hint`"
            :model-value="row.setting.hint ?? ''"
            :rows="2"
            maxlength="300"
            :disabled="saving"
            :placeholder="t('admin.settings.payments.hintPlaceholder')"
            @update:model-value="row.setting.hint = String($event)"
          />
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
