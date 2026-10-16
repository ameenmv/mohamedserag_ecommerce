import { toast } from 'vue-sonner'

export interface UndoToastOptions {
  onUndo: () => void | Promise<void>
  durationMs?: number
  description?: string
  actionLabel?: string
}

export type UndoToastFn = (message: string, options: UndoToastOptions) => string | number

export type UseUndoToastReturn = UndoToastFn & {
  undoToast: UndoToastFn
}

/**
 * Shows a vue-sonner toast with a localized undo action button.
 */
export function undoToast(message: string, options: UndoToastOptions): string | number {
  const { onUndo, durationMs = 6000, description, actionLabel } = options
  const label = actionLabel || useNuxtApp().$i18n.t('common.undo')

  return toast(message, {
    description,
    duration: durationMs,
    action: {
      label,
      onClick: () => {
        void onUndo()
      },
    },
  })
}

/**
 * Composable returning `undoToast(message, { onUndo, durationMs = 6000 })`.
 * Supports both `const { undoToast } = useUndoToast()` and `const undoToast = useUndoToast()`.
 */
export function useUndoToast(): UseUndoToastReturn {
  return Object.assign(undoToast, { undoToast })
}
