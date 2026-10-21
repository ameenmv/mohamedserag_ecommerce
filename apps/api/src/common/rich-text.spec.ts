import { describe, expect, it } from 'vitest'
import { sanitizeRichText } from './rich-text.js'

describe('sanitizeRichText', () => {
  it('keeps the formatting the editor produces', () => {
    const html = '<h2>عنوان</h2><p>نص <strong>تقيل</strong> و<em>مايل</em></p><ul><li>أول</li></ul><ol><li>تاني</li></ol><blockquote>اقتباس</blockquote>'
    expect(sanitizeRichText(html, 'page')).toBe(html)
  })

  it('removes scripts, styles, iframes and their contents', () => {
    const out = sanitizeRichText(
      '<p>أهلاً</p><script>alert(1)</script><style>p{}</style><iframe src="https://x.test"></iframe>',
      'page',
    )
    expect(out).toBe('<p>أهلاً</p>')
  })

  it('strips event handlers, inline styles and classes', () => {
    expect(sanitizeRichText('<p onclick="x()" style="color:red" class="big">نص</p>', 'page')).toBe('<p>نص</p>')
  })

  it('drops javascript:, data: and protocol-relative links but keeps the text', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">اضغط</a>', 'page')).toBe('<a>اضغط</a>')
    expect(sanitizeRichText('<a href="data:text/html,x">اضغط</a>', 'page')).toBe('<a>اضغط</a>')
    expect(sanitizeRichText('<a href="//evil.test">اضغط</a>', 'page')).toBe('<a>اضغط</a>')
  })

  it('opens external links in a new tab without opener and keeps site links as they are', () => {
    expect(sanitizeRichText('<a href="https://example.com" target="_self">برة</a>', 'page')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">برة</a>',
    )
    expect(sanitizeRichText('<a href="/pages/returns" target="_blank">جوة</a>', 'page')).toBe(
      '<a href="/pages/returns">جوة</a>',
    )
    expect(sanitizeRichText('<a href="tel:+201000000000">اتصل</a>', 'page')).toContain('href="tel:+201000000000"')
  })

  it('normalizes b/i to strong/em and removes headings outside h2–h4', () => {
    expect(sanitizeRichText('<h1>كبير</h1><b>ب</b><i>م</i>', 'page')).toBe('كبير<strong>ب</strong><em>م</em>')
  })

  it('never allows images on pages', () => {
    expect(sanitizeRichText('<p>صورة</p><img src="/uploads/content/a.webp" alt="x">', 'page')).toBe('<p>صورة</p>')
  })

  it('allows only our uploaded images in guides', () => {
    expect(sanitizeRichText('<img src="/uploads/content/2026-10/a.webp" alt=" تلاجة ">', 'guide')).toBe(
      '<img src="/uploads/content/2026-10/a.webp" alt="تلاجة" />',
    )
    expect(sanitizeRichText('<img src="https://evil.test/a.png" alt="x">', 'guide')).toBe('')
    expect(sanitizeRichText('<img src="data:image/png;base64,AAA" alt="x">', 'guide')).toBe('')
    expect(sanitizeRichText('<img src="/uploads/a.png" onerror="x()" alt="y">', 'guide')).toBe(
      '<img src="/uploads/a.png" alt="y" />',
    )
  })
})
