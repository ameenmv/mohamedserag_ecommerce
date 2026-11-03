<script setup lang="ts">
import {
  FAQ_TOPICS,
  compareFaqOrder,
  type AdminFaqEntry,
  type FaqTopic,
} from '@serag/shared'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const { t } = useI18n()
const faqApi = useAdminFaq()
const notify = useNotify()

const hydrated = ref(false)
const loading = ref(true)
const loadError = ref<string | null>(null)
const items = ref<AdminFaqEntry[]>([])

// Topic filter: 'all' or one of FAQ_TOPICS
const selectedTopic = ref<string>('all')

// Sheet state
const sheetOpen = ref(false)
const editingEntry = ref<AdminFaqEntry | null>(null)

// Delete dialog state
const deleteDialogOpen = ref(false)
const deletingEntry = ref<AdminFaqEntry | null>(null)
const deleting = ref(false)

// Reordering state
const reordering = ref(false)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const res = await faqApi.list()
    items.value = [...res.items].sort(compareFaqOrder)
  } catch (err: unknown) {
    loadError.value = parseAdminApiError(err, t).message
  } finally {
    loading.value = false
  }
}

// Grouped entries by topic according to `FAQ_TOPICS`
interface TopicGroup {
  topic: FaqTopic
  title: string
  items: AdminFaqEntry[]
}

const topicGroups = computed<TopicGroup[]>(() => {
  const topicsToInclude =
    selectedTopic.value === 'all'
      ? FAQ_TOPICS
      : FAQ_TOPICS.filter((top) => top === selectedTopic.value)

  return topicsToInclude.map((topic) => ({
    topic,
    title: t(`admin.content.faq.topics.${topic}`),
    items: items.value.filter((item) => item.topic === topic),
  }))
})

const totalEntriesCount = computed(() => items.value.length)

function openCreate(): void {
  editingEntry.value = null
  sheetOpen.value = true
}

function openEdit(entry: AdminFaqEntry): void {
  editingEntry.value = entry
  sheetOpen.value = true
}

function onCreated(newEntry: AdminFaqEntry): void {
  items.value = [...items.value, newEntry].sort(compareFaqOrder)
}

function onSaved(updatedEntry: AdminFaqEntry): void {
  const index = items.value.findIndex((e) => e.id === updatedEntry.id)
  if (index !== -1) {
    items.value[index] = updatedEntry
    items.value = [...items.value].sort(compareFaqOrder)
  } else {
    void load()
  }
}

async function toggleVisibility(entry: AdminFaqEntry): Promise<void> {
  const oldVal = entry.visible
  const nextVal = !oldVal
  entry.visible = nextVal // optimistic

  try {
    const updated = await faqApi.update(entry.id, { visible: nextVal })
    entry.visible = updated.visible
    notify.success(t('admin.content.faq.visibilityToast'))
  } catch (err: unknown) {
    entry.visible = oldVal
    const parsed = parseAdminApiError(err, t)
    notify.error(t('admin.content.faq.saveError'), parsed.message)
  }
}

async function moveEntry(group: TopicGroup, index: number, direction: -1 | 1): Promise<void> {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= group.items.length) return

  const itemA = group.items[index]
  const itemB = group.items[targetIndex]
  if (!itemA || !itemB) return

  // Swap locally within the topic group
  const updatedGroupItems = [...group.items]
  updatedGroupItems[index] = itemB
  updatedGroupItems[targetIndex] = itemA

  // Rebuild the complete list preserving topic ordering
  const newFullItems: AdminFaqEntry[] = []
  for (const top of FAQ_TOPICS) {
    if (top === group.topic) {
      newFullItems.push(...updatedGroupItems)
    } else {
      newFullItems.push(...items.value.filter((e) => e.topic === top))
    }
  }

  items.value = newFullItems
  reordering.value = true
  try {
    const allIds = newFullItems.map((e) => e.id)
    await faqApi.reorder(allIds)
    notify.success(t('admin.content.faq.reorderedToast'))
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    notify.error(t('admin.content.faq.reorderError'), parsed.message)
    void load()
  } finally {
    reordering.value = false
  }
}

function confirmDelete(entry: AdminFaqEntry): void {
  deletingEntry.value = entry
  deleteDialogOpen.value = true
}

