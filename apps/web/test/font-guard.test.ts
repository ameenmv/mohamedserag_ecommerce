import { describe, expect, it } from 'vitest'
import { isFontRequestAllowed } from '../server/utils/font-guard'

describe('isFontRequestAllowed', () => {
  it('allows a page of the site loading its own font', () => {
    expect(isFontRequestAllowed({ secFetchDest: 'font', secFetchSite: 'same-origin' })).toBe(true)
  })

  it('refuses an address typed into the browser, a script, an image and a cross-site page', () => {
    expect(isFontRequestAllowed({ secFetchDest: 'document', secFetchSite: 'none' })).toBe(false)
    expect(isFontRequestAllowed({ secFetchDest: 'empty', secFetchSite: 'same-origin' })).toBe(false)
    expect(isFontRequestAllowed({ secFetchDest: 'image', secFetchSite: 'same-origin' })).toBe(false)
    expect(isFontRequestAllowed({ secFetchDest: 'font', secFetchSite: 'cross-site' })).toBe(false)
    expect(isFontRequestAllowed({ secFetchDest: 'font', secFetchSite: 'same-site' })).toBe(false)
  })

  it('refuses a request that says nothing about where it comes from (curl, scrapers)', () => {
    expect(isFontRequestAllowed({})).toBe(false)
    expect(isFontRequestAllowed({ host: 'store.test' })).toBe(false)
  })

  it('lets an old browser without Fetch Metadata load the font from a page on this host only', () => {
    expect(isFontRequestAllowed({ referer: 'https://store.test/p/x', host: 'store.test' })).toBe(true)
    expect(isFontRequestAllowed({ referer: 'https://evil.test/', host: 'store.test' })).toBe(false)
    expect(isFontRequestAllowed({ referer: 'https://store.test.evil.test/', host: 'store.test' })).toBe(false)
    expect(isFontRequestAllowed({ referer: 'not a url', host: 'store.test' })).toBe(false)
  })
})
