<script setup lang="ts">
import type { AdminFlashSaleItem, FlashSaleInput } from '@serag/shared'
import { flashSaleInputSchema } from '@serag/shared'
import { Loader2, Plus, Sparkles, Trash2 } from '@lucide/vue'
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
  calculateDiscountPercent,
  egpInputToPiastres,
  piastresToEgpInput,
} from '~/utils/admin-money'

interface FlashItemRow {
  productId: string
  name: string
  modelCode: string
  regularPrice: number
  salePriceEgp: string | number
}

const props = defineProps<{
  open: boolean
  saleId: string | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  saved: []
}>()

const { t, localeProperties } = useI18n()
const { money } = usePrice()
const flashSalesApi = useAdminFlashSales()
const notify = useNotify()

const side = computed<'right' | 'left'>(() => (localeProperties.value.dir === 'ltr' ? 'right' : 'left'))
const isEdit = computed(() => Boolean(props.saleId))

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const loadingDetail = ref(false)
const saving = ref(false)
const pickerOpen = ref(false)

const form = reactive({
  name: '',
  startsAt: '',
  endsAt: '',
  items: [] as FlashItemRow[],
})

const errors = ref<Record<string, string>>({})
const itemErrors = ref<Record<string, string>>({})
const serverError = ref('')
const conflictProductIds = ref<Set<string>>(new Set())

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return

    errors.value = {}
    itemErrors.value = {}
    serverError.value = ''
    conflictProductIds.value = new Set()

    if (props.saleId) {
      loadingDetail.value = true
      try {
        const detail = await flashSalesApi.getById(props.saleId)
        form.name = detail.name
        form.startsAt = isoToDatetimeLocal(detail.startsAt)
        form.endsAt = isoToDatetimeLocal(detail.endsAt)
        form.items = detail.items.map((i: AdminFlashSaleItem) => ({
          productId: i.productId,
          name: i.productName,
          modelCode: i.modelCode ?? '',
          regularPrice: i.regularPrice,
          salePriceEgp: piastresToEgpInput(i.salePrice),
        }))
      } catch (err: unknown) {
        const parsed = parseAdminApiError(err, t)
        notify.error(parsed.message)
        emit('update:open', false)
      } finally {
        loadingDetail.value = false
      }
    } else {
      // Default: starts now, ends in 2 hours
      const now = new Date()
      const end = new Date(now.getTime() + 2 * 3600_000)
      form.name = ''
      form.startsAt = isoToDatetimeLocal(now.toISOString())
      form.endsAt = isoToDatetimeLocal(end.toISOString())
      form.items = []
      loadingDetail.value = false
    }
  },
  { immediate: true },
)

function handleProductPicked(p: {
  id: string
  name: string
  modelCode: string
  price: number
  flagged: boolean
}) {
  const existing = form.items.find((item) => item.productId === p.id)
  if (!existing) {
    form.items.push({
      productId: p.id,
      name: p.name,
      modelCode: p.modelCode,
      regularPrice: p.price,
      salePriceEgp: '',
    })
  }
}

function removeItem(productId: string) {
  form.items = form.items.filter((i) => i.productId !== productId)
  itemErrors.value = Object.fromEntries(
    Object.entries(itemErrors.value).filter(([id]) => id !== productId),
  )
  conflictProductIds.value.delete(productId)
}

function getItemDiscount(row: FlashItemRow): number | null {
  const salePiastres = egpInputToPiastres(row.salePriceEgp)
  return calculateDiscountPercent(salePiastres, row.regularPrice)
}

