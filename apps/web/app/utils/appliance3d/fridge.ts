import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PointLight,
  SphereGeometry,
  type BufferGeometry,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createApplianceMaterials, type ApplianceFinish, type ApplianceMaterials } from './materials'
import { doorAngle, easeInOutCubic } from './math'

export interface FridgeOptions {
  hingeSide?: 'left' | 'right'
}

export interface FridgeInstance {
  group: Group
  materials: ApplianceMaterials
  setFinish: (finish: ApplianceFinish, immediate?: boolean) => void
  setOpen: (progress: number) => void
  dispose: () => void
}

/**
 * Builds a realistic, high-fidelity generic top-freezer refrigerator.
 * Built entirely with procedural geometries, beveled edges, PBR materials,
 * realistic door reveal gaps, interior props, and dynamic LED lighting.
 */
export function buildFridge(
  initialFinish: ApplianceFinish = 'steel',
  options: FridgeOptions = {},
): FridgeInstance {
  const hingeSide = options.hingeSide ?? 'right'
  const isRightHinge = hingeSide === 'right'

  const materials = createApplianceMaterials(initialFinish)
  const group = new Group()
  group.name = 'refrigerator-root'

  const geometriesToDispose: BufferGeometry[] = []
  function registerGeometry<T extends BufferGeometry>(geom: T): T {
    geometriesToDispose.push(geom)
    return geom
  }

  // -------------------------------------------------------------
  // 1. PLINTH & LEVELING FEET (Bottom y in [0, 0.05])
  // -------------------------------------------------------------
  const plinthGeom = registerGeometry(new RoundedBoxGeometry(0.58, 0.05, 0.58, 2, 0.006))
  const plinth = new Mesh(plinthGeom, materials.darkBaseMaterial)
  plinth.position.set(0, 0.025, -0.015)
  plinth.castShadow = true
  plinth.receiveShadow = true
  group.add(plinth)

  const footDiscGeom = registerGeometry(new CylinderGeometry(0.022, 0.022, 0.012, 16))
  const footStemGeom = registerGeometry(new CylinderGeometry(0.01, 0.01, 0.02, 16))

  const footPositions = [
    { x: -0.24, z: 0.24 },
    { x: 0.24, z: 0.24 },
  ]
  for (const pos of footPositions) {
    const footDisc = new Mesh(footDiscGeom, materials.darkBaseMaterial)
    footDisc.position.set(pos.x, 0.006, pos.z)
    footDisc.castShadow = true
    group.add(footDisc)

    const footStem = new Mesh(footStemGeom, materials.chromeMaterial)
    footStem.position.set(pos.x, 0.016, pos.z)
    group.add(footStem)
  }

  // -------------------------------------------------------------
  // 2. CABINET BODY (Outer dimensions 0.60 W x 1.78 H x 0.64 D)
  // -------------------------------------------------------------
  const wallGeom = registerGeometry(new RoundedBoxGeometry(0.035, 1.78, 0.64, 3, 0.01))
  const leftWall = new Mesh(wallGeom, materials.finishMaterial)
  leftWall.position.set(-0.2825, 0.94, -0.005)
  leftWall.castShadow = true
  leftWall.receiveShadow = true
  group.add(leftWall)

  const rightWall = new Mesh(wallGeom, materials.finishMaterial)
  rightWall.position.set(0.2825, 0.94, -0.005)
  rightWall.castShadow = true
  rightWall.receiveShadow = true
  group.add(rightWall)

  const topPanelGeom = registerGeometry(new RoundedBoxGeometry(0.60, 0.03, 0.64, 3, 0.01))
  const topPanel = new Mesh(topPanelGeom, materials.finishMaterial)
  topPanel.position.set(0, 1.825, -0.005)
  topPanel.castShadow = true
  topPanel.receiveShadow = true
  group.add(topPanel)

  // Top vent line accent
  const ventGeom = registerGeometry(new RoundedBoxGeometry(0.56, 0.006, 0.02, 2, 0.002))
  const ventMesh = new Mesh(ventGeom, materials.chromeMaterial)
  ventMesh.position.set(0, 1.838, 0.30)
  group.add(ventMesh)

  const backPanelGeom = registerGeometry(new BoxGeometry(0.54, 1.76, 0.02))
  const backPanel = new Mesh(backPanelGeom, materials.finishMaterial)
  backPanel.position.set(0, 0.94, -0.315)
  backPanel.castShadow = true
  backPanel.receiveShadow = true
  group.add(backPanel)

  const cabinetFloorGeom = registerGeometry(new RoundedBoxGeometry(0.54, 0.03, 0.60, 2, 0.006))
  const cabinetFloor = new Mesh(cabinetFloorGeom, materials.finishMaterial)
  cabinetFloor.position.set(0, 0.065, -0.015)
  group.add(cabinetFloor)

  // Mullion (horizontal divider between freezer & fresh compartment)
  const mullionGeom = registerGeometry(new RoundedBoxGeometry(0.54, 0.035, 0.58, 2, 0.006))
  const mullion = new Mesh(mullionGeom, materials.finishMaterial)
  mullion.position.set(0, 1.25, -0.02)
  mullion.castShadow = true
  mullion.receiveShadow = true
  group.add(mullion)

  // Cabinet interior liner (smooth white shell lining cavity)
  const innerBackGeom = registerGeometry(new BoxGeometry(0.528, 1.74, 0.005))
  const innerBack = new Mesh(innerBackGeom, materials.interiorLinerMaterial)
  innerBack.position.set(0, 0.94, -0.30)
  innerBack.receiveShadow = true
  group.add(innerBack)

  // -------------------------------------------------------------
  // 3. TOP FREEZER COMPARTMENT (y in [1.27, 1.81])
  // -------------------------------------------------------------
  // Freezer shelf
  const freezerShelfGeom = registerGeometry(new RoundedBoxGeometry(0.51, 0.008, 0.46, 2, 0.003))
  const freezerShelf = new Mesh(freezerShelfGeom, materials.glassShelfMaterial)
  freezerShelf.position.set(0, 1.54, -0.03)
  freezerShelf.receiveShadow = true
  group.add(freezerShelf)

  // Ice maker / ice cube tray prop
  const iceTrayGeom = registerGeometry(new RoundedBoxGeometry(0.18, 0.028, 0.14, 2, 0.004))
  const iceTray = new Mesh(iceTrayGeom, materials.crisperMaterial)
  iceTray.position.set(-0.13, 1.56, 0.04)
  group.add(iceTray)

  const iceCubeGeom = registerGeometry(new RoundedBoxGeometry(0.022, 0.018, 0.022, 2, 0.003))
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const iceCube = new Mesh(iceCubeGeom, materials.props.iceCube)
      iceCube.position.set(-0.19 + col * 0.04, 1.572, 0.01 + row * 0.04)
      group.add(iceCube)
    }
  }

  // Frozen food container box prop
  const frozenBoxGeom = registerGeometry(new RoundedBoxGeometry(0.14, 0.07, 0.18, 2, 0.006))
  const frozenBox = new Mesh(frozenBoxGeom, materials.props.foodContainerCapBlue)
  frozenBox.position.set(0.13, 1.58, -0.02)
  frozenBox.castShadow = true
  group.add(frozenBox)

  // -------------------------------------------------------------
  // 4. BOTTOM FRESH FOOD COMPARTMENT (y in [0.08, 1.23])
  // -------------------------------------------------------------
  // LED ceiling light strip
  const ledGeom = registerGeometry(new RoundedBoxGeometry(0.38, 0.01, 0.03, 2, 0.002))
  const ledMesh = new Mesh(ledGeom, materials.ledMaterial)
  ledMesh.position.set(0, 1.228, 0.18)
  group.add(ledMesh)

  // Dynamic interior PointLight (turns on smoothly as door opens)
  const interiorLight = new PointLight(0xFFF5E4, 0, 1.8, 1.5)
  interiorLight.position.set(0, 1.15, 0.12)
  group.add(interiorLight)

  // 3 Frosted glass shelves with chrome front trim
  const shelfYPositions = [1.02, 0.77, 0.48]
  const glassShelfGeom = registerGeometry(new RoundedBoxGeometry(0.51, 0.008, 0.48, 2, 0.003))
  const shelfTrimGeom = registerGeometry(new RoundedBoxGeometry(0.512, 0.012, 0.012, 2, 0.002))

  for (const y of shelfYPositions) {
    const shelf = new Mesh(glassShelfGeom, materials.glassShelfMaterial)
    shelf.position.set(0, y, -0.02)
    shelf.receiveShadow = true
    group.add(shelf)

    const trim = new Mesh(shelfTrimGeom, materials.chromeMaterial)
    trim.position.set(0, y, 0.22)
    trim.receiveShadow = true
    group.add(trim)
  }

  // Crisper drawer (vegetable bin) at bottom
  const crisperFrontGeom = registerGeometry(new RoundedBoxGeometry(0.51, 0.34, 0.014, 3, 0.008))
  const crisperFront = new Mesh(crisperFrontGeom, materials.crisperMaterial)
  crisperFront.position.set(0, 0.25, 0.21)
  crisperFront.receiveShadow = true
  group.add(crisperFront)

  const crisperHandleGeom = registerGeometry(new RoundedBoxGeometry(0.18, 0.012, 0.008, 2, 0.002))
  const crisperHandle = new Mesh(crisperHandleGeom, materials.chromeMaterial)
  crisperHandle.position.set(0, 0.395, 0.218)
  group.add(crisperHandle)

  // Fresh produce props inside crisper
  const appleGeom = registerGeometry(new SphereGeometry(0.036, 16, 16))
  const lemonGeom = registerGeometry(new SphereGeometry(0.032, 16, 16))

  const produceItems = [
    { geom: appleGeom, mat: materials.props.produceRed, x: -0.15, y: 0.14, z: 0.08 },
    { geom: appleGeom, mat: materials.props.produceRed, x: -0.06, y: 0.135, z: 0.13 },
    { geom: appleGeom, mat: materials.props.produceGreen, x: 0.07, y: 0.14, z: 0.09 },
    { geom: appleGeom, mat: materials.props.produceGreen, x: 0.16, y: 0.14, z: 0.13 },
    { geom: lemonGeom, mat: materials.props.produceYellow, x: 0.01, y: 0.135, z: 0.15 },
  ]
  for (const item of produceItems) {
    const mesh = new Mesh(item.geom, item.mat)
    mesh.position.set(item.x, item.y, item.z)
    mesh.castShadow = true
    group.add(mesh)
  }

  // Shelf 1 Props: Milk carafe and glass bottles
  const carafeBodyGeom = registerGeometry(new CylinderGeometry(0.032, 0.036, 0.15, 20))
  const carafeMilkGeom = registerGeometry(new CylinderGeometry(0.030, 0.034, 0.11, 16))
  const carafeCapGeom = registerGeometry(new CylinderGeometry(0.02, 0.02, 0.016, 16))

  const carafeBody = new Mesh(carafeBodyGeom, materials.props.bottleClear)
  carafeBody.position.set(-0.14, 1.105, 0.06)
  group.add(carafeBody)

  const carafeMilk = new Mesh(carafeMilkGeom, materials.interiorLinerMaterial)
  carafeMilk.position.set(-0.14, 1.085, 0.06)
  group.add(carafeMilk)

  const carafeCap = new Mesh(carafeCapGeom, materials.chromeMaterial)
  carafeCap.position.set(-0.14, 1.185, 0.06)
  group.add(carafeCap)

  const bottleAmberGeom = registerGeometry(new CylinderGeometry(0.026, 0.026, 0.14, 16))
  const bottleAmber = new Mesh(bottleAmberGeom, materials.props.bottleAmber)
  bottleAmber.position.set(-0.04, 1.10, 0.07)
  group.add(bottleAmber)

  const bottleGreenGeom = registerGeometry(new CylinderGeometry(0.024, 0.024, 0.13, 16))
  const bottleGreen = new Mesh(bottleGreenGeom, materials.props.bottleGreen)
  bottleGreen.position.set(0.04, 1.095, 0.07)
  group.add(bottleGreen)

  // Shelf 2 Props: Food containers and egg tray
  const containerBase1Geom = registerGeometry(new RoundedBoxGeometry(0.14, 0.065, 0.12, 3, 0.008))
  const containerLid1Geom = registerGeometry(new RoundedBoxGeometry(0.145, 0.012, 0.125, 2, 0.004))
  const c1Base = new Mesh(containerBase1Geom, materials.props.foodContainerBody)
  c1Base.position.set(-0.12, 0.81, 0.06)
  group.add(c1Base)
  const c1Lid = new Mesh(containerLid1Geom, materials.props.foodContainerCap)
  c1Lid.position.set(-0.12, 0.846, 0.06)
  group.add(c1Lid)

  const containerBase2Geom = registerGeometry(new RoundedBoxGeometry(0.11, 0.055, 0.11, 3, 0.008))
  const containerLid2Geom = registerGeometry(new RoundedBoxGeometry(0.115, 0.012, 0.115, 2, 0.004))
  const c2Base = new Mesh(containerBase2Geom, materials.props.foodContainerBody)
  c2Base.position.set(0.03, 0.805, 0.06)
  group.add(c2Base)
  const c2Lid = new Mesh(containerLid2Geom, materials.props.foodContainerCapBlue)
  c2Lid.position.set(0.03, 0.835, 0.06)
  group.add(c2Lid)

  const eggTrayGeom = registerGeometry(new RoundedBoxGeometry(0.09, 0.018, 0.15, 2, 0.004))
  const eggTray = new Mesh(eggTrayGeom, materials.interiorLinerMaterial)
  eggTray.position.set(0.16, 0.785, 0.07)
  group.add(eggTray)

  const eggGeom = registerGeometry(new SphereGeometry(0.014, 12, 12))
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const egg = new Mesh(eggGeom, materials.interiorLinerMaterial)
      egg.scale.set(1, 1.25, 1)
      egg.position.set(0.14 + c * 0.035, 0.805, 0.03 + r * 0.04)
      group.add(egg)
    }
  }

  // -------------------------------------------------------------
  // 5. DOORS & HINGES (Top Freezer & Bottom Fresh Food)
  // -------------------------------------------------------------
  // Hinge axis: x = ±0.292, z = 0.3415 (accounts for 4mm reveal gap)
  const hingeX = isRightHinge ? 0.292 : -0.292
  const hingeZ = 0.3415
  const doorWidth = 0.584
  const doorDepth = 0.045
  const doorLocalOffset = isRightHinge ? -doorWidth / 2 : doorWidth / 2
  const handleX = isRightHinge ? -doorWidth + 0.045 : doorWidth - 0.045

  // Helper to create the perimeter rubber gasket ring
  function buildGasketGroup(w: number, h: number): Group {
    const g = new Group()
    const horizGeom = registerGeometry(new BoxGeometry(w, 0.012, 0.006))
    const vertGeom = registerGeometry(new BoxGeometry(0.012, h - 0.024, 0.006))

    const top = new Mesh(horizGeom, materials.gasketMaterial)
    top.position.set(0, h / 2 - 0.006, 0)
    g.add(top)

    const bottom = new Mesh(horizGeom, materials.gasketMaterial)
    bottom.position.set(0, -h / 2 + 0.006, 0)
    g.add(bottom)

    const left = new Mesh(vertGeom, materials.gasketMaterial)
    left.position.set(-w / 2 + 0.006, 0, 0)
    g.add(left)

    const right = new Mesh(vertGeom, materials.gasketMaterial)
    right.position.set(w / 2 - 0.006, 0, 0)
    g.add(right)

    return g
  }

  // --- Top Freezer Door ---
  const freezerDoorHeight = 0.55
  const freezerPivot = new Group()
  freezerPivot.name = 'freezer-door-pivot'
  freezerPivot.position.set(hingeX, 1.55, hingeZ)
  group.add(freezerPivot)

  const freezerDoorGeom = registerGeometry(
    new RoundedBoxGeometry(doorWidth, freezerDoorHeight, doorDepth, 4, 0.016),
  )
  const freezerDoorMesh = new Mesh(freezerDoorGeom, materials.finishMaterial)
  freezerDoorMesh.position.set(doorLocalOffset, 0, 0)
  freezerDoorMesh.castShadow = true
  freezerDoorMesh.receiveShadow = true
  freezerPivot.add(freezerDoorMesh)

  // Rubber seal on inner face of freezer door
  const freezerGasket = buildGasketGroup(0.55, 0.52)
  freezerGasket.position.set(doorLocalOffset, 0, -doorDepth / 2 - 0.003)
  freezerPivot.add(freezerGasket)

  // Freezer door chrome handle
  const freezerHandleBarGeom = registerGeometry(new CapsuleGeometry(0.009, 0.16, 8, 16))
  const freezerHandle = new Mesh(freezerHandleBarGeom, materials.chromeMaterial)
  freezerHandle.position.set(handleX, 0, doorDepth / 2 + 0.025)
  freezerHandle.castShadow = true
  freezerPivot.add(freezerHandle)

  const handlePostGeom = registerGeometry(new CylinderGeometry(0.006, 0.006, 0.024, 12))
  const fPost1 = new Mesh(handlePostGeom, materials.chromeMaterial)
  fPost1.rotation.x = Math.PI / 2
  fPost1.position.set(handleX, 0.06, doorDepth / 2 + 0.012)
  freezerPivot.add(fPost1)

  const fPost2 = new Mesh(handlePostGeom, materials.chromeMaterial)
  fPost2.rotation.x = Math.PI / 2
  fPost2.position.set(handleX, -0.06, doorDepth / 2 + 0.012)
  freezerPivot.add(fPost2)

  // --- Bottom Fresh Food Door ---
  const freshDoorHeight = 1.18
  const freshPivot = new Group()
  freshPivot.name = 'fresh-door-pivot'
  freshPivot.position.set(hingeX, 0.655, hingeZ)
  group.add(freshPivot)

  const freshDoorGeom = registerGeometry(
    new RoundedBoxGeometry(doorWidth, freshDoorHeight, doorDepth, 4, 0.016),
  )
  const freshDoorMesh = new Mesh(freshDoorGeom, materials.finishMaterial)
  freshDoorMesh.position.set(doorLocalOffset, 0, 0)
  freshDoorMesh.castShadow = true
  freshDoorMesh.receiveShadow = true
  freshPivot.add(freshDoorMesh)

  // Rubber seal on inner face of fresh door
  const freshGasket = buildGasketGroup(0.55, 1.15)
  freshGasket.position.set(doorLocalOffset, 0, -doorDepth / 2 - 0.003)
  freshPivot.add(freshGasket)

  // Fresh door chrome handle (longer ergonomic vertical bar)
  const freshHandleBarGeom = registerGeometry(new CapsuleGeometry(0.009, 0.36, 8, 16))
  const freshHandle = new Mesh(freshHandleBarGeom, materials.chromeMaterial)
  freshHandle.position.set(handleX, 0.20, doorDepth / 2 + 0.025)
  freshHandle.castShadow = true
  freshPivot.add(freshHandle)

  const frPost1 = new Mesh(handlePostGeom, materials.chromeMaterial)
  frPost1.rotation.x = Math.PI / 2
  frPost1.position.set(handleX, 0.34, doorDepth / 2 + 0.012)
  freshPivot.add(frPost1)

  const frPost2 = new Mesh(handlePostGeom, materials.chromeMaterial)
  frPost2.rotation.x = Math.PI / 2
  frPost2.position.set(handleX, 0.06, doorDepth / 2 + 0.012)
  freshPivot.add(frPost2)

  // Inner door storage bins (visible when fresh door swings open)
  const doorBinUpperGeom = registerGeometry(new RoundedBoxGeometry(0.44, 0.08, 0.07, 2, 0.004))
  const doorBinUpper = new Mesh(doorBinUpperGeom, materials.crisperMaterial)
  doorBinUpper.position.set(doorLocalOffset, 0.28, -doorDepth / 2 - 0.04)
  freshPivot.add(doorBinUpper)

  const doorBinLowerGeom = registerGeometry(new RoundedBoxGeometry(0.44, 0.12, 0.09, 2, 0.004))
  const doorBinLower = new Mesh(doorBinLowerGeom, materials.crisperMaterial)
  doorBinLower.position.set(doorLocalOffset, -0.26, -doorDepth / 2 - 0.05)
  freshPivot.add(doorBinLower)

  // -------------------------------------------------------------
  // 6. DOOR OPEN / CLOSE CONTROLLER
  // -------------------------------------------------------------
  const maxTopAngle = (105 * Math.PI) / 180
  const maxBottomAngle = (95 * Math.PI) / 180
  const hingeSign = isRightHinge ? 1 : -1

  function setOpen(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress))

    const topAngle = doorAngle(clamped, maxTopAngle)
    const bottomAngle = doorAngle(clamped, maxBottomAngle)

    freezerPivot.rotation.y = hingeSign * topAngle
    freshPivot.rotation.y = hingeSign * bottomAngle

    const lightProgress = easeInOutCubic(clamped)
    interiorLight.intensity = 1.8 * lightProgress
    materials.ledMaterial.emissiveIntensity = 2.5 * lightProgress
  }

  function setFinish(finish: ApplianceFinish, immediate = false): void {
    materials.updateFinish(finish, immediate)
  }

  function dispose(): void {
    for (const geom of geometriesToDispose) {
      geom.dispose()
    }
    materials.dispose()
    group.clear()
  }

  return {
    group,
    materials,
    setFinish,
    setOpen,
    dispose,
  }
}
