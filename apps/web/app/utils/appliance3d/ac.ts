import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createApplianceMaterials, type ApplianceFinish } from './materials'
import { easeInOutCubic, louverAngle } from './math'
import type { ApplianceInstance, ApplianceOptions } from './types'

/**
 * Procedural linear flow texture for animated cool air ribbons.
 */
function createAirFlowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  try {
    const width = 128
    const height = 256
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)')
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)')

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    const tex = new CanvasTexture(canvas)
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(1, 2)
    return tex
  } catch {
    return null
  }
}

/**
 * Builds a realistic generic wall-mounted split air conditioner indoor unit.
 * Dimensions: 1.00 W x 0.30 H x 0.22 D.
 */
export function buildAc(
  initialFinish: ApplianceFinish = 'white',
  _options: ApplianceOptions = {},
): ApplianceInstance {
  const materials = createApplianceMaterials(initialFinish)
  const group = new Group()
  group.name = 'ac-root'

  const geometriesToDispose: BufferGeometry[] = []
  function registerGeometry<T extends BufferGeometry>(geom: T): T {
    geometriesToDispose.push(geom)
    return geom
  }

  const materialsToDispose: Material[] = []
  function registerMaterial<T extends Material>(mat: T): T {
    materialsToDispose.push(mat)
    return mat
  }

  // -------------------------------------------------------------
  // 2. MAIN SPLIT INDOOR UNIT CASING (1.00 W x 0.30 H x 0.22 D)
  // -------------------------------------------------------------
  const casingGeom = registerGeometry(new RoundedBoxGeometry(1.00, 0.28, 0.20, 4, 0.018))
  const casing = new Mesh(casingGeom, materials.finishMaterial)
  casing.position.set(0, 0.20, 0)
  casing.castShadow = true
  casing.receiveShadow = true
  group.add(casing)

  // Top Air Intake Grille Slats (recessed slats along top surface)
  const slatGeom = registerGeometry(new RoundedBoxGeometry(0.88, 0.004, 0.012, 1, 0.001))
  const slatMat = registerMaterial(
    new MeshStandardMaterial({
      color: 0x485058,
      roughness: 0.7,
      metalness: 0.2,
    }),
  )
  for (let i = 0; i < 5; i++) {
    const slat = new Mesh(slatGeom, slatMat)
    slat.position.set(0, 0.342, -0.05 + i * 0.024)
    group.add(slat)
  }

  // Horizontal front panel seam line (recessed groove)
  const seamGeom = registerGeometry(new BoxGeometry(0.98, 0.002, 0.004))
  const seamMesh = new Mesh(seamGeom, materials.darkBaseMaterial)
  seamMesh.position.set(0, 0.24, 0.101)
  group.add(seamMesh)

  // Slim chrome lower trim accent strip
  const trimGeom = registerGeometry(new RoundedBoxGeometry(0.96, 0.003, 0.004, 2, 0.001))
  const trimMesh = new Mesh(trimGeom, materials.chromeMaterial)
  trimMesh.position.set(0, 0.10, 0.101)
  group.add(trimMesh)

  // Digital LED Temperature Display (front right)
  const displayBezelGeom = registerGeometry(new RoundedBoxGeometry(0.08, 0.034, 0.004, 2, 0.002))
  const displayBezel = new Mesh(displayBezelGeom, materials.darkBaseMaterial)
  displayBezel.position.set(0.28, 0.20, 0.102)
  group.add(displayBezel)

  const displayScreenGeom = registerGeometry(new BoxGeometry(0.068, 0.024, 0.002))
  const displayMat = registerMaterial(
    new MeshStandardMaterial({
      color: 0x061E1A,
      emissive: 0x2DD4BF,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
  )
  const displayScreen = new Mesh(displayScreenGeom, displayMat)
  displayScreen.position.set(0.28, 0.20, 0.104)
  group.add(displayScreen)

  // -------------------------------------------------------------
  // 3. BOTTOM AIR OUTLET & MOTORIZED LOUVER (Flap rotates ~50°)
  // -------------------------------------------------------------
  const louverPivot = new Group()
  louverPivot.name = 'ac-louver-pivot'
  louverPivot.position.set(0, 0.09, 0.05)
  group.add(louverPivot)

  const louverGeom = registerGeometry(new RoundedBoxGeometry(0.94, 0.012, 0.055, 3, 0.003))
  const louverMesh = new Mesh(louverGeom, materials.finishMaterial)
  louverMesh.position.set(0, -0.006, 0.026)
  louverMesh.castShadow = true
  louverPivot.add(louverMesh)

  // Chrome tip on louver
  const louverTipGeom = registerGeometry(new RoundedBoxGeometry(0.94, 0.003, 0.006, 2, 0.001))
  const louverTip = new Mesh(louverTipGeom, materials.chromeMaterial)
  louverTip.position.set(0, -0.012, 0.052)
  louverPivot.add(louverTip)

  // -------------------------------------------------------------
  // 4. COOL AIR STREAKS (Curved animated translucent ribbons)
  // -------------------------------------------------------------
  const airFlowTex = createAirFlowTexture()
  const airStreakMat = registerMaterial(
    new MeshBasicMaterial({
      color: 0x7DD3FC,
      map: airFlowTex,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  )

  // Cool air ribbons falling and fanning out below the louver
  const streakDefinitions: Vector3[][] = []
  for (let i = 0; i < 7; i++) {
    const x = -0.39 + i * 0.13
    const wiggle = i % 2 === 0 ? 0.025 : -0.025
    streakDefinitions.push([
      new Vector3(x, 0.06, 0.07),
      new Vector3(x * 1.04 + wiggle, -0.09, 0.13),
      new Vector3(x * 1.1 - wiggle, -0.25, 0.19),
      new Vector3(x * 1.18 + wiggle, -0.42, 0.24),
    ])
  }

  for (const pts of streakDefinitions) {
    const curve = new CatmullRomCurve3(pts)
    const tubeGeom = registerGeometry(new TubeGeometry(curve, 32, 0.01, 8, false))
    const tubeMesh = new Mesh(tubeGeom, airStreakMat)
    group.add(tubeMesh)
  }

  // -------------------------------------------------------------
  // 5. CONTROLLER & TICK
  // -------------------------------------------------------------
  const maxLouverAngle = (50 * Math.PI) / 180
  let currentOpen = 0

  function setOpen(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress))
    currentOpen = clamped

    // Motorized louver opening
    const angle = louverAngle(clamped, maxLouverAngle)
    louverPivot.rotation.x = angle

    // Air streaks opacity
    const eased = easeInOutCubic(clamped)
    airStreakMat.opacity = 0.75 * eased
  }

  function tick(dt: number): boolean {
    if (currentOpen > 0.01) {
      if (airFlowTex) {
        airFlowTex.offset.y -= dt * 0.9
      }
      return true
    }
    return false
  }

  function setFinish(finish: ApplianceFinish, immediate = false): void {
    materials.updateFinish(finish, immediate)
  }

  function dispose(): void {
    airFlowTex?.dispose()
    for (const geom of geometriesToDispose) {
      geom.dispose()
    }
    for (const mat of materialsToDispose) {
      mat.dispose()
    }
    materials.dispose()
    group.clear()
  }

  return {
    group,
    materials,
    bounds: {
      height: 0.78,
      width: 0.9,
      centerY: 0.02,
    },
    setFinish,
    setOpen,
    dispose,
    tick,
  }
}
