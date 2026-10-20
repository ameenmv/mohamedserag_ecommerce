import type { UndoToastOptions } from './useNotify'

export type UndoToastFn = (message: string, options: UndoToastOptions) => void

export type UseUndoToastReturn = UndoToastFn & {
  undoToast: UndoToastFn
}

/**
 * Shows a localized undo action toast using dynamic import via `useNotify`.
 */
export function undoToast(message: string, options: UndoToastOptions): void {
  const notify = useNotify()
  notify.undo(message, options)
}

/**
 * Composable returning `undoToast(message, { onUndo, durationMs = 6000 })`.
 * Supports both `const { undoToast } = useUndoToast()` and `const undoToast = useUndoToast()`.
 */
export function useUndoToast(): UseUndoToastReturn {
  return Object.assign(undoToast, { undoToast })
}
