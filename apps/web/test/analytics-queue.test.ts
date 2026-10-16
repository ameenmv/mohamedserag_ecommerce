import { describe, expect, it, vi } from 'vitest'
import { AnalyticsQueue, MAX_ANALYTICS_QUEUE_SIZE } from '../app/utils/analytics-queue'

describe('AnalyticsQueue', () => {
  it('starts empty and has default maxSize of 20', () => {
    const queue = new AnalyticsQueue()
    expect(queue.length).toBe(0)
    expect(queue.maxSize).toBe(MAX_ANALYTICS_QUEUE_SIZE)
    expect(queue.items).toEqual([])
  })

  it('enqueues events with and without payload data', () => {
    const queue = new AnalyticsQueue()
    const res1 = queue.enqueue('product_view', { productId: 'p1' })
    const res2 = queue.enqueue('whatsapp_click')

    expect(res1).toBe(true)
    expect(res2).toBe(true)
    expect(queue.length).toBe(2)
    expect(queue.items).toEqual([
      { event: 'product_view', data: { productId: 'p1' } },
      { event: 'whatsapp_click' },
    ])
  })

  it('caps at maximum 20 calls and refuses additional items', () => {
    const queue = new AnalyticsQueue(20)

    for (let i = 0; i < 20; i++) {
      const added = queue.enqueue('search', { query: `term_${i}` })
      expect(added).toBe(true)
    }

    expect(queue.length).toBe(20)

    // 21st call should be rejected
    const rejected = queue.enqueue('whatsapp_click', { source: 'header' })
    expect(rejected).toBe(false)
    expect(queue.length).toBe(20)
  })

  it('flushes queued events to the tracker in FIFO order and empties the queue', () => {
    const queue = new AnalyticsQueue()
    queue.enqueue('whatsapp_click', { source: 'header' })
    queue.enqueue('checkout_start', { step: 1 })

    const mockTrack = vi.fn()
    const mockTracker = { track: mockTrack }

    const flushedCount = queue.flush(mockTracker)

    expect(flushedCount).toBe(2)
    expect(queue.length).toBe(0)
    expect(mockTrack).toHaveBeenCalledTimes(2)
    expect(mockTrack).toHaveBeenNthCalledWith(1, 'whatsapp_click', { source: 'header' })
    expect(mockTrack).toHaveBeenNthCalledWith(2, 'checkout_start', { step: 1 })
  })

  it('no-ops and retains queue if tracker is not ready or has no track method', () => {
    const queue = new AnalyticsQueue()
    queue.enqueue('whatsapp_click')

    expect(queue.flush(null)).toBe(0)
    expect(queue.length).toBe(1)

    expect(queue.flush(undefined)).toBe(0)
    expect(queue.length).toBe(1)

    // @ts-expect-error testing invalid object
    expect(queue.flush({})).toBe(0)
    expect(queue.length).toBe(1)
  })

  it('continues flushing subsequent events even if one event tracker throws', () => {
    const queue = new AnalyticsQueue()
    queue.enqueue('whatsapp_click')
    queue.enqueue('order_placed', { orderNo: '101' })

    const mockTrack = vi.fn().mockImplementationOnce(() => {
      throw new Error('network down')
    })

    const flushed = queue.flush({ track: mockTrack })
    expect(flushed).toBe(2)
    expect(queue.length).toBe(0)
    expect(mockTrack).toHaveBeenCalledTimes(2)
  })

  it('clears queue when clear() is invoked', () => {
    const queue = new AnalyticsQueue()
    queue.enqueue('search', { q: 'ثلاجة' })
    expect(queue.length).toBe(1)

    queue.clear()
    expect(queue.length).toBe(0)
    expect(queue.items).toEqual([])
  })
})
