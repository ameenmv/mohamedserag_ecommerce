export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchMe } = useAdminAuth()
  const localePath = useLocalePath()
  if (!user.value) {
    await fetchMe()
  }
  if (!user.value) {
    const loginPath = localePath('/admin/login')
    return navigateTo(`${loginPath}?next=${encodeURIComponent(to.fullPath)}`)
  }
})
