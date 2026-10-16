import type { Ref } from 'vue'

/**
 * Shared state for the active admin page title displayed in the admin topbar.
 * Admin pages can either pass an initial title `useAdminPageTitle('الطلبات')`
 * or mutate the returned ref directly.
 */
export function useAdminPageTitle(initialTitle?: string): Ref<string> {
  const title = useState<string>('admin-page-title', () => 'نظرة عامة')

  if (initialTitle !== undefined) {
    title.value = initialTitle
  }

  return title
}
