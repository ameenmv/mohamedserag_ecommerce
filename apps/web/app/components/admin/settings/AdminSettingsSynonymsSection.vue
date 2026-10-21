<script setup lang="ts">
import { Info, Plus, PlusCircle, Trash2 } from '@lucide/vue'
import { parseSynonymInput } from '~/utils/admin-settings'

const { t } = useI18n()
const {
  draft,
  loaded,
  saving,
  fieldErrors,
  formError,
  dirty,
  save,
  discard,
} = useAdminSettingsSection('searchSynonyms')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const wordInputs = ref<string[]>([])

watch(
  () => [loaded.value, draft.value.length],
  () => {
    if (loaded.value) {
      wordInputs.value = draft.value.map(() => '')
    }
  },
  { immediate: true },
)

function groupError(index: number): string | undefined {
  return fieldErrors.value[String(index)] || fieldErrors.value[`${index}`]
}

function addWord(groupIndex: number, value: string) {
  const words = parseSynonymInput(value)
  if (words.length === 0) return
  const group = draft.value[groupIndex]
  if (!group) return
  for (const word of words) {
    if (!group.includes(word)) {
      group.push(word)
    }
  }
  wordInputs.value[groupIndex] = ''
}

function onWordKeydown(groupIndex: number, event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',' || event.key === '،') {
    event.preventDefault()
    const value = wordInputs.value[groupIndex] ?? ''
    addWord(groupIndex, value)
  }
}

function removeWord(groupIndex: number, wordIndex: number) {
  draft.value[groupIndex]?.splice(wordIndex, 1)
}

function addGroup() {
  draft.value.push([])
  wordInputs.value.push('')
}

function removeGroup(index: number) {
  draft.value.splice(index, 1)
  wordInputs.value.splice(index, 1)
}

async function handleSave() {
  await save()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.settings.synonyms.hint') }}</span>
    </p>

    <p
      v-if="formError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ formError }}
    </p>

    <div v-if="loaded" class="flex flex-col gap-4">
      <div
        v-for="(group, groupIndex) in draft"
        :key="groupIndex"
        class="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="num text-xs font-bold text-muted-foreground">
            {{ groupIndex + 1 }}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="saving"
            :aria-label="t('admin.settings.synonyms.removeGroupAria')"
            class="min-h-11 sm:min-h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            @click="removeGroup(groupIndex)"
          >
            <Trash2 class="size-3.5 me-1.5" aria-hidden="true" />
            <span class="hidden sm:inline">{{ t('admin.settings.synonyms.removeGroup') }}</span>
          </Button>
        </div>

        <!-- Word chips -->
        <div class="flex flex-wrap items-center gap-2">
          <span
            v-if="group.length === 0"
            class="text-xs text-muted-foreground"
          >
            {{ t('admin.settings.synonyms.empty') }}
          </span>
          <span
            v-for="(word, wordIndex) in group"
            :key="`${word}-${wordIndex}`"
            class="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
          >
            {{ word }}
            <button
              type="button"
              :aria-label="t('admin.settings.synonyms.removeWordAria')"
              :disabled="saving"
              class="text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none"
              @click="removeWord(groupIndex, wordIndex)"
            >
              <Trash2 class="size-3" aria-hidden="true" />
            </button>
          </span>
        </div>

        <div class="flex items-center gap-2 sm:max-w-sm">
          <Input
            v-model="wordInputs[groupIndex]"
            type="text"
            maxlength="40"
            :disabled="saving"
            :placeholder="t('admin.settings.synonyms.wordPlaceholder')"
            class="h-10 rounded-xl"
            @keydown="onWordKeydown(groupIndex, $event)"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="saving || !(wordInputs[groupIndex] ?? '').trim()"
            class="min-h-11 sm:min-h-9 shrink-0 text-xs"
            @click="addWord(groupIndex, wordInputs[groupIndex] ?? '')"
          >
            <PlusCircle class="size-3.5 me-1.5" aria-hidden="true" />
            <span>{{ t('admin.settings.synonyms.addWord') }}</span>
          </Button>
        </div>

        <p v-if="group.length === 1" class="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
          {{ t('admin.settings.synonyms.minWords') }}
        </p>
        <p v-if="groupError(groupIndex)" class="text-[11px] font-semibold text-destructive">
          {{ groupError(groupIndex) }}
        </p>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          :disabled="saving"
          class="min-h-11 text-xs font-bold"
          @click="addGroup"
        >
          <Plus class="size-4 me-1.5" aria-hidden="true" />
          <span>{{ t('admin.settings.synonyms.addGroup') }}</span>
        </Button>
      </div>
    </div>

    <AdminSettingsSaveBar
      :saving="saving"
      :dirty="dirty"
      :hydrated="hydrated"
      @save="handleSave"
      @discard="discard"
    />
  </div>
</template>
