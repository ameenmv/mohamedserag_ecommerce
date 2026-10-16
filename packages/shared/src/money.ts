import { z } from 'zod'

/**
 * Converts an amount in EGP to integer piastres, rounded to the nearest piastre.
 */
export function egpToPiastres(egp: number): number {
  const rounded = Math.round(egp * 100)
  return rounded === 0 ? 0 : rounded
}

/**
 * Converts an amount in integer piastres to EGP.
 */
export function piastresToEgp(p: number): number {
  const result = p / 100
  return result === 0 ? 0 : result
}

/**
 * Formats an integer piastre amount as an EGP number string with `en-US` grouping.
 * Drops `.00` for whole EGP amounts and keeps 2 decimals otherwise (e.g. `"28,900"`, `"12.50"`).
 */
export function formatEgp(p: number): string {
  const piastres = Math.round(p)
  const egp = piastres / 100
  if (piastres % 100 === 0) {
    return (egp === 0 ? 0 : egp).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })
  }
  return egp.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formats an integer piastre amount with the Egyptian Pound unit suffix (`"28,900 ج.م"`).
 */
export function formatEgpWithUnit(p: number): string {
  return `${formatEgp(p)} ج.م`
}

/**
 * Non-negative integer piastre amount schema.
 */
export const moneySchema = z.number().int().nonnegative()
