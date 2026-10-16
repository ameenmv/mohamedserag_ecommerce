import type { Permission } from '@serag/shared'
import type { AdminAuthPayload, AdminUser } from '~/types/admin'

/**
 * Admin authentication composable managing signed-in state, login/logout,
 * user permissions, and session verification.
 */
export function useAdminAuth() {
  const { user, permissions, csrfToken, setSession, clearSession } = useAdminSession()

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
      setSession(data)
      return data.user
    } catch {
      clearSession()
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
    setSession(data)
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
      clearSession()
    }
    const localePath = useLocalePath()
    await navigateTo(localePath('/admin/login'))
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
