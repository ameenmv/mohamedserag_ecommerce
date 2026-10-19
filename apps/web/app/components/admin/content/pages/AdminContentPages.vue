<script setup lang="ts">
import type { AdminPage, AdminPageRow } from '@serag/shared'
import { Loader2, Pencil } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const { t, locale } = useI18n()
const pagesApi = useAdminPages()

const hydrated = ref(false)
const loading = ref(true)
const loadError = ref('')
const items = ref<AdminPageRow[]>([])
const selectedId = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await pagesApi.list()
    items.value = [...result.items]
  } catch {
    loadError.value = t('admin.content.pages.loadError')
  } finally {
    loading.value = false
  }
}

function openEditor(id: string): void {
  selectedId.value = id
}

function closeEditor(): void {
  selectedId.value = null
}

function onSaved(updated: AdminPage): void {
  const index = items.value.findIndex((item) => item.id === updated.id)
  if (index === -1) return
  const current = items.value[index]
  if (!current) return
  items.value[index] = {
    ...current,
    title: updated.title,
    slug: updated.slug,
    published: updated.published,
    updatedAt: updated.updatedAt,
  }
}

onMounted(() => {
  hydrated.value = true
  void load()
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <template v-if="!selectedId">
      <div class="flex flex-col gap-1">
        <h1 class="font-display text-2xl font-bold text-foreground">
          {{ t('admin.content.pages.listTitle') }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ t('admin.content.pages.listSubtitle') }}
        </p>
      </div>

      <div
        v-if="loading"
        class="flex items-center justify-center py-16 text-sm text-muted-foreground"
      >
        <Loader2 class="me-2 size-4 animate-spin" aria-hidden="true" />
        <span>{{ t('admin.content.pages.loading') }}</span>
      </div>

      <div
        v-else-if="loadError"
        class="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 p-8 text-center"
      >
        <p class="text-sm font-semibold text-destructive">{{ loadError }}</p>
        <Button type="button" variant="outline" class="min-h-11" @click="load()">
          {{ t('common.retry') }}
        </Button>
      </div>

      <p
        v-else-if="!items.length"
        class="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
      >
        {{ t('admin.content.pages.empty') }}
      </p>

      <ul v-else class="flex flex-col gap-3">
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
                {{ row.published ? t('admin.content.pages.published') : t('admin.content.pages.draft') }}
              </span>
            </div>
            <span class="num truncate text-xs text-muted-foreground" dir="ltr">
              {{ t('admin.content.pages.snippetUrl', { slug: row.slug }) }}
            </span>
            <span class="num text-xs text-muted-foreground">
              {{ t('admin.content.pages.updatedAt', { date: formatDate(row.updatedAt, locale) }) }}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            class="min-h-11 shrink-0"
            :disabled="!hydrated"
            :aria-label="t('admin.content.pages.editNamed', { title: row.title })"
            @click="openEditor(row.id)"
          >
            <Pencil class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.pages.edit') }}</span>
          </Button>
        </li>
      </ul>
    </template>

    <AdminContentPagesEditor
      v-else-if="selectedId"
      :key="selectedId"
      :page-id="selectedId"
      @back="closeEditor"
      @saved="onSaved"
    />
  </div>
</template>
