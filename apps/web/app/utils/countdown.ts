export interface CountdownSplit {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
  isEnded: boolean
}

/**
 * Calculates remaining days, hours, minutes, seconds from a duration in milliseconds.
 * Never returns negative values.
 */
export function splitRemainingMs(ms: number): CountdownSplit {
  if (!Number.isFinite(ms) || ms <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isEnded: true,
    }
  }

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const remainingAfterDays = totalSeconds % 86400
  const hours = Math.floor(remainingAfterDays / 3600)
  const remainingAfterHours = remainingAfterDays % 3600
  const minutes = Math.floor(remainingAfterHours / 60)
  const seconds = remainingAfterHours % 60

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: ms,
    isEnded: false,
  }
}

/**
 * Calculates countdown split between now and target date.
 */
export function getCountdownSplit(
  endsAt: Date | string | number,
  now: Date | string | number = Date.now(),
): CountdownSplit {
  const endMs = typeof endsAt === 'number' ? endsAt : new Date(endsAt).getTime()
  const nowMs = typeof now === 'number' ? now : new Date(now).getTime()

  if (Number.isNaN(endMs) || Number.isNaN(nowMs)) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isEnded: true,
    }
  }

  return splitRemainingMs(endMs - nowMs)
}

/**
 * Formats the clock part with Latin numerals: HH:MM:SS under a day, HH:MM once
 * days are shown (the caller renders the day count through i18n).
 */
export function formatCountdownClock(split: CountdownSplit): string {
  if (split.isEnded) {
    return ''
  }

  const hh = String(split.hours).padStart(2, '0')
  const mm = String(split.minutes).padStart(2, '0')
  if (split.days >= 1) {
    return `${hh}:${mm}`
  }

  const ss = String(split.seconds).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