async function handleSubmit() {
  errors.value = {}
  itemErrors.value = {}
  serverError.value = ''
  conflictProductIds.value = new Set()

  if (form.items.length === 0) {
    errors.value.items = t('admin.promotions.flash.errors.minItems')
    return
  }

  // Validate sale price vs regular price for each product
  let hasPriceErrors = false
  for (const item of form.items) {
    const salePiastres = egpInputToPiastres(item.salePriceEgp)
    if (salePiastres === null || salePiastres <= 0) {
      itemErrors.value[item.productId] = t('admin.promotions.flash.errors.salePricePositive')
      hasPriceErrors = true
    } else if (salePiastres >= item.regularPrice) {
      itemErrors.value[item.productId] = t('admin.promotions.flash.errors.salePriceGteRegular')
      hasPriceErrors = true
    }
  }

  if (hasPriceErrors) {
    return
  }

  const startsAtIso = datetimeLocalToIso(form.startsAt)
  const endsAtIso = datetimeLocalToIso(form.endsAt)

  const payload: FlashSaleInput = {
    name: form.name.trim(),
    startsAt: startsAtIso ?? '',
    endsAt: endsAtIso ?? '',
    items: form.items.map((i) => ({
      productId: i.productId,
      salePrice: egpInputToPiastres(i.salePriceEgp) ?? 0,
    })),
  }

  const parseResult = flashSaleInputSchema.safeParse(payload)
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      const key = issue.path.join('.') || 'name'
      errors.value[key] = issue.message
    }
    return
  }

  saving.value = true
  try {
    if (isEdit.value && props.saleId) {
      await flashSalesApi.update(props.saleId, payload)
      notify.success(t('admin.promotions.flash.updated'))
    } else {
      await flashSalesApi.create(payload)
      notify.success(t('admin.promotions.flash.created'))
    }
    emit('saved')
    emit('update:open', false)
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    serverError.value = parsed.message

    const rawError = err as {
      data?: { code?: string; products?: Array<{ id: string }> }
      response?: { _data?: { code?: string; products?: Array<{ id: string }> } }
    }
    const payloadData = rawError?.data ?? rawError?.response?._data

    if (payloadData?.code === 'OVERLAP' && Array.isArray(payloadData.products)) {
      conflictProductIds.value = new Set(payloadData.products.map((p) => p.id))
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
          {{ isEdit ? t('admin.promotions.flash.edit') : t('admin.promotions.flash.new') }}
        </SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          {{ isEdit ? form.name : '' }}
        </SheetDescription>
      </SheetHeader>

      <div v-if="loadingDetail" class="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 class="size-8 animate-spin text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <span class="text-sm text-muted-foreground">{{ t('common.save') }}...</span>
      </div>

      <form v-else class="flex flex-col gap-5 py-2" @submit.prevent="handleSubmit">
        <!-- Server Error Banner -->
        <div
          v-if="serverError"
          role="alert"
          class="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive leading-relaxed"
        >
          {{ serverError }}
        </div>

        <!-- Sale Name -->
        <FormField
          id="flash-name"
          :label="t('admin.promotions.flash.name')"
          :error="errors.name"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.name"
              type="text"
              :placeholder="t('admin.promotions.flash.namePlaceholder')"
              :disabled="saving || !hydrated"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-11 rounded-xl"
            />
          </template>
        </FormField>

        <!-- Dates Grid -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="flash-starts-at"
            :label="t('admin.promotions.flash.startsAt')"
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
            id="flash-ends-at"
            :label="t('admin.promotions.flash.endsAt')"
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

        <!-- Products Section -->
        <div class="flex flex-col gap-3 pt-2 border-t border-border/80">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <Sparkles class="size-4 text-serag-gold" aria-hidden="true" />
              <Label class="text-sm font-bold text-foreground">
                {{ t('admin.promotions.flash.productsTitle') }}
              </Label>
              <span class="num text-xs text-muted-foreground">
                ({{ form.items.length }})
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="saving || !hydrated"
              class="rounded-xl text-xs gap-1.5 h-9"
              @click="pickerOpen = true"
            >
              <Plus class="size-3.5 stroke-[2.5]" aria-hidden="true" />
              <span>{{ t('admin.promotions.flash.addProduct') }}</span>
            </Button>
          </div>

          <!-- Section Error -->
          <p v-if="errors.items" role="alert" class="text-xs font-semibold text-destructive">
            {{ errors.items }}
          </p>

          <!-- Empty Items State -->
          <div
            v-if="form.items.length === 0"
            class="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground"
          >
            <p>{{ t('admin.promotions.flash.noProducts') }}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="mt-2 rounded-xl text-xs"
              :disabled="saving || !hydrated"
              @click="pickerOpen = true"
            >
              {{ t('admin.promotions.flash.addProduct') }}
            </Button>
          </div>

          <!-- Items Table / Stack -->
          <div v-else class="flex flex-col gap-2.5">
            <div
              v-for="(row, idx) in form.items"
              :key="row.productId"
              class="flex flex-col gap-2 rounded-xl border p-3 transition-colors"
              :class="[
                conflictProductIds.has(row.productId)
                  ? 'border-destructive bg-destructive/5'
                  : 'border-border bg-card',
              ]"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-bold text-foreground truncate">
                    {{ row.name }}
                  </span>
                  <div class="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span v-if="row.modelCode" class="num font-mono">{{ row.modelCode }}</span>
                    <span>·</span>
                    <span>{{ t('admin.promotions.flash.colRegularPrice') }}:</span>
                    <span class="num font-semibold text-foreground">{{ money(row.regularPrice) }}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  :aria-label="t('admin.promotions.flash.removeProduct')"
                  :disabled="saving || !hydrated"
                  class="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                  @click="removeItem(row.productId)"
                >
                  <Trash2 class="size-4" aria-hidden="true" />
                </Button>
              </div>

              <!-- Price Input & Discount Percent -->
              <div class="flex items-center gap-3 pt-1 border-t border-border/50">
                <div class="flex items-center gap-2 flex-1">
                  <Label :for="`flash-item-price-${idx}`" class="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {{ t('admin.promotions.flash.colSalePrice') }}:
                  </Label>
                  <Input
                    :id="`flash-item-price-${idx}`"
                    v-model="row.salePriceEgp"
                    type="number"
                    step="any"
                    min="1"
                    data-testid="flash-item-price"
                    :placeholder="t('admin.promotions.flash.colSalePrice')"
                    :disabled="saving || !hydrated"
                    :aria-invalid="Boolean(itemErrors[row.productId])"
                    class="h-9 rounded-lg font-mono placeholder:font-sans text-xs w-32"
                  />
                </div>

                <div v-if="getItemDiscount(row) !== null" class="flex items-center gap-1 shrink-0">
                  <span class="text-[11px] text-muted-foreground">{{ t('admin.promotions.flash.colDiscount') }}:</span>
                  <span class="num text-xs font-bold text-serag-green dark:text-serag-gold">
                    {{ t('admin.promotions.flash.percentOff', { percent: getItemDiscount(row) }) }}
                  </span>
                </div>
              </div>

              <!-- Item Error Message -->
              <p
                v-if="itemErrors[row.productId]"
                role="alert"
                class="text-[11px] font-semibold text-destructive mt-0.5"
              >
                {{ itemErrors[row.productId] }}
              </p>

              <!-- Conflict Notice -->
              <p
                v-if="conflictProductIds.has(row.productId)"
                role="alert"
                class="text-[11px] font-semibold text-destructive mt-0.5"
              >
                {{ t('admin.promotions.flash.errors.overlap') }}
              </p>
            </div>
          </div>
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

  <!-- Product Picker Dialog -->
  <AdminProductPicker
    :open="pickerOpen"
    :title="t('admin.promotions.flash.addProductTitle')"
    :description="t('admin.promotions.flash.addProductDescription')"
    @update:open="pickerOpen = $event"
    @select="handleProductPicked"
  />
</template>
