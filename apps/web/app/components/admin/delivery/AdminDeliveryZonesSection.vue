<script setup lang="ts">
import { Info, Plus, Trash2 } from '@lucide/vue'
import {
  EGYPT_GOVERNORATES,
  SHIPPING_CLASSES,
  type ShippingClass,
  type ZonePlaceSetting,
  type ZoneSetting,
} from '@serag/shared'
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

const feeInputs = ref<Record<string, Record<ShippingClass, string>>>({})
const feeErrors = ref<Record<string, string>>({})

function syncFeeInputs() {
  const next: Record<string, Record<ShippingClass, string>> = {}
  for (const zone of draft.value) {
    next[zone.id] = {
      small: piastresToEgpInput(zone.fees.small),
      medium: piastresToEgpInput(zone.fees.medium),
      large: piastresToEgpInput(zone.fees.large),
    }
  }
  feeInputs.value = next
  feeErrors.value = {}
}

// Resync on load, save, and discard (the draft object is replaced), but not while typing.
watch(
  draft,
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

function feeFieldError(index: number, shippingClass: ShippingClass): string | undefined {
  return fieldErrors.value[`${index}.fees.${shippingClass}`]
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
    fees: { small: 0, medium: 0, large: 0 },
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

function onFeeInput(zone: ZoneSetting, shippingClass: ShippingClass, value: string) {
  const currentFees = feeInputs.value[zone.id] ?? { small: '', medium: '', large: '' }
  feeInputs.value[zone.id] = { ...currentFees, [shippingClass]: value }

  const key = `${zone.id}.${shippingClass}`
  const piastres = egpInputToPiastres(value)
  if (piastres === null) {
    feeErrors.value[key] = t('admin.settings.zones.feeInvalid')
    return
  }
  feeErrors.value = Object.fromEntries(
    Object.entries(feeErrors.value).filter(([id]) => id !== key),
  )
  zone.fees[shippingClass] = piastres
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
            <label :for="`delivery-zone-${zone.id}-name`" class="text-xs font-semibold text-foreground">
              {{ t('admin.settings.zones.name') }}
            </label>
            <Input
              :id="`delivery-zone-${zone.id}-name`"
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

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            v-for="shippingClass in SHIPPING_CLASSES"
            :key="shippingClass"
            class="flex flex-col gap-1.5"
          >
            <label
              :for="`delivery-zone-${zone.id}-${shippingClass}`"
              class="text-xs font-semibold text-foreground"
            >
              {{
                t('admin.settings.zones.classFee', {
                  class: t(`admin.delivery.classes.${shippingClass}`),
                })
              }}
            </label>
            <Input
              :id="`delivery-zone-${zone.id}-${shippingClass}`"
              :model-value="feeInputs[zone.id]?.[shippingClass] ?? ''"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              dir="ltr"
              :disabled="saving"
              :aria-invalid="Boolean(
                feeErrors[`${zone.id}.${shippingClass}`] || feeFieldError(index, shippingClass),
              )"
              class="num h-10 rounded-xl"
              @update:model-value="onFeeInput(zone, shippingClass, String($event))"
            />
            <p
              v-if="feeErrors[`${zone.id}.${shippingClass}`]"
              class="text-[11px] font-semibold text-destructive"
            >
              {{ feeErrors[`${zone.id}.${shippingClass}`] }}
            </p>
            <p
              v-else-if="feeFieldError(index, shippingClass)"
              class="text-[11px] font-semibold text-destructive"
            >
              {{ feeFieldError(index, shippingClass) }}
            </p>
          </div>
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
                :for="`delivery-zone-${zone.id}-place-${placeIndex}-gov`"
                class="text-xs font-semibold text-foreground"
              >
                {{ t('admin.settings.zones.governorate') }}
              </label>
              <AdminFormSelect
                :id="`delivery-zone-${zone.id}-place-${placeIndex}-gov`"
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
                :for="`delivery-zone-${zone.id}-place-${placeIndex}-city`"
                class="text-xs font-semibold text-foreground"
              >
                {{ t('admin.settings.zones.city') }}
              </label>
              <Input
                :id="`delivery-zone-${zone.id}-place-${placeIndex}-city`"
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
