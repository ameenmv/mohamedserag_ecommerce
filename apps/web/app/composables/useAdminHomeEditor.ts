import type { AdminHomeState, HomeContent, HomeSectionId, HomeVersionRow } from '@serag/shared'
import { DEFAULT_HOME_CONTENT, DEFAULT_HOME_LAYOUT, countHomeChanges } from '@serag/shared'
import {
  cloneHomeDraft,
  isHomeFieldChanged,
  mapHomeFieldErrors,
  moveHomeSection,
  resetHomeField,
  setHomeField,
  toggleHomeSectionHidden,
} from '~/utils/admin-home-editor'

export type HomeSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface DraftShape {
  sections: HomeContent
  layout: AdminHomeState['draft']['layout']
}

function emptyState(): AdminHomeState {
  return {
    draft: { sections: cloneHomeDraft(DEFAULT_HOME_CONTENT), layout: cloneHomeDraft(DEFAULT_HOME_LAYOUT), updatedAt: null },
    published: {
      sections: cloneHomeDraft(DEFAULT_HOME_CONTENT),
      layout: cloneHomeDraft(DEFAULT_HOME_LAYOUT),
      publishedAt: null,
      label: null,
    },
    changes: 0,
  }
}

/**
 * Editor state for the admin home CMS. Owns a deep-cloned `draft` (sections + layout),
 * debounced autosave against the API, per-field change tracking and validation errors.
 * All network calls funnel through `useAdminCms`.
 */
