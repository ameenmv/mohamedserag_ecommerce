/**
 * Thmanyah allows its font on this website on one condition: the font files must not be
 * downloadable directly or hotlinkable by other sites (permission from Thmanyah support, ticket
 * 359363, 2026-10-26). These files are served only to a page of this site loading its own font.
 */
export const PROTECTED_FONT_PREFIX = '/fonts/thmanyah/'

export interface FontRequestHeaders {
  secFetchDest?: string
  secFetchSite?: string
  referer?: string
  host?: string
}

/**
 * True for a page of this site loading its own font (`@font-face` or a font preload). Browsers
 * state what a request is for in the Fetch Metadata headers, so an address typed into the browser
 * (`document`), a download tool (no headers), a script, or another site's page (`cross-site`)
 * is refused. A browser too old to send them is allowed only when the request comes from a page
 * on the same host.
 */
export function isFontRequestAllowed(headers: FontRequestHeaders): boolean {
  if (headers.secFetchDest !== undefined || headers.secFetchSite !== undefined) {
    return headers.secFetchDest === 'font' && headers.secFetchSite === 'same-origin'
  }
  if (!headers.referer || !headers.host) return false
  try {
    return new URL(headers.referer).host === headers.host
  } catch {
    return false
  }
}
