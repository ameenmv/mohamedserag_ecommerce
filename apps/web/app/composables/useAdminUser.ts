/**
 * The signed-in admin as the shell needs it (name + logout), backed by useAdminAuth.
 */
export function useAdminUser() {
  const { user, logout } = useAdminAuth()
  return {
    get name() {
      return user.value?.name ?? 'المدير'
    },
    user,
    logout,
  }
}
