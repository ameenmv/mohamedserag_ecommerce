import {
  CanvasTexture,
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  type Material,
} from 'three'
import { FINISHES, type ApplianceFinish } from './math'

export { FINISHES, type ApplianceFinish }

interface FinishConfig {
  color: Color
  metalness: number
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  hasBrushedMap: boolean
}

const FINISH_CONFIGS: Record<ApplianceFinish, FinishConfig> = {
  steel: {
    color: new Color(0xE8ECF0),
    metalness: 1.0,
    roughness: 0.38,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    hasBrushedMap: true,
  },
  white: {
    color: new Color(0xF6F7F9),
    metalness: 0.0,
    roughness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    hasBrushedMap: false,
  },
  black: {
    color: new Color(0x131316),
    metalness: 0.1,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    hasBrushedMap: false,
  },
  champagne: {
    color: new Color(0xD6C4AF),
    metalness: 0.88,
    roughness: 0.32,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
    hasBrushedMap: false,
  },
}

/**
 * Procedural horizontal brushed metal texture generated on an offscreen canvas.
 * Simulates fine microscopic machining grain with anisotropic specular highlights.
 */
function createBrushedMetalTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  try {
    const width = 512
    const height = 256
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Base neutral mid-tone
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, width, height)

    // Draw thousands of fine horizontal micro-scratches
    const streakCount = 3000
    for (let i = 0; i < streakCount; i++) {
      const y = Math.random() * height
      const x = Math.random() * width
      const length = 40 + Math.random() * 160
      const alpha = 0.02 + Math.random() * 0.07
      const isBright = Math.random() > 0.5

      ctx.strokeStyle = isBright
        ? `rgba(255, 255, 255, ${alpha})`
        : `rgba(0, 0, 0, ${alpha})`
      ctx.lineWidth = 0.5 + Math.random() * 0.7
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + length, y)
      ctx.stroke()

      // Wrap around for seamless horizontal tiling
      if (x + length > width) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(x + length - width, y)
        ctx.stroke()
      }
    }

    const texture = new CanvasTexture(canvas)
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(1.5, 6)
    return texture
  } catch {
    return null
  }
}

export interface ApplianceMaterials {
  finishMaterial: MeshPhysicalMaterial
  chromeMaterial: MeshPhysicalMaterial
  gasketMaterial: MeshStandardMaterial
  interiorLinerMaterial: MeshStandardMaterial
  glassShelfMaterial: MeshPhysicalMaterial
  crisperMaterial: MeshPhysicalMaterial
  ledMaterial: MeshStandardMaterial
  darkBaseMaterial: MeshStandardMaterial
  props: {
    bottleAmber: MeshPhysicalMaterial
    bottleGreen: MeshPhysicalMaterial
    bottleClear: MeshPhysicalMaterial
    foodContainerCap: MeshStandardMaterial
    foodContainerCapBlue: MeshStandardMaterial
    foodContainerBody: MeshPhysicalMaterial
    iceCube: MeshPhysicalMaterial
    produceRed: MeshStandardMaterial
    produceGreen: MeshStandardMaterial
    produceYellow: MeshStandardMaterial
  }
  currentFinish: ApplianceFinish
  updateFinish: (next: ApplianceFinish, immediate?: boolean) => void
  tickTransition: (delta: number) => boolean
  dispose: () => void
}

/**
 * Factory for all physically based materials required for the realistic 3D refrigerator.
 * Supports smooth crossfading when switching finishes.
 */
