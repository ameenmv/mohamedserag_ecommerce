/**
 * Resolves the backend API base URL depending on SSR (internal Docker network / localhost:4000)
 * vs client-side browser execution.
 */
export function getApiBaseUrl(): string {
  const config = useRuntimeConfig()
  return import.meta.server ? String(config.apiInternalBase) : String(config.public.apiBase)
}

/**
 * Builds standard request headers for admin API calls:
 * - Forwards incoming session cookies during SSR.
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
  const upperMethod = method.toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(upperMethod) && csrfToken) {
    headers.set('x-csrf-token', csrfToken)
  }
  return headers
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
