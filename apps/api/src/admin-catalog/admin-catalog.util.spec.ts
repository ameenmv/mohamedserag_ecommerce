import { describe, expect, it } from 'vitest'
import {
  detectImageMime,
  parseProductSetContents,
  parseProductSpecs,
  parseTemplateFields,
  resolveUploadsDir,
  slugifyModelCode,
} from './admin-catalog.util.js'

describe('admin-catalog.util', () => {
  describe('slugifyModelCode', () => {
    it('converts model codes with slashes and spaces into clean kebab case', () => {
      expect(slugifyModelCode('RT45K6000S8/MR')).toBe('rt45k6000s8-mr')
      expect(slugifyModelCode('  SR-ABC-123  ')).toBe('sr-abc-123')
      expect(slugifyModelCode('F4V5VYP0W.APBPELF')).toBe('f4v5vyp0w-apbpelf')
    })

    it('does not transliterate Arabic and falls back to "product" if no ascii letters/digits exist', () => {
      expect(slugifyModelCode('ثلاجة توشيبا')).toBe('product')
      expect(slugifyModelCode('   ')).toBe('product')
    })
  })

  describe('detectImageMime', () => {
    it('detects JPEG from magic bytes', () => {
      const jpegBuf = Buffer.alloc(20)
      jpegBuf[0] = 0xff
      jpegBuf[1] = 0xd8
      jpegBuf[2] = 0xff
      jpegBuf[3] = 0xe0

      const result = detectImageMime(jpegBuf)
      expect(result).toEqual({ mime: 'image/jpeg', ext: 'jpg' })
    })

    it('detects PNG from magic bytes', () => {
      const pngBuf = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
      ])
      const result = detectImageMime(pngBuf)
      expect(result).toEqual({ mime: 'image/png', ext: 'png' })
    })

    it('detects WebP from RIFF and WEBP signatures', () => {
      const webpBuf = Buffer.alloc(20)
      webpBuf.write('RIFF', 0, 'ascii')
      webpBuf.writeUInt32LE(12, 4)
      webpBuf.write('WEBP', 8, 'ascii')

      const result = detectImageMime(webpBuf)
      expect(result).toEqual({ mime: 'image/webp', ext: 'webp' })
    })

    it('detects AVIF from ftypavif signature', () => {
      const avifBuf = Buffer.alloc(24)
      avifBuf.writeUInt32BE(20, 0)
      avifBuf.write('ftyp', 4, 'ascii')
      avifBuf.write('avif', 8, 'ascii')

      const result = detectImageMime(avifBuf)
      expect(result).toEqual({ mime: 'image/avif', ext: 'avif' })
    })

    it('rejects text, corrupted or too short buffers', () => {
      expect(detectImageMime(Buffer.from('hello world'))).toBeNull()
      expect(detectImageMime(Buffer.from([0x01, 0x02, 0x03]))).toBeNull()
      expect(detectImageMime(Buffer.alloc(0))).toBeNull()
    })
  })

  describe('resolveUploadsDir', () => {
    it('returns a resolved directory path', () => {
      const dir = resolveUploadsDir()
      expect(typeof dir).toBe('string')
      expect(dir.length).toBeGreaterThan(0)
    })
  })

  describe('parseTemplateFields', () => {
    it('parses valid template fields JSON array', () => {
      const json = [
        { key: 'capacity_l', label: 'السعة', type: 'number', filterable: true, comparable: true },
        { key: 'cooling', label: 'التبريد', type: 'choice', options: ['نوفروست'] },
      ]
      const res = parseTemplateFields(json)
      expect(res).toHaveLength(2)
      expect(res[0].key).toBe('capacity_l')
    })

    it('falls back to empty array for corrupted or non-array JSON', () => {
      expect(parseTemplateFields(null)).toEqual([])
      expect(parseTemplateFields('not an array')).toEqual([])
      expect(parseTemplateFields([{ invalid: true }])).toEqual([])
    })
  })

  describe('parseProductSetContents', () => {
    it('parses valid set contents array', () => {
      const json = [{ item: 'حلة', size: '20 سم', qty: 1 }]
      const res = parseProductSetContents(json)
      expect(res).toEqual([{ item: 'حلة', size: '20 سم', qty: 1 }])
    })

    it('returns null on empty, null, or invalid json', () => {
      expect(parseProductSetContents(null)).toBeNull()
      expect(parseProductSetContents([])).toBeNull()
      expect(parseProductSetContents([{ qty: -1 }])).toBeNull()
    })
  })

  describe('parseProductSpecs', () => {
    it('parses valid record specs', () => {
      const json = { capacity_l: 450, cooling: 'نوفروست' }
      expect(parseProductSpecs(json)).toEqual({ capacity_l: 450, cooling: 'نوفروست' })
    })

    it('falls back to empty object on invalid input', () => {
      expect(parseProductSpecs(null)).toEqual({})
      expect(parseProductSpecs('string')).toEqual({})
    })
  })
})
