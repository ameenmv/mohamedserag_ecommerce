<script setup lang="ts">
import { useProductFormContext } from '~/composables/useProductFormContext'
import { calculateDiscountPercent, egpInputToPiastres } from '~/utils/admin-money'

defineProps<{
  errors: Record<string, string>
  disabled: boolean
}>()

const { form } = useProductFormContext()
const { t } = useI18n()

const discountPercent = computed(() => {
  const price = egpInputToPiastres(form.priceEgp)
  const oldPrice = egpInputToPiastres(form.oldPriceEgp)
  return calculateDiscountPercent(price, oldPrice)
})
</script>

<template>
  <Card class="rounded-2xl border border-border bg-card p-6 shadow-xs">
    <CardHeader class="p-0 pb-4">
      <CardTitle class="font-display text-xl text-primary">
        {{ t('admin.products.editor.pricing.title') }}
      </CardTitle>
    </CardHeader>
    <CardContent class="p-0 flex flex-col gap-5">
      <!-- Pricing row -->
      <div class="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
        <FormField
          id="product-price"
          :label="t('admin.products.editor.pricing.price')"
          :error="errors.priceEgp || errors.price"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.priceEgp"
              type="text"
              inputmode="decimal"
              min="0"
              placeholder="0.00"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="num h-10 rounded-lg text-start font-semibold"
            />
          </template>
        </FormField>

        <FormField
          id="product-old-price"
          :label="t('admin.products.editor.pricing.oldPrice')"
          :error="errors.oldPriceEgp || errors.oldPrice"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.oldPriceEgp"
              type="text"
              inputmode="decimal"
              min="0"
              placeholder="0.00"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="num h-10 rounded-lg text-start font-semibold"
            />
          </template>
        </FormField>

        <!-- Read-only computed discount -->
        <div class="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3">
          <span class="text-xs font-medium text-muted-foreground">
            {{ t('admin.products.editor.pricing.discountPercent') }}:
          </span>
          <Badge
            v-if="discountPercent !== null"
            variant="default"
            class="num bg-serag-night text-serag-gold font-bold"
          >
            -{{ discountPercent }}%
          </Badge>
          <span v-else class="text-xs text-muted-foreground">
            {{ t('admin.products.editor.pricing.noDiscount') }}
          </span>
        </div>
      </div>

      <!-- Stock & Availability row -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField
          id="product-stock"
          :label="t('admin.products.editor.pricing.stock')"
          :error="errors.stock"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model.number="form.stock"
              type="number"
              min="0"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="num h-10 rounded-lg"
            />
          </template>
        </FormField>

        <FormField
          id="product-low-stock"
          :label="t('admin.products.editor.pricing.lowStockThreshold')"
          :error="errors.lowStockThreshold"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model.number="form.lowStockThreshold"
              type="number"
              min="0"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="num h-10 rounded-lg"
            />
          </template>
        </FormField>

        <FormField
          id="product-tax-rate"
          :label="t('admin.products.editor.pricing.taxRate')"
          :error="errors.taxRate"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model.number="form.taxRate"
              type="number"
              min="0"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="num h-10 rounded-lg"
            />
          </template>
        </FormField>
      </div>

      <!-- Availability mode & lead-time -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="product-avail-mode"
          :label="t('admin.products.editor.pricing.availabilityMode')"
          :error="errors.availabilityMode"
        >
          <template #default="{ id, invalid, describedBy }">
            <AdminFormSelect
              :id="id"
              v-model="form.availabilityMode"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            >
              <option value="auto">
                {{ t('admin.products.editor.pricing.modes.auto') }}
              </option>
              <option value="on_request">
                {{ t('admin.products.editor.pricing.modes.on_request') }}
              </option>
              <option value="out">
                {{ t('admin.products.editor.pricing.modes.out') }}
              </option>
            </AdminFormSelect>
          </template>
        </FormField>

        <FormField
          v-if="form.availabilityMode === 'on_request'"
          id="product-lead-time"
          :label="t('admin.products.editor.pricing.leadTimeText')"
          :error="errors.leadTimeText"
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="form.leadTimeText"
              type="text"
              :placeholder="t('admin.products.editor.pricing.leadTimePlaceholder')"
              :disabled="disabled"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-10 rounded-lg"
            />
          </template>
        </FormField>
      </div>
    </CardContent>
  </Card>
</template>
