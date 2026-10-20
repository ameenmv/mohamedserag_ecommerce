<script setup lang="ts">
import { Info, Plus, Trash2 } from '@lucide/vue'
import { EGYPT_GOVERNORATES, type ZonePlaceSetting, type ZoneSetting } from '@serag/shared'
import { egpInputToPiastres, piastresToEgpInput } from '~/utils/admin-money'
import { createZoneId } from '~/utils/admin-settings'

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
} = useAdminSettingsSection('zones')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const feeInputs = ref<Record<string, string>>({})
const feeErrors = ref<Record<string, string>>({})

function syncFeeInputs() {
  const next: Record<string, string> = {}
  for (const zone of draft.value) {
    next[zone.id] = piastresToEgpInput(zone.fee)
  }
  feeInputs.value = next
}

watch(
  () => [loaded.value, draft.value.map((z) => z.id).join(',')],
  () => {
    if (loaded.value) syncFeeInputs()
  },
  { immediate: true },
)

function fieldError(field: string): string | undefined {
  return fieldErrors.value[field]
}

function zoneFieldError(index: number, field: string): string | undefined {
  return fieldErrors.value[`${index}.${field}`]
}

function placeError(index: number, placeIndex: number, field: string): string | undefined {
  return fieldErrors.value[`${index}.places.${placeIndex}.${field}`]
}

function placesError(index: number): string | undefined {
  return fieldErrors.value[`${index}.places`]
}

function addZone() {
  draft.value.push({
    id: createZoneId(),
    name: '',
    fee: 0,
    places: [{ governorate: EGYPT_GOVERNORATES[0] ?? '', city: undefined }],
  })
}

function removeZone(index: number) {
  draft.value.splice(index, 1)
}

function addPlace(zone: ZoneSetting) {
  zone.places.push({ governorate: EGYPT_GOVERNORATES[0] ?? '', city: undefined })
}

function removePlace(zone: ZoneSetting, placeIndex: number) {
  zone.places.splice(placeIndex, 1)
}

function onFeeInput(zone: ZoneSetting, value: string) {
  feeInputs.value[zone.id] = value
  const piastres = egpInputToPiastres(value)
  if (piastres === null) {
    feeErrors.value[zone.id] = t('admin.settings.zones.feeInvalid')
    return
  }
  feeErrors.value = Object.fromEntries(
    Object.entries(feeErrors.value).filter(([id]) => id !== zone.id),
  )
  zone.fee = piastres
}

function onCityChange(place: ZonePlaceSetting, value: string) {
  const trimmed = value.trim()
  place.city = trimmed === '' ? undefined : trimmed
}

