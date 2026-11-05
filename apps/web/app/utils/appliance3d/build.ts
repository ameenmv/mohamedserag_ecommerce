import type { ApplianceFinish } from './materials'
import type { ApplianceInstance, ApplianceKind, ApplianceOptions } from './types'
import { buildFridge } from './fridge'
import { buildWasher } from './washer'
import { buildCooker } from './cooker'
import { buildAc } from './ac'
import { buildTv } from './tv'

/**
 * Builds any of the 5 generic 3D appliances by kind.
 * Statically imported inside the lazy 3D bundle.
 */
export function buildAppliance(
  kind: ApplianceKind,
  finish: ApplianceFinish = 'steel',
  options: ApplianceOptions = {},
): ApplianceInstance {
  switch (kind) {
    case 'fridge':
      return buildFridge(finish, options)
    case 'washer':
      return buildWasher(finish, options)
    case 'cooker':
      return buildCooker(finish, options)
    case 'ac':
      return buildAc(finish, options)
    case 'tv':
      return buildTv(finish, options)
  }
}
