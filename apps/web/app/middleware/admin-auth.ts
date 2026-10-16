export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchMe } = useAdminAuth()
  if (!user.value) {
    await fetchMe()
  }
  if (!user.value) {
    return navigateTo(`/admin/login?next=${encodeURIComponent(to.fullPath)}`)
  }
})
