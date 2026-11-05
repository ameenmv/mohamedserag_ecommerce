import type { Group } from 'three'
import type { ProductStoryAppliance } from '@serag/shared'
import type { ApplianceFinish, ApplianceMaterials } from './materials'

export type ApplianceKind = ProductStoryAppliance

export interface ApplianceBounds {
  height: number
  width: number
  centerY: number
}

export interface ApplianceOptions {
  hingeSide?: 'left' | 'right'
}

export interface ApplianceInstance {
  group: Group
  materials: ApplianceMaterials
  bounds: ApplianceBounds
  setFinish(finish: ApplianceFinish, immediate?: boolean): void
  setOpen(progress: number): void
  dispose(): void
  tick?: (dt: number) => boolean
}

export type FridgeInstance = ApplianceInstance
export type FridgeOptions = ApplianceOptions
