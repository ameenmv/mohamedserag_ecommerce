/**
 * The signed-in admin as the shell needs it (name + logout), backed by useAdminAuth.
 */
export function useAdminUser() {
  const { user, logout } = useAdminAuth()
  const { t } = useI18n()

  return {
    get name() {
      return user.value?.name ?? t('admin.topbar.adminRole')
    },
    user,
    logout,
  }
}
