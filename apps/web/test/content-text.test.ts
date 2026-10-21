import { describe, expect, it } from 'vitest'
import { plainTextExcerpt } from '../app/utils/content-text'

describe('plainTextExcerpt', () => {
  it('strips tags and collapses whitespace', () => {
    const html = '<h2>سياسة الاسترجاع</h2>\n<p>للاسترجاع   خلال <strong>14 يوم</strong>.</p>'
    expect(plainTextExcerpt(html, 200)).toBe('سياسة الاسترجاع للاسترجاع خلال 14 يوم .')
  })

  it('decodes the supported HTML entities', () => {
    expect(plainTextExcerpt('<p>A&amp;B &lt;x&gt; &quot;y&quot; &#39;z&#39;&nbsp;!</p>', 200)).toBe(
      'A&B <x> "y" \'z\' !',
    )
  })

  it('clamps long text to the requested length', () => {
    expect(plainTextExcerpt('<p>abcdefghij</p>', 4)).toBe('abcd')
  })

  it('returns an empty string for empty input', () => {
    expect(plainTextExcerpt('', 160)).toBe('')
    expect(plainTextExcerpt('<p></p>', 160)).toBe('')
  })
})
