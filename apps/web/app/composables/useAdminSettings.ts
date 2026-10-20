import {
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_SCHEMAS,
  type AdminCodDeposit,
  type AdminPaymentsSetting,
  type AdminSettingsResponse,
  type AdminZonesSetting,
  type LowStockSettingInput,
  type SearchSynonymsSettingInput,
  type SettingsSection,
  type SettingsSectionState,
  type StoreInfoSettingOutput,
  type TemplatesSettingInput,
} from '@serag/shared'
import { parseAdminApiError } from '~/utils/admin-api-errors'
import {
  extractSettingsConflict,
  settingsDraftDirty,
  zodIssuesToFieldErrors,
  type SettingsConflictLatest,
} from '~/utils/admin-settings'

/** Runtime value shape of each settings section, mirroring `SETTINGS_SECTION_SCHEMAS`. */
export interface AdminSettingsValues {
  store: StoreInfoSettingOutput
  payments: AdminPaymentsSetting
  zones: AdminZonesSetting
  codDeposit: AdminCodDeposit
  lowStock: LowStockSettingInput
  searchSynonyms: SearchSynonymsSettingInput
  templates: TemplatesSettingInput
}

export interface AdminSettingsSectionState {
  loaded: boolean
  saved: unknown
  draft: unknown
  version: string | null
  warnings: string[]
  saving: boolean
  fieldErrors: Record<string, string>
  formError: string
}

export interface AdminSettingsConflict {
  section: SettingsSection
  latest: SettingsConflictLatest
}