export function useAdminHomeEditor() {
  const cms = useAdminCms()
  const { t } = useI18n()
  const undoToast = useUndoToast()

  const state = ref<AdminHomeState>(emptyState())
  const draft = ref<DraftShape>({
    sections: cloneHomeDraft(DEFAULT_HOME_CONTENT),
    layout: cloneHomeDraft(DEFAULT_HOME_LAYOUT),
  })
  const status = ref<HomeSaveStatus>('idle')
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})
  const versions = ref<HomeVersionRow[]>([])
  const hydrated = ref(false)

  const changes = computed(() =>
    countHomeChanges(
      { sections: draft.value.sections, layout: draft.value.layout },
      { sections: state.value.published.sections, layout: state.value.published.layout },
    ),
  )

  function applyState(next: AdminHomeState): void {
    state.value = next
    draft.value = {
      sections: cloneHomeDraft(next.draft.sections),
      layout: cloneHomeDraft(next.draft.layout),
    }
    fieldErrors.value = {}
  }

  // Autosave setup: debounce 800ms, never overlap — the latest draft is queued and
  // flushed as soon as the in-flight request settles.
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let saveInFlight = false
  let queued = false
  let currentSave: Promise<void> | null = null

  function flushSave(): Promise<void> {
    if (saveInFlight) {
      queued = true
      return currentSave ?? Promise.resolve()
    }
    currentSave = runSave()
    return currentSave
  }

  async function runSave(): Promise<void> {
    saveInFlight = true
    status.value = 'saving'
    fieldErrors.value = {}
    try {
      const payload = {
        sections: cloneHomeDraft(draft.value.sections),
        layout: cloneHomeDraft(draft.value.layout),
      }
      const next = await cms.saveDraft(payload)
      // Keep the user's local edits if they typed while the request was in flight.
      state.value = {
        ...next,
        draft: {
          ...next.draft,
          sections: cloneHomeDraft(draft.value.sections),
          layout: cloneHomeDraft(draft.value.layout),
        },
      }
      status.value = 'saved'
    } catch (err) {
      status.value = 'error'
      fieldErrors.value = extractFieldErrors(err)
    } finally {
      saveInFlight = false
      currentSave = null
      if (queued) {
        queued = false
        scheduleSave()
      }
    }
  }

  /**
   * Waits until every local edit has reached the server: a pending debounce is flushed now
   * and an in-flight save is awaited. Returns false when the last save failed.
   */
  async function settleSaves(): Promise<boolean> {
    // A finishing save may schedule a queued one, so loop until both are idle
    while (saveTimer || currentSave) {
      if (currentSave) {
        await currentSave
      } else if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
        await flushSave()
      }
    }
    return status.value !== 'error'
  }

  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      void flushSave()
    }, 800)
  }

  function extractFieldErrors(err: unknown): Record<string, string> {
    return mapHomeFieldErrors(parseAdminApiError(err, t).fieldErrors)
  }

  /** Any edit calls this: schedules the debounced autosave. */
  function touch(): void {
    status.value = 'idle'
    scheduleSave()
  }

  function isFieldChanged(sectionId: HomeSectionId, key: string): boolean {
    return isHomeFieldChanged(
      draft.value.sections,
      state.value.published.sections,
      sectionId,
      key,
    )
  }

  function resetField(sectionId: HomeSectionId, key: string): void {
    resetHomeField(draft.value, state.value.published.sections, sectionId, key)
    fieldErrors.value = {}
    touch()
  }

  /** Applies a single field edit from the fields editor and schedules the autosave. */
  function setField(sectionId: HomeSectionId, key: string, value: unknown): void {
    setHomeField(draft.value, sectionId, key, value)
    touch()
  }

  function moveSection(id: HomeSectionId, direction: -1 | 1): void {
    draft.value.layout.order = moveHomeSection(draft.value.layout.order, id, direction)
    touch()
  }

  function toggleHidden(id: HomeSectionId): void {
    draft.value.layout.hidden = toggleHomeSectionHidden(draft.value.layout.hidden, id)
    touch()
  }

  async function loadVersions(): Promise<void> {
    try {
      const res = await cms.versions()
      versions.value = res.items
    } catch {
      versions.value = []
    }
  }

  async function load(): Promise<void> {
    loading.value = true
    loadError.value = null
    try {
      const next = await cms.getHome()
      applyState(next)
      await loadVersions()
    } catch {
      loadError.value = t('admin.content.errors.loadFailed')
    } finally {
      loading.value = false
    }
  }

  async function publish(label?: string): Promise<boolean> {
    // Publish exactly what the editor shows: unsaved edits are saved first
    if (!(await settleSaves())) {
      useNotify().error(t('admin.content.errors.publishFailed'))
      return false
    }
    status.value = 'saving'
    try {
      const next = await cms.publish(label)
      applyState(next)
      status.value = 'saved'
      await loadVersions()
      return true
    } catch (err) {
      status.value = 'error'
      // 409 «مفيش تعديلات للنشر» and other API messages are already in Egyptian Arabic
      useNotify().error(parseAdminApiError(err, t).message)
      return false
    }
  }

  async function discard(): Promise<void> {
    await settleSaves()
    const beforeSections = cloneHomeDraft(draft.value.sections)
    const beforeLayout = cloneHomeDraft(draft.value.layout)
    try {
      const next = await cms.discard()
      applyState(next)
      status.value = 'saved'
      undoToast(t('admin.content.toasts.discarded'), {
        onUndo: async () => {
          draft.value = { sections: beforeSections, layout: beforeLayout }
          await flushSave()
        },
      })
    } catch {
      status.value = 'error'
      useNotify().error(t('admin.content.errors.discardFailed'))
    }
  }

  async function restore(versionId: string): Promise<void> {
    await settleSaves()
    try {
      const next = await cms.restore(versionId)
      applyState(next)
      status.value = 'saved'
      useNotify().success(t('admin.content.toasts.restored'))
      await loadVersions()
    } catch {
      status.value = 'error'
      useNotify().error(t('admin.content.errors.restoreFailed'))
    }
  }

  return {
    state,
    draft,
    status,
    loading,
    loadError,
    fieldErrors,
    versions,
    hydrated,
    changes,
    load,
    publish,
    discard,
    restore,
    moveSection,
    toggleHidden,
    isFieldChanged,
    resetField,
    setField,
    touch,
  }
}
