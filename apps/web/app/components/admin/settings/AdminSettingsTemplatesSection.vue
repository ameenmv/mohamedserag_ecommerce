<script setup lang="ts">
import { Info, Plus } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import {
  TEMPLATE_KEYS,
  TEMPLATE_VARIABLES,
  renderTemplatePreview,
  unknownTemplateVariables,
  type WhatsAppTemplateKey,
} from '@serag/shared'
import { insertTemplateVariable } from '~/utils/admin-settings'

const { t, localeProperties } = useI18n()
const {
  draft,
  loaded,
  saving,
  fieldErrors,
  formError,
  dirty,
  save,
  discard,
} = useAdminSettingsSection('templates')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const textareas = new Map<string, HTMLTextAreaElement>()
const previews = ref<Record<string, string>>({})
const previewErrors = ref<Record<string, boolean>>({})
const requestSeqs = ref<Record<string, number>>({})

function setTextareaRef(key: WhatsAppTemplateKey, el: unknown) {
  if (el instanceof HTMLTextAreaElement) {
    textareas.set(key, el)
  } else {
    textareas.delete(key)
  }
}

function localPreview(key: WhatsAppTemplateKey): string {
  return renderTemplatePreview(draft.value[key])
}

function previewText(key: WhatsAppTemplateKey): string {
  return previews.value[key] ?? localPreview(key)
}

function unknownVars(key: WhatsAppTemplateKey): string[] {
  return unknownTemplateVariables(key, draft.value[key])
}

function separator(): string {
  return localeProperties.value.dir === 'rtl' ? '، ' : ', '
}

async function refreshPreview(key: WhatsAppTemplateKey) {
  const seq = (requestSeqs.value[key] ?? 0) + 1
  requestSeqs.value[key] = seq
  try {
    const result = await adminFetch<{ text: string; unknownVariables: string[] }>(
      '/admin/settings/templates/preview',
      {
        method: 'POST',
        body: { key, template: draft.value[key] },
      },
    )
    if (requestSeqs.value[key] !== seq) return
    previews.value[key] = result.text
    previewErrors.value[key] = false
  } catch {
    if (requestSeqs.value[key] !== seq) return
    previews.value[key] = localPreview(key)
    previewErrors.value[key] = true
  }
}

const debouncedPreview = useDebounceFn((key: WhatsAppTemplateKey) => {
  void refreshPreview(key)
}, 300)

watch(
  () => (loaded.value ? draft.value : null),
  (value) => {
    if (!value) return
    for (const key of TEMPLATE_KEYS) {
      debouncedPreview(key)
    }
  },
  { deep: true },
)

async function insertVariable(key: WhatsAppTemplateKey, variable: string) {
  const el = textareas.get(key)
  const cursor = el?.selectionStart ?? draft.value[key].length
  const { text, cursor: nextCursor } = insertTemplateVariable(draft.value[key], variable, cursor)
  draft.value[key] = text
  await nextTick()
  const updated = textareas.get(key)
  if (updated) {
    updated.focus()
    updated.setSelectionRange(nextCursor, nextCursor)
  }
}

function templateLabel(key: WhatsAppTemplateKey): string {
  return t(`admin.settings.templates.name.${key}`)
}

async function handleSave() {
  await save()
}

/** The `{{name}}` text a variable chip inserts (built in script: mustaches can't nest in templates). */
function variableToken(variable: string): string {
  return `{{${variable}}}`
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-serag-night dark:text-serag-gold" aria-hidden="true" />
      <span>{{ t('admin.settings.templates.hint') }}</span>
    </p>

    <p
      v-if="formError"
      role="alert"
      class="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive"
    >
      {{ formError }}
    </p>

    <div v-if="loaded" class="flex flex-col gap-5">
      <div
        v-for="key in TEMPLATE_KEYS"
        :key="key"
        class="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs"
      >
        <h3 class="text-sm font-bold text-foreground">{{ templateLabel(key) }}</h3>

        <!-- Variable chips -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-semibold text-muted-foreground">
            {{ t('admin.settings.templates.variablesLabel') }}:
          </span>
          <button
            v-for="variable in TEMPLATE_VARIABLES[key]"
            :key="variable"
            type="button"
            :aria-label="`${t('admin.settings.templates.insertVariableAria')} ${variable}`"
            :disabled="saving"
            class="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 font-mono text-[11px] font-semibold text-secondary-foreground transition-colors hover:border-serag-gold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="insertVariable(key, variable)"
          >
            <Plus class="size-3" aria-hidden="true" />
            <span>{{ variableToken(variable) }}</span>
          </button>
        </div>

        <AdminFormTextarea
          :ref="(el) => setTextareaRef(key, el)"
          v-model="draft[key]"
          :rows="3"
          maxlength="1000"
          dir="auto"
          :disabled="saving"
          :aria-invalid="Boolean(fieldErrors[key])"
          :aria-describedby="`settings-template-${key}-error`"
        />

        <p
          v-if="fieldErrors[key]"
          :id="`settings-template-${key}-error`"
          role="alert"
          class="text-[11px] font-semibold text-destructive"
        >
          {{ fieldErrors[key] }}
        </p>

        <!-- Preview -->
        <div class="flex flex-col gap-1.5 rounded-xl bg-muted/40 p-3">
          <span class="text-[11px] font-bold text-muted-foreground">
            {{ t('admin.settings.templates.preview') }}
          </span>
          <p class="whitespace-pre-wrap text-xs text-foreground">{{ previewText(key) }}</p>
          <p v-if="previewErrors[key]" class="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            {{ t('admin.settings.templates.previewError') }}
          </p>
          <p v-if="unknownVars(key).length > 0" class="text-[11px] font-semibold text-destructive">
            {{ t('admin.settings.templates.unknown') }}: {{ unknownVars(key).join(separator()) }}
          </p>
        </div>
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
