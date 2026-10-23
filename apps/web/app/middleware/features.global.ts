import { FEATURES } from '~/constants/features'
import { stripLocalePrefix } from '~/utils/i18n'

/** Routes of a switched-off feature answer 404 (storefront) or go back to the overview (admin). */
export default defineNuxtRouteMiddleware((to) => {
  if (FEATURES.bridal) return
  const path = stripLocalePrefix(to.path)
  if (path === '/admin/bridal') {
    return navigateTo(useLocalePath()('/admin'))
  }
  if (path === '/bridal' || path.startsWith('/bridal/')) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
