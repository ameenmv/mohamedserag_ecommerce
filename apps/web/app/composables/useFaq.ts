import type { PublicFaqEntry } from '@serag/shared'
import { filterFaqEntries } from '~/utils/faq-filter'

/**
 * Data and interaction composable for the storefront FAQ page.
 * Handles SSR data fetching, topic and search filtering, accordion state,
 * deep linking via `#q-<id>`, and fallback to the legacy CMS page when empty.
 */
export async function useFaq() {
  const storeApi = useStoreApi()

  // Both requests start before the first await: a composable called after an await has lost the
  // Nuxt context (NUXT_E1001), so the CMS fallback is fetched inside the FAQ request instead.
  const faqRequest = useAsyncData('store:faq', async () => {
    const { items } = await storeApi.faq()
    if (items.length > 0) return { items, cmsPage: null }
    // No structured entries yet: show the old CMS page instead
    const cmsPage = await storeApi.page('faq').catch(() => null)
    return { items, cmsPage }
  })
  const storeInfoRequest = useAsyncData('store:store-info', () => storeApi.storeInfo())
  const [{ data: faqData, refresh: refreshFaq }, { data: storeInfo }] = await Promise.all([
    faqRequest,
    storeInfoRequest,
  ])

  const rawItems = computed<PublicFaqEntry[]>(() => faqData.value?.items ?? [])
  const hasEntries = computed(() => rawItems.value.length > 0)
  const cmsPage = computed(() => faqData.value?.cmsPage ?? null)

  // 4. Topic, search, and accordion states
  const selectedTopic = ref<string>('all')
  const searchQuery = ref<string>('')
  const activeQuestionId = ref<string | null>(null)

  // 5. Filtered items based on topic and query
  const filteredItems = computed(() =>
    filterFaqEntries(rawItems.value, {
      topic: selectedTopic.value,
      query: searchQuery.value,
    }),
  )

  // 6. Counts per topic for tab badges
  const topicCounts = computed(() => {
    const counts: Record<string, number> = { all: rawItems.value.length }
    for (const item of rawItems.value) {
      counts[item.topic] = (counts[item.topic] ?? 0) + 1
    }
    return counts
  })

  // 7. Toggle question accordion (single open at a time)
  function toggleQuestion(id: string): void {
    if (activeQuestionId.value === id) {
      activeQuestionId.value = null
      if (import.meta.client && window.location.hash === `#q-${id}`) {
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    } else {
      activeQuestionId.value = id
      if (import.meta.client) {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}#q-${id}`)
      }
    }
  }

  function resetFilters(): void {
    selectedTopic.value = 'all'
    searchQuery.value = ''
  }

  // 8. Deep linking: `#q-<id>` activates and scrolls to the item
  function applyHashLink(): void {
    if (!import.meta.client) return
    const hash = window.location.hash
    if (!hash.startsWith('#q-')) return
    const targetId = hash.slice(3)
    const matched = rawItems.value.find((item) => item.id === targetId)
    if (matched) {
      activeQuestionId.value = targetId
      if (selectedTopic.value !== 'all' && selectedTopic.value !== matched.topic) {
        selectedTopic.value = matched.topic
      }
      nextTick(() => {
        const el = document.getElementById(`q-${targetId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    }
  }

  onMounted(() => {
    applyHashLink()
    window.addEventListener('hashchange', applyHashLink)
  })

  onBeforeUnmount(() => {
    if (import.meta.client) {
      window.removeEventListener('hashchange', applyHashLink)
    }
  })

  return {
    rawItems,
    hasEntries,
    cmsPage,
    storeInfo,
    selectedTopic,
    searchQuery,
    activeQuestionId,
    filteredItems,
    topicCounts,
    toggleQuestion,
    resetFilters,
    refreshFaq,
  }
}
