import type { Ref } from 'vue'

/**
 * Shared state for the active admin page title key displayed in the admin topbar.
 * Admin pages can either pass an initial message key `useAdminPageTitle('admin.nav.orders')`
 * or mutate the returned ref directly.
 */
export function useAdminPageTitle(initialKey?: string): Ref<string> {
  const titleKey = useState<string>('admin-page-title-key', () => 'admin.nav.overview')

  if (initialKey !== undefined) {
    titleKey.value = initialKey
  }

  return titleKey
}
