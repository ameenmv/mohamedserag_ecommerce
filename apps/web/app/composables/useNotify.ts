export interface UndoToastOptions {
  onUndo: () => void | Promise<void>
  durationMs?: number
  description?: string
  actionLabel?: string
}

let sonnerModulePromise: Promise<typeof import('vue-sonner')> | null = null

function getSonnerModule(): Promise<typeof import('vue-sonner')> | null {
  if (import.meta.server || typeof window === 'undefined') {
    return null
  }
  if (!sonnerModulePromise) {
    sonnerModulePromise = import('vue-sonner')
  }
  return sonnerModulePromise
}

/**
 * Toast notification composable that loads `vue-sonner` dynamically on first use.
 * Prevents vue-sonner and its components from leaking into the storefront SSR/initial entry chunk.
 */
export function useNotify() {
  function success(message: string, description?: string): void {
    const mod = getSonnerModule()
    if (!mod) return
    void mod.then(({ toast }) => {
      toast.success(message, description ? { description } : undefined)
    })
  }

  function info(message: string, description?: string): void {
    const mod = getSonnerModule()
    if (!mod) return
    void mod.then(({ toast }) => {
      toast.info(message, description ? { description } : undefined)
    })
  }

  function warning(message: string, description?: string): void {
    const mod = getSonnerModule()
    if (!mod) return
    void mod.then(({ toast }) => {
      toast.warning(message, description ? { description } : undefined)
    })
  }

  function error(message: string, description?: string): void {
    const mod = getSonnerModule()
    if (!mod) return
    void mod.then(({ toast }) => {
      toast.error(message, description ? { description } : undefined)
    })
  }

  function undo(message: string, options: UndoToastOptions): void {
    const mod = getSonnerModule()
    if (!mod) return
    const { onUndo, durationMs = 6000, description, actionLabel } = options
    const label = actionLabel || useNuxtApp().$i18n.t('common.undo')

    void mod.then(({ toast }) => {
      toast(message, {
        description,
        duration: durationMs,
        action: {
          label,
          onClick: () => {
            void onUndo()
          },
        },
      })
    })
  }

  return {
    success,
    info,
    warning,
    error,
    undo,
  }
}
