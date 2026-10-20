<script setup lang="ts">
import { AlertTriangle, Info } from '@lucide/vue'

const { t } = useI18n()
const {
  draft,
  loaded,
  saving,
  warnings,
  fieldErrors,
  formError,
  dirty,
  save,
  discard,
} = useAdminSettingsSection('store')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

function fieldError(field: string): string | undefined {
  return fieldErrors.value[field]
}

function isPlaceholder(field: string): boolean {
  return warnings.value.includes(field)
}

async function handleSave() {
  await save()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.settings.store.hint') }}</span>
    </p>

    <p
      v-if="formError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ formError }}
    </p>

    <form class="flex max-w-2xl flex-col gap-4" @submit.prevent="handleSave">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="settings-store-name" :label="t('admin.settings.store.name')" :error="fieldError('name')">
          <template #default="{ id, invalid, describedBy }">
            <div class="flex flex-col gap-1">
              <Input
                :id="id"
                v-model="draft.name"
                type="text"
                maxlength="80"
                :disabled="!loaded || saving"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                :placeholder="t('admin.settings.store.namePlaceholder')"
                class="h-10 rounded-xl"
              />
              <span
                v-if="isPlaceholder('name')"
                class="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
              >
                <AlertTriangle class="size-3.5" aria-hidden="true" />
                <span>{{ t('admin.settings.store.placeholderWarning') }}</span>
              </span>
            </div>
          </template>
        </FormField>

        <FormField id="settings-store-phone" :label="t('admin.settings.store.phone')" :error="fieldError('phone')">
          <template #default="{ id, invalid, describedBy }">
            <div class="flex flex-col gap-1">
              <Input
                :id="id"
                v-model="draft.phone"
                type="tel"
                dir="ltr"
                :disabled="!loaded || saving"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="num h-10 rounded-xl"
              />
              <span class="text-[11px] text-muted-foreground">{{ t('admin.settings.store.phoneHint') }}</span>
            </div>
          </template>
        </FormField>

        <FormField id="settings-store-whatsapp" :label="t('admin.settings.store.whatsapp')" :error="fieldError('whatsapp')">
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="draft.whatsapp"
              type="tel"
              dir="ltr"
              :disabled="!loaded || saving"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="num h-10 rounded-xl"
            />
          </template>
        </FormField>

        <FormField
          id="settings-store-traders-whatsapp"
          :label="t('admin.settings.store.tradersWhatsapp')"
          :error="fieldError('tradersWhatsapp')"
        >
          <template #default="{ id, invalid, describedBy }">
            <div class="flex flex-col gap-1">
              <Input
                :id="id"
                v-model="draft.tradersWhatsapp"
                type="tel"
                dir="ltr"
                :disabled="!loaded || saving"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="num h-10 rounded-xl"
              />
              <span class="text-[11px] text-muted-foreground">
                {{ t('admin.settings.store.tradersWhatsappHint') }}
              </span>
            </div>
          </template>
        </FormField>
      </div>

      <FormField id="settings-store-address" :label="t('admin.settings.store.address')" :error="fieldError('address')">
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="draft.address"
            type="text"
            maxlength="200"
            :disabled="!loaded || saving"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
            class="h-10 rounded-xl"
          />
        </template>
      </FormField>

      <FormField id="settings-store-hours" :label="t('admin.settings.store.hours')" :error="fieldError('hours')">
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="draft.hours"
            type="text"
            maxlength="120"
            :disabled="!loaded || saving"
            :aria-invalid="invalid"
            :aria-describedby="describedBy"
            class="h-10 rounded-xl"
          />
        </template>
      </FormField>
    </form>

    <AdminSettingsSaveBar
      :saving="saving"
      :dirty="dirty"
      :hydrated="hydrated"
      @save="handleSave"
      @discard="discard"
    />
  </div>
</template>
