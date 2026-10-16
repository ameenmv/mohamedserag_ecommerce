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
