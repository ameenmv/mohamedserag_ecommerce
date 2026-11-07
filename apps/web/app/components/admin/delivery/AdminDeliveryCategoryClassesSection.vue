<script setup lang="ts">
import { Info, Loader2 } from '@lucide/vue'
import {
  SHIPPING_CLASSES,
  resolveShippingClass,
  type AdminCategory,
  type ShippingClass,
} from '@serag/shared'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const { t } = useI18n()
const notify = useNotify()
const categoriesApi = useAdminCategories()

const categories = ref<AdminCategory[]>([])
const values = reactive<Record<string, ShippingClass | ''>>({})
const loading = ref(false)
const loadError = ref('')
const savingId = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    categories.value = await categoriesApi.list()
    for (const category of categories.value) {
      values[category.id] = category.shippingClass ?? ''
    }
  } catch (err: unknown) {
    loadError.value = parseAdminApiError(err, t).message
  } finally {
    loading.value = false
  }
}

function depthOf(category: AdminCategory): number {
  let depth = 0
  let current: AdminCategory | undefined = category
  const visited = new Set<string>()
  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id)
    current = categories.value.find((candidate) => candidate.id === current?.parentId)
    if (current) depth += 1
  }
  return depth
}

function resolvedClass(category: AdminCategory): ShippingClass {
  const chain: (ShippingClass | null)[] = []
  const visited = new Set<string>()
  let current: AdminCategory | undefined = category
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    chain.push(current.shippingClass)
    current = categories.value.find((candidate) => candidate.id === current?.parentId)
  }
  return resolveShippingClass(null, chain)
}

function inheritedClass(category: AdminCategory): ShippingClass {
  const parent = categories.value.find((candidate) => candidate.id === category.parentId)
  return parent ? resolvedClass(parent) : 'large'
}

async function onChange(category: AdminCategory, value: string) {
  const previous = values[category.id] ?? ''
  const next: ShippingClass | null = SHIPPING_CLASSES.find((candidate) => candidate === value) ?? null
  values[category.id] = next ?? ''

  savingId.value = category.id
  try {
    const updated = await categoriesApi.update(category.id, { shippingClass: next })
    category.shippingClass = updated.shippingClass
    values[category.id] = updated.shippingClass ?? ''
    notify.success(t('admin.delivery.categoryClasses.updated'))
  } catch (err: unknown) {
    values[category.id] = previous
    const parsed = parseAdminApiError(err, t)
    notify.error(parsed.message)
  } finally {
    savingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.delivery.categoryClasses.hint') }}</span>
    </p>

    <p v-if="loading" class="py-6 text-center text-sm text-muted-foreground">
      {{ t('admin.delivery.categoryClasses.loading') }}
    </p>

    <p
      v-else-if="loadError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ loadError }}
    </p>

    <p v-else-if="categories.length === 0" class="py-6 text-center text-sm text-muted-foreground">
      {{ t('admin.delivery.categoryClasses.empty') }}
    </p>

    <div v-else class="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/80 bg-card">
      <div
        v-for="category in categories"
        :key="category.id"
        class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        :style="{ paddingInlineStart: `${0.75 + depthOf(category) * 1.25}rem` }"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-foreground">{{ category.name }}</p>
          <p class="text-xs text-muted-foreground">
            {{ t('admin.delivery.categoryClasses.resolved', {
              value: t(`admin.delivery.classes.${resolvedClass(category)}`),
            }) }}
          </p>
        </div>

        <div class="flex items-center gap-2 sm:w-64">
          <Loader2
            v-if="savingId === category.id"
            class="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <AdminFormSelect
            :model-value="values[category.id] ?? ''"
            :disabled="savingId !== null"
            :aria-label="t('admin.delivery.categoryClasses.labelFor', { name: category.name })"
            @update:model-value="onChange(category, String($event))"
          >
            <option value="">
              {{
                t('admin.delivery.categoryClasses.inherit', {
                  value: t(`admin.delivery.classes.${inheritedClass(category)}`),
                })
              }}
            </option>
            <option v-for="shippingClass in SHIPPING_CLASSES" :key="shippingClass" :value="shippingClass">
              {{ t(`admin.delivery.classes.${shippingClass}`) }}
            </option>
          </AdminFormSelect>
        </div>
      </div>
    </div>
  </div>
</template>
