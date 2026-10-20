import { describe, expect, it } from 'vitest'
import { buildRobotsTxt } from '../server/utils/robots'

const SITE = 'https://serag.eg'

describe('buildRobotsTxt', () => {
  it('disallows everything on non-indexable origins', () => {
    const txt = buildRobotsTxt({ siteUrl: SITE, indexable: false })
    expect(txt).toBe('User-agent: *\nDisallow: /\n')
  })

  it('disallows private pages, allows the bridal landing and points at the sitemap', () => {
    const txt = buildRobotsTxt({ siteUrl: `${SITE}/`, indexable: true })

    expect(txt.startsWith('User-agent: *\n')).toBe(true)
    expect(txt).not.toContain('\nDisallow: /\n')
    for (const prefix of [
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
    ]) {
      expect(txt).toContain(`Disallow: ${prefix}\n`)
    }

    expect(txt).toContain('Allow: /bridal$\n')
    expect(txt).toContain(`Sitemap: ${SITE}/sitemap.xml\n`)
  })

  it('does not disallow the /bridal landing itself', () => {
    const txt = buildRobotsTxt({ siteUrl: SITE, indexable: true })
    expect(txt).not.toContain('Disallow: /bridal\n')
  })
})
