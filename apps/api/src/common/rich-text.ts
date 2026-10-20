import sanitizeHtml from 'sanitize-html'

/** Which allowlist to apply: pages never carry images, guides may embed our own uploads. */
export type RichTextKind = 'page' | 'guide'

const BASE_TAGS = ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'a', 'blockquote']

/** Site paths (`/…` but not protocol-relative `//…`) and anchors stay internal links. */
function isSitePath(href: string): boolean {
  return (href.startsWith('/') && !href.startsWith('//')) || href.startsWith('#')
}

function optionsFor(kind: RichTextKind): sanitizeHtml.IOptions {
  return {
    allowedTags: kind === 'guide' ? [...BASE_TAGS, 'img'] : BASE_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      ...(kind === 'guide' ? { img: ['src', 'alt'] } : {}),
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: [] },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    // Drop the contents of script-like tags entirely instead of keeping their text.
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed'],
    exclusiveFilter: (frame) =>
      // Images must come from our own uploads; anything else is removed.
      frame.tag === 'img' && !(frame.attribs.src ?? '').startsWith('/uploads/'),
    transformTags: {
      b: 'strong',
      i: 'em',
      a: (tagName, attribs): sanitizeHtml.Tag => {
        const href = (attribs.href ?? '').trim()
        if (isSitePath(href)) return { tagName, attribs: { href } }
        if (/^(mailto|tel):/i.test(href)) return { tagName, attribs: { href } }
        if (/^https?:\/\//i.test(href)) {
          // Leaving the site: new tab, no opener, no referrer.
          return { tagName, attribs: { href, target: '_blank', rel: 'noopener noreferrer' } }
        }
        // Empty, javascript:, data:, protocol-relative or anything else: keep the text only.
        return { tagName, attribs: {} }
      },
      img: (tagName, attribs): sanitizeHtml.Tag => ({
        tagName,
        attribs: { src: attribs.src ?? '', alt: (attribs.alt ?? '').trim() },
      }),
    },
  }
}

/**
 * Sanitizes rich text from the admin editor before it is stored. The storefront renders the
 * result as HTML, so this allowlist is the trust boundary: no scripts, styles, classes, event
 * handlers, `javascript:`/`data:` URLs or foreign images survive.
 */
export function sanitizeRichText(html: string, kind: RichTextKind): string {
  return sanitizeHtml(html, optionsFor(kind)).trim()
}
