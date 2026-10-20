<script setup lang="ts">
import type { AdminQuizRow } from '@serag/shared'
import { AlertCircle, Pencil, Plus, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const { t } = useI18n()
const quizApi = useAdminQuiz()
const notify = useNotify()

const hydrated = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)
const items = ref<AdminQuizRow[]>([])
const selectedId = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await quizApi.list()
    items.value = res.items
  } catch (err: unknown) {
    error.value = parseAdminApiError(err, t).message
  } finally {
    loading.value = false
  }
}

function openEditor(categoryId: string): void {
  if (!hydrated.value) return
  selectedId.value = categoryId
}

function closeEditor(): void {
  selectedId.value = null
}

function onSaved(): void {
  void load()
}

function onDeleted(): void {
  notify.success(t('admin.content.quiz.deletedToast'))
  closeEditor()
  void load()
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
        <h2 class="font-display text-2xl font-bold text-foreground">
          {{ t('admin.content.quiz.listTitle') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ t('admin.content.quiz.listSubtitle') }}
        </p>
      </div>

      <div
        v-if="loading"
        class="flex flex-col gap-2"
        aria-hidden="true"
      >
        <Skeleton v-for="i in 4" :key="i" class="h-16 w-full rounded-xl" />
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
        {{ t('admin.content.quiz.empty') }}
      </p>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="row in items"
          :key="row.categoryId"
          class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex min-w-0 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <b class="min-w-0 truncate text-sm font-bold text-foreground">{{ row.categoryName }}</b>
              <span
                class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                :class="
                  row.hasQuiz
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                "
              >
                {{
                  row.hasQuiz
                    ? t('admin.content.quiz.hasQuiz', { count: row.questionCount })
                    : t('admin.content.quiz.noQuiz')
                }}
              </span>
            </div>
            <span class="num truncate text-xs text-muted-foreground" dir="ltr">
              /c/{{ row.categorySlug }}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            class="min-h-11 shrink-0 gap-1.5"
            :disabled="!hydrated"
            :aria-label="
              row.hasQuiz
                ? t('admin.content.quiz.editNamed', { name: row.categoryName })
                : t('admin.content.quiz.createNamed', { name: row.categoryName })
            "
            @click="openEditor(row.categoryId)"
          >
            <component :is="row.hasQuiz ? Pencil : Plus" class="size-4" aria-hidden="true" />
            <span>{{ row.hasQuiz ? t('admin.content.quiz.edit') : t('admin.content.quiz.create') }}</span>
          </Button>
        </li>
      </ul>
    </template>

    <AdminContentQuizEditor
      v-else
      :key="selectedId"
      :category-id="selectedId"
      @back="closeEditor"
      @saved="onSaved"
      @deleted="onDeleted"
    />
  </div>
</template>
