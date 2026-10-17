import type { Permission } from '@serag/shared'
import type { AdminAuthPayload, AdminUser } from '~/types/admin'

/**
 * Shared reactive state for the active admin session.
 */
export function useAdminSession() {
  const user = useState<AdminUser | null>('admin:user', () => null)
  const permissions = useState<Permission[]>('admin:permissions', () => [])
  const csrfToken = useState<string | null>('admin:csrfToken', () => null)

  function clearSession(): void {
    user.value = null
    permissions.value = []
    csrfToken.value = null
  }

  function setSession(payload: AdminAuthPayload): void {
    user.value = payload.user
    permissions.value = payload.permissions
    csrfToken.value = payload.csrfToken
  }

  return {
    user,
    permissions,
    csrfToken,
    clearSession,
    setSession,
  }
}
