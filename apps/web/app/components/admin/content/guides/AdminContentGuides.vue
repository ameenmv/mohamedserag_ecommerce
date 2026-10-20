<script setup lang="ts">
import type { AdminGuide, AdminGuideRow } from '@serag/shared'
import { AlertCircle, Pencil, Plus, RefreshCw, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { parseAdminApiError } from '~/utils/admin-api-errors'

type StatusFilter = 'all' | 'published' | 'draft'

const { t, locale } = useI18n()
const guidesApi = useAdminGuides()
const notify = useNotify()

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300
const STATUS_OPTIONS: StatusFilter[] = ['all', 'published', 'draft']

const hydrated = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)
const items = ref<AdminGuideRow[]>([])
const total = ref(0)
const page = ref(1)
const searchQuery = ref('')
const status = ref<StatusFilter>('all')
const selectedId = ref<string | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE) || 1)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await guidesApi.list({
      q: searchQuery.value.trim() || undefined,
      status: status.value,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    items.value = res.items
    total.value = res.total
  } catch (err: unknown) {
    error.value = parseAdminApiError(err, t).message
  } finally {
    loading.value = false
  }
}

function onSearchInput(value: string): void {
  searchQuery.value = value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void load()
  }, DEBOUNCE_MS)
}

function setStatus(next: StatusFilter): void {
  if (status.value === next) return
  status.value = next
  page.value = 1
  void load()
}

function goToPage(next: number): void {
  if (next < 1 || next > totalPages.value) return
  page.value = next
  void load()
}

function openEditor(id: string): void {
  if (!hydrated.value) return
  selectedId.value = id
}

function createGuide(): void {
  if (!hydrated.value) return
  selectedId.value = 'new'
}

function closeEditor(): void {
  selectedId.value = null
}

function onCreated(): void {
  closeEditor()
  void load()
}

function onSaved(updated: AdminGuide): void {
  const index = items.value.findIndex((item) => item.id === updated.id)
  const current = index === -1 ? undefined : items.value[index]
  if (index === -1 || !current) {
    void load()
    return
  }
  items.value[index] = {
    ...current,
    slug: updated.slug,
    title: updated.title,
    published: updated.published,
    publishedAt: updated.publishedAt,
    updatedAt: updated.updatedAt,
  }
}

function onDeleted(): void {
  closeEditor()
  notify.success(t('admin.content.guides.deletedToast'))
  void load()
}

onMounted(() => {
  hydrated.value = true
  void load()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <template v-if="!selectedId">
      <div class="flex flex-col gap-1">
        <h2 class="font-display text-2xl font-bold text-foreground">
          {{ t('admin.content.guides.listTitle') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ t('admin.content.guides.listSubtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative w-full sm:w-72">
            <Search
              class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              :value="searchQuery"
              type="search"
              :placeholder="t('admin.content.guides.searchPlaceholder')"
              :aria-label="t('admin.content.guides.searchPlaceholder')"
              :disabled="!hydrated"
              class="border-input bg-card h-11 w-full rounded-xl border ps-9 pe-4 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              @input="onSearchInput(($event.target as HTMLInputElement).value)"
            >
          </div>

          <div class="flex items-center gap-1.5" role="group" :aria-label="t('admin.content.guides.statusFilter')">
            <button
              v-for="option in STATUS_OPTIONS"
              :key="option"
              type="button"
              :disabled="!hydrated"
              :aria-pressed="status === option"
              class="min-h-11 rounded-lg border px-3 text-xs font-bold transition-colors disabled:opacity-50"
              :class="
                status === option
                  ? 'border-serag-green bg-serag-green/10 text-serag-green'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              "
              @click="setStatus(option)"
            >
              {{ t(`admin.content.guides.status.${option}`) }}
            </button>
          </div>
        </div>

        <Button
          type="button"
          class="min-h-11 shrink-0 gap-1.5 rounded-xl bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi"
          :disabled="!hydrated"
          @click="createGuide"
        >
          <Plus class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.guides.new') }}</span>
        </Button>
      </div>

      <div
        v-if="loading"
        class="flex flex-col gap-2"
        aria-hidden="true"
      >
        <Skeleton v-for="i in 5" :key="i" class="h-16 w-full rounded-xl" />
      </div>

      <div
        v-else-if="error"
        class="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 p-8 text-center"
      >
        <AlertCircle class="size-8 text-destructive" aria-hidden="true" />
        <p class="text-sm font-semibold text-destructive">{{ error }}</p>
        <Button type="button" variant="outline" class="min-h-11 gap-1.5" @click="load()">
          <RefreshCw class="size-4" aria-hidden="true" />
          <span>{{ t('common.retry') }}</span>
        </Button>
      </div>

      <p
        v-else-if="!items.length"
        class="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
      >
        {{ t('admin.content.guides.empty') }}
      </p>

      <template v-else>
        <ul class="flex flex-col gap-3">
          <li
            v-for="row in items"
            :key="row.id"
            class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex min-w-0 flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <b class="min-w-0 truncate text-sm font-bold text-foreground">{{ row.title }}</b>
                <span
                  class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  :class="
                    row.published
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  "
                >
                  {{ row.published ? t('admin.content.guides.published') : t('admin.content.guides.draft') }}
                </span>
              </div>
              <span class="num truncate text-xs text-muted-foreground" dir="ltr">
                {{ t('admin.content.guides.snippetUrl', { slug: row.slug }) }}
              </span>
              <span class="num text-xs text-muted-foreground">
                {{ t('admin.content.guides.updatedAt', { date: formatDate(row.updatedAt, locale) }) }}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              class="min-h-11 shrink-0"
              :disabled="!hydrated"
              :aria-label="t('admin.content.guides.editNamed', { title: row.title })"
              @click="openEditor(row.id)"
            >
              <Pencil class="size-4" aria-hidden="true" />
              <span>{{ t('admin.content.guides.edit') }}</span>
            </Button>
          </li>
        </ul>

        <div
          v-if="total > PAGE_SIZE"
          class="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"
        >
          <span class="num">{{ page }} / {{ totalPages }} ({{ total }})</span>
          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="page <= 1"
              class="h-9 rounded-lg px-3 text-xs"
              @click="goToPage(page - 1)"
            >
              {{ t('common.previous') }}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="page >= totalPages"
              class="h-9 rounded-lg px-3 text-xs"
              @click="goToPage(page + 1)"
            >
              {{ t('common.next') }}
            </Button>
          </div>
        </div>
      </template>
    </template>

    <AdminContentGuidesEditor
      v-else
      :key="selectedId"
      :guide-id="selectedId === 'new' ? null : selectedId"
      @back="closeEditor"
      @created="onCreated"
      @saved="onSaved"
      @deleted="onDeleted"
    />
  </div>
</template>
