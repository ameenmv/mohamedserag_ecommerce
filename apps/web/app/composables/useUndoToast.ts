import { toast } from 'vue-sonner'

export interface UndoToastOptions {
  onUndo: () => void | Promise<void>
  durationMs?: number
  description?: string
}

export type UndoToastFn = (message: string, options: UndoToastOptions) => string | number

export type UseUndoToastReturn = UndoToastFn & {
  undoToast: UndoToastFn
}

/**
 * Shows a vue-sonner toast with a «تراجع» action button.
 */
export function undoToast(message: string, options: UndoToastOptions): string | number {
  const { onUndo, durationMs = 6000, description } = options

  return toast(message, {
    description,
    duration: durationMs,
    action: {
      label: 'تراجع',
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
