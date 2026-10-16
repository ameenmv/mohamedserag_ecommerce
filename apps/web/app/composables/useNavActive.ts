/**
 * Determines whether a given navigation path is currently active.
 * Handles the special case where the root path (default `'/'` or custom like `'/admin'`)
 * matches strictly on exact path, whereas nested paths match either exact or as path prefix.
 * Strips language prefix (such as `'/en'`) so active state works in all locales.
 */
export function useNavActive(rootPath = '/') {
  const route = useRoute()

  function isActive(path: string): boolean {
    const current = stripLocalePrefix(route.path)
    const target = stripLocalePrefix(path)
    const normalizedRoot = stripLocalePrefix(rootPath)

    if (target === normalizedRoot) {
      return current === normalizedRoot
    }
    return current === target || current.startsWith(`${target}/`)
  }

  return {
    isActive,
  }
}
