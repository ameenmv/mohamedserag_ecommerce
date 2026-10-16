import type { Permission } from '@serag/shared'

export interface AdminUser {
  id: string
  name: string
  email: string
}

export interface AdminAuthPayload {
  user: AdminUser
  permissions: Permission[]
  csrfToken: string
}

type FetchOptions = Parameters<typeof $fetch>[1]

function getAdminStates() {
  const user = useState<AdminUser | null>('admin:user', () => null)
  const permissions = useState<Permission[]>('admin:permissions', () => [])
  const csrfToken = useState<string | null>('admin:csrfToken', () => null)
  return { user, permissions, csrfToken }
}

function getApiBaseUrl(): string {
  const config = useRuntimeConfig()
  return import.meta.server ? String(config.apiInternalBase) : String(config.public.apiBase)
}

function buildRequestHeaders(
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

function isUnauthorizedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const candidate = err as {
    statusCode?: number
    status?: number
    response?: { status?: number }
  }
  return (
    candidate.statusCode === 401 ||
    candidate.status === 401 ||
    candidate.response?.status === 401
  )
}

export async function adminFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { user, permissions, csrfToken } = getAdminStates()
  const baseURL = getApiBaseUrl()
  const method = String(options?.method ?? 'GET')
  const headers = buildRequestHeaders(
    options?.headers as HeadersInit | undefined,
    method,
    csrfToken.value,
  )

  try {
    return await ($fetch as <R>(url: string, opts?: FetchOptions) => Promise<R>)<T>(path, {
      ...options,
      baseURL,
      credentials: 'include',
      headers,
    })
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      user.value = null
      permissions.value = []
      csrfToken.value = null
      const route = useRoute()
      const currentPath = route?.fullPath || '/admin'
      if (!currentPath.startsWith('/admin/login')) {
        await navigateTo(`/admin/login?next=${encodeURIComponent(currentPath)}`)
      }
    }
    throw err
  }
}

export function useAdminAuth() {
  const { user, permissions, csrfToken } = getAdminStates()

  async function fetchMe(): Promise<AdminUser | null> {
    const baseURL = getApiBaseUrl()
    const headers = buildRequestHeaders(undefined, 'GET', csrfToken.value)
    try {
      const data = await $fetch<AdminAuthPayload>('/admin/auth/me', {
        baseURL,
        method: 'GET',
        credentials: 'include',
        headers,
      })
      user.value = data.user
      permissions.value = data.permissions
      csrfToken.value = data.csrfToken
      return data.user
    } catch {
      user.value = null
      permissions.value = []
      csrfToken.value = null
      return null
    }
  }

  async function login(email: string, password: string): Promise<AdminAuthPayload> {
    const baseURL = getApiBaseUrl()
    const data = await $fetch<AdminAuthPayload>('/admin/auth/login', {
      baseURL,
      method: 'POST',
      credentials: 'include',
      body: { email, password },
    })
    user.value = data.user
    permissions.value = data.permissions
    csrfToken.value = data.csrfToken
    return data
  }

  async function logout(): Promise<void> {
    const baseURL = getApiBaseUrl()
    const headers = buildRequestHeaders(undefined, 'POST', csrfToken.value)
    try {
      await $fetch('/admin/auth/logout', {
        baseURL,
        method: 'POST',
        credentials: 'include',
        headers,
      })
    } catch {
      // Clear client state even if session is already expired on the server
    } finally {
      user.value = null
      permissions.value = []
      csrfToken.value = null
    }
    await navigateTo('/admin/login')
  }

  function can(permission: Permission): boolean {
    return permissions.value.includes(permission)
  }

  return {
    user,
    permissions,
    csrfToken,
    fetchMe,
    login,
    logout,
    can,
    adminFetch,
  }
}
