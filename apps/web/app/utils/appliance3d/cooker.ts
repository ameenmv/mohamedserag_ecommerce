import {
  AdditiveBlending,
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  type BufferGeometry,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createApplianceMaterials, type ApplianceFinish } from './materials'
import { doorAngle, easeInOutCubic, flickerFlame } from './math'
import type { ApplianceInstance, ApplianceOptions } from './types'

/**
 * Builds a realistic generic freestanding 5-burner gas cooker with oven.
 * Dimensions: 0.76 W x 0.90 H x 0.60 D.
 */
export function buildCooker(
  initialFinish: ApplianceFinish = 'steel',
  _options: ApplianceOptions = {},
): ApplianceInstance {
  const materials = createApplianceMaterials(initialFinish)
  const group = new Group()
  group.name = 'cooker-root'

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
  const plinthGeom = registerGeometry(new RoundedBoxGeometry(0.74, 0.04, 0.58, 2, 0.006))
  const plinth = new Mesh(plinthGeom, materials.darkBaseMaterial)
  plinth.position.set(0, 0.02, 0)
  plinth.castShadow = true
  plinth.receiveShadow = true
  group.add(plinth)

  const footDiscGeom = registerGeometry(new CylinderGeometry(0.022, 0.022, 0.012, 16))
  const footStemGeom = registerGeometry(new CylinderGeometry(0.01, 0.01, 0.015, 16))
  const footPositions = [
    { x: -0.32, z: 0.24 },
    { x: 0.32, z: 0.24 },
    { x: -0.32, z: -0.24 },
    { x: 0.32, z: -0.24 },
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
  // 2. MAIN CABINET BODY (0.76 W x 0.83 H x 0.58 D)
  // -------------------------------------------------------------
  const bodyGeom = registerGeometry(new RoundedBoxGeometry(0.76, 0.83, 0.58, 3, 0.012))
  const bodyMesh = new Mesh(bodyGeom, materials.finishMaterial)
  bodyMesh.position.set(0, 0.455, -0.01)
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  group.add(bodyMesh)

  // Lower storage drawer front at bottom
  const drawerGeom = registerGeometry(new RoundedBoxGeometry(0.72, 0.11, 0.008, 2, 0.003))
  const drawerMesh = new Mesh(drawerGeom, materials.finishMaterial)
  drawerMesh.position.set(0, 0.11, 0.284)
  group.add(drawerMesh)

  const drawerSeamGeom = registerGeometry(new BoxGeometry(0.70, 0.003, 0.004))
  const drawerSeam = new Mesh(drawerSeamGeom, materials.darkBaseMaterial)
  drawerSeam.position.set(0, 0.17, 0.286)
  group.add(drawerSeam)

  // -------------------------------------------------------------
  // 3. COOKTOP SLAB, BACKSPLASH & BURNERS (y in [0.87, 0.95])
  // -------------------------------------------------------------
  const cooktopGeom = registerGeometry(new RoundedBoxGeometry(0.76, 0.035, 0.60, 3, 0.008))
  const cooktopSurface = new Mesh(cooktopGeom, materials.finishMaterial)
  cooktopSurface.position.set(0, 0.88, 0)
  cooktopSurface.castShadow = true
  cooktopSurface.receiveShadow = true
  group.add(cooktopSurface)

  // Rear backsplash strip
  const backsplashGeom = registerGeometry(new RoundedBoxGeometry(0.76, 0.065, 0.024, 2, 0.004))
  const backsplash = new Mesh(backsplashGeom, materials.finishMaterial)
  backsplash.position.set(0, 0.93, -0.288)
  backsplash.castShadow = true
  group.add(backsplash)

  // LED digital timer on backsplash
  const ledDisplayGeom = registerGeometry(new RoundedBoxGeometry(0.09, 0.026, 0.004, 2, 0.002))
  const ledDisplayMat = registerMaterial(
    new MeshStandardMaterial({
      color: 0x1A1408,
      emissive: 0xF59E0B,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    }),
  )
  const ledDisplay = new Mesh(ledDisplayGeom, ledDisplayMat)
  ledDisplay.position.set(0, 0.935, -0.274)
  group.add(ledDisplay)

  // Burner Grates & Gas Flames
  const burnerCapMat = registerMaterial(
    new MeshStandardMaterial({
      color: 0x1F2428,
      metalness: 0.85,
      roughness: 0.35,
    }),
  )

  const grateMat = registerMaterial(
    new MeshStandardMaterial({
      color: 0x16181A,
      roughness: 0.85,
      metalness: 0.1,
    }),
  )

  const flameMat = registerMaterial(
    new MeshBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  )

  const burnerConfigs = [
    { x: 0, z: 0, r: 0.055, isCentral: true }, // Center dual-ring burner
    { x: -0.24, z: 0.14, r: 0.038, isCentral: false }, // Front-left
    { x: 0.24, z: 0.14, r: 0.038, isCentral: false }, // Front-right
    { x: -0.24, z: -0.14, r: 0.038, isCentral: false }, // Rear-left
    { x: 0.24, z: -0.14, r: 0.038, isCentral: false }, // Rear-right
  ]

  const flameMeshes: Mesh[] = []

  for (const cfg of burnerConfigs) {
    // Base ring
    const baseGeom = registerGeometry(new CylinderGeometry(cfg.r, cfg.r, 0.008, 24))
    const baseMesh = new Mesh(baseGeom, materials.chromeMaterial)
    baseMesh.position.set(cfg.x, 0.898, cfg.z)
    group.add(baseMesh)

    // Burner Cap
    const capGeom = registerGeometry(new CylinderGeometry(cfg.r * 0.92, cfg.r * 0.92, 0.006, 24))
    const capMesh = new Mesh(capGeom, burnerCapMat)
    capMesh.position.set(cfg.x, 0.905, cfg.z)
    group.add(capMesh)

    if (cfg.isCentral) {
      // Inner ring for central dual-ring burner
      const innerCapGeom = registerGeometry(new CylinderGeometry(cfg.r * 0.45, cfg.r * 0.45, 0.008, 20))
      const innerCap = new Mesh(innerCapGeom, burnerCapMat)
      innerCap.position.set(cfg.x, 0.907, cfg.z)
      group.add(innerCap)
    }

    // Cast-iron Grates (crossing bars)
    const grateSpan = cfg.r * 2.7
    const barXGeom = registerGeometry(new RoundedBoxGeometry(grateSpan, 0.012, 0.008, 2, 0.002))
    const barX = new Mesh(barXGeom, grateMat)
    barX.position.set(cfg.x, 0.912, cfg.z)
    barX.castShadow = true
    group.add(barX)

    const barZGeom = registerGeometry(new RoundedBoxGeometry(0.008, 0.012, grateSpan, 2, 0.002))
    const barZ = new Mesh(barZGeom, grateMat)
    barZ.position.set(cfg.x, 0.912, cfg.z)
    barZ.castShadow = true
    group.add(barZ)

    // Gas Flame Mesh (conical ring with additive blending)
    const flameGeom = registerGeometry(
      new CylinderGeometry(cfg.r * 1.06, cfg.r * 0.96, 0.024, 24, 1, true),
    )
    const flameMesh = new Mesh(flameGeom, flameMat)
    flameMesh.position.set(cfg.x, 0.914, cfg.z)
    flameMesh.scale.set(0, 0, 0)
    group.add(flameMesh)
    flameMeshes.push(flameMesh)
  }

  // -------------------------------------------------------------
  // 4. FRONT CONTROL STRIP & 5 KNOBS (y ~ 0.805, z ~ 0.285)
  // -------------------------------------------------------------
  const knobPositionsX = [-0.26, -0.13, 0, 0.13, 0.26]
  const knobGroups: Group[] = []

  const knobBezelGeom = registerGeometry(new CylinderGeometry(0.022, 0.022, 0.004, 20))
  const knobDialGeom = registerGeometry(new CylinderGeometry(0.018, 0.018, 0.016, 20))
  const knobPipGeom = registerGeometry(new BoxGeometry(0.003, 0.014, 0.004))

  for (const kx of knobPositionsX) {
    const kGroup = new Group()
    kGroup.position.set(kx, 0.805, 0.286)

    const bezel = new Mesh(knobBezelGeom, materials.darkBaseMaterial)
    bezel.rotation.x = Math.PI / 2
    kGroup.add(bezel)

    const dial = new Mesh(knobDialGeom, materials.chromeMaterial)
    dial.rotation.x = Math.PI / 2
    dial.position.z = 0.008
    dial.castShadow = true
    kGroup.add(dial)

    const pip = new Mesh(knobPipGeom, materials.darkBaseMaterial)
    pip.position.set(0, 0.008, 0.016)
    kGroup.add(pip)

    group.add(kGroup)
    knobGroups.push(kGroup)
  }

  // -------------------------------------------------------------
  // 5. OVEN CAVITY & DROP-DOWN DOOR (Center y = 0.44, Hinge y = 0.22)
  // -------------------------------------------------------------
  const ovenInteriorLight = new PointLight(0xF59E0B, 0, 2.4, 1.4)
  ovenInteriorLight.position.set(0, 0.52, 0.10)
  group.add(ovenInteriorLight)

  // Dark recessed cavity behind the drop-down door: without it the open oven shows a blank steel front
  const cavityMat = registerMaterial(
    new MeshStandardMaterial({ color: 0x17110c, roughness: 0.7, emissive: 0x4a2008, emissiveIntensity: 0 }),
  )
  const cavityGeom = registerGeometry(new BoxGeometry(0.62, 0.4, 0.012))
  const cavity = new Mesh(cavityGeom, cavityMat)
  cavity.position.set(0, 0.44, 0.303)
  group.add(cavity)

  // 2 Interior Wire Racks
  const rackGeom = registerGeometry(new RoundedBoxGeometry(0.64, 0.006, 0.44, 2, 0.002))
  const rack1 = new Mesh(rackGeom, materials.chromeMaterial)
  rack1.position.set(0, 0.48, 0.02)
  group.add(rack1)

  const rack2 = new Mesh(rackGeom, materials.chromeMaterial)
  rack2.position.set(0, 0.34, 0.02)
  group.add(rack2)

  // Drop-down door pivot (hinged at bottom y = 0.22, z = 0.285)
  const doorPivot = new Group()
  doorPivot.name = 'cooker-oven-door-pivot'
  doorPivot.position.set(0, 0.22, 0.285)
  group.add(doorPivot)

  const doorHeight = 0.50
  const doorFrameGeom = registerGeometry(new RoundedBoxGeometry(0.72, doorHeight, 0.032, 3, 0.010))
  const doorFrame = new Mesh(doorFrameGeom, materials.finishMaterial)
  doorFrame.position.set(0, doorHeight / 2, 0)
  doorFrame.castShadow = true
  doorFrame.receiveShadow = true
  doorPivot.add(doorFrame)

  // Tinted glass viewing window in door
  const windowGeom = registerGeometry(new RoundedBoxGeometry(0.56, 0.34, 0.012, 2, 0.004))
  const windowMat = registerMaterial(
    new MeshPhysicalMaterial({
      color: 0x1A1816,
      transmission: 0.74,
      roughness: 0.12,
      ior: 1.5,
      transparent: true,
      thickness: 0.01,
    }),
  )
  const windowMesh = new Mesh(windowGeom, windowMat)
  windowMesh.position.set(0, doorHeight / 2, 0.012)
  doorPivot.add(windowMesh)

  // Horizontal chrome handle bar at top of door
  const handleBarGeom = registerGeometry(new CapsuleGeometry(0.009, 0.46, 8, 16))
  const handleBar = new Mesh(handleBarGeom, materials.chromeMaterial)
  handleBar.rotation.z = Math.PI / 2
  handleBar.position.set(0, doorHeight - 0.03, 0.04)
  handleBar.castShadow = true
  doorPivot.add(handleBar)

  const handlePostGeom = registerGeometry(new CylinderGeometry(0.006, 0.006, 0.025, 12))
  const hPost1 = new Mesh(handlePostGeom, materials.chromeMaterial)
  hPost1.rotation.x = Math.PI / 2
  hPost1.position.set(-0.20, doorHeight - 0.03, 0.022)
  doorPivot.add(hPost1)

  const hPost2 = new Mesh(handlePostGeom, materials.chromeMaterial)
  hPost2.rotation.x = Math.PI / 2
  hPost2.position.set(0.20, doorHeight - 0.03, 0.022)
  doorPivot.add(hPost2)

  // -------------------------------------------------------------
  // 6. CONTROLLER & TICK
  // -------------------------------------------------------------
  const maxDropAngle = (85 * Math.PI) / 180
  const maxKnobAngle = (120 * Math.PI) / 180
  let currentOpen = 0
  let elapsedTime = 0

  function setOpen(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress))
    currentOpen = clamped

    // Drop-down oven door
    const angle = doorAngle(clamped, maxDropAngle)
    doorPivot.rotation.x = angle

    // Rotate knobs
    const knobAngle = easeInOutCubic(clamped) * maxKnobAngle
    for (const kg of knobGroups) {
      kg.rotation.z = -knobAngle
    }

    // Interior glow
    const lightProgress = easeInOutCubic(clamped)
    ovenInteriorLight.intensity = 2.2 * lightProgress
    cavityMat.emissiveIntensity = 1.4 * lightProgress

    // Gas flames scale & opacity
    flameMat.opacity = 0.85 * lightProgress
    const flameScale = lightProgress
    for (const f of flameMeshes) {
      f.scale.set(flameScale, flameScale, flameScale)
    }
  }

  function tick(dt: number): boolean {
    if (currentOpen > 0.01) {
      elapsedTime += dt
      // Flicker flames organically
      for (let i = 0; i < flameMeshes.length; i++) {
        const mesh = flameMeshes[i]
        if (!mesh) continue
        const flicker = flickerFlame(elapsedTime, i)
        mesh.scale.y = currentOpen * flicker
      }
      return true
    }
    return false
  }

  function setFinish(finish: ApplianceFinish, immediate = false): void {
    materials.updateFinish(finish, immediate)
  }

  function dispose(): void {
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
      height: 1.12,
      width: 0.92,
      centerY: 0.5,
    },
    setFinish,
    setOpen,
    dispose,
    tick,
  }
}
