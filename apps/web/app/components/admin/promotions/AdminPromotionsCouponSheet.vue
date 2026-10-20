<script setup lang="ts">
import type { AdminBrand, AdminCategory, AdminCouponRow, CouponInput } from '@serag/shared'
import { couponInputSchema } from '@serag/shared'
import { Check, Loader2, Sparkles } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseAdminApiError } from '~/utils/admin-api-errors'
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
} from '~/utils/admin-promotions'
import {
  egpInputToPiastres,
  piastresToEgpInput,
} from '~/utils/admin-money'

const props = defineProps<{
  open: boolean
  coupon: AdminCouponRow | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  saved: []
}>()

const { t, localeProperties } = useI18n()
const couponsApi = useAdminCoupons()
const categoriesApi = useAdminCategories()
const brandsApi = useAdminBrands()
const notify = useNotify()

const side = computed<'right' | 'left'>(() => (localeProperties.value.dir === 'ltr' ? 'right' : 'left'))
const isEdit = computed(() => Boolean(props.coupon?.id))

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const saving = ref(false)
const errors = ref<Record<string, string>>({})
const serverError = ref('')

const availableCategories = ref<AdminCategory[]>([])
const availableBrands = ref<AdminBrand[]>([])
const loadingScopes = ref(false)

const form = reactive({
  code: '',
  type: 'percent' as 'percent' | 'fixed',
  // v-model on type="number" inputs yields numbers once the admin types
  value: '' as string | number,
  minOrderEgp: '' as string | number,
  startsAt: '',
  endsAt: '',
  maxUses: '' as string | number,
  maxUsesPerPhone: '' as string | number,
  categoryIds: [] as string[],
  brandIds: [] as string[],
  active: true,
})

async function loadScopes() {
  if (availableCategories.value.length > 0 && availableBrands.value.length > 0) return
  loadingScopes.value = true
  try {
    const [cats, brs] = await Promise.all([
      categoriesApi.list(),
      brandsApi.list(),
    ])
    availableCategories.value = cats
    availableBrands.value = brs
  } catch {
    // Non-fatal, scopes remain empty
  } finally {
    loadingScopes.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    errors.value = {}
    serverError.value = ''
    void loadScopes()

    if (props.coupon) {
      form.code = props.coupon.code
      form.type = props.coupon.type
      form.value = props.coupon.type === 'percent'
        ? String(props.coupon.value)
        : piastresToEgpInput(props.coupon.value)
      form.minOrderEgp = props.coupon.minOrder > 0 ? piastresToEgpInput(props.coupon.minOrder) : ''
      form.startsAt = isoToDatetimeLocal(props.coupon.startsAt)
      form.endsAt = isoToDatetimeLocal(props.coupon.endsAt)
      form.maxUses = props.coupon.maxUses !== null ? String(props.coupon.maxUses) : ''
      form.maxUsesPerPhone = props.coupon.maxUsesPerPhone !== null ? String(props.coupon.maxUsesPerPhone) : ''
      form.categoryIds = [...props.coupon.categoryIds]
      form.brandIds = [...props.coupon.brandIds]
      form.active = props.coupon.active
    } else {
      form.code = ''
      form.type = 'percent'
      form.value = ''
      form.minOrderEgp = ''
      form.startsAt = ''
      form.endsAt = ''
      form.maxUses = ''
      form.maxUsesPerPhone = ''
      form.categoryIds = []
      form.brandIds = []
      form.active = true
    }
  },
  { immediate: true },
)

function onCodeInput() {
  if (errors.value.code) {
    errors.value = { ...errors.value, code: '' }
  }
}

function toggleCategory(id: string) {
  const idx = form.categoryIds.indexOf(id)
  if (idx >= 0) {
    form.categoryIds.splice(idx, 1)
  } else {
    form.categoryIds.push(id)
  }
}

function toggleBrand(id: string) {
  const idx = form.brandIds.indexOf(id)
  if (idx >= 0) {
    form.brandIds.splice(idx, 1)
  } else {
    form.brandIds.push(id)
  }
}

