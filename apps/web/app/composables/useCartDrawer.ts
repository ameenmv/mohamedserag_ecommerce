/**
 * Global reactive state for the storefront slide-over cart drawer.
 */
export function useCartDrawer() {
  const isOpen = useState<boolean>('storefront-cart-drawer-open', () => false)

  function open(): void {
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  function toggle(): void {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
