import { describe, expect, it } from 'vitest'
import {
  decodeHtmlEntities,
  isAllowedFacebookImage,
  isAllowedFacebookPage,
  normalizeFacebookVideoUrl,
  readOpenGraph,
} from './facebook-reel.js'

describe('isAllowedFacebookPage', () => {
  it('accepts https Facebook hosts and nothing else', () => {
    expect(isAllowedFacebookPage('https://www.facebook.com/share/r/abc/')).toBe(true)
    expect(isAllowedFacebookPage('https://m.facebook.com/reel/1/')).toBe(true)
    expect(isAllowedFacebookPage('http://www.facebook.com/reel/1/')).toBe(false)
    expect(isAllowedFacebookPage('https://facebook.com.evil.test/reel/1/')).toBe(false)
    expect(isAllowedFacebookPage('https://evil.test/?u=https://www.facebook.com/')).toBe(false)
    expect(isAllowedFacebookPage('http://169.254.169.254/latest')).toBe(false)
    expect(isAllowedFacebookPage('not a url')).toBe(false)
  })
})

describe('isAllowedFacebookImage', () => {
  it('accepts the Facebook CDN over https only', () => {
    expect(isAllowedFacebookImage('https://scontent-hbe1-2.xx.fbcdn.net/v/t15/a.jpg')).toBe(true)
    expect(isAllowedFacebookImage('https://fbcdn.net/a.jpg')).toBe(true)
    expect(isAllowedFacebookImage('http://scontent.xx.fbcdn.net/a.jpg')).toBe(false)
    expect(isAllowedFacebookImage('https://fbcdn.net.evil.test/a.jpg')).toBe(false)
    expect(isAllowedFacebookImage('https://evil.test/fbcdn.net/a.jpg')).toBe(false)
  })
})

describe('readOpenGraph', () => {
  const html = `<head><meta content="https://x.test/a?b=1&amp;c=2" property="og:image" />
    <meta property="og:title" content="&#x637;&#x642;&#x645; &amp; more" /></head>`
  it('reads either attribute order and decodes entities', () => {
    expect(readOpenGraph(html, 'image')).toBe('https://x.test/a?b=1&c=2')
    expect(readOpenGraph(html, 'title')).toBe('طقم & more')
    expect(readOpenGraph(html, 'url')).toBeNull()
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes named, decimal and hex entities and leaves unknown ones', () => {
    expect(decodeHtmlEntities('&lt;a&gt; &#65;&#x42; &nope;')).toBe('<a> AB &nope;')
  })
})

describe('normalizeFacebookVideoUrl', () => {
  it('reduces reels and page videos to the plain address', () => {
    expect(normalizeFacebookVideoUrl('https://www.facebook.com/reel/123/?rdid=x&share_url=y')).toBe(
      'https://www.facebook.com/reel/123/',
    )
    expect(
      normalizeFacebookVideoUrl('https://www.facebook.com/raoufyoousef/videos/%D8%B7%D9%82%D9%85/456/?x=1'),
    ).toBe('https://www.facebook.com/raoufyoousef/videos/456/')
    expect(normalizeFacebookVideoUrl('https://www.facebook.com/Elkawagastore/videos/789/')).toBe(
      'https://www.facebook.com/Elkawagastore/videos/789/',
    )
  })

  it('rejects short share links, other pages and other hosts', () => {
    expect(normalizeFacebookVideoUrl('https://www.facebook.com/share/r/abc/')).toBeNull()
    expect(normalizeFacebookVideoUrl('https://www.facebook.com/somepage/')).toBeNull()
    expect(normalizeFacebookVideoUrl('https://evil.test/reel/123/')).toBeNull()
    expect(normalizeFacebookVideoUrl('nope')).toBeNull()
  })
})
