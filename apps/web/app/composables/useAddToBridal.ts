import { ref } from 'vue'
import type { BridalListView } from '@serag/shared'
import { getApiBaseUrl } from '../utils/api'
import {
  addCategoryProductToRooms,
  canAppendToBridalList,
  isRecoverableBridalError,
  toRooms,
} from '../utils/bridal'

export interface AddToBridalProductInput {
  id: string
  name?: string
  category: {
    slug: string
  }
}

export function useAddToBridal() {
  const pending = ref(false)
  const lastAddedToken = ref<string | null>(null)
  const bridalDevice = useBridalDevice()
  const notify = useNotify()
  const analytics = useAnalytics()
  const localePath = useLocalePath()
  const { t } = useI18n()
  const baseURL = getApiBaseUrl()

  async function addToBridal(product: AddToBridalProductInput): Promise<boolean> {
    if (pending.value) {
      return false
    }

    pending.value = true
    try {
      // Filled after mount; the button stays disabled until hydration, so it is set by the first tap.
      const existingToken = bridalDevice.lastToken.value

      let appended = false
      let targetToken: string | null = null

      if (existingToken) {
        const token = existingToken
        try {
          const list = await $fetch<BridalListView>(
            `/bridal/lists/${encodeURIComponent(token)}`,
            {
              baseURL,
              method: 'GET',
            },
          )

          if (canAppendToBridalList(list)) {
            const currentRooms = toRooms(list)
            const updatedRooms = addCategoryProductToRooms(
              currentRooms,
              product.category.slug,
              product.id,
              1,
            )

            await $fetch<BridalListView>(
              `/bridal/lists/${encodeURIComponent(token)}`,
              {
                baseURL,
                method: 'PATCH',
                body: { rooms: updatedRooms },
              },
            )

            appended = true
            targetToken = token
          }
        } catch (fetchOrPatchErr: unknown) {
          if (!isRecoverableBridalError(fetchOrPatchErr)) {
            notify.error(t('store.bridal.productButton.errorToast'))
            return false
          }
          // Recoverable error (404 or 409): fall through to creating a new list
        }
      }

      if (!appended) {
        const createRes = await $fetch<{ editToken: string }>('/bridal/lists', {
          baseURL,
          method: 'POST',
          body: { productId: product.id },
        })

        targetToken = createRes.editToken
        bridalDevice.remember(targetToken)
        analytics.track('bridal_list_created')
      }

      if (targetToken) {
        lastAddedToken.value = targetToken
        const listPath = localePath(`/bridal/${targetToken}`)
        notify.action(t('store.bridal.productButton.addedToast'), {
          actionLabel: t('store.bridal.productButton.openList'),
          onAction: () => {
            void navigateTo(listPath)
          },
        })
        return true
      }

      return false
    } catch {
      notify.error(t('store.bridal.productButton.errorToast'))
      return false
    } finally {
      pending.value = false
    }
  }

  return {
    pending,
    lastAddedToken,
    addToBridal,
  }
}
