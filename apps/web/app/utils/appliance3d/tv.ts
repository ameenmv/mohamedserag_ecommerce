import {
  AdditiveBlending,
  CanvasTexture,
  SRGBColorSpace,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  type BufferGeometry,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createApplianceMaterials, type ApplianceFinish } from './materials'
import { easeInOutCubic } from './math'
import type { ApplianceInstance, ApplianceOptions } from './types'

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Procedural smart-TV home screen (no text, no brands): deep emerald aurora background with
 * bokeh, a hero banner, a row of content tiles and a status bar, finished with a soft vignette and grain.
 */
function createScreenWallpaperTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  try {
    const width = 1024
    const height = 576
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Background: midnight teal with a lit centre
    const bg = ctx.createRadialGradient(width * 0.62, height * 0.35, 40, width * 0.5, height * 0.5, width * 0.8)
    bg.addColorStop(0, '#0f4a45')
    bg.addColorStop(0.45, '#08272b')
    bg.addColorStop(1, '#030b10')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Aurora ribbons (blurred where the canvas supports filters)
    ctx.save()
    ctx.filter = 'blur(14px)'
    const ribbons: [string, number, number][] = [
      ['rgba(16,185,129,0.55)', 0.28, 46],
      ['rgba(6,182,212,0.42)', 0.4, 60],
      ['rgba(245,196,81,0.38)', 0.52, 34],
    ]
    for (const [color, base, lw] of ribbons) {
      ctx.beginPath()
      ctx.moveTo(-20, height * base)
      ctx.bezierCurveTo(width * 0.3, height * (base - 0.26), width * 0.62, height * (base + 0.3), width + 20, height * (base - 0.05))
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.stroke()
    }
    ctx.restore()

    // Bokeh
    for (let i = 0; i < 26; i++) {
      const x = ((i * 193) % 1000) + 12
      const y = ((i * 97) % 380) + 10
      const r = 6 + ((i * 7) % 22)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, i % 3 === 0 ? 'rgba(255,225,150,0.35)' : 'rgba(150,255,230,0.22)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }

    // Top status bar: pills and dots
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    for (const [x, w] of [[48, 74], [132, 54]] as const) {
      roundRectPath(ctx, x, 34, w, 22, 11)
      ctx.fill()
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(width - 60 - i * 34, 45, 8, 0, Math.PI * 2)
      ctx.fillStyle = i === 0 ? 'rgba(245,196,81,0.9)' : 'rgba(255,255,255,0.25)'
      ctx.fill()
    }

    // Hero banner
    const hero = ctx.createLinearGradient(60, 110, 600, 330)
    hero.addColorStop(0, 'rgba(14,140,110,0.85)')
    hero.addColorStop(1, 'rgba(8,50,60,0.9)')
    roundRectPath(ctx, 60, 100, 560, 240, 22)
    ctx.fillStyle = hero
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    roundRectPath(ctx, 96, 150, 260, 22, 11)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    roundRectPath(ctx, 96, 190, 190, 14, 7)
    ctx.fill()
    roundRectPath(ctx, 96, 214, 220, 14, 7)
    ctx.fill()
    ctx.fillStyle = '#f5c451'
    roundRectPath(ctx, 96, 262, 120, 40, 20)
    ctx.fill()

    // Content tiles
    const tileColors = ['#1aa37f', '#e0a63a', '#2f7ec9', '#8b5cf6', '#e0584a']
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 188
      const t = ctx.createLinearGradient(x, 380, x + 170, 520)
      t.addColorStop(0, tileColors[i] ?? '#1aa37f')
      t.addColorStop(1, 'rgba(3,12,16,0.92)')
      roundRectPath(ctx, x, 384, 170, 124, 16)
      ctx.fillStyle = t
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      roundRectPath(ctx, x + 14, 478, 90, 10, 5)
      ctx.fill()
    }

    // Vignette
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.75)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)

    // Film grain
    const img = ctx.getImageData(0, 0, width, height)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = ((i * 2654435761) >>> 24) % 9 - 4
      img.data[i] = Math.max(0, Math.min(255, (img.data[i] ?? 0) + n))
      img.data[i + 1] = Math.max(0, Math.min(255, (img.data[i + 1] ?? 0) + n))
      img.data[i + 2] = Math.max(0, Math.min(255, (img.data[i + 2] ?? 0) + n))
    }
    ctx.putImageData(img, 0, 0)

    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
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
    baseEmissive = 1.35 * eased
    screenMaterial.emissiveIntensity = baseEmissive

    // Ambient light spill glow increases with progress
    glowPlaneMat.opacity = 0.45 * eased
  }

  let baseEmissive = 0
  let breathe = 0

  function tick(dt: number): boolean {
    if (currentOpen > 0.01) {
      breathe += dt
      screenMaterial.emissiveIntensity = baseEmissive * (0.96 + 0.04 * Math.sin(breathe * 1.4))
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
