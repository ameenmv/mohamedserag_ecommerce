<script setup lang="ts">
import type { AdminCategory, AdminSpecTemplate } from '@serag/shared'
import {
  ArrowDown,
  ArrowUp,
  Edit,
  FolderTree,
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

const props = defineProps<{
  categories: AdminCategory[]
  specTemplates: AdminSpecTemplate[]
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { t } = useI18n()
const categoriesApi = useAdminCategories()
const notify = useNotify()

// Sheet state
const sheetOpen = ref(false)
const selectedCategory = ref<AdminCategory | null>(null)

function openCreate() {
  selectedCategory.value = null
  sheetOpen.value = true
}

function openEdit(cat: AdminCategory) {
  selectedCategory.value = cat
  sheetOpen.value = true
}

// Delete dialog state
const deleteTarget = ref<AdminCategory | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')

function promptDelete(cat: AdminCategory) {
  deleteTarget.value = cat
  deleteError.value = ''
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  deleteError.value = ''

  try {
    await categoriesApi.remove(deleteTarget.value.id)
    notify.success(t('admin.catalog.categories.deleted'))
    deleteTarget.value = null
    emit('refresh')
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    deleteError.value = parsed.message
  } finally {
    deleteLoading.value = false
  }
}

// Reordering
const reordering = ref(false)

async function moveCategory(index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= props.categories.length) return

  const list = [...props.categories]
  const [removed] = list.splice(index, 1)
  if (!removed) return
  list.splice(targetIndex, 0, removed)

  reordering.value = true
  try {
    await categoriesApi.reorder(list.map((c) => c.id))
    notify.success(t('admin.catalog.categories.reorderSuccess'))
    emit('refresh')
  } catch (err) {
    notify.error(parseAdminApiError(err, t).message)
  } finally {
    reordering.value = false
  }
}

// Quick visibility toggle
async function toggleVisible(cat: AdminCategory) {
  try {
    await categoriesApi.update(cat.id, { visible: !cat.visible })
    cat.visible = !cat.visible
    notify.success(t('admin.catalog.categories.updated'))
  } catch (err) {
    notify.error(parseAdminApiError(err, t).message)
  }
}

// Compute tree display items with depth
interface TreeCategoryItem {
  category: AdminCategory
  depth: number
}

const treeItems = computed<TreeCategoryItem[]>(() => {
  const result: TreeCategoryItem[] = []
  const roots = props.categories.filter((c) => !c.parentId)
  const childrenMap = new Map<string, AdminCategory[]>()

  for (const c of props.categories) {
    if (c.parentId) {
      const list = childrenMap.get(c.parentId) ?? []
      list.push(c)
      childrenMap.set(c.parentId, list)
    }
  }

  function appendBranch(cat: AdminCategory, depth: number) {
    result.push({ category: cat, depth })
    const children = childrenMap.get(cat.id) ?? []
    for (const child of children) {
      appendBranch(child, depth + 1)
    }
  }

  for (const r of roots) {
    appendBranch(r, 0)
  }

  // Fallback for orphans if any parentId is missing from roots
  const placedIds = new Set(result.map((r) => r.category.id))
  for (const c of props.categories) {
    if (!placedIds.has(c.id)) {
      result.push({ category: c, depth: 0 })
    }
  }

  return result
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header with action -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <FolderTree class="size-5 text-serag-gold" aria-hidden="true" />
        <h2 class="font-display text-lg font-bold text-foreground">
          {{ t('admin.catalog.tabs.categories') }}
        </h2>
      </div>

      <Button
        type="button"
        size="sm"
        class="gap-1.5 rounded-xl bg-serag-gold text-serag-ink font-bold hover:bg-serag-gold-hi shadow-xs"
        @click="openCreate"
      >
        <Plus class="size-4 stroke-[2.5]" aria-hidden="true" />
        <span>{{ t('admin.catalog.categories.new') }}</span>
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="i in 4" :key="i" class="h-16 w-full rounded-xl" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="categories.length === 0"
      class="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground"
    >
      <p>{{ t('admin.catalog.categories.empty') }}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="mt-3 rounded-xl"
        @click="openCreate"
      >
        {{ t('admin.catalog.categories.new') }}
      </Button>
    </div>

    <!-- List -->
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="(item, index) in treeItems"
        :key="item.category.id"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs transition-colors hover:bg-muted/15"
        :class="item.depth > 0 ? 'ms-4 sm:ms-8 border-s-4 border-s-serag-gold/60' : ''"
      >
        <!-- Info -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-foreground text-sm truncate">
                {{ item.category.name }}
              </span>
              <span class="num font-mono text-xs text-muted-foreground">
                ({{ item.category.slug }})
              </span>
            </div>
            <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Badge variant="outline" class="text-[10px] py-0">
                {{ t('admin.catalog.categories.productsCount', { count: item.category.productCount }) }}
              </Badge>
              <span v-if="item.category.specTemplate" class="text-[11px] text-serag-green dark:text-serag-gold font-medium">
                {{ item.category.specTemplate.name }}
              </span>
              <span v-else class="text-[11px] text-muted-foreground/60">
                {{ t('admin.catalog.categories.noSpecTemplate') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-2 ms-auto sm:ms-0">
          <!-- Move up / down -->
          <div class="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              :disabled="reordering || index === 0"
              class="size-8 rounded-lg"
              :aria-label="t('admin.catalog.categories.moveUpN', { name: item.category.name, n: index + 1 })"
              @click="moveCategory(index, 'up')"
            >
              <ArrowUp class="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              :disabled="reordering || index === treeItems.length - 1"
              class="size-8 rounded-lg"
              :aria-label="t('admin.catalog.categories.moveDownN', { name: item.category.name, n: index + 1 })"
              @click="moveCategory(index, 'down')"
            >
              <ArrowDown class="size-3.5" aria-hidden="true" />
            </Button>
          </div>

          <!-- Visibility switch -->
          <AdminFormSwitch
            :id="`cat-vis-${item.category.id}`"
            :model-value="item.category.visible"
            :aria-label="t('admin.catalog.categories.visible')"
            @update:model-value="toggleVisible(item.category)"
          />

          <!-- Edit button -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            :aria-label="t('admin.catalog.categories.editNamed', { name: item.category.name })"
            @click="openEdit(item.category)"
          >
            <Edit class="size-4" aria-hidden="true" />
          </Button>

          <!-- Delete button -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
            :aria-label="t('admin.catalog.categories.deleteNamed', { name: item.category.name })"
            @click="promptDelete(item.category)"
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Sheet -->
    <AdminCatalogCategorySheet
      v-model:open="sheetOpen"
      :category="selectedCategory"
      :categories="categories"
      :spec-templates="specTemplates"
      @saved="emit('refresh')"
    />

    <!-- Delete Confirmation / Blocked Reason Dialog -->
    <Dialog :open="Boolean(deleteTarget)" @update:open="deleteTarget = null">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ deleteError ? t('common.error') : t('admin.catalog.categories.confirmDelete', { name: deleteTarget?.name || '' }) }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed">
            <span v-if="deleteError" class="font-bold text-destructive">
              {{ deleteError }}
            </span>
            <span v-else>
              {{ t('admin.catalog.categories.confirmDelete', { name: deleteTarget?.name || '' }) }}
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
