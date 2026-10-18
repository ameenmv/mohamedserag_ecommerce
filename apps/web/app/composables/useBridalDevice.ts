import { onMounted, readonly, type DeepReadonly, type Ref } from 'vue'

const STORAGE_KEY = 'serag:bridal:edit'

export interface BridalDeviceComposable {
  lastToken: DeepReadonly<Ref<string | null>>
  remember: (token: string) => void
  forget: () => void
}

/**
 * Remembers the last bridal list edit token in localStorage.
 *
 * All localStorage access is wrapped in try/catch to gracefully handle
 * private browsing or disabled storage. Reading is deferred until after
 * mount so `lastToken` stays strictly null during SSR and hydration,
 * preventing hydration mismatches.
 */
export function useBridalDevice(): BridalDeviceComposable {
  const lastToken = useState<string | null>('serag:bridal:edit:token', () => null)

  if (import.meta.client) {
    onMounted(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored && typeof stored === 'string') {
          const trimmed = stored.trim()
          if (trimmed.length > 0) {
            lastToken.value = trimmed
          }
        }
      } catch {
        // Silently ignore storage errors
      }
    })
  }

  function remember(token: string): void {
    if (!token || typeof token !== 'string') return
    const trimmed = token.trim()
    if (trimmed.length === 0) return

    lastToken.value = trimmed
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, trimmed)
      } catch {
        // Silently ignore storage errors
      }
    }
  }

  function forget(): void {
    lastToken.value = null
    if (import.meta.client) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Silently ignore storage errors
      }
    }
  }

  return {
    lastToken: readonly(lastToken),
    remember,
    forget,
  }
}
