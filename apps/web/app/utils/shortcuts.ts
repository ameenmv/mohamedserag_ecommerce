export const ADMIN_SHORTCUT_WINDOW_MS = 1500

export type AdminNavGroup = 'main' | 'store' | 'content' | 'system'

export interface AdminNavShortcut {
  key: string
  hint: string
  paletteHint: string
  labelKey: string
  to: string
  group: AdminNavGroup
}

export const ADMIN_NAV_SHORTCUTS: readonly AdminNavShortcut[] = [
  { key: 'h', hint: 'G H', paletteHint: 'G H', labelKey: 'admin.nav.overview', to: '/admin', group: 'main' },
  { key: 'o', hint: 'G O', paletteHint: 'G O', labelKey: 'admin.nav.orders', to: '/admin/orders', group: 'store' },
  { key: 'p', hint: 'G P', paletteHint: 'G P', labelKey: 'admin.nav.products', to: '/admin/products', group: 'store' },
  { key: 'c', hint: 'G C', paletteHint: 'G C', labelKey: 'admin.nav.catalog', to: '/admin/catalog', group: 'store' },
  { key: 'b', hint: 'G B', paletteHint: 'G B', labelKey: 'admin.nav.bridal', to: '/admin/bridal', group: 'store' },
  { key: 'm', hint: 'G M', paletteHint: 'G M', labelKey: 'admin.nav.promotions', to: '/admin/promotions', group: 'store' },
  { key: 'r', hint: 'G R', paletteHint: 'G R', labelKey: 'admin.nav.reviews', to: '/admin/reviews', group: 'store' },
  { key: 'e', hint: 'G E', paletteHint: 'G E', labelKey: 'admin.nav.content', to: '/admin/content', group: 'content' },
  { key: 't', hint: 'G T', paletteHint: 'G T', labelKey: 'admin.nav.reports', to: '/admin/reports', group: 'system' },
  { key: 's', hint: 'G S', paletteHint: 'G S', labelKey: 'admin.nav.settings', to: '/admin/settings', group: 'system' },
] as const

export const ADMIN_SHORTCUT_ROUTES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(ADMIN_NAV_SHORTCUTS.map((item) => [item.key, item.to])),
)

export interface ShortcutSequenceState {
  gPressedAt: number | null
}

export interface ShortcutKeyInput {
  key: string
  now?: number
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  isEditable?: boolean
  disabled?: boolean
}

export type ShortcutAction =
  | { type: 'none' }
  | { type: 'armed' }
  | { type: 'navigate'; to: string; key: string }
  | { type: 'open-help' }
  | { type: 'toggle-palette' }

export interface ShortcutStepResult {
  state: ShortcutSequenceState
  action: ShortcutAction
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Checks whether an event target is an editable element (`input`, `textarea`, `select`, or `contenteditable`).
 * Safe to call without a DOM environment.
 */
export function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') {
    return false
  }

  const candidate = target as {
    tagName?: unknown
    isContentEditable?: unknown
    getAttribute?: (attr: string) => string | null
  }

  if (typeof candidate.tagName === 'string' && EDITABLE_TAGS.has(candidate.tagName.toUpperCase())) {
    return true
  }

  if (candidate.isContentEditable === true) {
    return true
  }

  if (typeof candidate.getAttribute === 'function') {
    const contentEditable = candidate.getAttribute('contenteditable')
    if (contentEditable === '' || contentEditable === 'true' || contentEditable === 'plaintext-only') {
      return true
    }
  }

  return false
}

/**
 * Pure transition function for the admin «G ثم حرف» keyboard shortcut sequence.
 */
export function stepShortcutSequence(
  state: ShortcutSequenceState,
  input: ShortcutKeyInput,
  options?: {
    windowMs?: number
    routes?: Readonly<Record<string, string>>
  },
): ShortcutStepResult {
  const windowMs = options?.windowMs ?? ADMIN_SHORTCUT_WINDOW_MS
  const routes = options?.routes ?? ADMIN_SHORTCUT_ROUTES
  const now = input.now ?? Date.now()
  const rawKey = input.key ?? ''
  const lowerKey = rawKey.toLowerCase()

  // Ctrl/⌘+K toggles the command palette unless explicitly disabled
  if (!input.disabled && (input.ctrlKey || input.metaKey) && !input.altKey && lowerKey === 'k') {
    return {
      state: { gPressedAt: null },
      action: { type: 'toggle-palette' },
    }
  }

  // Ignore single-key / sequence shortcuts when disabled, inside editable fields, or with modifiers
  if (input.disabled || input.isEditable || input.ctrlKey || input.metaKey || input.altKey) {
    return {
      state: { gPressedAt: null },
      action: { type: 'none' },
    }
  }

  // Ignore modifier-only keydown events such as Shift so `?` (Shift+/) works naturally
  if (rawKey === 'Shift' || rawKey === 'Control' || rawKey === 'Alt' || rawKey === 'Meta') {
    return {
      state,
      action: { type: 'none' },
    }
  }

  if (rawKey === '?' || rawKey === '؟') {
    return {
      state: { gPressedAt: null },
      action: { type: 'open-help' },
    }
  }

  const isArmed =
    state.gPressedAt !== null && now >= state.gPressedAt && now - state.gPressedAt <= windowMs

  if (isArmed) {
    const targetRoute = routes[lowerKey]
    if (targetRoute !== undefined) {
      return {
        state: { gPressedAt: null },
        action: { type: 'navigate', to: targetRoute, key: lowerKey },
      }
    }

    if (lowerKey === 'g') {
      return {
        state: { gPressedAt: now },
        action: { type: 'armed' },
      }
    }

    return {
      state: { gPressedAt: null },
      action: { type: 'none' },
    }
  }

  if (lowerKey === 'g') {
    return {
      state: { gPressedAt: now },
      action: { type: 'armed' },
    }
  }

  return {
    state: { gPressedAt: null },
    action: { type: 'none' },
  }
}

export interface ShortcutTracker {
  handleKey: (input: ShortcutKeyInput) => ShortcutAction
  reset: () => void
  isPending: (now?: number) => boolean
  getState: () => ShortcutSequenceState
}

/**
 * Stateful wrapper around `stepShortcutSequence` for keyboard listeners and unit tests.
 */
export function createShortcutTracker(options?: {
  windowMs?: number
  routes?: Readonly<Record<string, string>>
}): ShortcutTracker {
  const windowMs = options?.windowMs ?? ADMIN_SHORTCUT_WINDOW_MS
  let state: ShortcutSequenceState = { gPressedAt: null }

  return {
    handleKey(input: ShortcutKeyInput): ShortcutAction {
      const result = stepShortcutSequence(state, input, options)
      state = result.state
      return result.action
    },
    reset(): void {
      state = { gPressedAt: null }
    },
    isPending(now = Date.now()): boolean {
      return (
        state.gPressedAt !== null && now >= state.gPressedAt && now - state.gPressedAt <= windowMs
      )
    },
    getState(): ShortcutSequenceState {
      return { ...state }
    },
  }
}
