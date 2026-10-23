import { whenToasterReady } from '../utils/toaster'

export interface UndoToastOptions {
  onUndo: () => void | Promise<void>
  durationMs?: number
  description?: string
  actionLabel?: string
}

export interface ActionToastOptions {
  actionLabel: string
  onAction: () => void | Promise<void>
  durationMs?: number
  description?: string
}

export interface ToastAction {
  label: string
  onClick: (event?: MouseEvent) => void | Promise<void>
}

export interface ToastOptions {
  description?: string
  action?: ToastAction
  durationMs?: number
}

let sonnerModulePromise: Promise<typeof import('vue-sonner')> | null = null

function getSonnerModule(): Promise<typeof import('vue-sonner')> | null {
  if (import.meta.server || typeof window === 'undefined') {
    return null
  }
  if (!sonnerModulePromise) {
    // Toasts published before the toaster subscribes would be lost: wait for it to mount
    sonnerModulePromise = Promise.all([import('vue-sonner'), whenToasterReady()]).then(([mod]) => mod)
  }
  return sonnerModulePromise
}

/**
 * Toast notification composable that loads `vue-sonner` dynamically on first use.
 * Prevents vue-sonner and its components from leaking into the storefront SSR/initial entry chunk.
 */
export function useNotify() {
  function success(message: string, descriptionOrOptions?: string | ToastOptions): void {
    const mod = getSonnerModule()
    if (!mod) return
    const options: ToastOptions =
      typeof descriptionOrOptions === 'string'
        ? { description: descriptionOrOptions }
        : descriptionOrOptions ?? {}

    void mod.then(({ toast }) => {
      toast.success(message, {
        description: options.description,
        duration: options.durationMs,
        action: options.action
          ? {
              label: options.action.label,
              onClick: (e) => {
                void options.action?.onClick(e)
              },
            }
          : undefined,
      })
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

  function action(message: string, options: ActionToastOptions): void {
    success(message, {
      description: options.description,
      durationMs: options.durationMs,
      action: {
        label: options.actionLabel,
        onClick: options.onAction,
      },
    })
  }

  return {
    success,
    info,
    warning,
    error,
    undo,
    action,
  }
}

