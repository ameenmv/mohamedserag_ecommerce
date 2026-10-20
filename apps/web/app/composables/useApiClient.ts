type FetchOptions = Parameters<typeof $fetch>[1]

/**
 * Authenticated HTTP client for admin API calls.
 * Automatically injects CSRF tokens, forwards SSR session cookies and the visitor IP,
 * and redirects to `/admin/login?next=...` on 401 Unauthorized responses.
 */
export async function adminFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { csrfToken, clearSession } = useAdminSession()
  const method = String(options?.method ?? 'GET')
  const headers = buildRequestHeaders(
    options?.headers as HeadersInit | undefined,
    method,
    csrfToken.value,
  )

  try {
    return await apiFetch<T>(path, {
      ...options,
      credentials: 'include',
      headers,
    })
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      clearSession()
      const nuxtApp = useNuxtApp()
      const loginPath = nuxtApp.$localePath('/admin/login')
      const route = useRoute()
      if (!stripLocalePrefix(route.path).startsWith('/admin/login')) {
        await navigateTo(`${loginPath}?next=${encodeURIComponent(route.fullPath)}`)
      }
    }
    throw err
  }
}

/**
 * Composable returning the admin API fetch client.
 */
export function useApiClient() {
  return {
    adminFetch,
  }
}
