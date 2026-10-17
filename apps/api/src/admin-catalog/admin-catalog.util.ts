import * as path from 'node:path'
import {
  adminSpecTemplateFieldSchema,
  type AdminProductSetContent,
  type AdminSpecTemplateField,
  productSetContentPieceSchema,
} from '@serag/shared'
import { z } from 'zod'

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
}

export interface DetectedImageInfo {
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
  ext: 'jpg' | 'png' | 'webp' | 'avif'
}

/**
 * Converts model code to a lowercase, kebab-case URL-safe slug.
 * Does not transliterate Arabic.
 */
export function slugifyModelCode(modelCode: string): string {
  const slug = modelCode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  return slug.length > 0 ? slug : 'product'
}

/**
 * Detects image MIME type from magic bytes.
 * Supports:
 * - JPEG (FF D8 FF)
 * - PNG (89 50 4E 47 0D 0A 1A 0A)
 * - WebP (RIFF....WEBP)
 * - AVIF (....ftypavif or ftypavis)
 */
export function detectImageMime(buffer: Buffer): DetectedImageInfo | null {
  if (!buffer || buffer.length < 12) {
    return null
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' }
  }

  // WebP: RIFF at 0..4, WEBP at 8..12
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }

  // AVIF: ftyp at 4..8, avif or avis at 8..12 (or in compatible brands slice)
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12)
    if (brand === 'avif' || brand === 'avis') {
      return { mime: 'image/avif', ext: 'avif' }
    }
    const compatibleSlice = buffer.slice(8, Math.min(buffer.length, 36)).toString('ascii')
    if (compatibleSlice.includes('avif')) {
      return { mime: 'image/avif', ext: 'avif' }
    }
  }

  return null
}

/**
 * Resolves the uploads root directory exactly like seed.ts does.
 */
export function resolveUploadsDir(): string {
  const configured = process.env.UPLOADS_DIR?.trim()
  if (configured && configured.length > 0) {
    return path.resolve(configured)
  }
  return path.resolve('../../uploads')
}

const templateFieldsArraySchema = z.array(adminSpecTemplateFieldSchema)

/**
 * Parses and validates SpecTemplate.fields JSON column from DB.
 * Falls back to [] on invalid JSON or parse failure.
 */
export function parseTemplateFields(json: unknown): AdminSpecTemplateField[] {
  const parsed = templateFieldsArraySchema.safeParse(json)
  return parsed.success ? parsed.data : []
}

const productSetContentsArraySchema = z.array(productSetContentPieceSchema)

/**
 * Parses and validates Product.setContents JSON column from DB.
 * Returns validated pieces array or null if empty/invalid.
 */
export function parseProductSetContents(json: unknown): AdminProductSetContent[] | null {
  if (json === null || json === undefined) {
    return null
  }
  const parsed = productSetContentsArraySchema.safeParse(json)
  if (!parsed.success || parsed.data.length === 0) {
    return null
  }
  return parsed.data
}

const productSpecsRecordSchema = z.record(z.string(), z.unknown())

/**
 * Parses and validates Product.specs JSON column from DB.
 * Falls back to {} on invalid JSON or parse failure.
 */
export function parseProductSpecs(json: unknown): Record<string, unknown> {
  const parsed = productSpecsRecordSchema.safeParse(json)
  return parsed.success ? parsed.data : {}
}