function createInitialState(): Record<SettingsSection, AdminSettingsSectionState> {
  const state = {} as Record<SettingsSection, AdminSettingsSectionState>
  for (const section of SETTINGS_SECTIONS) {
    state[section] = {
      loaded: false,
      saved: null,
      draft: null,
      version: null,
      warnings: [],
      saving: false,
      fieldErrors: {},
      formError: '',
    }
  }
  return state
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Shared admin settings state (Slice 7): loads every section once, tracks
 * per-section drafts vs. saved values, saves with optimistic-concurrency
 * versions, and surfaces 409 conflicts for explicit resolution.
 */
export function useAdminSettings() {
  const { t } = useI18n()
  const sections = useState<Record<SettingsSection, AdminSettingsSectionState>>(
    'admin-settings-sections',
    createInitialState,
  )
  const conflict = useState<AdminSettingsConflict | null>('admin-settings-conflict', () => null)
  /** Section that was just saved, shown as a short «اتحفظت» status, cleared after a few seconds. */
  const savedNotice = useState<SettingsSection | null>('admin-settings-saved-notice', () => null)
  let savedNoticeTimer: ReturnType<typeof setTimeout> | undefined
  const loading = ref(false)
  const loadError = ref('')

  async function loadAll(): Promise<void> {
    if (loading.value) return
    loading.value = true
    loadError.value = ''
    try {
      const response = await adminFetch<AdminSettingsResponse>('/admin/settings')
      for (const section of SETTINGS_SECTIONS) {
        const incoming = response.sections[section]
        if (!incoming) continue
        const parsed = SETTINGS_SECTION_SCHEMAS[section].safeParse(incoming.value)
        const state = sections.value[section]
        if (parsed.success) {
          state.loaded = true
          state.saved = parsed.data
          state.draft = deepCopy(parsed.data)
          state.version = incoming.version
          state.warnings = incoming.warnings ?? []
          state.fieldErrors = {}
          state.formError = ''
        } else {
          state.loaded = false
          state.formError = t('admin.settings.sectionLoadError')
        }
      }
    } catch (err: unknown) {
      loadError.value = parseAdminApiError(err, t).message
    } finally {
      loading.value = false
    }
  }

  async function save(section: SettingsSection): Promise<boolean> {
    const state = sections.value[section]
    if (!state.loaded || state.saving) return false

    const parsed = SETTINGS_SECTION_SCHEMAS[section].safeParse(state.draft)
    if (!parsed.success) {
      state.fieldErrors = zodIssuesToFieldErrors(parsed.error.issues)
      state.formError = ''
      return false
    }

    state.fieldErrors = {}
    state.formError = ''
    state.saving = true
    try {
      const result = await adminFetch<SettingsSectionState<unknown>>(
        `/admin/settings/${section}`,
        {
          method: 'PUT',
          body: { value: parsed.data, version: state.version },
        },
      )
      const resultParsed = SETTINGS_SECTION_SCHEMAS[section].safeParse(result.value)
      const savedValue = resultParsed.success ? resultParsed.data : parsed.data
      state.saved = savedValue
      state.draft = deepCopy(savedValue)
      state.version = result.version
      state.warnings = result.warnings ?? []
      savedNotice.value = section
      clearTimeout(savedNoticeTimer)
      savedNoticeTimer = setTimeout(() => {
        if (savedNotice.value === section) savedNotice.value = null
      }, 4000)
      return true
    } catch (err: unknown) {
      const latest = extractSettingsConflict(err)
      if (latest) {
        conflict.value = { section, latest }
        return false
      }
      const apiError = parseAdminApiError(err, t)
      state.fieldErrors = apiError.fieldErrors
      state.formError =
        Object.keys(apiError.fieldErrors).length > 0 ? '' : apiError.message
      return false
    } finally {
      state.saving = false
    }
  }

  /** Applies the 409 `latest` payload as the new saved+draft value, then closes the conflict. */
  async function loadLatest(section: SettingsSection): Promise<void> {
    const current = conflict.value
    if (!current || current.section !== section) return
    const parsed = SETTINGS_SECTION_SCHEMAS[section].safeParse(current.latest.value)
    if (!parsed.success) return
    const state = sections.value[section]
    state.loaded = true
    state.saved = parsed.data
    state.draft = deepCopy(parsed.data)
    state.version = current.latest.version
    state.fieldErrors = {}
    state.formError = ''
    conflict.value = null
  }

  function cancelConflict(): void {
    conflict.value = null
  }

  function discard(section: SettingsSection): void {
    const state = sections.value[section]
    if (!state.loaded) return
    state.draft = deepCopy(state.saved)
    state.fieldErrors = {}
    state.formError = ''
  }

  function discardAll(): void {
    for (const section of SETTINGS_SECTIONS) {
      discard(section)
    }
  }

  function isDirty(section: SettingsSection): boolean {
    const state = sections.value[section]
    if (!state.loaded) return false
    return settingsDraftDirty(state.saved, state.draft)
  }

  const anyDirty = computed(() => SETTINGS_SECTIONS.some((section) => isDirty(section)))

  return {
    sections,
    conflict,
    savedNotice,
    loading,
    loadError,
    loadAll,
    save,
    loadLatest,
    cancelConflict,
    discard,
    discardAll,
    isDirty,
    anyDirty,
  }
}

/**
 * Typed per-section accessor used by the section editor components.
 * Values are stored as `unknown` in the shared state and cast once here,
 * at this single boundary, to the section's schema output type.
 */
export function useAdminSettingsSection<S extends SettingsSection>(section: S) {
  const { sections, save, discard, isDirty } = useAdminSettings()

  const state = computed(() => sections.value[section])

  const draft = computed(() => state.value.draft as AdminSettingsValues[S])

  const loaded = computed(() => state.value.loaded)
  const saving = computed(() => state.value.saving)
  const warnings = computed(() => state.value.warnings)
  const fieldErrors = computed(() => state.value.fieldErrors)
  const formError = computed(() => state.value.formError)
  const dirty = computed(() => isDirty(section))

  return {
    draft,
    loaded,
    saving,
    warnings,
    fieldErrors,
    formError,
    dirty,
    save: () => save(section),
    discard: () => discard(section),
  }
}
