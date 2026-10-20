export interface VisitorIpInput {
  forwardedFor: string | undefined
  remoteAddress: string | undefined
}

const IPV4_WITH_PORT = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/
const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
const IPV6_HEXTET = /^[0-9a-f]{1,4}$/
const IPV6_DOTTED_TAIL = /^(\d{1,3}(?:\.\d{1,3}){3})$/

const PRIVATE_IPV4 = /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/
const PRIVATE_IPV6 = /^(?:::1$|f[cd])/

function isIpv4(value: string): boolean {
  return IPV4.test(value)
}

function isIpv6(value: string): boolean {
  if (!value.includes(':')) return false
  if (value.includes(':::')) return false
  const doubleColons = value.split('::')
  if (doubleColons.length > 2) return false

  const groups = value.split(':')
  let hextetCount = 0
  let zoneSeen = false

  for (const group of groups) {
    if (group === '') continue
    const withoutZone = group.split('%')[0] ?? ''
    if (withoutZone.length === 0) return false
    if (group.includes('%')) {
      if (zoneSeen) return false
      zoneSeen = true
    }
    if (IPV6_DOTTED_TAIL.test(withoutZone)) {
      hextetCount += 2
      continue
    }
    if (!IPV6_HEXTET.test(withoutZone)) return false
    hextetCount += 1
  }

  if (doubleColons.length === 2) {
    return hextetCount < 8
  }
  return hextetCount === 8
}

function isIp(value: string): boolean {
  return isIpv4(value) || isIpv6(value)
}

function isPrivateIp(value: string): boolean {
  if (isIpv4(value)) return PRIVATE_IPV4.test(value)
  return PRIVATE_IPV6.test(value)
}

/**
 * Normalizes a single address token: trims it, strips a bracketed IPv6 port
 * (`[::1]:443`), an IPv4 port (`1.2.3.4:5678`), and an IPv4-mapped IPv6 prefix
 * (`::ffff:10.0.0.5` and `::ffff:a00:5`). Returns `undefined` for anything that
 * is not a syntactically valid IPv4 or IPv6 address.
 */
function normalizeAddress(raw: string | undefined): string | undefined {
  if (typeof raw !== 'string') return undefined
  let value = raw.trim().toLowerCase()
  if (value.length === 0) return undefined

  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(value)
  if (bracketed && bracketed[1]) {
    value = bracketed[1]
  } else {
    const ipv4Port = IPV4_WITH_PORT.exec(value)
    if (ipv4Port && ipv4Port[1]) {
      value = ipv4Port[1]
    }
  }

  if (value.startsWith('::ffff:')) {
    const tail = value.slice('::ffff:'.length)
    if (isIpv4(tail)) {
      value = tail
    } else {
      const parts = tail.split(':')
      if (parts.length === 2 && parts.every((p) => IPV6_HEXTET.test(p))) {
        const [high, low] = parts as [string, string]
        const highNum = Number.parseInt(high, 16)
        const lowNum = Number.parseInt(low, 16)
        value = [
          (highNum >> 8) & 0xff,
          highNum & 0xff,
          (lowNum >> 8) & 0xff,
          lowNum & 0xff,
        ].join('.')
      } else {
        return undefined
      }
    }
  }

  if (!isIp(value)) return undefined
  return value
}

function toForwardedList(forwardedFor: string | undefined): string[] {
  if (typeof forwardedFor !== 'string') return []
  return forwardedFor
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

/**
 * Derives the real visitor IP used to key per-visitor API rate limits.
 *
 * The API is only ever reached from the web server, so the web server must forward
 * the visitor address. Caddy is the single trusted proxy in front of the app: it
 * appends the client address to `X-Forwarded-For`, while any client-supplied
 * entries remain to its left and can be spoofed.
 *
 * Resolution rules:
 * - Private/loopback socket (a request that arrived through Caddy): use the last
 *   forwarded entry, since the trusted proxy appends the real client last. If that
 *   entry is missing or invalid, fall back to the socket address.
 * - Public socket (direct API access in local tooling / tests): trust the socket,
 *   ignoring `X-Forwarded-For`.
 * - Unparseable socket: return `undefined` so the throttle bucket fails closed.
 */
export function visitorIp(input: VisitorIpInput): string | undefined {
  const socket = normalizeAddress(input.remoteAddress)
  const forwarded = toForwardedList(input.forwardedFor)

  if (socket && !isPrivateIp(socket)) {
    return socket
  }

  for (let index = forwarded.length - 1; index >= 0; index -= 1) {
    const candidate = normalizeAddress(forwarded[index])
    if (candidate) return candidate
  }

  return socket
}