async function handleSave() {
  await save()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.settings.zones.hint') }}</span>
    </p>

    <p
      v-if="formError || fieldError('zones')"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ fieldError('zones') || formError }}
    </p>

    <div v-if="loaded" class="flex flex-col gap-4">
      <div
        v-for="(zone, index) in draft"
        :key="zone.id"
        class="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs"
      >
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-1 flex-col gap-1.5 sm:max-w-xs">
            <label :for="`settings-zone-${zone.id}-name`" class="text-xs font-semibold text-foreground">
              {{ t('admin.settings.zones.name') }}
            </label>
            <Input
              :id="`settings-zone-${zone.id}-name`"
              v-model="zone.name"
              type="text"
              maxlength="40"
              :disabled="saving"
              :aria-invalid="Boolean(zoneFieldError(index, 'name'))"
              :placeholder="t('admin.settings.zones.namePlaceholder')"
              class="h-10 rounded-xl"
            />
            <p v-if="zoneFieldError(index, 'name')" class="text-[11px] font-semibold text-destructive">
              {{ zoneFieldError(index, 'name') }}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="saving || draft.length <= 1"
            :aria-label="t('admin.settings.zones.removeAria')"
            class="min-h-11 sm:min-h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            @click="removeZone(index)"
          >
            <Trash2 class="size-3.5 me-1.5" aria-hidden="true" />
            <span class="hidden sm:inline">{{ t('admin.settings.zones.remove') }}</span>
          </Button>
        </div>

        <div class="flex max-w-xs flex-col gap-1.5">
          <label :for="`settings-zone-${zone.id}-fee`" class="text-xs font-semibold text-foreground">
            {{ t('admin.settings.zones.fee') }}
          </label>
          <Input
            :id="`settings-zone-${zone.id}-fee`"
            :model-value="feeInputs[zone.id] ?? ''"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            dir="ltr"
            :disabled="saving"
            :aria-invalid="Boolean(feeErrors[zone.id])"
            class="num h-10 rounded-xl"
            @update:model-value="onFeeInput(zone, String($event))"
          />
          <p v-if="feeErrors[zone.id]" class="text-[11px] font-semibold text-destructive">
            {{ feeErrors[zone.id] }}
          </p>
        </div>

        <div class="flex flex-col gap-3 border-t border-border/60 pt-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-foreground">{{ t('admin.settings.zones.places') }}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="saving"
              class="min-h-11 sm:min-h-9 text-xs"
              @click="addPlace(zone)"
            >
              <Plus class="size-3.5 me-1.5" aria-hidden="true" />
              <span>{{ t('admin.settings.zones.addPlace') }}</span>
            </Button>
          </div>

          <p v-if="placesError(index)" class="text-[11px] font-semibold text-destructive">
            {{ placesError(index) }}
          </p>

          <p
            v-if="zone.places.length === 0"
            class="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground"
          >
            {{ t('admin.settings.zones.catchAll') }}
          </p>

          <div
            v-for="(place, placeIndex) in zone.places"
            :key="placeIndex"
            class="flex flex-col gap-3 rounded-xl bg-muted/40 p-3 sm:flex-row sm:items-end"
          >
            <div class="flex flex-1 flex-col gap-1.5">
              <label
                :for="`settings-zone-${zone.id}-place-${placeIndex}-gov`"
                class="text-xs font-semibold text-foreground"
              >
                {{ t('admin.settings.zones.governorate') }}
              </label>
              <AdminFormSelect
                :id="`settings-zone-${zone.id}-place-${placeIndex}-gov`"
                v-model="place.governorate"
                :disabled="saving"
                :aria-invalid="Boolean(placeError(index, placeIndex, 'governorate'))"
              >
                <option value="" disabled>{{ t('admin.settings.zones.selectGovernorate') }}</option>
                <option v-for="gov in EGYPT_GOVERNORATES" :key="gov" :value="gov">{{ gov }}</option>
              </AdminFormSelect>
              <p
                v-if="placeError(index, placeIndex, 'governorate')"
                class="text-[11px] font-semibold text-destructive"
              >
                {{ placeError(index, placeIndex, 'governorate') }}
              </p>
            </div>

            <div class="flex flex-1 flex-col gap-1.5">
              <label
                :for="`settings-zone-${zone.id}-place-${placeIndex}-city`"
                class="text-xs font-semibold text-foreground"
              >
                {{ t('admin.settings.zones.city') }}
              </label>
              <Input
                :id="`settings-zone-${zone.id}-place-${placeIndex}-city`"
                :model-value="place.city ?? ''"
                type="text"
                maxlength="40"
                :disabled="saving"
                :placeholder="t('admin.settings.zones.cityPlaceholder')"
                class="h-10 rounded-xl"
                @update:model-value="onCityChange(place, String($event))"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              :disabled="saving"
              :aria-label="t('admin.settings.zones.removePlaceAria')"
              class="min-h-11 sm:min-h-9 text-xs text-destructive hover:bg-destructive/10"
              @click="removePlace(zone, placeIndex)"
            >
              <Trash2 class="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          :disabled="saving"
          class="min-h-11 text-xs font-bold"
          @click="addZone"
        >
          <Plus class="size-4 me-1.5" aria-hidden="true" />
          <span>{{ t('admin.settings.zones.add') }}</span>
        </Button>
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