export function createApplianceMaterials(initialFinish: ApplianceFinish = 'steel'): ApplianceMaterials {
  const brushedTexture = createBrushedMetalTexture()
  const initialConfig = FINISH_CONFIGS[initialFinish]

  const finishMaterial = new MeshPhysicalMaterial({
    color: initialConfig.color.clone(),
    metalness: initialConfig.metalness,
    roughness: initialConfig.roughness,
    clearcoat: initialConfig.clearcoat,
    clearcoatRoughness: initialConfig.clearcoatRoughness,
    roughnessMap: initialConfig.hasBrushedMap ? brushedTexture : null,
    bumpMap: initialConfig.hasBrushedMap ? brushedTexture : null,
    bumpScale: initialConfig.hasBrushedMap ? 0.0006 : 0,
  })

  const chromeMaterial = new MeshPhysicalMaterial({
    color: new Color(0xF0F2F5),
    metalness: 1.0,
    roughness: 0.06,
    clearcoat: 0.9,
    clearcoatRoughness: 0.05,
  })

  const gasketMaterial = new MeshStandardMaterial({
    color: new Color(0x181818),
    roughness: 0.85,
    metalness: 0.0,
  })

  const interiorLinerMaterial = new MeshStandardMaterial({
    color: new Color(0xF4F3EE),
    roughness: 0.35,
    metalness: 0.0,
  })

  const glassShelfMaterial = new MeshPhysicalMaterial({
    color: new Color(0xEEF6F8),
    transmission: 0.88,
    roughness: 0.25,
    ior: 1.5,
    transparent: true,
    thickness: 0.015,
  })

  const crisperMaterial = new MeshPhysicalMaterial({
    color: new Color(0xDFECE4),
    transmission: 0.82,
    roughness: 0.16,
    ior: 1.45,
    transparent: true,
    thickness: 0.01,
  })

  const ledMaterial = new MeshStandardMaterial({
    color: new Color(0xFFF6E6),
    emissive: new Color(0xFFF2D4),
    emissiveIntensity: 0.0,
    roughness: 0.2,
  })

  const darkBaseMaterial = new MeshStandardMaterial({
    color: new Color(0x1A1A1A),
    roughness: 0.7,
    metalness: 0.1,
  })

  const props = {
    bottleAmber: new MeshPhysicalMaterial({
      color: new Color(0x8C5624),
      transmission: 0.85,
      roughness: 0.1,
      transparent: true,
    }),
    bottleGreen: new MeshPhysicalMaterial({
      color: new Color(0x245C32),
      transmission: 0.85,
      roughness: 0.1,
      transparent: true,
    }),
    bottleClear: new MeshPhysicalMaterial({
      color: new Color(0xEDF4F8),
      transmission: 0.9,
      roughness: 0.08,
      transparent: true,
    }),
    foodContainerCap: new MeshStandardMaterial({
      color: new Color(0xE27854),
      roughness: 0.4,
    }),
    foodContainerCapBlue: new MeshStandardMaterial({
      color: new Color(0x367A99),
      roughness: 0.4,
    }),
    foodContainerBody: new MeshPhysicalMaterial({
      color: new Color(0xFAFAFA),
      transmission: 0.7,
      roughness: 0.3,
      transparent: true,
    }),
    iceCube: new MeshPhysicalMaterial({
      color: new Color(0xE8F4FA),
      transmission: 0.92,
      roughness: 0.16,
      transparent: true,
      ior: 1.31,
    }),
    produceRed: new MeshStandardMaterial({
      color: new Color(0xCC3328),
      roughness: 0.35,
    }),
    produceGreen: new MeshStandardMaterial({
      color: new Color(0x589832),
      roughness: 0.4,
    }),
    produceYellow: new MeshStandardMaterial({
      color: new Color(0xE6B828),
      roughness: 0.35,
    }),
  }

  let currentFinish: ApplianceFinish = initialFinish
  let targetFinish: ApplianceFinish = initialFinish
  let isTransitioning = false

  function applyFinishInstant(finish: ApplianceFinish): void {
    const cfg = FINISH_CONFIGS[finish]
    finishMaterial.color.copy(cfg.color)
    finishMaterial.metalness = cfg.metalness
    finishMaterial.roughness = cfg.roughness
    finishMaterial.clearcoat = cfg.clearcoat
    finishMaterial.clearcoatRoughness = cfg.clearcoatRoughness
    finishMaterial.roughnessMap = cfg.hasBrushedMap ? brushedTexture : null
    finishMaterial.bumpMap = cfg.hasBrushedMap ? brushedTexture : null
    finishMaterial.bumpScale = cfg.hasBrushedMap ? 0.0006 : 0
    finishMaterial.needsUpdate = true
    currentFinish = finish
    targetFinish = finish
    isTransitioning = false
  }

  function updateFinish(next: ApplianceFinish, immediate = false): void {
    if (immediate) {
      applyFinishInstant(next)
      return
    }
    if (next === currentFinish && !isTransitioning) return
    targetFinish = next
    isTransitioning = true

    // Enable texture immediately if transitioning to steel
    const targetCfg = FINISH_CONFIGS[next]
    if (targetCfg.hasBrushedMap && !finishMaterial.roughnessMap) {
      finishMaterial.roughnessMap = brushedTexture
      finishMaterial.bumpMap = brushedTexture
      finishMaterial.bumpScale = 0.0006
      finishMaterial.needsUpdate = true
    }
  }

  function tickTransition(delta: number): boolean {
    if (!isTransitioning) return false

    const targetCfg = FINISH_CONFIGS[targetFinish]
    // Smooth exponential approach towards target values
    const factor = Math.min(1, delta * 12)

    finishMaterial.color.lerp(targetCfg.color, factor)
    finishMaterial.metalness += (targetCfg.metalness - finishMaterial.metalness) * factor
    finishMaterial.roughness += (targetCfg.roughness - finishMaterial.roughness) * factor
    finishMaterial.clearcoat += (targetCfg.clearcoat - finishMaterial.clearcoat) * factor
    finishMaterial.clearcoatRoughness += (targetCfg.clearcoatRoughness - finishMaterial.clearcoatRoughness) * factor

    const colorDiff = Math.abs(finishMaterial.color.r - targetCfg.color.r) +
                      Math.abs(finishMaterial.color.g - targetCfg.color.g) +
                      Math.abs(finishMaterial.color.b - targetCfg.color.b)

    if (colorDiff < 0.01 && Math.abs(finishMaterial.metalness - targetCfg.metalness) < 0.01) {
      applyFinishInstant(targetFinish)
      return false
    }

    return true
  }

  const allMaterials: Material[] = [
    finishMaterial,
    chromeMaterial,
    gasketMaterial,
    interiorLinerMaterial,
    glassShelfMaterial,
    crisperMaterial,
    ledMaterial,
    darkBaseMaterial,
    props.bottleAmber,
    props.bottleGreen,
    props.bottleClear,
    props.foodContainerCap,
    props.foodContainerCapBlue,
    props.foodContainerBody,
    props.iceCube,
    props.produceRed,
    props.produceGreen,
    props.produceYellow,
  ]

  function dispose(): void {
    brushedTexture?.dispose()
    for (const mat of allMaterials) {
      mat.dispose()
    }
  }

  return {
    finishMaterial,
    chromeMaterial,
    gasketMaterial,
    interiorLinerMaterial,
    glassShelfMaterial,
    crisperMaterial,
    ledMaterial,
    darkBaseMaterial,
    props,
    get currentFinish() {
      return currentFinish
    },
    updateFinish,
    tickTransition,
    dispose,
  }
}
