<script setup lang="ts">
import type { AdminSpecTemplate } from '@serag/shared'
import {
  Edit,
  Layers,
  Loader2,
  Plus,
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
  templates: AdminSpecTemplate[]
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { t } = useI18n()
const templatesApi = useAdminSpecTemplates()
const notify = useNotify()

const sheetOpen = ref(false)
const selectedTemplate = ref<AdminSpecTemplate | null>(null)

function openCreate() {
  selectedTemplate.value = null
  sheetOpen.value = true
}

function openEdit(tpl: AdminSpecTemplate) {
  selectedTemplate.value = tpl
  sheetOpen.value = true
}

const deleteTarget = ref<AdminSpecTemplate | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')

function promptDelete(tpl: AdminSpecTemplate) {
  deleteTarget.value = tpl
  deleteError.value = ''
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  deleteError.value = ''

  try {
    await templatesApi.remove(deleteTarget.value.id)
    notify.success(t('admin.catalog.specTemplates.deleted'))
    deleteTarget.value = null
    emit('refresh')
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    deleteError.value = parsed.message
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Layers class="size-5 text-serag-gold" aria-hidden="true" />
        <h2 class="font-display text-lg font-bold text-foreground">
          {{ t('admin.catalog.tabs.specTemplates') }}
        </h2>
      </div>

      <Button
        type="button"
        size="sm"
        class="gap-1.5 rounded-xl bg-serag-gold text-serag-ink font-bold hover:bg-serag-gold-hi shadow-xs"
        @click="openCreate"
      >
        <Plus class="size-4 stroke-[2.5]" aria-hidden="true" />
        <span>{{ t('admin.catalog.specTemplates.new') }}</span>
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="i in 3" :key="i" class="h-16 w-full rounded-xl" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="templates.length === 0"
      class="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground"
    >
      <p>{{ t('admin.catalog.specTemplates.empty') }}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="mt-3 rounded-xl"
        @click="openCreate"
      >
        {{ t('admin.catalog.specTemplates.new') }}
      </Button>
    </div>

    <!-- List -->
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:bg-muted/15"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-col min-w-0">
            <span class="font-bold text-foreground text-sm truncate">
              {{ tpl.name }}
            </span>
            <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Badge variant="outline" class="text-[10px] py-0 font-medium">
                {{ t('admin.catalog.specTemplates.fieldsCount', { count: tpl.fields.length }) }}
              </Badge>
              <span>·</span>
              <span class="text-[11px]">
                {{ t('admin.catalog.specTemplates.usedIn', { count: tpl.categoryCount ?? 0 }) }}
              </span>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              :aria-label="t('admin.catalog.specTemplates.editNamed', { name: tpl.name })"
              @click="openEdit(tpl)"
            >
              <Edit class="size-4" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
              :aria-label="t('admin.catalog.specTemplates.deleteNamed', { name: tpl.name })"
              @click="promptDelete(tpl)"
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <!-- Spec fields preview pills -->
        <div class="flex flex-wrap gap-1 pt-1 border-t border-border/60">
          <span
            v-for="field in tpl.fields.slice(0, 4)"
            :key="field.key"
            class="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {{ field.label }}
          </span>
          <span
            v-if="tpl.fields.length > 4"
            class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground"
          >
            +{{ tpl.fields.length - 4 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Create / Edit Sheet -->
    <AdminCatalogSpecTemplateSheet
      v-model:open="sheetOpen"
      :template="selectedTemplate"
      @saved="emit('refresh')"
    />

    <!-- Delete Confirmation / Blocked Reason Dialog -->
    <Dialog :open="Boolean(deleteTarget)" @update:open="deleteTarget = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ deleteError ? t('common.error') : t('admin.catalog.specTemplates.confirmDelete', { name: deleteTarget?.name || '' }) }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed">
            <span v-if="deleteError" class="font-bold text-destructive">
              {{ deleteError }}
            </span>
            <span v-else>
              {{ t('admin.catalog.specTemplates.confirmDelete', { name: deleteTarget?.name || '' }) }}
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
