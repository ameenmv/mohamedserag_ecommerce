export interface StoreNavItem {
  labelKey: string
  to: string
  highlight?: boolean
}

export interface FooterLinkItem {
  labelKey: string
  to: string
}

/**
 * Main customer navigation links for the storefront header, mobile menu, and quick-strip.
 */
export const STORE_NAV_ITEMS: readonly StoreNavItem[] = [
  { labelKey: 'store.header.home', to: '/' },
  { labelKey: 'store.header.shop', to: '/shop' },
  { labelKey: 'store.header.bridal', to: '/bridal', highlight: true },
  { labelKey: 'store.header.offers', to: '/offers' },
  { labelKey: 'store.header.guides', to: '/guides' },
] as const

/**
 * Essential informational and policy links shown in the storefront footer.
 */
export const FOOTER_LINKS: readonly FooterLinkItem[] = [
  { labelKey: 'store.footer.about', to: '/about' },
  { labelKey: 'store.footer.delivery', to: '/delivery' },
  { labelKey: 'store.footer.returns', to: '/returns' },
  { labelKey: 'store.footer.warranty', to: '/warranty' },
  { labelKey: 'store.footer.privacy', to: '/privacy' },
  { labelKey: 'store.footer.faq', to: '/faq' },
  { labelKey: 'store.footer.traders', to: '/traders' },
] as const

/**
 * Quick department links rendered under the "تسوّق" footer column.
 */
export const FOOTER_STORE_SECTIONS: readonly FooterLinkItem[] = [
  { labelKey: 'store.header.home', to: '/' },
  { labelKey: 'store.footer.allSections', to: '/shop' },
  { labelKey: 'store.header.bridal', to: '/bridal' },
  { labelKey: 'store.header.offers', to: '/offers' },
  { labelKey: 'store.header.guides', to: '/guides' },
] as const
