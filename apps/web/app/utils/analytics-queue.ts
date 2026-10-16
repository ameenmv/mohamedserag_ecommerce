import type { FunnelEvent, FunnelEventData } from '@serag/shared'

export interface QueuedEvent {
  event: FunnelEvent
  data?: FunnelEventData
}

export interface TrackerTarget {
  track: (event: FunnelEvent | string, data?: FunnelEventData) => unknown
}

export const MAX_ANALYTICS_QUEUE_SIZE = 20

/**
 * Pure, testable in-memory FIFO queue for analytics events tracked before the tracker script is loaded.
 * Caps at MAX_ANALYTICS_QUEUE_SIZE (20) events and flushes them in order once the tracker is ready.
 */
export class AnalyticsQueue {
  private queue: QueuedEvent[] = []
  readonly maxSize: number

  constructor(maxSize = MAX_ANALYTICS_QUEUE_SIZE) {
    this.maxSize = maxSize
  }

  /**
   * Enqueues an event if queue has not reached maxSize.
   * Returns true if enqueued, false if the queue is full.
   */
  enqueue(event: FunnelEvent, data?: FunnelEventData): boolean {
    if (this.queue.length >= this.maxSize) {
      return false
    }
    this.queue.push(data !== undefined ? { event, data } : { event })
    return true
  }

  /**
   * Flushes all queued events to the tracker and clears the queue.
   * Silently catches individual track errors.
   * Returns the count of events flushed.
   */
  flush(tracker?: TrackerTarget | null): number {
    if (!tracker || typeof tracker.track !== 'function') {
      return 0
    }
    const itemsToFlush = [...this.queue]
    this.queue = []

    for (const item of itemsToFlush) {
      try {
        tracker.track(item.event, item.data)
      } catch {
        // Silently ignore errors during flush to ensure all items attempt delivery
      }
    }

    return itemsToFlush.length
  }

  get items(): readonly QueuedEvent[] {
    return [...this.queue]
  }

  get length(): number {
    return this.queue.length
  }

  clear(): void {
    this.queue = []
  }
}

export const globalAnalyticsQueue = new AnalyticsQueue(MAX_ANALYTICS_QUEUE_SIZE)
