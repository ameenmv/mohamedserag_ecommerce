import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  SRGBColorSpace,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  RepeatWrapping,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createApplianceMaterials, type ApplianceFinish } from './materials'
import { doorAngle, easeInOutCubic } from './math'
import type { ApplianceInstance, ApplianceOptions } from './types'

/**
 * What the visitor sees through the open door: a perforated steel drum wall fading into a dark centre.
 */
function createDrumOpeningTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  try {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const c = size / 2
    const wall = ctx.createRadialGradient(c, c, size * 0.05, c, c, c)
    wall.addColorStop(0, '#020202')
    wall.addColorStop(0.45, '#15171a')
    wall.addColorStop(0.8, '#6d737b')
    wall.addColorStop(1, '#2a2d31')
    ctx.fillStyle = wall
    ctx.fillRect(0, 0, size, size)
    // Perforation holes on concentric rings, denser towards the rim
    for (let ring = 0; ring < 9; ring++) {
      const r = size * (0.16 + ring * 0.036)
      const count = 14 + ring * 7
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (ring % 2) * 0.2
        ctx.beginPath()
        ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 3 + ring * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.fill()
      }
    }
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    return tex
  } catch {
    return null
  }
}

/**
 * Procedural perforated metal hole texture for the washing machine drum.
 */
function createDrumPerforationTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  try {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = '#202020'
    const step = 32
    for (let y = 8; y < size; y += step) {
      for (let x = 8; x < size; x += step) {
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(x + step / 2, y + step / 2, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tex = new CanvasTexture(canvas)
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(6, 4)
    return tex
  } catch {
    return null
  }
}

/**
 * Builds a realistic generic front-loader washing machine.
 * Dimensions: 0.60 W x 0.85 H x 0.60 D.
 */
export function buildWasher(
  initialFinish: ApplianceFinish = 'steel',
  options: ApplianceOptions = {},
): ApplianceInstance {
  const hingeSide = options.hingeSide ?? 'right'
  const isRightHinge = hingeSide === 'right'

  const materials = createApplianceMaterials(initialFinish)
  const group = new Group()
  group.name = 'washer-root'

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
  // 1. PLINTH & LEVELING FEET (y in [0, 0.05])
  // -------------------------------------------------------------
  const plinthGeom = registerGeometry(new RoundedBoxGeometry(0.58, 0.04, 0.58, 2, 0.006))
  const plinth = new Mesh(plinthGeom, materials.darkBaseMaterial)
  plinth.position.set(0, 0.02, 0)
  plinth.castShadow = true
  plinth.receiveShadow = true
  group.add(plinth)

  const footDiscGeom = registerGeometry(new CylinderGeometry(0.022, 0.022, 0.012, 16))
  const footStemGeom = registerGeometry(new CylinderGeometry(0.01, 0.01, 0.015, 16))
  const footPositions = [
    { x: -0.24, z: 0.24 },
    { x: 0.24, z: 0.24 },
    { x: -0.24, z: -0.24 },
    { x: 0.24, z: -0.24 },
  ]
  for (const pos of footPositions) {
    const disc = new Mesh(footDiscGeom, materials.darkBaseMaterial)
    disc.position.set(pos.x, 0.006, pos.z)
    disc.castShadow = true
    group.add(disc)

    const stem = new Mesh(footStemGeom, materials.chromeMaterial)
    stem.position.set(pos.x, 0.014, pos.z)
    group.add(stem)
  }

  // -------------------------------------------------------------
  // 2. MAIN CABINET BODY (0.60 W x 0.85 H x 0.60 D)
  // -------------------------------------------------------------
  const bodyGeom = registerGeometry(new RoundedBoxGeometry(0.60, 0.77, 0.58, 3, 0.014))
  const bodyMesh = new Mesh(bodyGeom, materials.finishMaterial)
  bodyMesh.position.set(0, 0.425, -0.01)
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  group.add(bodyMesh)

  // Top worktop slab
  const worktopGeom = registerGeometry(new RoundedBoxGeometry(0.60, 0.035, 0.60, 3, 0.008))
  const worktop = new Mesh(worktopGeom, materials.finishMaterial)
  worktop.position.set(0, 0.832, 0)
  worktop.castShadow = true
  group.add(worktop)

  // Back panel
  const backPanelGeom = registerGeometry(new BoxGeometry(0.56, 0.76, 0.015))
  const backPanel = new Mesh(backPanelGeom, materials.darkBaseMaterial)
  backPanel.position.set(0, 0.42, -0.30)
  group.add(backPanel)

  // -------------------------------------------------------------
  // 3. FRONT CONTROL PANEL (Top front y ~ 0.74)
  // -------------------------------------------------------------
  // Detergent drawer on inline-start side
  const drawerX = isRightHinge ? -0.17 : 0.17
  const drawerFaceGeom = registerGeometry(new RoundedBoxGeometry(0.15, 0.08, 0.008, 2, 0.003))
  const drawerFace = new Mesh(drawerFaceGeom, materials.finishMaterial)
  drawerFace.position.set(drawerX, 0.74, 0.284)
  group.add(drawerFace)

  const drawerHandleGeom = registerGeometry(new RoundedBoxGeometry(0.08, 0.008, 0.006, 2, 0.002))
  const drawerHandle = new Mesh(drawerHandleGeom, materials.chromeMaterial)
  drawerHandle.position.set(drawerX, 0.71, 0.288)
  group.add(drawerHandle)

  // Rotary program selector dial (center)
  const dialBaseGeom = registerGeometry(new CylinderGeometry(0.032, 0.034, 0.016, 24))
  const dialMesh = new Mesh(dialBaseGeom, materials.chromeMaterial)
  dialMesh.rotation.x = Math.PI / 2
  dialMesh.position.set(0, 0.74, 0.288)
  dialMesh.castShadow = true
  group.add(dialMesh)

  const dialPipGeom = registerGeometry(new BoxGeometry(0.004, 0.018, 0.004))
  const dialPip = new Mesh(dialPipGeom, materials.darkBaseMaterial)
  dialPip.position.set(0, 0.75, 0.298)
  group.add(dialPip)

  // Digital LED Display (inline-end side)
  const displayX = isRightHinge ? 0.16 : -0.16
  const displayBezelGeom = registerGeometry(new RoundedBoxGeometry(0.12, 0.05, 0.006, 2, 0.002))
  const displayBezel = new Mesh(displayBezelGeom, materials.darkBaseMaterial)
  displayBezel.position.set(displayX, 0.745, 0.284)
  group.add(displayBezel)

  const displayScreenGeom = registerGeometry(new BoxGeometry(0.10, 0.036, 0.002))
  const displayMaterial = registerMaterial(
    new MeshStandardMaterial({
      color: 0x0A201A,
      emissive: 0x2DD4BF,
      emissiveIntensity: 1.1,
      roughness: 0.15,
    }),
  )
  const displayScreen = new Mesh(displayScreenGeom, displayMaterial)
  displayScreen.position.set(displayX, 0.745, 0.288)
  group.add(displayScreen)

  // 4 Round Function Buttons below display
  const buttonGeom = registerGeometry(new CylinderGeometry(0.007, 0.007, 0.006, 16))
  const buttonSpacing = 0.024
  for (let i = 0; i < 4; i++) {
    const btn = new Mesh(buttonGeom, materials.chromeMaterial)
    btn.rotation.x = Math.PI / 2
    btn.position.set(displayX - 0.036 + i * buttonSpacing, 0.702, 0.286)
    group.add(btn)
  }

  // -------------------------------------------------------------
  // 4. DRUM HOUSING, GASKET & ROTATING DRUM (Center y = 0.40)
  // -------------------------------------------------------------
  const drumCenterY = 0.40
  const drumCenterZ = 0.10

  // Rubber bellows ring (seals drum cavity to cabinet)
  const bellowsGeom = registerGeometry(new TorusGeometry(0.205, 0.022, 16, 32))
  const bellowsMesh = new Mesh(bellowsGeom, materials.gasketMaterial)
  bellowsMesh.position.set(0, drumCenterY, 0.286)
  group.add(bellowsMesh)

  // Opening the door reveals the drum wall (the cabinet front is otherwise a solid panel)
  const openingTex = createDrumOpeningTexture()
  const openingGeom = registerGeometry(new CircleGeometry(0.196, 64))
  const openingMat = registerMaterial(
    new MeshStandardMaterial({
      map: openingTex,
      emissiveMap: openingTex,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      metalness: 0.5,
      roughness: 0.55,
    }),
  )
  const opening = new Mesh(openingGeom, openingMat)
  opening.position.set(0, drumCenterY, 0.2935)
  group.add(opening)

  // Outer porthole bezel trim
  const portholeTrimGeom = registerGeometry(new TorusGeometry(0.232, 0.012, 16, 36))
  const portholeTrim = new Mesh(portholeTrimGeom, materials.chromeMaterial)
  portholeTrim.position.set(0, drumCenterY, 0.281)
  group.add(portholeTrim)

  // Interior LED wash light
  const drumInteriorLight = new PointLight(0xFFF3DD, 0, 1.8, 1.4)
  drumInteriorLight.position.set(0, drumCenterY + 0.14, drumCenterZ + 0.06)
  group.add(drumInteriorLight)

  // Spinning drum group
  const drumGroup = new Group()
  drumGroup.name = 'washer-drum'
  drumGroup.position.set(0, drumCenterY, drumCenterZ)
  group.add(drumGroup)

  const drumPerforationTex = createDrumPerforationTexture()
  const drumMaterial = registerMaterial(
    new MeshStandardMaterial({
      color: 0x8C929A,
      metalness: 0.92,
      roughness: 0.28,
      bumpMap: drumPerforationTex,
      bumpScale: 0.0015,
    }),
  )

  const drumCylinderGeom = registerGeometry(new CylinderGeometry(0.185, 0.185, 0.30, 32, 1, true))
  const drumCylinder = new Mesh(drumCylinderGeom, drumMaterial)
  drumCylinder.rotation.x = Math.PI / 2
  drumGroup.add(drumCylinder)

  const drumBackGeom = registerGeometry(new CylinderGeometry(0.184, 0.184, 0.008, 32))
  const drumBack = new Mesh(drumBackGeom, drumMaterial)
  drumBack.rotation.x = Math.PI / 2
  drumBack.position.z = -0.148
  drumGroup.add(drumBack)

  // 3 Internal Lifters / Paddles (makes drum rotation clearly visible)
  const paddleGeom = registerGeometry(new RoundedBoxGeometry(0.024, 0.03, 0.26, 2, 0.004))
  const paddleMaterial = registerMaterial(
    new MeshStandardMaterial({
      color: 0x586068,
      metalness: 0.3,
      roughness: 0.4,
    }),
  )
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3
    const paddle = new Mesh(paddleGeom, paddleMaterial)
    paddle.position.set(Math.cos(angle) * 0.165, Math.sin(angle) * 0.165, 0)
    paddle.rotation.z = angle + Math.PI / 2
    drumGroup.add(paddle)
  }

  // -------------------------------------------------------------
  // 5. PORTHOLE DOOR (Vertical swing hinge, ~110°)
  // -------------------------------------------------------------
  const hingeX = isRightHinge ? 0.245 : -0.245
  const hingeZ = 0.288
  const doorPivot = new Group()
  doorPivot.name = 'washer-door-pivot'
  doorPivot.position.set(hingeX, drumCenterY, hingeZ)
  group.add(doorPivot)

  const doorLocalOffset = isRightHinge ? -0.245 : 0.245

  // Outer chrome ring
  const doorChromeRingGeom = registerGeometry(new TorusGeometry(0.215, 0.016, 16, 36))
  const doorChromeRing = new Mesh(doorChromeRingGeom, materials.chromeMaterial)
  doorChromeRing.position.set(doorLocalOffset, 0, 0.005)
  doorChromeRing.castShadow = true
  doorPivot.add(doorChromeRing)

  // Black glass border ring
  const darkGlassRingGeom = registerGeometry(new CylinderGeometry(0.20, 0.20, 0.01, 32))
  const darkGlassMaterial = registerMaterial(
    new MeshPhysicalMaterial({
      color: 0x141416,
      roughness: 0.1,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    }),
  )
  const darkGlassRing = new Mesh(darkGlassRingGeom, darkGlassMaterial)
  darkGlassRing.rotation.x = Math.PI / 2
  darkGlassRing.position.set(doorLocalOffset, 0, 0.002)
  doorPivot.add(darkGlassRing)

  // Convex curved glass dome (curved bowl shape)
  const glassDomeGeom = registerGeometry(
    new SphereGeometry(0.165, 24, 16, 0, Math.PI * 2, 0, Math.PI / 3.4),
  )
  const glassDomeMaterial = registerMaterial(
    new MeshPhysicalMaterial({
      color: 0xEEF6F8,
      transmission: 0.86,
      roughness: 0.12,
      ior: 1.5,
      transparent: true,
      thickness: 0.012,
    }),
  )
  const glassDome = new Mesh(glassDomeGeom, glassDomeMaterial)
  glassDome.rotation.x = -Math.PI / 2
  glassDome.position.set(doorLocalOffset, 0, -0.01)
  doorPivot.add(glassDome)

  // Door handle notch (on opposite side of hinge)
  const handleX = isRightHinge ? doorLocalOffset - 0.19 : doorLocalOffset + 0.19
  const doorHandleGeom = registerGeometry(new RoundedBoxGeometry(0.02, 0.07, 0.018, 2, 0.004))
  const doorHandle = new Mesh(doorHandleGeom, materials.chromeMaterial)
  doorHandle.position.set(handleX, 0, 0.015)
  doorHandle.castShadow = true
  doorPivot.add(doorHandle)

  // -------------------------------------------------------------
  // 6. CONTROLLER & TICK
  // -------------------------------------------------------------
  const maxSwingAngle = (110 * Math.PI) / 180
  const hingeSign = isRightHinge ? 1 : -1
  let currentOpen = 0

  function setOpen(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress))
    currentOpen = clamped

    const angle = doorAngle(clamped, maxSwingAngle)
    doorPivot.rotation.y = hingeSign * angle

    const lightProgress = easeInOutCubic(clamped)
    drumInteriorLight.intensity = 1.9 * lightProgress
    openingMat.emissiveIntensity = 0.55 * lightProgress
  }

  function tick(dt: number): boolean {
    if (currentOpen > 0.05) {
      // Drum spins smoothly while door is opened
      drumGroup.rotation.z += dt * 1.6
      return true
    }
    return false
  }

  function setFinish(finish: ApplianceFinish, immediate = false): void {
    materials.updateFinish(finish, immediate)
  }

  function dispose(): void {
    openingTex?.dispose()
    drumPerforationTex?.dispose()
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
      width: 0.95,
      centerY: 0.425,
    },
    setFinish,
    setOpen,
    dispose,
    tick,
  }
}
