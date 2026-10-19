export type ConfirmTone = 'default' | 'destructive'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

export interface ConfirmDialogState {
  open: boolean
  options: ConfirmOptions | null
}

export type ConfirmResolver = (confirmed: boolean) => void

export interface ConfirmController {
  request: (options: ConfirmOptions) => Promise<boolean>
  settle: (confirmed: boolean) => void
}

/**
 * Promise-based state for a single app-wide confirm dialog.
 * `settle` is idempotent: the dialog's close event fires `settle(false)` right
 * after a button already settled, and that second call must not override it.
 */
export function createConfirmController(
  state: { value: ConfirmDialogState },
  resolver: { value: ConfirmResolver | null },
): ConfirmController {
  function settle(confirmed: boolean) {
    const resolve = resolver.value
    if (!resolve) return
    resolver.value = null
    // Keep options so the closing animation still shows the text.
    state.value = { open: false, options: state.value.options }
    resolve(confirmed)
  }

  function request(options: ConfirmOptions): Promise<boolean> {
    // A newer request supersedes a pending one, which counts as cancelled.
    settle(false)
    return new Promise<boolean>((resolve) => {
      resolver.value = resolve
      state.value = { open: true, options }
    })
  }

  return { request, settle }
}