async function executeDelete(): Promise<void> {
  const target = deletingEntry.value
  if (!target) return

  deleting.value = true
  try {
    await faqApi.remove(target.id)
    items.value = items.value.filter((e) => e.id !== target.id)
    deleteDialogOpen.value = false
    deletingEntry.value = null
    notify.success(t('admin.content.faq.deletedToast'))
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    notify.error(t('admin.content.faq.deleteError'), parsed.message)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  hydrated.value = true
  void load()
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6">
    <!-- Screen Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="font-display text-2xl font-bold text-foreground">
          {{ t('admin.content.faq.pageTitle') }}
        </h1>
        <p class="text-xs text-muted-foreground sm:text-sm">
          {{ t('admin.content.faq.subtitle') }}
        </p>
      </div>

      <Button
        type="button"
        class="min-h-11 shrink-0 gap-1.5 rounded-xl bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi"
        :disabled="!hydrated || loading"
        @click="openCreate"
      >
        <Plus class="size-4" aria-hidden="true" />
        <span>{{ t('admin.content.faq.newQuestion') }}</span>
      </Button>
    </div>

    <!-- Topic Filter Pills -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1" role="group" :aria-label="t('admin.content.faq.topic')">
      <button
        type="button"
        :disabled="!hydrated"
        :aria-pressed="selectedTopic === 'all'"
        class="min-h-10 rounded-full px-3.5 text-xs font-bold transition-colors disabled:opacity-50"
        :class="
          selectedTopic === 'all'
            ? 'bg-serag-green text-serag-ivory dark:bg-serag-gold dark:text-serag-night'
            : 'border border-border bg-card text-muted-foreground hover:text-foreground'
        "
        @click="selectedTopic = 'all'"
      >
        {{ t('admin.content.faq.allTopics') }} ({{ totalEntriesCount }})
      </button>

      <button
        v-for="topic in FAQ_TOPICS"
        :key="topic"
        type="button"
        :disabled="!hydrated"
        :aria-pressed="selectedTopic === topic"
        class="min-h-10 rounded-full px-3.5 text-xs font-bold transition-colors disabled:opacity-50"
        :class="
          selectedTopic === topic
            ? 'bg-serag-green text-serag-ivory dark:bg-serag-gold dark:text-serag-night'
            : 'border border-border bg-card text-muted-foreground hover:text-foreground'
        "
        @click="selectedTopic = topic"
      >
        {{ t(`admin.content.faq.topics.${topic}`) }} ({{ items.filter((e) => e.topic === topic).length }})
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="flex flex-col gap-3">
      <Skeleton v-for="i in 4" :key="i" class="h-24 w-full rounded-2xl" />
    </div>

    <!-- Error State -->
    <div
      v-else-if="loadError"
      class="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 p-8 text-center"
    >
      <AlertCircle class="size-8 text-destructive" aria-hidden="true" />
      <p class="text-sm font-semibold text-destructive">{{ loadError }}</p>
      <Button type="button" variant="outline" class="min-h-11 gap-1.5" @click="load">
        <RefreshCw class="size-4" aria-hidden="true" />
        <span>{{ t('common.retry') }}</span>
      </Button>
    </div>

    <!-- Global Empty State -->
    <p
      v-else-if="items.length === 0"
      class="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
    >
      {{ t('admin.content.faq.emptyAll') }}
    </p>

    <!-- Grouped list of questions -->
    <div v-else class="flex flex-col gap-8">
      <section
        v-for="group in topicGroups"
        :key="group.topic"
        class="flex flex-col gap-3"
      >
        <!-- Group Header -->
        <div class="flex items-center justify-between border-b border-border pb-2">
          <div class="flex items-center gap-2">
            <h2 class="font-display text-base font-bold text-foreground sm:text-lg">
              {{ group.title }}
            </h2>
            <span class="num rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {{ group.items.length }}
            </span>
          </div>
        </div>

        <!-- Empty in this topic -->
        <p
          v-if="group.items.length === 0"
          class="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground"
        >
          {{ t('admin.content.faq.empty') }}
        </p>

        <!-- Topic Items -->
        <ul v-else class="flex flex-col gap-2.5">
          <li
            v-for="(item, idx) in group.items"
            :key="item.id"
            class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border/80 sm:flex-row sm:items-center sm:justify-between"
          >
            <!-- Content & Translation preview -->
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="num text-xs font-bold text-serag-gold">
                  #{{ idx + 1 }}
                </span>
                <b class="text-sm font-bold text-foreground">
                  {{ item.question }}
                </b>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  :class="
                    item.visible
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  "
                >
                  {{ item.visible ? t('admin.content.faq.visible') : t('admin.content.faq.hidden') }}
                </span>
              </div>

              <!-- English snippet if present -->
              <p
                v-if="item.translations?.en?.question"
                class="truncate text-xs text-muted-foreground"
                dir="ltr"
              >
                {{ item.translations.en.question }}
              </p>
            </div>

            <!-- Action Controls -->
            <div class="flex items-center gap-1.5 self-end sm:self-center">
              <!-- Up / Down Reordering -->
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-9 rounded-lg"
                :disabled="!hydrated || reordering || idx === 0"
                :aria-label="t('admin.content.faq.moveUp')"
                @click="moveEntry(group, idx, -1)"
              >
                <ArrowUp class="size-4" aria-hidden="true" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-9 rounded-lg"
                :disabled="!hydrated || reordering || idx === group.items.length - 1"
                :aria-label="t('admin.content.faq.moveDown')"
                @click="moveEntry(group, idx, 1)"
              >
                <ArrowDown class="size-4" aria-hidden="true" />
              </Button>

              <!-- Visibility toggle -->
              <AdminFormSwitch
                :id="`faq-visible-${item.id}`"
                :model-value="item.visible"
                :disabled="!hydrated"
                :aria-label="t('admin.content.faq.fieldVisible')"
                @update:model-value="toggleVisibility(item)"
              />

              <!-- Edit button -->
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="size-9 rounded-lg ms-1"
                :disabled="!hydrated"
                :aria-label="t('admin.content.faq.edit')"
                @click="openEdit(item)"
              >
                <Pencil class="size-4" aria-hidden="true" />
              </Button>

              <!-- Delete button -->
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-9 rounded-lg text-destructive hover:bg-destructive/10"
                :disabled="!hydrated"
                :aria-label="t('admin.content.faq.delete')"
                @click="confirmDelete(item)"
              >
                <Trash2 class="size-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- Add / Edit Sheet -->
    <AdminContentFaqSheet
      v-model:open="sheetOpen"
      :entry="editingEntry"
      @created="onCreated"
      @saved="onSaved"
    />

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ t('admin.content.faq.confirmDeleteTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-foreground">
            {{ t('admin.content.faq.confirmDelete') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            :disabled="deleting"
            class="min-h-11 sm:min-h-9"
            @click="deleteDialogOpen = false"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="deleting"
            class="min-h-11 font-bold sm:min-h-9"
            @click="executeDelete"
          >
            <Loader2 v-if="deleting" class="me-1.5 size-4 animate-spin" aria-hidden="true" />
            <span>{{ t('common.delete') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