async function handleSubmit() {
  errors.value = {}
  serverError.value = ''

  let calculatedValue = 0
  if (form.type === 'percent') {
    const parsedPercent = Number.parseInt(String(form.value).trim(), 10)
    calculatedValue = Number.isNaN(parsedPercent) ? 0 : parsedPercent
  } else {
    const parsedFixedPiastres = egpInputToPiastres(form.value)
    calculatedValue = parsedFixedPiastres ?? 0
  }

  const minOrderPiastres = String(form.minOrderEgp).trim()
    ? (egpInputToPiastres(form.minOrderEgp) ?? 0)
    : 0

  const maxUsesNumber = String(form.maxUses).trim()
    ? Number.parseInt(String(form.maxUses).trim(), 10)
    : null
  const maxUsesPerPhoneNumber = String(form.maxUsesPerPhone).trim()
    ? Number.parseInt(String(form.maxUsesPerPhone).trim(), 10)
    : null

  const payload: CouponInput = {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: calculatedValue,
    minOrder: minOrderPiastres,
    startsAt: datetimeLocalToIso(form.startsAt),
    endsAt: datetimeLocalToIso(form.endsAt),
    maxUses: maxUsesNumber,
    maxUsesPerPhone: maxUsesPerPhoneNumber,
    categoryIds: form.categoryIds,
    brandIds: form.brandIds,
    active: form.active,
  }

  const parseResult = couponInputSchema.safeParse(payload)
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      const key = issue.path.join('.') || 'code'
      errors.value[key] = issue.message
    }
    return
  }

  saving.value = true
  try {
    if (isEdit.value && props.coupon) {
      await couponsApi.update(props.coupon.id, payload)
      notify.success(t('admin.promotions.coupons.updated'))
    } else {
      await couponsApi.create(payload)
      notify.success(t('admin.promotions.coupons.created'))
    }
    emit('saved')
    emit('update:open', false)
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)

    // Show duplicate code error inline on the code field
    if (parsed.status === 409) {
      errors.value.code = parsed.message || t('admin.promotions.coupons.errors.duplicateCode')
    } else {
      serverError.value = parsed.message
    }

    if (parsed.fieldErrors) {
      Object.assign(errors.value, parsed.fieldErrors)
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      :side="side"
      class="w-full max-w-xl overflow-y-auto p-6 sm:max-w-xl"
    >
      <SheetHeader class="text-start pb-4">
        <SheetTitle class="font-display text-2xl text-primary">
          {{ isEdit ? t('admin.promotions.coupons.edit') : t('admin.promotions.coupons.new') }}
        </SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          {{ isEdit ? props.coupon?.code : '' }}
        </SheetDescription>
      </SheetHeader>

      <form class="flex flex-col gap-4 py-2" @submit.prevent="handleSubmit">
        <!-- Server Error Banner -->
        <div
          v-if="serverError"
          role="alert"
          class="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive leading-relaxed"
        >
          {{ serverError }}
        </div>

        <!-- Code Input -->
        <FormField
          id="coupon-code"
          :label="t('admin.promotions.coupons.code')"
          :error="errors.code"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.code"
              type="text"
              dir="ltr"
              :placeholder="t('admin.promotions.coupons.codePlaceholder')"
              :disabled="saving || !hydrated"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-11 rounded-xl font-mono placeholder:font-sans text-sm tracking-wide text-start uppercase"
              @update:model-value="onCodeInput"
            />
          </template>
        </FormField>
        <span class="text-[11px] text-muted-foreground -mt-2">
          {{ t('admin.promotions.coupons.codeHint') }}
        </span>

        <!-- Type Select -->
        <div class="flex flex-col gap-1.5">
          <Label for="coupon-type" class="text-sm font-semibold">
            {{ t('admin.promotions.coupons.type') }}
          </Label>
          <select
            id="coupon-type"
            v-model="form.type"
            :disabled="saving || !hydrated"
            class="h-11 rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="percent">{{ t('admin.promotions.coupons.types.percent') }}</option>
            <option value="fixed">{{ t('admin.promotions.coupons.types.fixed') }}</option>
          </select>
        </div>

        <!-- Value Input -->
        <FormField
          id="coupon-value"
          :label="form.type === 'percent' ? t('admin.promotions.coupons.valuePercent') : t('admin.promotions.coupons.valueFixed')"
          :error="errors.value"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.value"
              type="number"
              step="any"
              :min="form.type === 'percent' ? 1 : 0.01"
              :max="form.type === 'percent' ? 90 : undefined"
              :placeholder="form.type === 'percent' ? '10' : '500'"
              :disabled="saving || !hydrated"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-11 rounded-xl font-mono placeholder:font-sans text-sm"
            />
          </template>
        </FormField>

        <!-- Min Order -->
        <FormField
          id="coupon-min-order"
          :label="t('admin.promotions.coupons.minOrder')"
          :error="errors.minOrder"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.minOrderEgp"
              type="number"
              step="any"
              min="0"
              :placeholder="t('admin.promotions.coupons.minOrderPlaceholder')"
              :disabled="saving || !hydrated"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-11 rounded-xl font-mono placeholder:font-sans text-sm"
            />
          </template>
        </FormField>

        <!-- Dates Grid -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="coupon-starts-at"
            :label="t('admin.promotions.coupons.startsAt')"
            :error="errors.startsAt"
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="form.startsAt"
                type="datetime-local"
                :disabled="saving || !hydrated"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-11 rounded-xl font-mono placeholder:font-sans text-xs"
              />
            </template>
          </FormField>

          <FormField
            id="coupon-ends-at"
            :label="t('admin.promotions.coupons.endsAt')"
            :error="errors.endsAt"
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="form.endsAt"
                type="datetime-local"
                :disabled="saving || !hydrated"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-11 rounded-xl font-mono placeholder:font-sans text-xs"
              />
            </template>
          </FormField>
        </div>

        <!-- Limits Grid -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="coupon-max-uses"
            :label="t('admin.promotions.coupons.maxUses')"
            :error="errors.maxUses"
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="form.maxUses"
                type="number"
                min="1"
                :placeholder="t('admin.promotions.coupons.maxUsesPlaceholder')"
                :disabled="saving || !hydrated"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-11 rounded-xl font-mono placeholder:font-sans text-xs"
              />
            </template>
          </FormField>

          <FormField
            id="coupon-max-uses-per-phone"
            :label="t('admin.promotions.coupons.maxUsesPerPhone')"
            :error="errors.maxUsesPerPhone"
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="form.maxUsesPerPhone"
                type="number"
                min="1"
                :placeholder="t('admin.promotions.coupons.maxUsesPerPhonePlaceholder')"
                :disabled="saving || !hydrated"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-11 rounded-xl font-mono placeholder:font-sans text-xs"
              />
            </template>
          </FormField>
        </div>

        <!-- Scopes Section -->
        <div class="flex flex-col gap-3 pt-2 border-t border-border/80">
          <div class="flex items-center gap-1.5">
            <Sparkles class="size-4 text-serag-gold" aria-hidden="true" />
            <span class="text-sm font-bold text-foreground">
              {{ t('admin.promotions.coupons.scopesTitle') }}
            </span>
          </div>

          <!-- Category Scopes -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-foreground">
                {{ t('admin.promotions.coupons.categories') }}
              </span>
              <span class="text-muted-foreground text-[11px]">
                {{ form.categoryIds.length === 0 ? t('admin.promotions.coupons.allCategories') : `(${form.categoryIds.length})` }}
              </span>
            </div>

            <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-border/60 rounded-xl bg-muted/20">
              <button
                v-for="cat in availableCategories"
                :key="cat.id"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer"
                :class="[
                  form.categoryIds.includes(cat.id)
                    ? 'bg-serag-night text-white dark:bg-serag-gold dark:text-serag-ink'
                    : 'bg-card text-muted-foreground hover:bg-muted border border-border/60',
                ]"
                @click="toggleCategory(cat.id)"
              >
                <Check v-if="form.categoryIds.includes(cat.id)" class="size-3" aria-hidden="true" />
                <span>{{ cat.name }}</span>
              </button>
            </div>
          </div>

          <!-- Brand Scopes -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-foreground">
                {{ t('admin.promotions.coupons.brands') }}
              </span>
              <span class="text-muted-foreground text-[11px]">
                {{ form.brandIds.length === 0 ? t('admin.promotions.coupons.allBrands') : `(${form.brandIds.length})` }}
              </span>
            </div>

            <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-border/60 rounded-xl bg-muted/20">
              <button
                v-for="br in availableBrands"
                :key="br.id"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer"
                :class="[
                  form.brandIds.includes(br.id)
                    ? 'bg-serag-night text-white dark:bg-serag-gold dark:text-serag-ink'
                    : 'bg-card text-muted-foreground hover:bg-muted border border-border/60',
                ]"
                @click="toggleBrand(br.id)"
              >
                <Check v-if="form.brandIds.includes(br.id)" class="size-3" aria-hidden="true" />
                <span>{{ br.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Active Switch -->
        <div class="flex items-center justify-between rounded-xl border border-border p-3.5 mt-1 bg-card">
          <Label for="coupon-active-switch" class="text-sm font-semibold cursor-pointer">
            {{ t('admin.promotions.coupons.active') }}
          </Label>
          <AdminFormSwitch
            id="coupon-active-switch"
            v-model="form.active"
            :disabled="saving || !hydrated"
          />
        </div>

        <SheetFooter class="pt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            :disabled="saving"
            class="min-h-11 sm:min-h-10"
            @click="emit('update:open', false)"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="submit"
            class="bg-serag-gold text-serag-ink font-bold hover:bg-serag-gold-hi min-h-11 sm:min-h-10"
            :disabled="saving || !hydrated"
          >
            <Loader2 v-if="saving" class="size-4 animate-spin me-1.5" aria-hidden="true" />
            <span>{{ isEdit ? t('common.save') : t('common.create') }}</span>
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
