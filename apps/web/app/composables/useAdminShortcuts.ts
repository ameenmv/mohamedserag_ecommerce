import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface UseAdminShortcutsOptions {
  commandPaletteOpen: Ref<boolean>
  shortcutsDialogOpen: Ref<boolean>
  mobileNavOpen?: Ref<boolean>
}

/**
 * Attaches the global keydown listener for admin navigation chords,
 * command palette, and shortcut dialogs using `@vueuse/core` useEventListener.
 */
export function useAdminShortcuts(options: UseAdminShortcutsOptions): void {
  const { commandPaletteOpen, shortcutsDialogOpen, mobileNavOpen } = options
  const shortcutTracker = createShortcutTracker()
  const localePath = useLocalePath()

  function handleKeydown(event: KeyboardEvent): void {
    const isDialogActive =
      commandPaletteOpen.value ||
      shortcutsDialogOpen.value ||
      Boolean(mobileNavOpen?.value)

    const action = shortcutTracker.handleKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      isEditable: isEditableTarget(event.target),
      disabled: isDialogActive && !(event.ctrlKey || event.metaKey),
    })

    if (action.type === 'toggle-palette') {
      event.preventDefault()
      commandPaletteOpen.value = !commandPaletteOpen.value
      return
    }

    if (action.type === 'open-help') {
      event.preventDefault()
      shortcutsDialogOpen.value = true
      return
    }

    if (action.type === 'navigate') {
      event.preventDefault()
      navigateTo(localePath(action.to))
    }
  }

  useEventListener('keydown', handleKeydown)
}
