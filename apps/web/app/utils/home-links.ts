/**
 * Determines whether a content link is external (opens in a new tab).
 * Internal site paths start with `/` and use locale-aware routing;
 * only `https://` URLs are treated as external.
 */
export function isExternalHref(href: string): boolean {
  return href.startsWith('https://')
}

/**
 * Whether the href should be routed through the locale-aware NuxtLink.
 */
export function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//')
}
