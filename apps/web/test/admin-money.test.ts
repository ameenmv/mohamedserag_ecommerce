import { describe, expect, it } from 'vitest'
import {
  calculateDiscountPercent,
  egpInputToPiastres,
  piastresToEgpInput,
} from '../app/utils/admin-money'

describe('admin money form conversion', () => {
  describe('egpInputToPiastres', () => {
    it('converts integer EGP string to piastres', () => {
      expect(egpInputToPiastres('150')).toBe(15000)
      expect(egpInputToPiastres('0')).toBe(0)
    })

    it('converts decimal EGP string to piastres rounding properly', () => {
      expect(egpInputToPiastres('150.5')).toBe(15050)
      expect(egpInputToPiastres('150.99')).toBe(15099)
      expect(egpInputToPiastres('0.50')).toBe(50)
    })

    it('converts number inputs', () => {
      expect(egpInputToPiastres(250)).toBe(25000)
      expect(egpInputToPiastres(12.75)).toBe(1275)
    })

    it('returns null on empty, undefined, null or invalid input', () => {
      expect(egpInputToPiastres('')).toBeNull()
      expect(egpInputToPiastres('   ')).toBeNull()
      expect(egpInputToPiastres(null)).toBeNull()
      expect(egpInputToPiastres(undefined)).toBeNull()
      expect(egpInputToPiastres('abc')).toBeNull()
      expect(egpInputToPiastres('-15')).toBeNull()
    })
  })

  describe('piastresToEgpInput', () => {
    it('converts integer piastres to clean EGP string', () => {
      expect(piastresToEgpInput(15000)).toBe('150')
      expect(piastresToEgpInput(15050)).toBe('150.5')
      expect(piastresToEgpInput(15099)).toBe('150.99')
      expect(piastresToEgpInput(0)).toBe('0')
    })

    it('returns empty string on null or undefined', () => {
      expect(piastresToEgpInput(null)).toBe('')
      expect(piastresToEgpInput(undefined)).toBe('')
    })
  })

  describe('calculateDiscountPercent', () => {
    it('calculates rounded discount percentage when oldPrice > price', () => {
      expect(calculateDiscountPercent(8000, 10000)).toBe(20)
      expect(calculateDiscountPercent(7500, 10000)).toBe(25)
      expect(calculateDiscountPercent(6666, 10000)).toBe(33)
    })

    it('returns null when oldPrice <= price or missing', () => {
      expect(calculateDiscountPercent(10000, 10000)).toBeNull()
      expect(calculateDiscountPercent(12000, 10000)).toBeNull()
      expect(calculateDiscountPercent(10000, null)).toBeNull()
      expect(calculateDiscountPercent(null, 10000)).toBeNull()
    })
  })
})
