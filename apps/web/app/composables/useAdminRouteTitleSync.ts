/**
 * Synchronizes the topbar page title key with the active route.
 * Also runs an optional callback on path change (e.g. to close the mobile drawer).
 */
export function useAdminRouteTitleSync(onPathChange?: (newPath: string) => void) {
  const route = useRoute()
  const pageTitle = useAdminPageTitle()

  watch(
    () => route.path,
    (newPath) => {
      onPathChange?.(newPath)
      const normalized = stripLocalePrefix(newPath)
      const matched =
        ADMIN_NAV_SHORTCUTS.find(
          (item) => item.to !== '/admin' && (normalized === item.to || normalized.startsWith(`${item.to}/`)),
        ) ?? ADMIN_NAV_SHORTCUTS.find((item) => item.to === normalized)
      if (matched) {
        pageTitle.value = matched.labelKey
      }
    },
    { immediate: true },
  )

  return {
    pageTitle,
  }
}
