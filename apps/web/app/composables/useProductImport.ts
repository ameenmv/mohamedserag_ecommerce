import type {
  ImportPlan,
  ImportPlanRow,
  ImportRowStatus,
} from '@serag/shared'
import { parseAdminApiError } from '~/utils/admin-api-errors'

export interface ProductImportApplyResult {
  updated: number
  skipped: number
  errors: number
}

export type ImportFilterMode = 'changes' | 'all' | ImportRowStatus

export function useProductImport() {
  const { t } = useI18n()
  const notify = useNotify()

  const file = ref<File | null>(null)
  const fileName = ref('')
  const csvText = ref('')
  const fileError = ref<string | null>(null)

  const loading = ref(false)
  const applying = ref(false)
  const downloadingExport = ref(false)
  const hydrated = ref(false)

  const plan = ref<ImportPlan | null>(null)
  const appliedResult = ref<ProductImportApplyResult | null>(null)
  const confirmDialogOpen = ref(false)
  const filterStatus = ref<ImportFilterMode>('changes')

  onMounted(() => {
    hydrated.value = true
  })

  const filteredRows = computed<ImportPlanRow[]>(() => {
    if (!plan.value) return []
    const mode = filterStatus.value
    if (mode === 'all') {
      return plan.value.rows
    }
    if (mode === 'changes') {
      return plan.value.rows.filter((r) => r.status === 'update')
    }
    return plan.value.rows.filter((r) => r.status === mode)
  })

  const updateCount = computed(() => plan.value?.summary.update ?? 0)

  async function downloadCurrentCatalog(): Promise<void> {
    downloadingExport.value = true
    try {
      const blob = await adminFetch<Blob>('/admin/products/import/export', {
        responseType: 'blob',
      })
      const today = new Date().toISOString().slice(0, 10)
      const downloadUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `serag-products-${today}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: unknown) {
      const parsed = parseAdminApiError(err, t)
      notify.error(t('admin.products.import.errors.exportFailed'), parsed.message)
    } finally {
      downloadingExport.value = false
    }
  }

  async function handleFile(selectedFile: File): Promise<void> {
    fileError.value = null
    appliedResult.value = null

    const validExtensions = ['.csv']
    const hasValidExt = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext),
    )

    if (!hasValidExt && selectedFile.type !== 'text/csv' && selectedFile.type !== 'application/vnd.ms-excel') {
      fileError.value = t('admin.products.import.dropzone.invalidType')
      return
    }

    const maxSize = 2 * 1024 * 1024 // 2 MB
    if (selectedFile.size > maxSize) {
      fileError.value = t('admin.products.import.dropzone.fileTooLarge')
      return
    }

    try {
      loading.value = true
      file.value = selectedFile
      fileName.value = selectedFile.name
      const text = await selectedFile.text()
      csvText.value = text

      const previewPlan = await adminFetch<ImportPlan>('/admin/products/import/preview', {
        method: 'POST',
        body: { csv: text },
      })

      plan.value = previewPlan
      filterStatus.value = 'changes'
    } catch (err: unknown) {
      const parsed = parseAdminApiError(err, t)
      fileError.value = parsed.message || t('admin.products.import.errors.previewFailed')
      plan.value = null
    } finally {
      loading.value = false
    }
  }

  async function applyImport(): Promise<void> {
    if (!csvText.value || updateCount.value === 0) return

    applying.value = true
    try {
      const result = await adminFetch<ProductImportApplyResult>('/admin/products/import/apply', {
        method: 'POST',
        body: { csv: csvText.value },
      })

      appliedResult.value = result
      confirmDialogOpen.value = false
      plan.value = null
      file.value = null
      fileName.value = ''
      csvText.value = ''

      notify.success(
        t('admin.products.import.toasts.appliedTitle'),
        t('admin.products.import.toasts.appliedDescription', {
          count: result.updated,
        }),
      )
    } catch (err: unknown) {
      const parsed = parseAdminApiError(err, t)
      notify.error(t('admin.products.import.errors.applyFailed'), parsed.message)
    } finally {
      applying.value = false
    }
  }

  function reset(): void {
    file.value = null
    fileName.value = ''
    csvText.value = ''
    fileError.value = null
    plan.value = null
    appliedResult.value = null
    confirmDialogOpen.value = false
    filterStatus.value = 'changes'
  }

  return {
    file,
    fileName,
    csvText,
    fileError,
    loading,
    applying,
    downloadingExport,
    hydrated,
    plan,
    appliedResult,
    confirmDialogOpen,
    filterStatus,
    filteredRows,
    updateCount,
    downloadCurrentCatalog,
    handleFile,
    applyImport,
    reset,
  }
}

export type ProductImportContext = ReturnType<typeof useProductImport>
