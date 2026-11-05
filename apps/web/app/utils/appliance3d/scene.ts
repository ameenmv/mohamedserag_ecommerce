import {
  ACESFilmicToneMapping,
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  VSMShadowMap,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildAppliance } from './build'
import type { ApplianceFinish } from './materials'
import { clampPitch, clampYaw, inertiaStep } from './math'
import type { ApplianceInstance, ApplianceKind, ApplianceOptions } from './types'

export interface ApplianceSceneOptions extends ApplianceOptions {
  kind?: ApplianceKind
  finish?: ApplianceFinish
  reducedMotion?: boolean
}

export interface ApplianceScene {
  setOpen: (progress: number) => void
  setFinish: (finish: ApplianceFinish) => void
  resize: () => void
  pause: () => void
  resume: () => void
  render: () => void
  dispose: () => void
}

/**
 * Procedural ground contact shadow gradient texture.
 * Softly anchors the appliance on the transparent canvas without visible borders.
 */
function createGroundGradientTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 96)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    gradient.addColorStop(0.45, 'rgba(10, 16, 12, 0.22)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    return new CanvasTexture(canvas)
  } catch {
    return null
  }
}

/**
 * Initializes and manages the WebGL appliance product showcase scene.
 */
export function createApplianceScene(
  canvas: HTMLCanvasElement,
  options: ApplianceSceneOptions = {},
): ApplianceScene {
  const reducedMotion = options.reducedMotion ?? false
  const kind = options.kind ?? 'fridge'
  const initialFinish =
    options.finish ?? (kind === 'tv' ? 'black' : kind === 'ac' ? 'white' : 'steel')

  // Enforce touch-action so mobile vertical scroll is never captured
  canvas.style.touchAction = 'pan-y'
  canvas.style.cursor = 'grab'

  // 1. WebGL Renderer
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = VSMShadowMap

  // 2. Scene & Environment
  const scene = new Scene()

  const pmremGenerator = new PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()
  const roomEnv = new RoomEnvironment()
  // Tall soft boxes only in the reflection environment: they give the metal long vertical highlights
  const softboxGeom = new PlaneGeometry(1.6, 7)
  const softboxMat = new MeshBasicMaterial({ color: 0xffffff })
  softboxMat.color.setScalar(9)
  const softboxLeft = new Mesh(softboxGeom, softboxMat)
  softboxLeft.position.set(-5, 3, 1.5)
  softboxLeft.rotation.y = Math.PI / 2.6
  const softboxRight = new Mesh(softboxGeom, softboxMat)
  softboxRight.position.set(5, 3, 2.5)
  softboxRight.rotation.y = -Math.PI / 2.6
  roomEnv.add(softboxLeft, softboxRight)
  const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture
  scene.environment = envTexture
  scene.environmentIntensity = 1.25
  pmremGenerator.dispose()
  roomEnv.dispose()
  softboxGeom.dispose()
  softboxMat.dispose()

  // 3. Studio Lighting Setup
  const keyLight = new DirectionalLight(0xFFFFFF, 2.2)
  keyLight.position.set(1.4, 4.6, 3.4)
  // Baked contact shadow below: a shadow map gave hard polygon edges on the transparent canvas
  keyLight.castShadow = false
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 10
  keyLight.shadow.camera.left = -1.2
  keyLight.shadow.camera.right = 1.2
  keyLight.shadow.camera.top = 2.4
  keyLight.shadow.camera.bottom = -0.5
  keyLight.shadow.bias = -0.0002
  keyLight.shadow.normalBias = 0.02
  keyLight.shadow.radius = 9
  keyLight.shadow.blurSamples = 20
  scene.add(keyLight)

  const rimLight = new DirectionalLight(0xD0E2FF, 1.3)
  rimLight.position.set(-2.4, 2.2, -2.0)
  scene.add(rimLight)

  const ambientLight = new AmbientLight(0xFFFFFF, 0.35)
  scene.add(ambientLight)

  // 4. Turntable Root & Appliance Instance
  const turntableGroup = new Group()
  turntableGroup.name = 'turntable-root'
  scene.add(turntableGroup)

  const applianceInstance: ApplianceInstance = buildAppliance(kind, initialFinish, {
    hingeSide: options.hingeSide,
  })
  turntableGroup.add(applianceInstance.group)

  // 5. Ground Shadow & Soft Contact Plane (scales with bounds.width)
  const shadowPlaneGeom = new PlaneGeometry(3.5, 3.5)
  const shadowPlaneMat = new ShadowMaterial({ opacity: 0.26 })
  const shadowPlane = new Mesh(shadowPlaneGeom, shadowPlaneMat)
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = 0.001
  shadowPlane.receiveShadow = true
  scene.add(shadowPlane)

  const groundTexture = createGroundGradientTexture()
  let groundPlane: Mesh | undefined
  let groundPlaneGeom: PlaneGeometry | null = null
  let groundPlaneMat: MeshBasicMaterial | null = null

  if (groundTexture) {
    groundPlaneGeom = new PlaneGeometry(2.4, 2.4)
    groundPlaneMat = new MeshBasicMaterial({
      map: groundTexture,
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
    groundPlane = new Mesh(groundPlaneGeom, groundPlaneMat)
    groundPlane.rotation.x = -Math.PI / 2
    groundPlane.position.y = 0.0005
    const widthRatio = applianceInstance.bounds.width / 0.66
    const shadowWidthScale = widthRatio * 1.15
    const shadowDepthScale = Math.max(0.6, widthRatio * 0.9)
    groundPlane.scale.set(shadowWidthScale, shadowDepthScale, 1.0)
    scene.add(groundPlane)
  }

  // 6. Camera Setup (Framed from instance.bounds)
  const camera = new PerspectiveCamera(30, 1, 0.1, 20)
  const initialCamY = applianceInstance.bounds.centerY + applianceInstance.bounds.height * 0.083
  camera.position.set(0, initialCamY, 4.35)
  camera.lookAt(0, applianceInstance.bounds.centerY, 0)

  // 7. Interaction & Turntable State
  let currentYaw = 0
  let currentPitch = 0
  let yawVelocity = 0
  let isDragging = false
  let activePointerId: number | null = null
  let lastPointerX = 0
  let lastPointerY = 0
  let lastInteractionTime = performance.now()
  let lastFrameTime = performance.now()
  let isLoopRunning = false
  let isPaused = false
  let isDisposed = false
  let rafId: number | null = null

  const minYaw = -0.96 // ~ -55°
  const maxYaw = 0.96  // ~ +55°
  const minPitch = -0.105 // ~ -6°
  const maxPitch = 0.105  // ~ +6°

  function requestFrame(): void {
    if (isPaused || isDisposed) return
    if (!isLoopRunning) {
      isLoopRunning = true
      lastFrameTime = performance.now()
      rafId = requestAnimationFrame(animate)
    }
  }

  function animate(time: number): void {
    if (isPaused || isDisposed) {
      isLoopRunning = false
      return
    }

    const delta = Math.min((time - lastFrameTime) / 1000, 0.1)
    lastFrameTime = time

    let keepLooping = false

    // Transition crossfading finishes
    const matTransitioning = applianceInstance.materials.tickTransition(delta)
    if (matTransitioning) keepLooping = true

    // Custom appliance tick (drum rotation, flame flicker, cool air flow, tv screen pan)
    if (applianceInstance.tick) {
      const isTicking = applianceInstance.tick(delta)
      if (isTicking) keepLooping = true
    }

    // Inertia decay when released
    if (!isDragging && Math.abs(yawVelocity) > 0.0001) {
      const step = inertiaStep(yawVelocity, 0.92, 0.0001)
      yawVelocity = step.velocity
      currentYaw = clampYaw(currentYaw + yawVelocity, minYaw, maxYaw)
      if (step.moving) keepLooping = true
    }

    // Return to rest & subtle idle sway
    if (!reducedMotion) {
      const idleSeconds = (time - lastInteractionTime) / 1000

      if (!isDragging && Math.abs(yawVelocity) <= 0.0001 && idleSeconds > 2.5) {
        if (Math.abs(currentYaw) > 0.001) {
          currentYaw += (0 - currentYaw) * Math.min(1, delta * 2.5)
          keepLooping = true
        }
        if (Math.abs(currentPitch) > 0.001) {
          currentPitch += (0 - currentPitch) * Math.min(1, delta * 2.5)
          keepLooping = true
        }

        // Apply subtle sway (±2.3°) once centered
        if (Math.abs(currentYaw) < 0.05) {
          const sway = Math.sin(time * 0.0008) * 0.04
          turntableGroup.rotation.y = currentYaw + sway
          turntableGroup.rotation.x = currentPitch
          keepLooping = true
        } else {
          turntableGroup.rotation.y = currentYaw
          turntableGroup.rotation.x = currentPitch
        }
      } else {
        turntableGroup.rotation.y = currentYaw
        turntableGroup.rotation.x = currentPitch
      }
    } else {
      turntableGroup.rotation.y = currentYaw
      turntableGroup.rotation.x = currentPitch
    }

    renderer.render(scene, camera)

    if (keepLooping || isDragging) {
      rafId = requestAnimationFrame(animate)
    } else {
      isLoopRunning = false
    }
  }

  // Pointer Event Listeners
  function onPointerDown(e: PointerEvent): void {
    if (activePointerId !== null) return
    activePointerId = e.pointerId
    isDragging = true
    lastPointerX = e.clientX
    lastPointerY = e.clientY
    yawVelocity = 0
    canvas.style.cursor = 'grabbing'
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {
      // Ignored if browser rejects capture
    }
    lastInteractionTime = performance.now()
    requestFrame()
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging || e.pointerId !== activePointerId) return

    const deltaX = e.clientX - lastPointerX
    const deltaY = e.clientY - lastPointerY
    lastPointerX = e.clientX
    lastPointerY = e.clientY

    // Horizontal turntable rotation
    yawVelocity = deltaX * 0.0045
    currentYaw = clampYaw(currentYaw + yawVelocity, minYaw, maxYaw)

    // Vertical pitch tilt
    currentPitch = clampPitch(currentPitch + deltaY * 0.002, minPitch, maxPitch)

    lastInteractionTime = performance.now()
    requestFrame()
  }

  function onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== activePointerId) return
    isDragging = false
    activePointerId = null
    canvas.style.cursor = 'grab'
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {
      // Ignored
    }
    lastInteractionTime = performance.now()
    requestFrame()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)

  // Context Loss & Recovery
  function onContextLost(e: Event): void {
    e.preventDefault()
    pause()
  }

  function onContextRestored(): void {
    resume()
  }

  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)

  function resize(): void {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width === 0 || height === 0) return

    const isCoarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
    const maxDpr = isCoarse ? 1.5 : 2.0
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, maxDpr)

    camera.aspect = width / height

    // Frame appliance from bounds (fit height with ~26% margin, and width with margin)
    const targetHeight = applianceInstance.bounds.height / 0.74
    const halfFovRad = (camera.fov / 2) * (Math.PI / 180)
    let dist = (targetHeight / 2) / Math.tan(halfFovRad)

    const hFov = 2 * Math.atan(Math.tan(halfFovRad) * camera.aspect)
    const targetWidth = applianceInstance.bounds.width / 0.82
    const distForWidth = (targetWidth / 2) / Math.tan(hFov / 2)
    dist = Math.max(dist, distForWidth)

    const centerY = applianceInstance.bounds.centerY
    const camY = centerY + applianceInstance.bounds.height * 0.083
    camera.position.set(0, camY, dist)
    camera.lookAt(0, centerY, 0)
    camera.updateProjectionMatrix()

    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)
    requestFrame()
  }

  function setOpen(progress: number): void {
    applianceInstance.setOpen(progress)
    requestFrame()
  }

  function setFinish(finish: ApplianceFinish): void {
    applianceInstance.setFinish(finish)
    requestFrame()
  }

  function pause(): void {
    isPaused = true
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    isLoopRunning = false
  }

  function resume(): void {
    if (!isPaused) return
    isPaused = false
    lastInteractionTime = performance.now()
    lastFrameTime = performance.now()
    requestFrame()
  }

  function render(): void {
    renderer.render(scene, camera)
  }

  function dispose(): void {
    isDisposed = true
    pause()

    canvas.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    canvas.removeEventListener('webglcontextrestored', onContextRestored)

    applianceInstance.dispose()

    shadowPlaneGeom.dispose()
    shadowPlaneMat.dispose()

    groundPlaneGeom?.dispose()
    groundPlaneMat?.dispose()
    groundTexture?.dispose()

    envTexture.dispose()

    renderer.dispose()
    renderer.forceContextLoss()
    scene.clear()
  }

  // Initial sizing and render
  resize()
  requestFrame()

  return {
    setOpen,
    setFinish,
    resize,
    pause,
    resume,
    render,
    dispose,
  }
}
