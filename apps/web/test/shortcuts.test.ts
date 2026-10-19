import { describe, expect, it } from 'vitest'
import {
  ADMIN_NAV_SHORTCUTS,
  ADMIN_SHORTCUT_ROUTES,
  ADMIN_SHORTCUT_WINDOW_MS,
  createShortcutTracker,
  isEditableTarget,
  stepShortcutSequence,
} from '../app/utils/shortcuts'

describe('ADMIN_NAV_SHORTCUTS', () => {
  it('maps all eleven admin routes to their expected G-chord letters', () => {
    expect(ADMIN_SHORTCUT_ROUTES).toEqual({
      h: '/admin',
      o: '/admin/orders',
      p: '/admin/products',
      c: '/admin/catalog',
      b: '/admin/bridal',
      m: '/admin/promotions',
      n: '/admin/notify',
      r: '/admin/reviews',
      e: '/admin/content',
      t: '/admin/reports',
      s: '/admin/settings',
    })
    expect(ADMIN_NAV_SHORTCUTS).toHaveLength(11)
    for (const item of ADMIN_NAV_SHORTCUTS) {
      expect(item.labelKey).toMatch(/^admin\.nav\./)
      expect(['main', 'store', 'content', 'system']).toContain(item.group)
    }
  })
})

describe('stepShortcutSequence & createShortcutTracker', () => {
  it('navigates when G is followed by a valid letter within 1.5s (case-insensitive)', () => {
    const tracker = createShortcutTracker()

    expect(tracker.handleKey({ key: 'g', now: 1000 })).toEqual({ type: 'armed' })
    expect(tracker.isPending(1500)).toBe(true)

    expect(tracker.handleKey({ key: 'O', now: 2200 })).toEqual({
      type: 'navigate',
      to: '/admin/orders',
      key: 'o',
    })
    expect(tracker.isPending(2200)).toBe(false)
  })

  it('supports every admin shortcut route within the 1500ms window', () => {
    for (const item of ADMIN_NAV_SHORTCUTS) {
      const tracker = createShortcutTracker()
      expect(tracker.handleKey({ key: 'G', now: 100 })).toEqual({ type: 'armed' })
      expect(tracker.handleKey({ key: item.key, now: 100 + ADMIN_SHORTCUT_WINDOW_MS })).toEqual({
        type: 'navigate',
        to: item.to,
        key: item.key,
      })
    }
  })

  it('expires the G chord after 1.5s and does not navigate', () => {
    const tracker = createShortcutTracker()

    expect(tracker.handleKey({ key: 'g', now: 1000 })).toEqual({ type: 'armed' })
    expect(tracker.isPending(2501)).toBe(false)

    expect(tracker.handleKey({ key: 'h', now: 2501 })).toEqual({ type: 'none' })
  })

  it('re-arms the timer if G is pressed a second time', () => {
    const tracker = createShortcutTracker()

    expect(tracker.handleKey({ key: 'g', now: 1000 })).toEqual({ type: 'armed' })
    expect(tracker.handleKey({ key: 'g', now: 2000 })).toEqual({ type: 'armed' })
    expect(tracker.handleKey({ key: 'p', now: 3400 })).toEqual({
      type: 'navigate',
      to: '/admin/products',
      key: 'p',
    })
  })

  it('cancels the pending G sequence on an unknown second key', () => {
    const tracker = createShortcutTracker()

    expect(tracker.handleKey({ key: 'g', now: 1000 })).toEqual({ type: 'armed' })
    expect(tracker.handleKey({ key: 'z', now: 1200 })).toEqual({ type: 'none' })
    expect(tracker.isPending(1250)).toBe(false)
    expect(tracker.handleKey({ key: 'o', now: 1300 })).toEqual({ type: 'none' })
  })

  it('opens the shortcuts help dialog on ? and ignores standalone Shift presses', () => {
    let state = { gPressedAt: null as number | null }

    const shiftStep = stepShortcutSequence(state, { key: 'Shift', now: 500 })
    state = shiftStep.state
    expect(shiftStep.action).toEqual({ type: 'none' })

    const helpStep = stepShortcutSequence(state, { key: '?', now: 520 })
    expect(helpStep.action).toEqual({ type: 'open-help' })
    expect(helpStep.state.gPressedAt).toBeNull()
  })

  it('toggles the command palette on Ctrl+K or Meta+K even when focused in an editable field', () => {
    const tracker = createShortcutTracker()

    expect(
      tracker.handleKey({ key: 'k', ctrlKey: true, isEditable: true, now: 100 }),
    ).toEqual({ type: 'toggle-palette' })

    expect(
      tracker.handleKey({ key: 'K', metaKey: true, isEditable: false, now: 200 }),
    ).toEqual({ type: 'toggle-palette' })
  })

  it('ignores G sequences and ? while focus is in an editable element or when disabled', () => {
    const tracker = createShortcutTracker()

    expect(tracker.handleKey({ key: 'g', isEditable: true, now: 1000 })).toEqual({ type: 'none' })
    expect(tracker.isPending(1000)).toBe(false)

    expect(tracker.handleKey({ key: '?', isEditable: true, now: 1100 })).toEqual({ type: 'none' })
    expect(tracker.handleKey({ key: 'g', disabled: true, now: 1200 })).toEqual({ type: 'none' })
  })
})

describe('isEditableTarget', () => {
  it('identifies input, textarea, select and contenteditable targets without DOM globals', () => {
    expect(isEditableTarget(null)).toBe(false)
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false)
    expect(isEditableTarget({ tagName: 'input' })).toBe(true)
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true)
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(
      isEditableTarget({
        tagName: 'DIV',
        getAttribute: (attr: string) => (attr === 'contenteditable' ? 'true' : null),
      }),
    ).toBe(true)
  })
})
