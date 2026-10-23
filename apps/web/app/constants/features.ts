/**
 * Storefront features switched off for now. Their pages, API and admin screens stay in the
 * code; flipping a flag back to `true` restores every link and route to them.
 */
export const FEATURES = {
  /** «جهّز بيتك» bridal builder: header/footer/bottom-nav links, home teaser, product button, /bridal routes. */
  bridal: false,
} as const
