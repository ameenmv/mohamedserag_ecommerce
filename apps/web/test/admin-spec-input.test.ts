import { describe, expect, it } from 'vitest'
import {
  parseSpecInput,
  specBool,
  specNumber,
  specText,
} from '../app/utils/admin-spec-input'

describe('admin-spec-input', () => {
  describe('specText / specNumber / specBool', () => {
    it('normalizes text spec field values', () => {
      expect(specText('Inox')).toBe('Inox')
      expect(specText('')).toBe('')
      expect(specText(null)).toBe('')
      expect(specText(undefined)).toBe('')
      expect(specText(123)).toBe('')
      expect(specText('Silver')).toBe('Silver')
    })

    it('normalizes number spec field values', () => {
      expect(specNumber(1200)).toBe(1200)
      expect(specNumber(0)).toBe(0)
      expect(specNumber(null)).toBeUndefined()
      expect(specNumber(undefined)).toBeUndefined()
      expect(specNumber(Number.NaN)).toBeUndefined()
      expect(specNumber('not-a-number')).toBeUndefined()
      expect(specNumber(1400)).toBe(1400)
    })

    it('normalizes boolean spec field values', () => {
      expect(specBool(true)).toBe(true)
      expect(specBool(false)).toBe(false)
      expect(specBool(null)).toBe(false)
      expect(specBool(undefined)).toBe(false)
      expect(specBool(true)).toBe(true)
    })

    it('normalizes choice spec field values', () => {
      expect(specText('A+++')).toBe('A+++')
      expect(specText(null)).toBe('')
      expect(specText(undefined)).toBe('')
      expect(specText('Option 1')).toBe('Option 1')
    })
  })

  describe('parseSpecInput', () => {
    it('parses text input correctly', () => {
      expect(parseSpecInput('text', 'Stainless Steel')).toBe('Stainless Steel')
      expect(parseSpecInput('text', '  Trimmed  ')).toBe('Trimmed')
      expect(parseSpecInput('text', '')).toBeUndefined()
      expect(parseSpecInput('text', '   ')).toBeUndefined()
      expect(parseSpecInput('text', null)).toBeUndefined()
      expect(parseSpecInput('text', undefined)).toBeUndefined()
    })

    it('parses number input correctly', () => {
      expect(parseSpecInput('number', 1500)).toBe(1500)
      expect(parseSpecInput('number', '1500')).toBe(1500)
      expect(parseSpecInput('number', '0')).toBe(0)
      expect(parseSpecInput('number', 0)).toBe(0)
      expect(parseSpecInput('number', '')).toBeUndefined()
      expect(parseSpecInput('number', '   ')).toBeUndefined()
      expect(parseSpecInput('number', 'invalid')).toBeUndefined()
      expect(parseSpecInput('number', -10)).toBeUndefined()
      expect(parseSpecInput('number', '-2380')).toBeUndefined()
      expect(parseSpecInput('number', null)).toBeUndefined()
      expect(parseSpecInput('number', undefined)).toBeUndefined()
    })

    it('parses boolean input correctly', () => {
      expect(parseSpecInput('boolean', true)).toBe(true)
      expect(parseSpecInput('boolean', false)).toBe(false)
      expect(parseSpecInput('boolean', 1)).toBe(true)
      expect(parseSpecInput('boolean', 0)).toBe(false)
    })

    it('parses choice input correctly', () => {
      expect(parseSpecInput('choice', 'Option A')).toBe('Option A')
      expect(parseSpecInput('choice', '  Option B  ')).toBe('Option B')
      expect(parseSpecInput('choice', '')).toBeUndefined()
      expect(parseSpecInput('choice', null)).toBeUndefined()
    })
  })
})
