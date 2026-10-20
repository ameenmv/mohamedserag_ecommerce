<script setup lang="ts">
import type { AdminBrand } from '@serag/shared'
import {
  Edit,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { parseAdminApiError } from '~/utils/admin-api-errors'

defineProps<{
  brands: AdminBrand[]
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { t } = useI18n()
const brandsApi = useAdminBrands()
const notify = useNotify()

const sheetOpen = ref(false)
const selectedBrand = ref<AdminBrand | null>(null)

function openCreate() {
  selectedBrand.value = null
  sheetOpen.value = true
}

function openEdit(brand: AdminBrand) {
  selectedBrand.value = brand
  sheetOpen.value = true
}

const deleteTarget = ref<AdminBrand | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')

function promptDelete(brand: AdminBrand) {
  deleteTarget.value = brand
  deleteError.value = ''
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  deleteError.value = ''

  try {
    await brandsApi.remove(deleteTarget.value.id)
    notify.success(t('admin.catalog.brands.deleted'))
    deleteTarget.value = null
    emit('refresh')
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    deleteError.value = parsed.message
  } finally {
    deleteLoading.value = false
  }
}

async function toggleVisible(brand: AdminBrand) {
  try {
    await brandsApi.update(brand.id, { visible: !brand.visible })
    brand.visible = !brand.visible
    notify.success(t('admin.catalog.brands.updated'))
  } catch (err) {
    notify.error(parseAdminApiError(err, t).message)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Sparkles class="size-5 text-serag-gold" aria-hidden="true" />
        <h2 class="font-display text-lg font-bold text-foreground">
          {{ t('admin.catalog.tabs.brands') }}
        </h2>
      </div>

      <Button
        type="button"
        size="sm"
        class="gap-1.5 rounded-xl bg-serag-gold text-serag-ink font-bold hover:bg-serag-gold-hi shadow-xs"
        @click="openCreate"
      >
        <Plus class="size-4 stroke-[2.5]" aria-hidden="true" />
        <span>{{ t('admin.catalog.brands.new') }}</span>
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="i in 4" :key="i" class="h-16 w-full rounded-xl" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="brands.length === 0"
      class="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground"
    >
      <p>{{ t('admin.catalog.brands.empty') }}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="mt-3 rounded-xl"
        @click="openCreate"
      >
        {{ t('admin.catalog.brands.new') }}
      </Button>
    </div>

    <!-- List -->
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="b in brands"
        :key="b.id"
        class="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:bg-muted/15"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-serag-ivory/60 p-1 dark:bg-muted/30">
            <img
              v-if="b.logoUrl"
              :src="b.logoUrl"
              :alt="b.name"
              class="size-full object-contain"
              loading="lazy"
            >
            <ImagePlus v-else class="size-5 text-muted-foreground/40" aria-hidden="true" />
          </div>

          <div class="flex flex-col min-w-0">
            <span class="font-bold text-foreground text-sm truncate">
              {{ b.name }}
            </span>
            <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span class="num font-mono text-[11px]">{{ b.slug }}</span>
              <span>·</span>
              <Badge variant="outline" class="text-[10px] py-0">
                {{ t('admin.catalog.brands.productsCount', { count: b.productCount }) }}
              </Badge>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-1 shrink-0">
          <AdminFormSwitch
            :id="`brand-vis-${b.id}`"
            :model-value="b.visible"
            :aria-label="t('admin.catalog.brands.visible')"
            @update:model-value="toggleVisible(b)"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            :aria-label="t('admin.catalog.brands.editNamed', { name: b.name })"
            @click="openEdit(b)"
          >
            <Edit class="size-4" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
            :aria-label="t('admin.catalog.brands.deleteNamed', { name: b.name })"
            @click="promptDelete(b)"
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Sheet -->
    <AdminCatalogBrandSheet
      v-model:open="sheetOpen"
      :brand="selectedBrand"
      @saved="emit('refresh')"
    />

    <!-- Delete Confirmation / Blocked Reason Dialog -->
    <Dialog :open="Boolean(deleteTarget)" @update:open="deleteTarget = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ deleteError ? t('common.error') : t('admin.catalog.brands.confirmDelete', { name: deleteTarget?.name || '' }) }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed">
            <span v-if="deleteError" class="font-bold text-destructive">
              {{ deleteError }}
            </span>
            <span v-else>
              {{ t('admin.catalog.brands.confirmDelete', { name: deleteTarget?.name || '' }) }}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            :disabled="deleteLoading"
            @click="deleteTarget = null"
          >
            {{ deleteError ? t('common.close') : t('common.cancel') }}
          </Button>
          <Button
            v-if="!deleteError"
            type="button"
            variant="destructive"
            :disabled="deleteLoading"
            @click="executeDelete"
          >
            <Loader2 v-if="deleteLoading" class="size-4 animate-spin me-1.5" aria-hidden="true" />
            <span>{{ t('common.delete') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
