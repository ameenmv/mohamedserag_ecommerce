import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  RepeatWrapping,
  type BufferGeometry,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createApplianceMaterials, type ApplianceFinish } from './materials'
import { easeInOutCubic } from './math'
import type { ApplianceInstance, ApplianceOptions } from './types'

/**
 * Procedural abstract 4K-style wallpaper texture generated on an offscreen canvas:
 * rich dark teal-to-emerald-and-gold abstract gradient wave pattern with soft vignette.
 */
function createScreenWallpaperTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  try {
    const width = 512
    const height = 288
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Base background gradient: deep obsidian teal to midnight navy
    const bgGrad = ctx.createLinearGradient(0, 0, width, height)
    bgGrad.addColorStop(0, '#041618')
    bgGrad.addColorStop(0.5, '#072528')
    bgGrad.addColorStop(1, '#05111A')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Flowing emerald and cyan energy ribbons
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(0, height * (0.3 + i * 0.15))
      ctx.bezierCurveTo(
        width * 0.35,
        height * (0.1 + i * 0.2),
        width * 0.65,
        height * (0.8 - i * 0.15),
        width,
        height * (0.4 + i * 0.1),
      )
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 182, 212, 0.4)'
      ctx.lineWidth = 18 + i * 6
      ctx.stroke()
    }

    // Warm golden highlight accent wave
    ctx.beginPath()
    ctx.moveTo(0, height * 0.6)
    ctx.bezierCurveTo(
      width * 0.4,
      height * 0.85,
      width * 0.6,
      height * 0.2,
      width,
      height * 0.55,
    )
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)'
    ctx.lineWidth = 14
    ctx.stroke()

    // Fine gold shimmer core
    ctx.beginPath()
    ctx.moveTo(0, height * 0.6)
    ctx.bezierCurveTo(
      width * 0.4,
      height * 0.85,
      width * 0.6,
      height * 0.2,
      width,
      height * 0.55,
    )
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.75)'
    ctx.lineWidth = 3
    ctx.stroke()

    // Outer soft vignette darkening the edges
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.25,
      width / 2,
      height / 2,
      width * 0.6,
    )
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.65)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)

    const tex = new CanvasTexture(canvas)
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(1.5, 1)
    return tex
  } catch {
    return null
  }
}

/**
 * Procedural radial ambient glow texture for the TV back-light spill.
 */
function createTvGlowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  try {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const center = size / 2
    const grad = ctx.createRadialGradient(center, center, 10, center, center, size / 2)
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.6)')
    grad.addColorStop(0.35, 'rgba(6, 182, 212, 0.35)')
    grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.15)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    return new CanvasTexture(canvas)
  } catch {
    return null
  }
}

/**
 * Builds a realistic generic 55" television.
 * Screen dimensions: 1.23 W x 0.72 H.
 */
