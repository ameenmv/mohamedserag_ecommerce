import { FEATURES } from './features'

export interface StoreNavItem {
  labelKey: string
  to: string
  highlight?: boolean
}

export interface FooterLinkItem {
  labelKey: string
  to: string
}

/** A footer link whose label is resolved at runtime (e.g. a CMS page title). */
export interface FooterResolvedLink {
  label: string
  to: string
}

/**
 * Main customer navigation links for the storefront header, mobile menu, and quick-strip.
 */
export const STORE_NAV_ITEMS: readonly StoreNavItem[] = [
  { labelKey: 'store.header.home', to: '/' },
  { labelKey: 'store.header.shop', to: '/shop' },
  ...(FEATURES.bridal ? [{ labelKey: 'store.header.bridal', to: '/bridal', highlight: true }] : []),
  { labelKey: 'store.header.offers', to: '/offers' },
  { labelKey: 'store.header.guides', to: '/guides' },
] as const

/**
 * Fixed fallback labels for the CMS content pages. The footer prefers the published
 * page titles from `GET /pages`; these keys are used only when that request fails.
 */
export const FOOTER_PAGE_LINKS: readonly { slug: string; labelKey: string }[] = [
  { slug: 'about', labelKey: 'store.footer.about' },
  { slug: 'delivery', labelKey: 'store.footer.delivery' },
  { slug: 'returns', labelKey: 'store.footer.returns' },
  { slug: 'warranty', labelKey: 'store.footer.warranty' },
  { slug: 'privacy', labelKey: 'store.footer.privacy' },
  { slug: 'faq', labelKey: 'store.footer.faq' },
] as const

/** The always-present traders entry point shown after the CMS pages. */
export const FOOTER_TRADERS_LINK: FooterLinkItem = {
  labelKey: 'store.footer.traders',
  to: '/traders',
}
