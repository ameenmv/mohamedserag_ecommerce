<script setup lang="ts">
import { DEFAULT_HOME_CONTENT_EN } from '@serag/shared'
import type { HomeSectionId } from '@serag/shared'
import { Eye, History } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { HOME_SECTION_META } from '~/utils/admin-home-fields'

const { t } = useI18n()
const editor = useAdminHomeEditor()

const selected = ref<HomeSectionId>('hero')
const currentLocale = ref<'ar' | 'en'>('ar')
const versionsOpen = ref(false)
const publishing = ref(false)
const restoringId = ref<string | null>(null)
const saveVersion = ref(0)
const publishBar = ref<{ focusStatus: () => void } | null>(null)
const showPreview = ref(false)

// The preview iframe reloads whenever the server state changes (autosave, publish,
// discard, restore) so it always shows the saved draft.
watch(editor.state, () => {
  saveVersion.value += 1
})

watch(
  editor.draft,
  (draft) => {
    if (!draft.layout.order.includes(selected.value) && draft.layout.order[0]) {
      selected.value = draft.layout.order[0]
    }
  },
  { deep: true },
)

const changedCounts = computed<Record<HomeSectionId, number>>(() => {
  const counts = {} as Record<HomeSectionId, number>
  for (const id of editor.draft.value.layout.order) {
    let count = 0
    for (const field of HOME_SECTION_META[id].fields) {
      if (
        editor.isFieldChanged(id, field.key, 'ar') ||
        editor.isFieldChanged(id, field.key, 'en')
      ) {
        count += 1
      }
    }
    counts[id] = count
  }
  return counts
})

onMounted(() => {
  editor.hydrated.value = true
  void editor.load()
})

// Leaving the tab must not drop an edit still waiting for its debounced autosave
onBeforeUnmount(() => {
  void editor.settleSaves()
})

async function onPublish(label?: string): Promise<void> {
  publishing.value = true
  const ok = await editor.publish(label)
  publishing.value = false
  if (ok) {
    useNotify().success(t('admin.content.toasts.published'))
    await nextTick()
    publishBar.value?.focusStatus()
  }
}

async function onRestore(id: string): Promise<void> {
  restoringId.value = id
  await editor.restore(id)
  restoringId.value = null
  versionsOpen.value = false
  await nextTick()
  publishBar.value?.focusStatus()
}

function onSelect(id: HomeSectionId): void {
  selected.value = id
}

</script>

<template>
  <div class="flex flex-col gap-6">
    <div
      v-if="editor.loading.value"
      class="flex items-center justify-center py-20 text-sm text-muted-foreground"
    >
      {{ t('admin.content.loading') }}
    </div>

    <div
      v-else-if="editor.loadError.value"
      class="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 p-8 text-center"
    >
      <p class="text-sm font-semibold text-destructive">{{ editor.loadError.value }}</p>
      <Button type="button" variant="outline" @click="editor.load()">
        {{ t('common.retry') }}
      </Button>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-2xl font-bold text-foreground">
          {{ t('admin.nav.content') }}
        </h2>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            class="min-h-11 lg:hidden"
            :aria-pressed="showPreview"
            @click="showPreview = !showPreview"
          >
            <Eye class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.preview.toggle') }}</span>
          </Button>
          <Button type="button" variant="outline" class="min-h-11" @click="versionsOpen = true">
            <History class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.versions.button') }}</span>
          </Button>
        </div>
      </div>

      <div
        class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] xl:grid-cols-[280px_minmax(0,1fr)_minmax(0,1.1fr)]"
      >
        <AdminContentHomeSections
          :order="editor.draft.value.layout.order"
          :hidden="editor.draft.value.layout.hidden"
          :selected="selected"
          :changed-counts="changedCounts"
          :hydrated="editor.hydrated.value"
          @select="onSelect"
          @move="editor.moveSection"
          @toggle="editor.toggleHidden"
        />

        <AdminContentHomeFields
          :key="`${selected}-${currentLocale}`"
          :locale="currentLocale"
          :section-id="selected"
          :section="editor.draft.value.sections[selected]"
          :english-section="editor.draft.value.english[selected]"
          :published-section="editor.state.value.published.sections[selected]"
          :published-english-section="
            editor.state.value.published.english
              ? editor.state.value.published.english[selected]
              : DEFAULT_HOME_CONTENT_EN[selected]
          "
          :hydrated="editor.hydrated.value"
          :errors="editor.fieldErrors.value"
          @update:locale="currentLocale = $event"
          @set="
            (key: string, value: unknown, loc: 'ar' | 'en') =>
              editor.setField(selected, key, value, loc)
          "
          @reset="(key: string, loc: 'ar' | 'en') => editor.resetField(selected, key, loc)"
        />

        <div :class="showPreview ? 'block' : 'hidden lg:block'">
          <AdminContentHomePreview :save-version="saveVersion" />
        </div>
      </div>

      <AdminContentHomePublishBar
        ref="publishBar"
        :changes="editor.changes.value"
        :status="editor.status.value"
        :hydrated="editor.hydrated.value"
        :publishing="publishing"
        @publish="onPublish"
        @discard="editor.discard"
      />

      <AdminContentHomeVersions
        :versions="editor.versions.value"
        :open="versionsOpen"
        :restoring-id="restoringId"
        :hydrated="editor.hydrated.value"
        @update:open="versionsOpen = $event"
        @restore="onRestore"
      />
    </template>
  </div>
</template>
