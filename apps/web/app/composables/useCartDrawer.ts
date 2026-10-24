/**
 * Global reactive state for the storefront slide-over cart drawer.
 */
export function useCartDrawer() {
  const isOpen = useState<boolean>('storefront-cart-drawer-open', () => false)
  const notify = useNotify()

  // The drawer shows the cart itself, so an "added to cart" toast over its buttons is just noise.
  function open(): void {
    notify.dismissAll()
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  function toggle(): void {
    if (isOpen.value) close()
    else open()
  }

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