export function buildTv(
  initialFinish: ApplianceFinish = 'black',
  _options: ApplianceOptions = {},
): ApplianceInstance {
  const materials = createApplianceMaterials(initialFinish)
  const group = new Group()
  group.name = 'tv-root'

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
  // 1. STAND (Slim central chrome pedestal + vertical neck)
  // -------------------------------------------------------------
  const pedestalGeom = registerGeometry(new RoundedBoxGeometry(0.46, 0.012, 0.22, 2, 0.004))
  const pedestal = new Mesh(pedestalGeom, materials.chromeMaterial)
  pedestal.position.set(0, 0.006, 0)
  pedestal.castShadow = true
  pedestal.receiveShadow = true
  group.add(pedestal)

  const neckGeom = registerGeometry(new RoundedBoxGeometry(0.12, 0.08, 0.03, 2, 0.004))
  const neck = new Mesh(neckGeom, materials.chromeMaterial)
  neck.position.set(0, 0.045, -0.01)
  neck.castShadow = true
  group.add(neck)

  // -------------------------------------------------------------
  // 2. BEZEL & REAR CHASSIS (Screen center y = 0.445)
  // -------------------------------------------------------------
  const screenCenterY = 0.445

  // Ultra-thin bezel around screen
  const bezelGeom = registerGeometry(new RoundedBoxGeometry(1.24, 0.73, 0.022, 3, 0.005))
  const bezel = new Mesh(bezelGeom, materials.finishMaterial)
  bezel.position.set(0, screenCenterY, 0)
  bezel.castShadow = true
  bezel.receiveShadow = true
  group.add(bezel)

  // Rear electronics housing bump
  const rearHousingGeom = registerGeometry(new RoundedBoxGeometry(0.76, 0.40, 0.032, 2, 0.008))
  const rearHousing = new Mesh(rearHousingGeom, materials.darkBaseMaterial)
  rearHousing.position.set(0, screenCenterY - 0.08, -0.024)
  rearHousing.castShadow = true
  group.add(rearHousing)

  // Small power status LED indicator (center bottom of bezel)
  const powerLedGeom = registerGeometry(new CylinderGeometry(0.002, 0.002, 0.002, 12))
  const powerLedMat = registerMaterial(
    new MeshBasicMaterial({
      color: 0x34D399,
    }),
  )
  const powerLed = new Mesh(powerLedGeom, powerLedMat)
  powerLed.rotation.x = Math.PI / 2
  powerLed.position.set(0, screenCenterY - 0.36, 0.012)
  group.add(powerLed)

  // -------------------------------------------------------------
  // 3. SCREEN DISPLAY (Glossy black glass + procedural emissive map)
  // -------------------------------------------------------------
  const screenWallpaperTex = createScreenWallpaperTexture()
  const screenGeom = registerGeometry(new PlaneGeometry(1.22, 0.71))
  const screenMaterial = registerMaterial(
    new MeshPhysicalMaterial({
      color: new Color(0x060608),
      metalness: 0.1,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      emissive: new Color(0xFFFFFF),
      emissiveMap: screenWallpaperTex,
      emissiveIntensity: 0.0,
    }),
  )
  const screenMesh = new Mesh(screenGeom, screenMaterial)
  screenMesh.position.set(0, screenCenterY, 0.012)
  group.add(screenMesh)

  // -------------------------------------------------------------
  // 4. AMBIENT LIGHT SPILL GLOW PLANE (Behind TV)
  // -------------------------------------------------------------
  const glowTex = createTvGlowTexture()
  const glowPlaneGeom = registerGeometry(new PlaneGeometry(1.55, 0.96))
  const glowPlaneMat = registerMaterial(
    new MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  )
  const glowPlane = new Mesh(glowPlaneGeom, glowPlaneMat)
  glowPlane.position.set(0, screenCenterY, -0.045)
  group.add(glowPlane)

  // -------------------------------------------------------------
  // 5. CONTROLLER & TICK
  // -------------------------------------------------------------
  let currentOpen = 0

  function setOpen(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress))
    currentOpen = clamped

    const eased = easeInOutCubic(clamped)

    // Cross-fade emissive screen from pure black to vibrant image
    screenMaterial.emissiveIntensity = 1.35 * eased

    // Ambient light spill glow increases with progress
    glowPlaneMat.opacity = 0.45 * eased
  }

  function tick(dt: number): boolean {
    if (currentOpen > 0.01) {
      if (screenWallpaperTex) {
        screenWallpaperTex.offset.x += dt * 0.018
      }
      return true
    }
    return false
  }

  function setFinish(finish: ApplianceFinish, immediate = false): void {
    materials.updateFinish(finish, immediate)
  }

  function dispose(): void {
    screenWallpaperTex?.dispose()
    glowTex?.dispose()
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
      height: 0.85,
      width: 1.25,
      centerY: 0.42,
    },
    setFinish,
    setOpen,
    dispose,
    tick,
  }
}
