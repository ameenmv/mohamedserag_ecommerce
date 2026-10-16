import type { WritableComputedRef } from 'vue'
import { useDark } from '@vueuse/core'

export interface UseAdminThemeReturn {
  isDark: WritableComputedRef<boolean>
  toggleTheme: () => void
}

/**
 * Persisted dark/light theme toggle via `.dark` class on `<html>` using `@vueuse/core` `useDark`.
 */
export function useAdminTheme(): UseAdminThemeReturn {
  const isDark = useDark({
    selector: 'html',
    attribute: 'class',
    valueDark: 'dark',
    valueLight: '',
    storageKey: 'serag-theme',
  })

  function toggleTheme(): void {
    isDark.value = !isDark.value
  }

  return {
    isDark,
    toggleTheme,
  }
}
