import type {
  AdminBridalTier,
  BridalTierUpdateInput,
} from '@serag/shared'
import { parseAdminApiError } from '~/utils/admin-api-errors'

export function useAdminBridalTiers() {
  const notify = useNotify()

  const tiers = ref<AdminBridalTier[]>([])
  const loading = ref(true)
  const saving = ref<Record<string, boolean>>({})
  const error = ref<string | null>(null)

  async function fetchTiers(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await adminFetch<{ tiers: AdminBridalTier[] }>('/admin/bridal/tiers')
      tiers.value = res.tiers
    } catch (err) {
      error.value = parseAdminApiError(err).message
      notify.error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function saveTier(id: string, input: BridalTierUpdateInput): Promise<AdminBridalTier | null> {
    saving.value = { ...saving.value, [id]: true }
    error.value = null
    try {
      const updated = await adminFetch<AdminBridalTier>(
        `/admin/bridal/tiers/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          body: input,
        },
      )
      const index = tiers.value.findIndex((t) => t.id === id)
      if (index >= 0) {
        tiers.value[index] = updated
      }
      return updated
    } catch (err) {
      const apiErr = parseAdminApiError(err)
      error.value = apiErr.message
      notify.error(apiErr.message)
      return null
    } finally {
      saving.value = { ...saving.value, [id]: false }
    }
  }

  return {
    tiers,
    loading,
    saving,
    error,
    fetchTiers,
    saveTier,
  }
}
