export interface RobotsOptions {
  siteUrl: string
  indexable: boolean
}

/**
 * Private / personal URL prefixes kept out of crawlers, in both locales where they exist publicly.
 * `/bridal/` blocks token lists (`/bridal/<token>`) but not the `/bridal` landing page, which
 * `Allow: /bridal$` explicitly re-opens.
 */
const DISALLOW_PREFIXES: readonly string[] = [
  '/admin',
  '/en/admin',
  '/cart',
  '/en/cart',
  '/checkout',
  '/en/checkout',
  '/order/',
  '/en/order/',
  '/compare',
  '/en/compare',
  '/wishlist',
  '/en/wishlist',
  '/bridal/',
  '/confirm',
  '/help-me-choose/',
  '/api/',
]

export function buildRobotsTxt(options: RobotsOptions): string {
  const site = options.siteUrl.replace(/\/$/, '')

  if (!options.indexable) {
    return 'User-agent: *\nDisallow: /\n'
  }

  const lines: string[] = ['User-agent: *']
  for (const prefix of DISALLOW_PREFIXES) {
    lines.push(`Disallow: ${prefix}`)
  }
  lines.push('Allow: /bridal$', '', `Sitemap: ${site}/sitemap.xml`)
  return `${lines.join('\n')}\n`
}
