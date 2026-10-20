import type {
  AdminBrand,
  AdminCategory,
  AdminProductDetail,
  AdminProductImage,
  AdminProductSetContent,
  AdminSpecTemplate,
  AvailabilityMode,
  CreateProductInput,
} from '@serag/shared'
import { validateProductSpecs } from '@serag/shared'
import { parseAdminApiError } from '~/utils/admin-api-errors'
import { egpInputToPiastres, piastresToEgpInput } from '~/utils/admin-money'
import { buildProductCardPreview } from '~/utils/admin-product-preview'

export interface ProductFormState {
  id: string
  name: string
  modelCode: string
  slug: string
  brandId: string
  categoryId: string
  priceEgp: string
  oldPriceEgp: string
  stock: number
  lowStockThreshold: number
  availabilityMode: AvailabilityMode
  leadTimeText: string
  taxRate: number
  specs: Record<string, unknown>
  setContents: AdminProductSetContent[]
  warranty: string
  warrantyActivation: string
  origin: string
  visible: boolean
  featured: boolean
  seoTitle: string
  seoDescription: string
  images: AdminProductImage[]
}

export function useProductForm(initialDetail?: AdminProductDetail | null) {
  const { t } = useI18n()
  const router = useRouter()
  const localePath = useLocalePath()
  const productsApi = useAdminProducts()
  const categoriesApi = useAdminCategories()
  const brandsApi = useAdminBrands()
  const specTemplatesApi = useAdminSpecTemplates()
  const notify = useNotify()

  const isEditMode = computed(() => Boolean(initialDetail?.id))

  const form = reactive<ProductFormState>({
    id: initialDetail?.id ?? '',
    name: initialDetail?.name ?? '',
    modelCode: initialDetail?.modelCode ?? '',
    slug: initialDetail?.slug ?? '',
    brandId: initialDetail?.brandId ?? '',
    categoryId: initialDetail?.categoryId ?? '',
    priceEgp: initialDetail ? piastresToEgpInput(initialDetail.price) : '',
    oldPriceEgp: initialDetail?.oldPrice ? piastresToEgpInput(initialDetail.oldPrice) : '',
    stock: initialDetail?.stock ?? 0,
    lowStockThreshold: initialDetail?.lowStockThreshold ?? 3,
    availabilityMode: initialDetail?.availabilityMode ?? 'auto',
    leadTimeText: initialDetail?.leadTimeText ?? '',
    taxRate: initialDetail?.taxRate ?? 14,
    specs: initialDetail?.specs ? JSON.parse(JSON.stringify(initialDetail.specs)) : {},
    setContents: initialDetail?.setContents ? JSON.parse(JSON.stringify(initialDetail.setContents)) : [],
    warranty: initialDetail?.warranty ?? '',
    warrantyActivation: initialDetail?.warrantyActivation ?? '',
    origin: initialDetail?.origin ?? '',
    visible: initialDetail?.visible ?? false,
    featured: initialDetail?.featured ?? false,
    seoTitle: initialDetail?.seoTitle ?? '',
    seoDescription: initialDetail?.seoDescription ?? '',
    images: initialDetail?.images ? [...initialDetail.images] : [],
  })

  // Snapshot for dirty checking
  const initialSnapshot = ref(JSON.stringify(form))

  function updateSnapshot() {
    initialSnapshot.value = JSON.stringify(form)
  }

  const isDirty = computed(() => JSON.stringify(form) !== initialSnapshot.value)

  const hydrated = ref(false)
  const saving = ref(false)
  const errors = ref<Record<string, string>>({})
  const serverError = ref('')

  // Reference data
  const categories = ref<AdminCategory[]>([])
  const brands = ref<AdminBrand[]>([])
  const specTemplates = ref<AdminSpecTemplate[]>([])
  const loadingRefs = ref(true)

  async function loadReferenceData() {
    loadingRefs.value = true
    try {
      const [catsRes, brandsRes, templatesRes] = await Promise.all([
        categoriesApi.list(),
        brandsApi.list(),
        specTemplatesApi.list(),
      ])
      categories.value = catsRes
      brands.value = brandsRes
      specTemplates.value = templatesRes
    } catch (err) {
      serverError.value = parseAdminApiError(err).message
    } finally {
      loadingRefs.value = false
    }
  }

  const currentCategory = computed(() =>
    categories.value.find((c) => c.id === form.categoryId),
  )

  const currentTemplate = computed(() => {
    if (!currentCategory.value?.specTemplateId) return null
    return (
      specTemplates.value.find((t) => t.id === currentCategory.value?.specTemplateId) ?? null
    )
  })

  const isCookwareCategory = computed(() => {
    if (!currentCategory.value) return false
    const str = `${currentCategory.value.name} ${currentCategory.value.slug}`.toLowerCase()
    return /cookware|pots|أواني|حلل|طبيخ|أطقم|طقم/.test(str)
  })

  const showSetContents = computed(
    () => isCookwareCategory.value || form.setContents.length > 0,
  )

  // Live product card preview
  const previewProduct = computed(() => {
    const pricePiastres = egpInputToPiastres(form.priceEgp) ?? 0
    const oldPricePiastres = egpInputToPiastres(form.oldPriceEgp)
    return buildProductCardPreview(
      {
        id: form.id || 'preview',
        name: form.name,
        modelCode: form.modelCode,
        slug: form.slug,
        brandId: form.brandId,
        categoryId: form.categoryId,
        price: pricePiastres,
        oldPrice: oldPricePiastres,
        stock: form.stock,
        lowStockThreshold: form.lowStockThreshold,
        availabilityMode: form.availabilityMode,
        leadTimeText: form.leadTimeText,
        images: form.images,
      },
      {
        brands: brands.value,
        categories: categories.value,
      },
      {
        defaultName: t('admin.products.preview.defaultName'),
        defaultBrand: t('admin.products.preview.defaultBrand'),
        defaultCategory: t('admin.products.preview.defaultCategory'),
        defaultImageAlt: t('admin.products.preview.defaultImageAlt'),
      },
    )
  })

  // Category change with confirmation if specs exist
  const categoryChangePending = ref<string | null>(null)
  const categoryConfirmDialogOpen = ref(false)

  function requestCategoryChange(newCategoryId: string) {
    if (newCategoryId === form.categoryId) return

    const hasSpecValues = Object.values(form.specs).some(
      (v) => v !== null && v !== undefined && v !== '',
    )

    if (hasSpecValues) {
      categoryChangePending.value = newCategoryId
      categoryConfirmDialogOpen.value = true
    } else {
      applyCategoryChange(newCategoryId)
    }
  }

  function confirmCategoryChange() {
    if (categoryChangePending.value) {
      applyCategoryChange(categoryChangePending.value)
    }
    categoryConfirmDialogOpen.value = false
    categoryChangePending.value = null
  }

  function cancelCategoryChange() {
    categoryConfirmDialogOpen.value = false
    categoryChangePending.value = null
  }

  function applyCategoryChange(newCategoryId: string) {
    form.categoryId = newCategoryId
    const targetCat = categories.value.find((c) => c.id === newCategoryId)
    const targetTpl = targetCat?.specTemplateId
      ? specTemplates.value.find((t) => t.id === targetCat.specTemplateId)
      : null

    if (targetTpl?.fields) {
      const allowedKeys = new Set(targetTpl.fields.map((f) => f.key))
      const nextSpecs: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(form.specs)) {
        if (allowedKeys.has(k)) {
          nextSpecs[k] = v
        }
      }
      form.specs = nextSpecs
    } else {
      form.specs = {}
    }
  }

  function validate(): boolean {
    errors.value = {}
    serverError.value = ''

    const pricePiastres = egpInputToPiastres(form.priceEgp)
    if (pricePiastres === null) {
      errors.value.priceEgp = t('validation.priceRequired')
    }

    const oldPricePiastres = egpInputToPiastres(form.oldPriceEgp)
    if (oldPricePiastres !== null && pricePiastres !== null) {
      if (oldPricePiastres <= pricePiastres) {
        errors.value.oldPriceEgp = t('admin.products.editor.pricing.oldPriceGreater')
      }
    }

    if (!form.name.trim()) {
      errors.value.name = t('admin.products.validation.nameRequired')
    }
    if (!form.modelCode.trim()) {
      errors.value.modelCode = t('admin.products.validation.modelCodeRequired')
    }
    if (!form.brandId) {
      errors.value.brandId = t('admin.products.validation.brandRequired')
    }
    if (!form.categoryId) {
      errors.value.categoryId = t('admin.products.validation.categoryRequired')
    }

    // Validate specs against template if any
    if (currentTemplate.value?.fields) {
      const specResult = validateProductSpecs(form.specs, currentTemplate.value.fields)
      if (!specResult.valid) {
        for (const [k, errList] of Object.entries(specResult.errors)) {
          errors.value[`specs.${k}`] = errList[0] || t('common.errors.invalidValue')
        }
      }
    }

    return Object.keys(errors.value).length === 0
  }

  async function submit(): Promise<boolean> {
    if (saving.value) return false
    if (!validate()) return false

    saving.value = true
    serverError.value = ''

    const price = egpInputToPiastres(form.priceEgp) ?? 0
    const oldPrice = egpInputToPiastres(form.oldPriceEgp)

    const payload: CreateProductInput = {
      name: form.name.trim(),
      modelCode: form.modelCode.trim(),
      slug: form.slug.trim() || undefined,
      brandId: form.brandId,
      categoryId: form.categoryId,
      price,
      oldPrice,
      stock: form.stock,
      lowStockThreshold: form.lowStockThreshold,
      availabilityMode: form.availabilityMode,
      leadTimeText: form.availabilityMode === 'on_request' ? form.leadTimeText.trim() : null,
      taxRate: form.taxRate,
      specs: form.specs,
      setContents: form.setContents.length > 0 ? form.setContents : null,
      warranty: form.warranty.trim() || null,
      warrantyActivation: form.warrantyActivation.trim() || null,
      origin: form.origin.trim() || null,
      visible: form.visible,
      featured: form.featured,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
    }

    try {
      if (isEditMode.value) {
        const updated = await productsApi.update(form.id, payload)
        form.images = [...updated.images]
        updateSnapshot()
        notify.success(t('admin.products.toasts.saved', { name: updated.name }))
        return true
      }

      const created = await productsApi.create(payload)
      // Mark clean first, or the unsaved-changes guard blocks the redirect.
      updateSnapshot()
      notify.success(t('admin.products.toasts.created', { name: created.name }))
      await router.push(localePath(`/admin/products/${created.id}`))
      return true
    } catch (err: unknown) {
      const parsed = parseAdminApiError(err, t)
      serverError.value = parsed.message
      if (parsed.fieldErrors) {
        Object.assign(errors.value, parsed.fieldErrors)
      }
      return false
    } finally {
      saving.value = false
    }
  }

  // Image actions (edit mode only)
  const uploadingImage = ref(false)

  async function uploadImageFile(file: File): Promise<boolean> {
    if (!form.id) return false

    // Client-side validation: max 5MB and allowed types
    if (file.size > 5 * 1024 * 1024) {
      notify.error(t('admin.products.editor.images.maxSizeError'))
      return false
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!validTypes.includes(file.type)) {
      notify.error(t('admin.products.editor.images.typeError'))
      return false
    }

    uploadingImage.value = true
    try {
      const newImg = await productsApi.uploadImage(form.id, file)
      form.images.push(newImg)
      notify.success(t('admin.products.toasts.imageUploaded'))
      return true
    } catch (err) {
      notify.error(parseAdminApiError(err, t).message)
      return false
    } finally {
      uploadingImage.value = false
    }
  }

  async function patchImageDetails(
    imageId: string,
    patch: { alt?: string; isReal?: boolean },
  ): Promise<void> {
    if (!form.id) return
    try {
      const updated = await productsApi.patchImage(form.id, imageId, patch)
      const idx = form.images.findIndex((img) => img.id === imageId)
      if (idx !== -1) {
        form.images[idx] = updated
      }
    } catch (err) {
      notify.error(parseAdminApiError(err, t).message)
    }
  }

  async function moveImage(fromIndex: number, toIndex: number): Promise<void> {
    if (!form.id || fromIndex < 0 || toIndex < 0 || toIndex >= form.images.length) return
    const target = form.images[fromIndex]
    if (!target) return

    const reordered = [...form.images]
    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, target)
    form.images = reordered

    try {
      await productsApi.reorderImages(
        form.id,
        form.images.map((img) => img.id),
      )
    } catch (err) {
      notify.error(parseAdminApiError(err, t).message)
    }
  }

  async function removeImage(imageId: string): Promise<void> {
    if (!form.id) return
    try {
      await productsApi.deleteImage(form.id, imageId)
      form.images = form.images.filter((img) => img.id !== imageId)
      notify.success(t('admin.products.toasts.imageDeleted'))
    } catch (err) {
      notify.error(parseAdminApiError(err, t).message)
    }
  }

  // Set contents row actions
  function addSetContentRow() {
    form.setContents.push({ item: '', size: '', qty: 1 })
  }

  function removeSetContentRow(index: number) {
    form.setContents.splice(index, 1)
  }

  // Keyboard shortcut Ctrl/Cmd+S
  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (isDirty.value && !saving.value) {
        void submit()
      }
    }
  }

  // Route leave guard & beforeunload
  onMounted(() => {
    hydrated.value = true
    void loadReferenceData()
    if (import.meta.client) {
      window.addEventListener('keydown', handleKeydown)
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
  })

  onBeforeUnmount(() => {
    if (import.meta.client) {
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  })

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (isDirty.value) {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  onBeforeRouteLeave((_to, _from, next) => {
    if (isDirty.value) {
      const answer = window.confirm(
        t('admin.products.editor.unsavedChanges'),
      )
      if (answer) next()
      else next(false)
    } else {
      next()
    }
  })

  return {
    form,
    isEditMode,
    isDirty,
    hydrated,
    saving,
    errors,
    serverError,
    categories,
    brands,
    specTemplates,
    loadingRefs,
    currentCategory,
    currentTemplate,
    showSetContents,
    previewProduct,
    categoryConfirmDialogOpen,
    requestCategoryChange,
    confirmCategoryChange,
    cancelCategoryChange,
    submit,
    uploadingImage,
    uploadImageFile,
    patchImageDetails,
    moveImage,
    removeImage,
    addSetContentRow,
    removeSetContentRow,
  }
}
