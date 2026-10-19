import { describe, expect, it } from 'vitest'
import {
  createConfirmController,
  type ConfirmDialogState,
  type ConfirmOptions,
  type ConfirmResolver,
} from '../app/utils/confirm-dialog'

function setup() {
  const state: { value: ConfirmDialogState } = { value: { open: false, options: null } }
  const resolver: { value: ConfirmResolver | null } = { value: null }
  return { state, resolver, controller: createConfirmController(state, resolver) }
}

const leave: ConfirmOptions = { title: 'Unsaved changes', description: 'Leave?', tone: 'destructive' }

describe('createConfirmController', () => {
  it('opens with the options and resolves true on confirm', async () => {
    const { state, controller } = setup()
    const answer = controller.request(leave)
    expect(state.value).toEqual({ open: true, options: leave })
    controller.settle(true)
    await expect(answer).resolves.toBe(true)
    expect(state.value.open).toBe(false)
  })

  it('resolves false on cancel', async () => {
    const { controller } = setup()
    const answer = controller.request(leave)
    controller.settle(false)
    await expect(answer).resolves.toBe(false)
  })

  it('ignores a second settle after the first one (close event after a button click)', async () => {
    const { state, resolver, controller } = setup()
    const answer = controller.request(leave)
    controller.settle(true)
    controller.settle(false)
    await expect(answer).resolves.toBe(true)
    expect(state.value.open).toBe(false)
    expect(resolver.value).toBeNull()
  })

  it('does nothing when settled with no pending request', () => {
    const { state, controller } = setup()
    controller.settle(true)
    expect(state.value).toEqual({ open: false, options: null })
  })

  it('cancels a pending request when a newer one arrives', async () => {
    const { state, controller } = setup()
    const first = controller.request(leave)
    const next: ConfirmOptions = { title: 'Delete?' }
    const second = controller.request(next)
    await expect(first).resolves.toBe(false)
    expect(state.value).toEqual({ open: true, options: next })
    controller.settle(true)
    await expect(second).resolves.toBe(true)
  })

  it('keeps the options after closing so the exit animation still has text', () => {
    const { state, controller } = setup()
    void controller.request(leave)
    controller.settle(false)
    expect(state.value).toEqual({ open: false, options: leave })
  })
})
