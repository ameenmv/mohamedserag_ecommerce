import { visitorIp } from '../../server/utils/visitor-ip'

/**
 * Resolves the backend API base URL depending on SSR (internal Docker network / localhost:4000)
 * vs client-side browser execution.
 */
export function getApiBaseUrl(): string {
  const config = useRuntimeConfig()
  return import.meta.server ? String(config.apiInternalBase) : String(config.public.apiBase)
}

/**
 * Builds the `X-Forwarded-For` header that lets the API rate-limit each visitor separately.
 *
 * During SSR every call reaches the API from the web server's own address, so without this
 * header all visitors would share one throttle budget. We forward the visitor address derived
 * from the incoming request (see `visitorIp`) so the API can key its limits per visitor.
 * Returns `{}` on the client, where the browser talks to Caddy directly and Caddy appends
 * the client address itself.
 */
export function ssrForwardingHeaders(): Record<string, string> {
  if (!import.meta.server) return {}
  // tryUseNuxtApp: a call made after an `await` can lose the Nuxt context; skip the header then
  // rather than throwing (the request still works, it just shares the web server's budget).
  const event = tryUseNuxtApp()?.ssrContext?.event
  const forwardedForRaw = event?.node.req.headers['x-forwarded-for']
  const forwardedFor = Array.isArray(forwardedForRaw)
    ? forwardedForRaw.join(', ')
    : forwardedForRaw
  const ip = visitorIp({
    forwardedFor,
    remoteAddress: event?.node.req.socket.remoteAddress,
  })
  return ip ? { 'x-forwarded-for': ip } : {}
}

/**
 * Adds the SSR visitor-IP forwarding header to an outgoing request, unless the caller
 * already set (or deliberately suppressed) one.
 */
function mergeForwardingHeaders(headers: Headers): Headers {
  if (!headers.has('x-forwarded-for')) {
    for (const [key, value] of Object.entries(ssrForwardingHeaders())) {
      headers.set(key, value)
    }
  }
  return headers
}

/**
 * Builds standard request headers for admin API calls:
 * - Forwards incoming session cookies during SSR.
 * - Forwards the visitor IP so SSR calls are rate-limited per visitor.
 * - Attaches the x-csrf-token header for mutation methods (POST, PUT, PATCH, DELETE).
 */
export function buildRequestHeaders(
  initialHeaders: HeadersInit | undefined,
  method: string,
  csrfToken: string | null,
): Headers {
  const headers = new Headers(initialHeaders)
  if (import.meta.server) {
    const incoming = useRequestHeaders(['cookie'])
    if (incoming.cookie && !headers.has('cookie')) {
      headers.set('cookie', incoming.cookie)
    }
  }
  mergeForwardingHeaders(headers)
  const upperMethod = method.toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(upperMethod) && csrfToken) {
    headers.set('x-csrf-token', csrfToken)
  }
  return headers
}

type ApiFetchOptions = NonNullable<Parameters<typeof $fetch>[1]>

/**
 * Typed `$fetch` against the backend API that always targets the resolved base URL and
 * forwards the SSR visitor IP for per-visitor rate limiting.
 * All backend API calls should go through this helper rather than calling `$fetch` directly.
 */
export function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const headers = mergeForwardingHeaders(new Headers(options.headers))
  return ($fetch as <R>(url: string, opts?: ApiFetchOptions) => Promise<R>)<T>(path, {
    ...options,
    baseURL: options.baseURL ?? getApiBaseUrl(),
    headers,
  })
}

/**
 * Extracts an HTTP status code from an unknown error payload (FetchError, response object, or custom error).
 */
export function getErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const candidate = err as {
    statusCode?: number
    status?: number
    response?: { status?: number }
  }
  return candidate.statusCode ?? candidate.status ?? candidate.response?.status
}

/**
 * Detects whether an error represents an unauthorized 401 response from the API.
 */
export function isUnauthorizedError(err: unknown): boolean {
  return getErrorStatus(err) === 401
}
