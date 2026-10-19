import { describe, expect, it } from 'vitest'
import { buildGoogleFeed, escapeXml, formatFeedPrice, plainText } from './feed-xml.js'

const channel = { title: 'معرض محمد سراج', link: 'https://serag.test/', description: 'وصف' }

describe('formatFeedPrice', () => {
  it('formats integer piastres as EGP with two decimals', () => {
    expect(formatFeedPrice(123400)).toBe('1234.00 EGP')
    expect(formatFeedPrice(0)).toBe('0.00 EGP')
    expect(formatFeedPrice(70)).toBe('0.70 EGP')
  })
})

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &apos;')
  })

  it('removes characters that are invalid in XML 1.0', () => {
    expect(escapeXml('a\u0000b\u0008c\u001Fd')).toBe('abcd')
    expect(escapeXml('keep\ttab\nnewline')).toBe('keep\ttab\nnewline')
  })
})

describe('plainText', () => {
  it('strips tags, decodes entities, collapses whitespace and truncates', () => {
    expect(plainText('<p>أهلاً   <b>بالعالم</b></p>', 5000)).toBe('أهلاً بالعالم')
    expect(plainText('a &amp; b &lt;c&gt;', 5000)).toBe('a & b <c>')
    expect(plainText('<p>1234567890</p>', 4)).toBe('1234')
  })
})

describe('buildGoogleFeed', () => {
  it('declares the Google namespace and includes required fields', () => {
    const xml = buildGoogleFeed(channel, [
      {
        id: 'MOD-1',
        title: 'منتج',
        description: 'وصف المنتج',
        link: 'https://serag.test/p/mod-1',
        imageLink: 'https://serag.test/uploads/mod-1.jpg',
        price: '1234.00 EGP',
        availability: 'in_stock',
        brand: 'سامسونج',
        condition: 'new',
      },
    ])

    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"')
    expect(xml).toContain('<g:id>MOD-1</g:id>')
    expect(xml).toContain('<g:price>1234.00 EGP</g:price>')
    expect(xml).toContain('<g:availability>in_stock</g:availability>')
    expect(xml).toContain('<g:condition>new</g:condition>')
    expect(xml).not.toContain('<g:sale_price>')
    expect(xml).not.toContain('<g:sale_price_effective_date>')
  })

  it('emits sale price fields only when a sale is present', () => {
    const xml = buildGoogleFeed(channel, [
      {
        id: 'MOD-2',
        title: 'منتج',
        description: 'وصف',
        link: 'https://serag.test/p/mod-2',
        imageLink: 'https://serag.test/uploads/mod-2.jpg',
        price: '1000.00 EGP',
        availability: 'in_stock',
        brand: 'سامسونج',
        condition: 'new',
        salePrice: '700.00 EGP',
        salePriceEffectiveDate: '2026-01-01T00:00:00.000Z/2026-01-02T00:00:00.000Z',
      },
    ])

    expect(xml).toContain('<g:sale_price>700.00 EGP</g:sale_price>')
    expect(xml).toContain(
      '<g:sale_price_effective_date>2026-01-01T00:00:00.000Z/2026-01-02T00:00:00.000Z</g:sale_price_effective_date>',
    )
  })

  it('escapes product names containing markup characters', () => {
    const xml = buildGoogleFeed(channel, [
      {
        id: 'MOD-3',
        title: 'A & <B>',
        description: 'وصف',
        link: 'https://serag.test/p/mod-3',
        imageLink: 'https://serag.test/uploads/mod-3.jpg',
        price: '1.00 EGP',
        availability: 'in_stock',
        brand: 'براند',
        condition: 'new',
      },
    ])

    expect(xml).toContain('<g:title>A &amp; &lt;B&gt;</g:title>')
  })
})
