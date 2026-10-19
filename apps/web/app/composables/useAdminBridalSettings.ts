import type { BridalSettings } from '@serag/shared'
import { parseAdminApiError } from '~/utils/admin-api-errors'

export function useAdminBridalSettings() {
  const notify = useNotify()

  const settings = ref<BridalSettings | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchSettings(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      settings.value = await adminFetch<BridalSettings>('/admin/bridal/settings')
    } catch (err) {
      error.value = parseAdminApiError(err).message
      notify.error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(input: BridalSettings): Promise<BridalSettings | null> {
    saving.value = true
    error.value = null
    try {
      const updated = await adminFetch<BridalSettings>('/admin/bridal/settings', {
        method: 'PUT',
        body: input,
      })
      settings.value = updated
      return updated
    } catch (err) {
      const apiErr = parseAdminApiError(err)
      error.value = apiErr.message
      notify.error(apiErr.message)
      return null
    } finally {
      saving.value = false
    }
  }

  return {
    settings,
    loading,
    saving,
    error,
    fetchSettings,
    saveSettings,
  }
}
