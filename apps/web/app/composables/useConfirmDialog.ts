import type { ConfirmDialogState, ConfirmOptions, ConfirmResolver } from '~/utils/confirm-dialog'

/** App-wide confirm dialog rendered once by `<AdminConfirmDialog>` in the admin layout. */
export function useConfirmDialog() {
  const state = useState<ConfirmDialogState>('confirm-dialog', () => ({ open: false, options: null }))
  const resolver = useState<ConfirmResolver | null>('confirm-dialog-resolver', () => null)
  const controller = createConfirmController(state, resolver)

  function confirm(options: ConfirmOptions): Promise<boolean> {
    if (import.meta.server) return Promise.resolve(false)
    return controller.request(options)
  }

  return { state, confirm, settle: controller.settle }
}
